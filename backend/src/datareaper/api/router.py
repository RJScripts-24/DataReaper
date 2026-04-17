from __future__ import annotations

from fastapi import APIRouter

from datareaper.api.routes import (
    dashboard,
    events,
    health,
    inbox,
    onboarding,
    recon,
    reports,
    scans,
    targets,
    war_room,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
api_router.include_router(scans.router, prefix="/scans", tags=["scans"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(recon.router, prefix="/recon", tags=["recon"])
api_router.include_router(targets.router, prefix="/targets", tags=["targets"])
api_router.include_router(war_room.router, prefix="/war-room", tags=["war-room"])
api_router.include_router(inbox.router, prefix="/inbox", tags=["inbox"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
