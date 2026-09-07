from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AuthorMetadata(BaseModel):
    name: str = Field(min_length=1)
    provider_id: str | None = None


class EditionMetadata(BaseModel):
    isbn10: str | None
    isbn13: str
    title: str = Field(min_length=1)
    subtitle: str | None = None
    authors: list[AuthorMetadata] = Field(default_factory=list)
    publisher: str | None = None
    publication_date: str | None = None
    page_count: int | None = Field(default=None, gt=0)
    cover_url: str | None = None
    description: str | None = None
    metadata_provider: str
    provider_id: str | None = None


class BookEditionResponse(EditionMetadata):
    id: UUID
    fetched_at: datetime


class LookupResponse(BaseModel):
    book: BookEditionResponse
    source: Literal["cache", "provider"]


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
