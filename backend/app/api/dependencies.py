from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import current_user
from app.repositories.books import PostgresEditionRepository
from app.schemas.auth import UserResponse
from app.services.lookup import LookupService
from app.services.providers.open_library import OpenLibraryProvider


async def get_session(request: Request):
    async with request.app.state.sessions() as session:
        yield session


def get_lookup_service(
    request: Request, session: AsyncSession = Depends(get_session)
) -> LookupService:
    return LookupService(
        PostgresEditionRepository(session), [OpenLibraryProvider(request.app.state.http)]
    )


def get_copy_service(
    user: UserResponse = Depends(current_user), session: AsyncSession = Depends(get_session)
):
    from app.repositories.copies import CopyRepository
    from app.services.copies import CopyService

    return CopyService(CopyRepository(session, user.id))
