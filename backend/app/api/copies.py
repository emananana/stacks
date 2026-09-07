from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from app.api.dependencies import get_copy_service
from app.schemas.books import ErrorResponse
from app.schemas.copies import CopyDetails, CreateCopyRequest, LibraryCopyResponse, LibraryResponse
from app.services.copies import CopyService

router = APIRouter(prefix="/library/copies", tags=["library"])


@router.get("", response_model=LibraryResponse)
async def list_copies(
    query: str | None = Query(default=None, max_length=120),
    status: str | None = Query(default=None, pattern="^(unread|reading|read)$"),
    sort: str = Query(default="recent", pattern="^(recent|title|author|rating)$"),
    service: CopyService = Depends(get_copy_service),
) -> LibraryResponse:
    return await service.list(query, status, sort)


@router.post(
    "",
    status_code=201,
    response_model=LibraryCopyResponse,
    responses={
        200: {"model": LibraryCopyResponse, "description": "Replay of an already saved operation"},
        **{code: {"model": ErrorResponse} for code in (404, 409, 422, 503)},
    },
)
async def create_copy(
    request: CreateCopyRequest, response: Response, service: CopyService = Depends(get_copy_service)
) -> LibraryCopyResponse:
    result = await service.create(request)
    response.status_code = 201 if result.created else 200
    response.headers["Location"] = f"/library/copies/{result.copy.id}"
    return result.copy


@router.get(
    "/{copy_id}",
    response_model=LibraryCopyResponse,
    responses={code: {"model": ErrorResponse} for code in (404, 422, 503)},
)
async def get_copy(
    copy_id: UUID, service: CopyService = Depends(get_copy_service)
) -> LibraryCopyResponse:
    return await service.get(copy_id)


@router.patch(
    "/{copy_id}",
    response_model=LibraryCopyResponse,
    responses={code: {"model": ErrorResponse} for code in (404, 422, 503)},
)
async def update_copy(
    copy_id: UUID, request: CopyDetails, service: CopyService = Depends(get_copy_service)
) -> LibraryCopyResponse:
    return await service.update(copy_id, request)


@router.delete(
    "/{copy_id}",
    status_code=204,
    responses={code: {"model": ErrorResponse} for code in (404, 422, 503)},
)
async def delete_copy(copy_id: UUID, service: CopyService = Depends(get_copy_service)) -> Response:
    await service.delete(copy_id)
    return Response(status_code=204)
