"""Application settings loaded from environment variables."""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ComplyGeM AI"
    app_env: str = "development"
    secret_key: str = "change-me-to-a-long-random-secret"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    database_url: str = "sqlite:///./complygem.db"

    cors_origins: str = "http://localhost:5173,http://localhost:8080,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:8080,https://complygem-frontend.vercel.app"
    frontend_url: str = ""

    upload_dir: str = "./uploads"
    max_upload_mb: int = 15

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_db_url(cls, value: str | None) -> str:
        if not value:
            return "sqlite:///./complygem.db"
        val = str(value).strip().strip('"').strip("'")
        if "pgbouncer=true" in val:
            val = val.replace("?pgbouncer=true&", "?")
            val = val.replace("&pgbouncer=true", "")
            val = val.replace("?pgbouncer=true", "")
        if val.startswith("postgres://"):
            val = val.replace("postgres://", "postgresql+psycopg://", 1)
        elif val.startswith("postgresql://") and not val.startswith("postgresql+psycopg://"):
            val = val.replace("postgresql://", "postgresql+psycopg://", 1)
        return val

    @field_validator("cors_origins")
    @classmethod
    def _strip_origins(cls, value: str) -> str:
        return value.strip()

    def cors_origin_list(self) -> List[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        if self.frontend_url and self.frontend_url.strip():
            f_url = self.frontend_url.strip().rstrip("/")
            if f_url not in origins:
                origins.append(f_url)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()

