from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.api.dependencies import get_lookup_service, get_session
from app.core.errors import AppError
from app.main import create_app
from app.services.lookup import LookupService


def test_liveness_requires_no_database():
    with TestClient(create_app()) as client:
        assert client.get("/health").json() == {"status": "ok"}


def test_invalid_isbn_uses_error_envelope():
    app = create_app()
    app.dependency_overrides[get_lookup_service] = lambda: LookupService(AsyncMock(), [])
    with TestClient(app) as client:
        result = client.get("/books/lookup/invalid")
        assert result.status_code == 422
        assert result.json()["error"]["code"] == "invalid_isbn"
        assert client.get("/books/lookup/" + "0" * 33).json()["error"]["code"] == "invalid_request"


def test_not_found_response():
    app = create_app()
    service = AsyncMock()
    service.lookup.side_effect = AppError("book_not_found", "No book found", 404)
    app.dependency_overrides[get_lookup_service] = lambda: service
    with TestClient(app) as client:
        result = client.get("/books/lookup/9780140328721")
        assert result.status_code == 404
        assert result.json() == {"error": {"code": "book_not_found", "message": "No book found"}}


def test_database_failure_does_not_expose_connection_details():
    app = create_app()
    session = AsyncMock()
    session.execute.side_effect = OperationalError("secret database url", {}, Exception("password"))
    app.dependency_overrides[get_session] = lambda: session
    with TestClient(app) as client:
        response = client.get("/health/ready")
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "database_unavailable"
        assert "password" not in response.text and "secret" not in response.text
