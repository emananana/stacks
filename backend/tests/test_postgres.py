"""Tests truncate the named disposable database. Never point TEST_DATABASE_URL at real data."""

import asyncio
import os
from uuid import uuid4

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.auth import current_user
from app.core.config import Settings
from app.main import create_app
from app.models import Author, BookEdition, LibraryCopy
from app.models.accounts import LEGACY_USER_ID
from app.repositories.books import PostgresEditionRepository
from app.schemas.auth import UserResponse
from app.schemas.books import AuthorMetadata, EditionMetadata

URL = os.getenv("TEST_DATABASE_URL")
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set"),
]


@pytest_asyncio.fixture
async def sessions():
    engine = create_async_engine(URL)
    async with engine.begin() as conn:
        await conn.execute(
            text("TRUNCATE library_copies, edition_authors, authors, book_editions CASCADE")
        )
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()


def metadata(isbn13="9780140328721", isbn10="0140328726"):
    return EditionMetadata(
        isbn13=isbn13,
        isbn10=isbn10,
        title="Fantastic Mr. Fox",
        metadata_provider="open_library",
        authors=[AuthorMetadata(name="Roald Dahl", provider_id="OL34184A")],
    )


async def test_concurrent_lookups_create_one_edition(sessions):
    async def save():
        async with sessions() as session:
            return await PostgresEditionRepository(session).save(metadata())

    results = await asyncio.gather(save(), save())
    assert results[0].id == results[1].id
    async with sessions() as session:
        assert await session.scalar(select(func.count()).select_from(BookEdition)) == 1
        assert await session.scalar(select(func.count()).select_from(Author)) == 1
        assert await session.scalar(select(func.count()).select_from(LibraryCopy)) == 0


async def test_author_reused_between_editions(sessions):
    async with sessions() as session:
        repo = PostgresEditionRepository(session)
        await repo.save(metadata())
        await repo.save(metadata("9780804429573", "080442957X"))
        assert await session.scalar(select(func.count()).select_from(Author)) == 1


async def test_copy_retry_key_unique_but_multiple_copies_allowed(sessions):
    async with sessions() as session:
        book = await PostgresEditionRepository(session).save(metadata())
        key = uuid4()
        session.add_all(
            [
                LibraryCopy(book_edition_id=book.id, acquisition_key=key),
                LibraryCopy(book_edition_id=book.id, acquisition_key=uuid4()),
            ]
        )
        await session.commit()
        assert await session.scalar(select(func.count()).select_from(LibraryCopy)) == 2
        session.add(LibraryCopy(book_edition_id=book.id, acquisition_key=key))
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


@pytest.mark.parametrize("values", [{"rating": 6}, {"rating": 0}, {"reading_status": "finished"}])
async def test_copy_constraints(sessions, values):
    async with sessions() as session:
        book = await PostgresEditionRepository(session).save(metadata())
        session.add(LibraryCopy(book_edition_id=book.id, acquisition_key=uuid4(), **values))
        with pytest.raises(IntegrityError):
            await session.commit()
        await session.rollback()


async def test_http_to_provider_to_postgres_then_cache(sessions):
    calls = []

    def upstream(request):
        calls.append(request)
        return httpx.Response(
            200,
            json={
                "ISBN:9780140328721": {
                    "title": "Fantastic Mr. Fox",
                    "authors": [{"name": "Roald Dahl"}],
                }
            },
        )

    app = create_app(Settings(database_url=URL))
    app.dependency_overrides[current_user] = lambda: UserResponse(
        id=LEGACY_USER_ID, email="legacy@stacks.local"
    )
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.MockTransport(upstream), base_url="https://openlibrary.org"
        ) as provider:
            app.state.http = provider
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app), base_url="http://test"
            ) as client:
                first = await client.get("/books/lookup/0140328726")
                second = await client.get("/books/lookup/9780140328721")
                assert first.status_code == second.status_code == 200
                assert first.json()["source"] == "provider"
                assert second.json()["source"] == "cache"
                assert first.json()["book"]["id"] == second.json()["book"]["id"]
                assert (await client.get("/health/ready")).status_code == 200
    assert len(calls) == 1


