from __future__ import annotations

from fastapi import APIRouter, Depends

from datareaper.api.deps import DbSession, get_onboarding_service
from datareaper.intake.consent_guard import enforce_consent
from datareaper.schemas.onboarding import OnboardingInitializeRequest, OnboardingInitializeResponse
from datareaper.services.onboarding_service import OnboardingService

router = APIRouter()


@router.post("/initialize", response_model=OnboardingInitializeResponse)
async def initialize(
    payload: OnboardingInitializeRequest,
    db: DbSession,
    service: OnboardingService = Depends(get_onboarding_service),
) -> dict:
    enforce_consent(payload.consent_confirmed)
    return await service.initialize_scan(db, payload.seed, payload.seed_type, payload.jurisdiction)
