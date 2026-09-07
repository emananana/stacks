import httpx
import pytest

from app.core.errors import AppError
from app.services.isbn import normalize_isbn
from app.services.providers.open_library import OpenLibraryProvider

ISBN = normalize_isbn("0140328726")
RECORD = {
    "title": " Fantastic Mr. Fox ",
    "subtitle": "A story",
    "url": "https://openlibrary.org/books/OL7353617M/Fantastic Mr. Fox",
    "authors": [
        {"name": "Roald Dahl", "url": "https://openlibrary.org/authors/OL34184A/Roald_Dahl"}
    ],
    "publishers": [{"name": "Puffin"}],
    "publish_date": "1988",
    "number_of_pages": 240,
    "cover": {"large": "http://covers.openlibrary.org/b/id/123-L.jpg"},
    "description": {"value": "A remarkable reader."},
}


async def call_provider(handler):
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler), base_url="https://openlibrary.org"
    ) as client:
        return await OpenLibraryProvider(client).lookup(ISBN)


async def test_normalizes_record_and_requests_both_identifiers():
    def handler(request):
        assert request.url.path == "/api/books"
        assert request.url.params["bibkeys"] == "ISBN:9780140328721,ISBN:0140328726"
        assert request.url.params["jscmd"] == "data"
        return httpx.Response(200, json={"ISBN:0140328726": RECORD})

    book = await call_provider(handler)
    assert book.title == "Fantastic Mr. Fox"
    assert book.authors[0].provider_id == "OL34184A"
    assert book.publisher == "Puffin"
    assert book.publication_date == "1988"
    assert book.page_count == 240
    assert book.cover_url.startswith("https://")
    assert book.description == "A remarkable reader."
    assert book.provider_id == "OL7353617M"
    assert book.isbn13 == ISBN.isbn13


async def test_missing_optional_fields_are_null_and_authors_empty():
    book = await call_provider(
        lambda _: httpx.Response(200, json={"ISBN:9780140328721": {"title": "Sparse"}})
    )
    assert book.authors == []
    assert book.cover_url is None and book.page_count is None and book.description is None


async def test_filters_bad_optional_values_and_duplicate_authors():
    record = dict(RECORD, number_of_pages=-1, cover={"large": "https://untrusted.example/image"})
    record["authors"] = RECORD["authors"] * 2 + [None, {"name": " "}]
    book = await call_provider(lambda _: httpx.Response(200, json={"ISBN:9780140328721": record}))
    assert len(book.authors) == 1
    assert book.page_count is None and book.cover_url is None


async def test_empty_payload_is_not_found():
    assert await call_provider(lambda _: httpx.Response(200, json={})) is None


@pytest.mark.parametrize(
    "payload",
    [
        [],
        {"ISBN:9780140328721": []},
        {"ISBN:9780140328721": {}},
        {"ISBN:9780140328721": {"title": "A", "authors": 42}},
    ],
)
async def test_malformed_payload(payload):
    with pytest.raises(AppError) as error:
        await call_provider(lambda _: httpx.Response(200, json=payload))
    assert error.value.code == "metadata_invalid"


async def test_non_json_payload():
    with pytest.raises(AppError) as error:
        await call_provider(lambda _: httpx.Response(200, text="<html>Bad gateway</html>"))
    assert error.value.status == 502


@pytest.mark.parametrize(
    "status,code",
    [(500, "metadata_unavailable"), (429, "metadata_busy"), (404, "metadata_unavailable")],
)
async def test_upstream_status(status, code):
    with pytest.raises(AppError) as error:
        await call_provider(lambda _: httpx.Response(status))
    assert error.value.code == code


@pytest.mark.parametrize(
    "exception,code,status",
    [
        (httpx.ReadTimeout, "metadata_timeout", 504),
        (httpx.ConnectError, "metadata_unavailable", 502),
    ],
)
async def test_network_failures(exception, code, status):
    def handler(request):
        raise exception("failed", request=request)

    with pytest.raises(AppError) as error:
        await call_provider(handler)
    assert (error.value.code, error.value.status) == (code, status)
