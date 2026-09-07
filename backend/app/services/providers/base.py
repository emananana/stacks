from typing import Protocol

from app.schemas.books import EditionMetadata
from app.services.isbn import ISBN


class MetadataProvider(Protocol):
    async def lookup(self, isbn: ISBN) -> EditionMetadata | None:
        """Return normalized metadata, None for absent records, or an AppError."""
        ...
