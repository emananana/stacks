from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BookEdition(Base):
    __tablename__ = "book_editions"
    __table_args__ = (
        CheckConstraint("page_count IS NULL OR page_count > 0", name="positive_page_count"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    isbn13: Mapped[str] = mapped_column(String(13), unique=True)
    isbn10: Mapped[str | None] = mapped_column(String(10), unique=True)
    title: Mapped[str] = mapped_column(Text)
    subtitle: Mapped[str | None] = mapped_column(Text)
    publisher: Mapped[str | None] = mapped_column(Text)
    publication_date: Mapped[str | None] = mapped_column(Text)
    page_count: Mapped[int | None] = mapped_column(Integer)
    cover_url: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    metadata_provider: Mapped[str] = mapped_column(String(40))
    provider_id: Mapped[str | None] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author_links: Mapped[list[EditionAuthor]] = relationship(
        back_populates="edition",
        cascade="all, delete-orphan",
        order_by="EditionAuthor.position",
        lazy="selectin",
    )


class Author(Base):
    __tablename__ = "authors"
    __table_args__ = (UniqueConstraint("provider", "provider_id"),)
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text)
    provider: Mapped[str | None] = mapped_column(String(40))
    provider_id: Mapped[str | None] = mapped_column(Text)


class EditionAuthor(Base):
    __tablename__ = "edition_authors"
    __table_args__ = (
        UniqueConstraint("book_edition_id", "position"),
        CheckConstraint("position >= 0", name="nonnegative_position"),
    )
    book_edition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("book_editions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("authors.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    position: Mapped[int] = mapped_column(Integer)
    edition: Mapped[BookEdition] = relationship(back_populates="author_links")
    author: Mapped[Author] = relationship(lazy="joined")


class LibraryCopy(Base):
    __tablename__ = "library_copies"
    __table_args__ = (
        CheckConstraint("reading_status IN ('unread', 'reading', 'read')", name="reading_status"),
        CheckConstraint("rating IS NULL OR rating BETWEEN 1 AND 5", name="rating_range"),
        UniqueConstraint("user_id", "acquisition_key", name="uq_copy_owner_acquisition"),
    )
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    book_edition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("book_editions.id", ondelete="RESTRICT"),
        index=True,
    )
    # One UUID per future add-copy operation: retries cannot create another physical copy.
    acquisition_key: Mapped[uuid.UUID] = mapped_column(Uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    creation_fingerprint: Mapped[str | None] = mapped_column(String(64))
    reading_status: Mapped[str] = mapped_column(String(10), server_default="unread")
    rating: Mapped[int | None] = mapped_column(Integer)
    shelf: Mapped[str | None] = mapped_column(String(120))
    date_acquired: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    edition: Mapped[BookEdition] = relationship(lazy="joined")
