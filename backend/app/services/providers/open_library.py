import re
from typing import Any

import httpx
from pydantic import ValidationError

from app.core.errors import AppError
from app.schemas.books import AuthorMetadata, EditionMetadata
from app.services.isbn import ISBN


def text(value: Any) -> str | None:
    return value.strip() or None if isinstance(value, str) else None


def provider_id(value: Any, kind: str) -> str | None:
    if isinstance(value, str):
        match = re.search(rf"/{kind}/(OL[0-9]+[AM])(?:/|$)", value)
        if match:
            return match.group(1)
    return None


def normalize_record(record: dict, isbn: ISBN) -> EditionMetadata:
    title = text(record.get("title"))
    if not title:
        raise AppError("metadata_invalid", "The book provider returned an incomplete record.", 502)
    authors = []
    seen = set()
    for item in record.get("authors", []) or []:
        if isinstance(item, dict) and (name := text(item.get("name"))):
            identifier = provider_id(item.get("url"), "authors")
            identity = identifier or name
            if identity not in seen:
                authors.append(AuthorMetadata(name=name, provider_id=identifier))
                seen.add(identity)
    publishers = [
        text(p.get("name")) for p in record.get("publishers", []) or [] if isinstance(p, dict)
    ]
    cover = record.get("cover") or {}
    cover_url = text(cover.get("large") or cover.get("medium") or cover.get("small"))
    # Do not relay arbitrary upstream URLs to the client.
    if cover_url:
        url = httpx.URL(cover_url)
        cover_url = (
            str(url.copy_with(scheme="https")) if url.host == "covers.openlibrary.org" else None
        )
    description = record.get("description")
    if isinstance(description, dict):
        description = description.get("value")
    pages = record.get("number_of_pages")
    return EditionMetadata(
        isbn13=isbn.isbn13,
        isbn10=isbn.isbn10,
        title=title,
        subtitle=text(record.get("subtitle")),
        authors=authors,
        publisher="; ".join(p for p in publishers if p) or None,
        publication_date=text(record.get("publish_date")),
        page_count=pages if type(pages) is int and pages > 0 else None,
        cover_url=cover_url,
        description=text(description),
        metadata_provider="open_library",
        provider_id=provider_id(record.get("url"), "books"),
    )


class OpenLibraryProvider:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def lookup(self, isbn: ISBN) -> EditionMetadata | None:
        # Include both equivalent ISBNs; some records are indexed only by ISBN-10.
        keys = [f"ISBN:{isbn.isbn13}"]
        if isbn.isbn10:
            keys.append(f"ISBN:{isbn.isbn10}")
        try:
            response = await self.client.get(
                "/api/books",
                params={
                    "bibkeys": ",".join(keys),
                    "format": "json",
                    "jscmd": "data",
                },
            )
            response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise AppError(
                "metadata_timeout", "The book provider timed out. Try again.", 504
            ) from exc
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                raise AppError(
                    "metadata_busy", "The book provider is busy. Try again shortly.", 503
                ) from exc
            raise AppError(
                "metadata_unavailable", "The book provider is unavailable. Try again.", 502
            ) from exc
        except httpx.RequestError as exc:
            raise AppError(
                "metadata_unavailable", "Could not reach the book provider. Try again.", 502
            ) from exc
        try:
            payload = response.json()
            if not isinstance(payload, dict):
                raise ValueError("Expected an object")
            record = next((payload[key] for key in keys if key in payload), None)
            if record is None:
                return None
            if not isinstance(record, dict):
                raise ValueError("Expected a book object")
            return normalize_record(record, isbn)
        except (ValueError, TypeError, AttributeError, ValidationError, httpx.InvalidURL) as exc:
            raise AppError(
                "metadata_invalid", "The book provider returned an invalid response.", 502
            ) from exc
