"""Application configuration sourced entirely from environment variables (12-factor)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres connection. Provided by docker-compose / the cloud platform.
    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/order_management"

    # Comma-separated list of allowed CORS origins (the frontend URL(s)).
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Default page size for list endpoints.
    default_page_limit: int = 100

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
