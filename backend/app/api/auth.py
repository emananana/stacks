from collections import OrderedDict
from time import monotonic

from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import AppError
from app.schemas.auth import Credentials, SessionResponse, UserResponse
from app.services.auth import AuthService

bearer = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["accounts"])


async def get_auth_service(request: Request):
    # A separate session avoids starting a transaction on the copy repository session.
    async with request.app.state.sessions() as session:
        yield AuthService(session, request.app.state.settings.session_lifetime_days)


def require_token(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if not credentials:
        raise AppError("unauthorized", "Sign in to view your library.", 401)
    return credentials.credentials


async def current_user(
    token: str = Depends(require_token), service: AuthService = Depends(get_auth_service)
) -> UserResponse:
    return await service.authenticate(token)


def limit_auth(request: Request):
    # Bounded per-process protection for this single-worker MVP. Proxy headers are not trusted.
    attempts: OrderedDict = request.app.state.auth_attempts
    key = request.client.host if request.client else "unknown"
    now = monotonic()
    recent = [stamp for stamp in attempts.pop(key, []) if now - stamp < 60]
    attempts[key] = recent
    if len(attempts) > 4096:
        attempts.popitem(last=False)
    if len(recent) >= 10:
        raise AppError(
            "rate_limited", "Too many sign-in attempts. Wait a minute and try again.", 429
        )
    recent.append(now)


@router.post(
    "/register", response_model=SessionResponse, status_code=201, dependencies=[Depends(limit_auth)]
)
async def register(
    body: Credentials, response: Response, service: AuthService = Depends(get_auth_service)
):
    response.headers["Cache-Control"] = "no-store"
    return await service.register(body)


@router.post("/login", response_model=SessionResponse, dependencies=[Depends(limit_auth)])
async def login(
    body: Credentials, response: Response, service: AuthService = Depends(get_auth_service)
):
    response.headers["Cache-Control"] = "no-store"
    return await service.login(body)


@router.get("/me", response_model=UserResponse)
async def me(user: UserResponse = Depends(current_user)):
    return user


@router.post("/logout", status_code=204)
async def logout(
    token: str = Depends(require_token), service: AuthService = Depends(get_auth_service)
):
    await service.logout(token)
    return Response(status_code=204)
