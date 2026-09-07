from collections import OrderedDict
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.copies import router as copies_router
from app.api.routes import router
from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.db.session import create_database


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine, sessions = create_database(settings)
        app.state.sessions = sessions
        try:
            async with httpx.AsyncClient(
                base_url=settings.open_library_base_url,
                timeout=httpx.Timeout(settings.metadata_timeout_seconds),
                headers={"User-Agent": settings.open_library_user_agent},
                follow_redirects=True,
            ) as client:
                app.state.http = client
                yield
        finally:
            await engine.dispose()

    app = FastAPI(title="Stacks API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.auth_attempts = OrderedDict()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )
    register_error_handlers(app)
    app.include_router(router)
    app.include_router(copies_router)
    app.include_router(auth_router)
    return app


app = create_app()