async def seed_edition(sessions):
    async with sessions() as session:
        return await PostgresEditionRepository(session).save(metadata())


async def test_concurrent_copy_retries_and_readback(sessions):
    from app.repositories.copies import CopyRepository
    from app.schemas.copies import CreateCopyRequest
    from app.services.copies import CopyService

    book = await seed_edition(sessions)
    body = CreateCopyRequest(
        book_edition_id=book.id,
        acquisition_key=uuid4(),
        reading_status="read",
        rating=5,
        shelf="Office",
        notes="Gift",
    )

    async def save():
        async with sessions() as session:
            return await CopyService(CopyRepository(session)).create(body)

    results = await asyncio.gather(save(), save(), save())
    assert sum(r.created for r in results) == 1
    assert len({r.copy.id for r in results}) == 1
    async with sessions() as session:
        retrieved = await CopyService(CopyRepository(session)).get(results[0].copy.id)
        assert retrieved.notes == "Gift" and retrieved.rating == 5
        assert await session.scalar(select(func.count()).select_from(LibraryCopy)) == 1


async def test_concurrent_distinct_requests_require_duplicate_consent(sessions):
    from app.core.errors import AppError
    from app.repositories.copies import CopyRepository
    from app.schemas.copies import CreateCopyRequest
    from app.services.copies import CopyService

    book = await seed_edition(sessions)

    async def save():
        async with sessions() as session:
            return await CopyService(CopyRepository(session)).create(
                CreateCopyRequest(book_edition_id=book.id, acquisition_key=uuid4())
            )

    results = await asyncio.gather(save(), save(), return_exceptions=True)
    failures = [r for r in results if isinstance(r, AppError)]
    assert len(failures) == 1 and failures[0].code == "duplicate_copy"
    async with sessions() as session:
        service = CopyService(CopyRepository(session))
        assert (
            await service.create(
                CreateCopyRequest(
                    book_edition_id=book.id, acquisition_key=uuid4(), allow_duplicate=True
                )
            )
        ).created
        assert await session.scalar(select(func.count()).select_from(LibraryCopy)) == 2


async def test_same_key_on_different_editions_returns_conflict(sessions):
    from app.core.errors import AppError
    from app.repositories.copies import CopyRepository
    from app.schemas.copies import CreateCopyRequest
    from app.services.copies import CopyService

    first = await seed_edition(sessions)
    async with sessions() as session:
        second = await PostgresEditionRepository(session).save(
            metadata("9780804429573", "080442957X")
        )
    key = uuid4()

    async def save(edition_id):
        async with sessions() as session:
            return await CopyService(CopyRepository(session)).create(
                CreateCopyRequest(book_edition_id=edition_id, acquisition_key=key)
            )

    results = await asyncio.gather(save(first.id), save(second.id), return_exceptions=True)
    failures = [r for r in results if isinstance(r, AppError)]
    assert len(failures) == 1 and failures[0].code == "idempotency_conflict"


async def test_create_copy_http_persists_after_new_app_instance(sessions):
    book = await seed_edition(sessions)
    body = {
        "book_edition_id": str(book.id),
        "acquisition_key": str(uuid4()),
        "reading_status": "reading",
        "rating": 4,
        "shelf": "  Study  ",
        "date_acquired": "2026-09-06",
        "notes": "My own book",
    }
    app = create_app(Settings(database_url=URL))
    app.dependency_overrides[current_user] = lambda: UserResponse(
        id=LEGACY_USER_ID, email="legacy@stacks.local"
    )
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            response = await client.post("/library/copies", json=body)
            assert response.status_code == 201
            copy = response.json()
            assert copy["shelf"] == "Study"
            assert (await client.post("/library/copies", json=body)).status_code == 200
            duplicate = body | {"acquisition_key": str(uuid4())}
            conflict = await client.post("/library/copies", json=duplicate)
            assert (
                conflict.status_code == 409 and conflict.json()["error"]["code"] == "duplicate_copy"
            )
    other_app = create_app(Settings(database_url=URL))
    async with other_app.router.lifespan_context(other_app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=other_app), base_url="http://test"
        ) as client:
            assert (await client.get(f"/library/copies/{copy['id']}")).json() == copy
