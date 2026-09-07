from typing import Protocol

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Author, BookEdition, EditionAuthor
from app.schemas.books import AuthorMetadata, BookEditionResponse, EditionMetadata


class EditionRepository(Protocol):
    async def find(self, isbn13: str) -> BookEditionResponse | None: ...
    async def save(self, metadata: EditionMetadata) -> BookEditionResponse: ...


def serialize(book: BookEdition) -> BookEditionResponse:
    return BookEditionResponse(
        **{key: getattr(book, key) for key in EditionMetadata.model_fields if key != "authors"},
        id=book.id,
        fetched_at=book.fetched_at,
        authors=[
            AuthorMetadata(name=link.author.name, provider_id=link.author.provider_id)
            for link in book.author_links
        ],
    )


class PostgresEditionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def find(self, isbn13: str) -> BookEditionResponse | None:
        result = await self.session.scalar(select(BookEdition).where(BookEdition.isbn13 == isbn13))
        return serialize(result) if result else None

    async def save(self, metadata: EditionMetadata) -> BookEditionResponse:
        # The edition and all authors are committed atomically. ON CONFLICT resolves
        # concurrent lookups without overwriting metadata or duplicating editions.
        values = metadata.model_dump(exclude={"authors"})
        statement = (
            insert(BookEdition)
            .values(**values)
            .on_conflict_do_nothing(
                index_elements=[BookEdition.isbn13],
            )
            .returning(BookEdition.id)
        )
        edition_id = await self.session.scalar(statement)
        if edition_id:
            for position, author in enumerate(metadata.authors):
                author_values = {
                    "name": author.name,
                    "provider": metadata.metadata_provider,
                    "provider_id": author.provider_id,
                }
                if author.provider_id:
                    # Reuse provider identities. Never merge distinct authors by name.
                    stmt = (
                        insert(Author)
                        .values(**author_values)
                        .on_conflict_do_update(
                            index_elements=[Author.provider, Author.provider_id],
                            set_={"provider_id": author.provider_id},
                        )
                        .returning(Author.id)
                    )
                    author_id = await self.session.scalar(stmt)
                else:
                    row = Author(**author_values)
                    self.session.add(row)
                    await self.session.flush()
                    author_id = row.id
                self.session.add(
                    EditionAuthor(
                        book_edition_id=edition_id,
                        author_id=author_id,
                        position=position,
                    )
                )
        await self.session.commit()
        result = await self.find(metadata.isbn13)
        assert result is not None
        return result
