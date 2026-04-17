from __future__ import annotations

from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from datareaper.core.config import get_settings

settings = get_settings()
try:
    engine = create_async_engine(settings.database_url, echo=settings.app_debug, future=True)
    SessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
except Exception:  # pragma: no cover - local fallback when DB driver is not installed
    engine = None
    SessionLocal = None


async def get_db_session() -> AsyncIterator[AsyncSession]:
    if SessionLocal is None:
        yield None  # type: ignore[misc]
        return
    async with SessionLocal() as session:
        yield session
