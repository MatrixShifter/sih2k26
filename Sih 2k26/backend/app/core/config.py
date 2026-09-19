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

    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    upload_dir: str = "./uploads"
    max_upload_mb: int = 15

    @field_validator("cors_origins")
    @classmethod
    def _strip_origins(cls, value: str) -> str:
        return value.strip()

    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
