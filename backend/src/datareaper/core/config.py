from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "DataReaper Backend"
    app_env: Literal["development", "test", "production"] = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    app_debug: bool = True
    app_log_level: str = "INFO"
    app_cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])
    app_secret_key: str = "change-me"
    app_enable_demo_mode: bool = True
    app_auto_create_tables: bool = False
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost/datareaper"
    sync_database_url: str = "postgresql+psycopg://postgres:postgres@localhost/datareaper"
    redis_url: str = "redis://localhost:6379/0"
    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    groq_api_key: str = ""
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_refresh_token: str = ""
    gmail_sender_email: str = ""
    playwright_headless: bool = True
    local_storage_path: str = "./storage"

    @property
    def project_root(self) -> Path:
        return Path(__file__).resolve().parents[3]

    @property
    def data_dir(self) -> Path:
        return self.project_root / "data"


@lru_cache
def get_settings() -> Settings:
    return Settings()
