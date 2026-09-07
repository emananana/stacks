from contextlib import asynccontextmanager
from hashlib import blake2b
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Author, BookEdition, EditionAuthor, LibraryCopy
from app.models.accounts import LEGACY_USER_ID
from app.schemas.copies import (
    CopyDetails,
    CreateCopyRequest,
    LibraryCopyListItem,
    LibraryCopyResponse,
)


class CopyRepository:
    def __init__(self, session: AsyncSession, user_id: UUID = LEGACY_USER_ID):
        self.session = session
        self.user_id = user_id

    @asynccontextmanager
    async def transaction(self, acquisition_key: UUID):
        async with self.session.begin():
            # Serialize the same operation even if callers reuse its key across editions.
            lock = int.from_bytes(
                blake2b(self.user_id.bytes + acquisition_key.bytes, digest_size=8).digest(),
                byteorder="big",
                signed=True,
            )
            await self.session.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock})
            yield

    async def find_by_key(self, key: UUID) -> LibraryCopy | None:
        return await self.session.scalar(
            select(LibraryCopy).where(
                LibraryCopy.acquisition_key == key, LibraryCopy.user_id == self.user_id
            )
        )

    async def lock_edition(self, edition_id: UUID) -> bool:
        # All add-copy operations for an edition take this lock before the ownership check.
        result = await self.session.scalar(
            select(BookEdition.id).where(BookEdition.id == edition_id).with_for_update()
        )
        return result is not None

    async def count_for_edition(self, edition_id: UUID) -> int:
        return (
            await self.session.scalar(
                select(func.count())
                .select_from(LibraryCopy)
                .where(
                    LibraryCopy.book_edition_id == edition_id, LibraryCopy.user_id == self.user_id
                )
            )
            or 0
        )

    async def insert(self, request: CreateCopyRequest, fingerprint: str) -> LibraryCopy:
        row = LibraryCopy(
            **request.model_dump(exclude={"allow_duplicate"}),
            creation_fingerprint=fingerprint,
            user_id=self.user_id,
        )
        self.session.add(row)
        await self.session.flush()
        return row

    async def find(self, copy_id: UUID) -> LibraryCopy | None:
        return await self.session.scalar(
            select(LibraryCopy).where(
                LibraryCopy.id == copy_id, LibraryCopy.user_id == self.user_id
            )
        )

    async def update(self, copy_id: UUID, details: CopyDetails) -> LibraryCopy | None:
        row = await self.find(copy_id)
        if row is None:
            return None
        for field, value in details.model_dump().items():
            setattr(row, field, value)
        await self.session.commit()
        await self.session.refresh(row)
        return row

    async def delete(self, copy_id: UUID) -> bool:
        row = await self.find(copy_id)
        if row is None:
            return False
        await self.session.delete(row)
        await self.session.commit()
        return True

    async def list(
        self, query: str | None, status: str | None, sort: str
    ) -> list[LibraryCopyListItem]:
        statement = (
            select(LibraryCopy).join(LibraryCopy.edition).where(LibraryCopy.user_id == self.user_id)
        )
        if query:
            term = f"%{query.strip()}%"
            statement = statement.where(
                BookEdition.title.ilike(term)
                | BookEdition.id.in_(
                    select(EditionAuthor.book_edition_id)
                    .join(EditionAuthor.author)
                    .where(Author.name.ilike(term))
                )
            )
        if status:
            statement = statement.where(LibraryCopy.reading_status == status)
        if sort == "rating":
            statement = statement.order_by(
                LibraryCopy.rating.desc().nullslast(), LibraryCopy.created_at.desc()
            )
        elif sort == "title":
            statement = statement.order_by(BookEdition.title.asc())
        elif sort == "author":
            statement = statement.order_by(
                select(Author.name)
                .join(EditionAuthor, EditionAuthor.author_id == Author.id)
                .where(EditionAuthor.book_edition_id == BookEdition.id)
                .limit(1)
                .scalar_subquery()
                .asc(),
                BookEdition.title.asc(),
            )
        else:
            statement = statement.order_by(LibraryCopy.created_at.desc())
        rows = (await self.session.scalars(statement)).unique().all()
        return [
            LibraryCopyListItem.model_validate(
                {
                    **LibraryCopyResponse.model_validate(row).model_dump(),
                    "title": row.edition.title,
                    "authors": [link.author.name for link in row.edition.author_links],
                    "cover_url": row.edition.cover_url,
                    "isbn13": row.edition.isbn13,
                }
            )
            for row in rows
        ]
