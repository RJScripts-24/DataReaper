from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from datareaper.core.ids import new_id
from datareaper.db.repositories.scan_repo import ScanRepository
from datareaper.intake.normalizers import normalize_seed
from datareaper.intake.validators import infer_seed_type, validate_seed
from datareaper.orchestrator.supervisor import Supervisor


class OnboardingService:
    def __init__(self) -> None:
        self.scan_repo = ScanRepository()
        self.supervisor = Supervisor()

    async def initialize_scan(
        self,
        session: AsyncSession | None,
        seed: str,
        seed_type: str,
        jurisdiction: str,
    ) -> dict:
        normalized_seed = normalize_seed(seed, seed_type)
        resolved_seed_type = infer_seed_type(normalized_seed) if seed_type == "auto" else seed_type
        validate_seed(normalized_seed, resolved_seed_type)
        scan_id = new_id("scan")
        bundle = self.supervisor.build_scan_bundle(scan_id, normalized_seed, resolved_seed_type, jurisdiction)
        await self.scan_repo.create_scan_bundle(session, bundle)
        return {
            "scan_id": scan_id,
            "normalized_seed": normalized_seed,
            "status": "initializing",
            "boot_log": [
                "Booting Sleuth Agent...",
                "Establishing secure proxy tunnels...",
                "Rotating IP pools...",
                "Scanning 120+ platforms...",
                "Extracting usernames...",
                "Building identity graph...",
                "Cross-referencing data brokers...",
                "Target acquired.",
            ],
        }
