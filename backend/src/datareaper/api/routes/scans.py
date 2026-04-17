from __future__ import annotations

from fastapi import APIRouter, Depends

from datareaper.api.deps import DbSession, get_scan_service
from datareaper.schemas.scan import ScanStatusResponse
from datareaper.services.scan_service import ScanService

router = APIRouter()


@router.get("/{scan_id}", response_model=ScanStatusResponse)
async def get_scan(
    scan_id: str, db: DbSession, service: ScanService = Depends(get_scan_service)
) -> dict:
    return await service.get_status(db, scan_id)
