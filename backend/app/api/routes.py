from fastapi import APIRouter, Depends, Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_lookup_service, get_session
from app.schemas.books import ErrorResponse, HealthResponse, LookupResponse
from app.services.lookup import LookupService

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Process liveness. Use /health/ready to verify the database and migration."""
    return HealthResponse()


@router.get(
    "/health/ready",
    response_model=HealthResponse,
    responses={503: {"model": ErrorResponse}},
    tags=["system"],
)
async def ready(session: AsyncSession = Depends(get_session)) -> HealthResponse:
    await session.execute(text("SELECT id FROM book_editions LIMIT 0"))
    await session.execute(text("SELECT creation_fingerprint FROM library_copies LIMIT 0"))
    return HealthResponse()


@router.get(
    "/books/lookup/{isbn}",
    response_model=LookupResponse,
    tags=["books"],
    responses={code: {"model": ErrorResponse} for code in (404, 422, 502, 503, 504)},
)
async def lookup_book(
    isbn: str = Path(min_length=1, max_length=32),
    service: LookupService = Depends(get_lookup_service),
) -> LookupResponse:
    return await service.lookup(isbn)
