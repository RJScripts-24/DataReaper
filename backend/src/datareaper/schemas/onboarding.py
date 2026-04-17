from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class OnboardingInitializeRequest(BaseModel):
    seed: str = Field(min_length=3, max_length=320)
    seed_type: Literal["email", "phone", "auto"] = "auto"
    jurisdiction: str = "DPDP"
    consent_confirmed: bool = True


class OnboardingInitializeResponse(BaseModel):
    scan_id: str
    normalized_seed: str
    status: str
    boot_log: list[str]
