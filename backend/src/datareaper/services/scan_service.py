from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from datareaper.db.repositories.scan_repo import ScanRepository


class ScanService:
    def __init__(self) -> None:
        self.scan_repo = ScanRepository()

    async def get_status(self, session: AsyncSession | None, scan_id: str) -> dict:
        return await self.scan_repo.get_scan(session, scan_id)
