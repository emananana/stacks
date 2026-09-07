import hashlib
import json
from dataclasses import dataclass
from uuid import UUID

from app.core.errors import AppError
from app.repositories.copies import CopyRepository
from app.schemas.copies import CopyDetails, CreateCopyRequest, LibraryCopyResponse, LibraryResponse


def creation_fingerprint(request: CreateCopyRequest) -> str:
    # Consent and transport identity aren't physical-copy content. This digest stays
    # immutable when copy editing is added later, so original retries remain valid.
    payload = request.model_dump(mode="json", exclude={"acquisition_key", "allow_duplicate"})
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


@dataclass
class SaveResult:
    copy: LibraryCopyResponse
    created: bool


class CopyService:
    def __init__(self, repository: CopyRepository):
        self.repository = repository

    async def create(self, request: CreateCopyRequest) -> SaveResult:
        fingerprint = creation_fingerprint(request)
        async with self.repository.transaction(request.acquisition_key):
            existing = await self.repository.find_by_key(request.acquisition_key)
            if existing:
                if existing.creation_fingerprint != fingerprint:
                    raise AppError(
                        "idempotency_conflict",
                        "This save request was already used with different details.",
                        409,
                    )
                return SaveResult(LibraryCopyResponse.model_validate(existing), created=False)
            if not await self.repository.lock_edition(request.book_edition_id):
                raise AppError(
                    "edition_not_found",
                    "This edition is no longer available. Look it up again.",
                    404,
                )
            owned = await self.repository.count_for_edition(request.book_edition_id)
            if owned and not request.allow_duplicate:
                raise AppError(
                    "duplicate_copy",
                    f"You already own {owned} {'copy' if owned == 1 else 'copies'} "
                    "of this edition. "
                    "Confirm to add another physical copy.",
                    409,
                )
            row = await self.repository.insert(request, fingerprint)
            result = SaveResult(LibraryCopyResponse.model_validate(row), created=True)
        # The transaction has committed before we tell the client its copy is saved.
        return result

    async def get(self, copy_id: UUID) -> LibraryCopyResponse:
        row = await self.repository.find(copy_id)
        if row is None:
            raise AppError("copy_not_found", "This library copy was not found.", 404)
        return LibraryCopyResponse.model_validate(row)

    async def list(self, query: str | None, status: str | None, sort: str) -> LibraryResponse:
        items = await self.repository.list(query, status, sort)
        return LibraryResponse(
            items=items,
            total=len(items),
            books_owned=len(items),
            books_read=sum(i.reading_status == "read" for i in items),
            currently_reading=sum(i.reading_status == "reading" for i in items),
            unread=sum(i.reading_status == "unread" for i in items),
        )

    async def update(self, copy_id: UUID, details: CopyDetails) -> LibraryCopyResponse:
        row = await self.repository.update(copy_id, details)
        if row is None:
            raise AppError("copy_not_found", "This library copy was not found.", 404)
        return LibraryCopyResponse.model_validate(row)

    async def delete(self, copy_id: UUID) -> None:
        if not await self.repository.delete(copy_id):
            raise AppError("copy_not_found", "This library copy was not found.", 404)
