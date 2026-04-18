from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from datareaper.db.repositories.scan_repo import ScanRepository
from datareaper.realtime.publishers import publish


class ScanService:
    def __init__(self) -> None:
        self.scan_repo = ScanRepository()

    async def get_status(self, session: AsyncSession | None, scan_id: str) -> dict:
        return await self.scan_repo.get_scan(session, scan_id)

    async def stop_scan(self, session: AsyncSession | None, scan_id: str, reason: str | None = None) -> dict:
        stopped = await self.scan_repo.stop_scan(session, scan_id, reason=reason)
        await publish(
            f"scan:{scan_id}",
            {
                "type": "scan_stopped",
                "scan_id": scan_id,
                "status": stopped.get("status", "cancelled"),
                "current_stage": stopped.get("current_stage", "stopped_by_user"),
                "reason": reason or "manual",
            },
        )
        return stopped
