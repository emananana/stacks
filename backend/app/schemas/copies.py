from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

ReadingStatus = Literal["unread", "reading", "read"]


class CopyDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reading_status: ReadingStatus = "unread"
    rating: int | None = Field(default=None, strict=True, ge=1, le=5)
    shelf: str | None = Field(default=None, max_length=120)
    date_acquired: date | None = None
    notes: str | None = Field(default=None, max_length=10000)

    @field_validator("shelf", "notes", mode="before")
    @classmethod
    def trim_optional_text(cls, value):
        return (value.strip() or None) if isinstance(value, str) else value

    @field_validator("date_acquired", mode="before")
    @classmethod
    def require_calendar_date(cls, value):
        # Do not accept timestamps/numbers as acquisition dates.
        if value is not None and not isinstance(value, (str, date)):
            raise ValueError("Use a calendar date in YYYY-MM-DD format")
        return value


class CreateCopyRequest(CopyDetails):
    book_edition_id: UUID
    acquisition_key: UUID
    allow_duplicate: bool = Field(default=False, strict=True)


class LibraryCopyResponse(CopyDetails):
    model_config = ConfigDict(from_attributes=True, extra="forbid")
    id: UUID
    book_edition_id: UUID
    acquisition_key: UUID
    created_at: datetime
    updated_at: datetime


class LibraryCopyListItem(LibraryCopyResponse):
    title: str
    authors: list[str] = Field(default_factory=list)
    cover_url: str | None = None
    isbn13: str


class LibraryResponse(BaseModel):
    items: list[LibraryCopyListItem]
    total: int
    books_owned: int
    books_read: int
    currently_reading: int
    unread: int
