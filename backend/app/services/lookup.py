from app.core.errors import AppError
from app.repositories.books import EditionRepository
from app.schemas.books import LookupResponse
from app.services.isbn import normalize_isbn
from app.services.providers.base import MetadataProvider


class LookupService:
    def __init__(self, repository: EditionRepository, providers: list[MetadataProvider]):
        self.repository, self.providers = repository, providers

    async def lookup(self, raw_isbn: str) -> LookupResponse:
        isbn = normalize_isbn(raw_isbn)
        cached = await self.repository.find(isbn.isbn13)
        if cached:
            return LookupResponse(book=cached, source="cache")
        # A later provider can be appended here; routes and clients remain unchanged.
        # Absence falls through. Provider outages are surfaced rather than hidden.
        for provider in self.providers:
            metadata = await provider.lookup(isbn)
            if metadata:
                return LookupResponse(book=await self.repository.save(metadata), source="provider")
        raise AppError(
            "book_not_found",
            "No book was found for this ISBN. Check the number and try again.",
            404,
        )
