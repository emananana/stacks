from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://stacks:stacks@localhost:5432/stacks"
    cors_origins: list[str] = ["http://localhost:8081", "http://127.0.0.1:8081"]
    open_library_base_url: str = "https://openlibrary.org"
    open_library_user_agent: str = "Stacks/0.1 (local development)"
    metadata_timeout_seconds: float = Field(default=8, gt=0, le=30)
    session_lifetime_days: int = Field(default=7, ge=1, le=30)

    @field_validator("database_url")
    @classmethod
    def require_postgres(cls, value: str) -> str:
        if not value.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL must use postgresql+psycopg://")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
