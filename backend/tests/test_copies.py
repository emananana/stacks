from contextlib import asynccontextmanager
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
from pydantic import ValidationError

from app.api.dependencies import get_copy_service
from app.core.errors import AppError
from app.main import create_app
from app.schemas.copies import CreateCopyRequest
from app.services.copies import CopyService, creation_fingerprint


def request(**values):
    return CreateCopyRequest(book_edition_id=uuid4(), acquisition_key=uuid4(), **values)


def stored(body):
    return SimpleNamespace(
        **body.model_dump(exclude={"allow_duplicate"}),
        id=uuid4(),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        creation_fingerprint=creation_fingerprint(body),
    )


@asynccontextmanager
async def transaction(_):
    yield


def repository():
    repo = AsyncMock()
    repo.transaction = transaction
    repo.find_by_key.return_value = None
    repo.lock_edition.return_value = True
    repo.count_for_edition.return_value = 0
    return repo


@pytest.mark.parametrize(
    "fields",
    [
        {"rating": 0},
        {"rating": 6},
        {"rating": True},
        {"rating": 2.5},
        {"reading_status": "finished"},
        {"shelf": "a" * 121},
        {"notes": "a" * 10001},
        {"date_acquired": "2025-02-30"},
        {"date_acquired": 0},
        {"allow_duplicate": "yes"},
        {"unexpected": "field"},
    ],
)
def test_invalid_copy_details(fields):
    with pytest.raises(ValidationError):
        request(**fields)


def test_optional_text_and_request_fingerprint():
    body = request(shelf="  Office  ", notes=" ")
    assert body.shelf == "Office" and body.notes is None
    assert creation_fingerprint(body) == creation_fingerprint(
        body.model_copy(update={"allow_duplicate": True, "acquisition_key": uuid4()})
    )
    assert creation_fingerprint(body) != creation_fingerprint(body.model_copy(update={"rating": 5}))


async def test_create_and_replay():
    repo = repository()
    body = request(reading_status="reading", rating=4, notes="A gift")
    row = stored(body)
    repo.insert.return_value = row
    service = CopyService(repo)
    first = await service.create(body)
    assert first.created and first.copy.notes == "A gift"
    repo.find_by_key.return_value = row
    replay = await service.create(body)
    assert not replay.created and replay.copy.id == first.copy.id
    repo.insert.assert_awaited_once()


async def test_reuse_key_with_changed_content_conflicts():
    repo = repository()
    body = request()
    repo.find_by_key.return_value = stored(body)
    with pytest.raises(AppError) as error:
        await CopyService(repo).create(body.model_copy(update={"shelf": "Other"}))
    assert error.value.code == "idempotency_conflict"
    repo.insert.assert_not_called()


async def test_duplicate_requires_consent():
    repo = repository()
    repo.count_for_edition.return_value = 1
    body = request()
    with pytest.raises(AppError) as error:
        await CopyService(repo).create(body)
    assert error.value.code == "duplicate_copy"
    repo.insert.assert_not_called()
    repo.insert.return_value = stored(body)
    assert (
        await CopyService(repo).create(body.model_copy(update={"allow_duplicate": True}))
    ).created


async def test_missing_edition_and_copy():
    repo = repository()
    repo.lock_edition.return_value = False
    service = CopyService(repo)
    with pytest.raises(AppError) as error:
        await service.create(request())
    assert error.value.code == "edition_not_found"
    repo.find.return_value = None
    with pytest.raises(AppError) as error:
        await service.get(uuid4())
    assert error.value.code == "copy_not_found"


async def test_post_http_statuses_and_read_contract():
    repo = repository()
    body = request()
    row = stored(body)
    repo.insert.return_value = row
    repo.find.return_value = row
    app = create_app()
    app.dependency_overrides[get_copy_service] = lambda: CopyService(repo)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        first = await client.post("/library/copies", json=body.model_dump(mode="json"))
        assert first.status_code == 201
        assert first.headers["location"] == f"/library/copies/{row.id}"
        assert "creation_fingerprint" not in first.json()
        repo.find_by_key.return_value = row
        assert (
            await client.post("/library/copies", json=body.model_dump(mode="json"))
        ).status_code == 200
        changed = body.model_dump(mode="json") | {"notes": "Changed"}
        assert (await client.post("/library/copies", json=changed)).json()["error"][
            "code"
        ] == "idempotency_conflict"
        assert (await client.get(first.headers["location"])).json() == first.json()
        assert (await client.post("/library/copies", json={})).status_code == 422
        cors = await client.options(
            "/library/copies",
            headers={
                "Origin": "http://localhost:8081",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        assert cors.status_code == 200
