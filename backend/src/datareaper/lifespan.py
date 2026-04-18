from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine

from datareaper.core.config import get_settings
from datareaper.core.logging import configure_logging
from datareaper.db import models as _models  # noqa: F401
from datareaper.db.base import Base
from datareaper.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.app_log_level, settings.app_log_format)
    if settings.app_auto_create_tables and engine is not None:
        await _create_tables(engine)
    yield


async def _create_tables(db_engine: AsyncEngine) -> None:
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
