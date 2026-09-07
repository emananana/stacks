import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from pwdlib import PasswordHash
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.errors import AppError
from app.models.accounts import AuthSession, User
from app.schemas.auth import Credentials, SessionResponse, UserResponse

passwords = PasswordHash.recommended()
dummy_hash = passwords.hash("dummy-password-never-used-for-login")


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class AuthService:
    def __init__(self, session: AsyncSession, lifetime_days: int = 7):
        self.session = session
        self.lifetime_days = lifetime_days

    async def register(self, credentials: Credentials) -> SessionResponse:
        hashed = await run_in_threadpool(passwords.hash, credentials.password.get_secret_value())
        user = User(email=str(credentials.email), password_hash=hashed)
        self.session.add(user)
        try:
            await self.session.flush()
            result = await self.issue_session(user)
            await self.session.commit()
            return result
        except IntegrityError as exc:
            await self.session.rollback()
            raise AppError(
                "account_exists", "An account with this email already exists. Sign in instead.", 409
            ) from exc

    async def login(self, credentials: Credentials) -> SessionResponse:
        user = await self.session.scalar(select(User).where(User.email == str(credentials.email)))
        valid = await run_in_threadpool(
            passwords.verify,
            credentials.password.get_secret_value(),
            user.password_hash if user and user.password_hash else dummy_hash,
        )
        if not valid or not user or not user.password_hash:
            raise AppError("invalid_credentials", "Email or password is incorrect.", 401)
        result = await self.issue_session(user)
        await self.session.commit()
        return result

    async def issue_session(self, user: User) -> SessionResponse:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=self.lifetime_days)
        await self.session.execute(
            delete(AuthSession).where(
                AuthSession.user_id == user.id, AuthSession.expires_at <= datetime.now(timezone.utc)
            )
        )
        self.session.add(
            AuthSession(token_hash=token_digest(token), user_id=user.id, expires_at=expires_at)
        )
        return SessionResponse(
            access_token=token, expires_at=expires_at, user=UserResponse.model_validate(user)
        )

    async def authenticate(self, token: str) -> UserResponse:
        if not 20 <= len(token) <= 256:
            raise AppError("unauthorized", "Please sign in again.", 401)
        user = await self.session.scalar(
            select(User)
            .join(AuthSession, AuthSession.user_id == User.id)
            .where(
                AuthSession.token_hash == token_digest(token),
                AuthSession.expires_at > datetime.now(timezone.utc),
                User.password_hash.is_not(None),
            )
        )
        if not user:
            raise AppError("unauthorized", "Your session has expired. Please sign in again.", 401)
        return UserResponse.model_validate(user)

    async def logout(self, token: str) -> None:
        await self.session.execute(
            delete(AuthSession).where(AuthSession.token_hash == token_digest(token))
        )
        await self.session.commit()
