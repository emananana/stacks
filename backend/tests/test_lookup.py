from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.errors import AppError
from app.schemas.books import BookEditionResponse, EditionMetadata
from app.services.lookup import LookupService


def metadata():
    return EditionMetadata(
        isbn13="9780140328721",
        isbn10="0140328726",
        title="Fantastic Mr. Fox",
        metadata_provider="open_library",
    )


def response():
    return BookEditionResponse(
        **metadata().model_dump(), id=uuid4(), fetched_at=datetime.now(timezone.utc)
    )


async def test_cache_hit_never_calls_provider():
    repo, provider = AsyncMock(), AsyncMock()
    repo.find.return_value = response()
    result = await LookupService(repo, [provider]).lookup("0-14-032872-6")
    assert result.source == "cache"
    repo.find.assert_awaited_once_with("9780140328721")
    provider.lookup.assert_not_called()
    repo.save.assert_not_called()


async def test_miss_saves_normalized_edition():
    repo, provider = AsyncMock(), AsyncMock()
    repo.find.return_value = None
    provider.lookup.return_value = metadata()
    repo.save.return_value = response()
    result = await LookupService(repo, [provider]).lookup("9780140328721")
    assert result.source == "provider"
    repo.save.assert_awaited_once_with(metadata())


async def test_not_found_does_not_cache_negative_result():
    repo, provider = AsyncMock(), AsyncMock()
    repo.find.return_value = provider.lookup.return_value = None
    with pytest.raises(AppError) as error:
        await LookupService(repo, [provider]).lookup("9780140328721")
    assert error.value.status == 404
    repo.save.assert_not_called()


async def test_fallback_provider_can_be_added_without_route_changes():
    repo, primary, secondary = AsyncMock(), AsyncMock(), AsyncMock()
    repo.find.return_value = primary.lookup.return_value = None
    secondary.lookup.return_value = metadata()
    repo.save.return_value = response()
    result = await LookupService(repo, [primary, secondary]).lookup("9780140328721")
    assert result.book.title == "Fantastic Mr. Fox"
    secondary.lookup.assert_awaited_once()


async def test_invalid_input_does_no_io():
    repo, provider = AsyncMock(), AsyncMock()
    with pytest.raises(AppError):
        await LookupService(repo, [provider]).lookup("bad input")
    repo.find.assert_not_called()
    provider.lookup.assert_not_called()


async def test_provider_failure_propagates_without_saving():
    repo, provider = AsyncMock(), AsyncMock()
    repo.find.return_value = None
    provider.lookup.side_effect = AppError("metadata_timeout", "Timed out", 504)
    with pytest.raises(AppError) as error:
        await LookupService(repo, [provider]).lookup("9780140328721")
    assert error.value.status == 504
    repo.save.assert_not_called()
