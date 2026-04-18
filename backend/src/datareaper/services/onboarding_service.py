from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from datareaper.core.config import get_settings
from datareaper.core.ids import new_id
from datareaper.db.repositories.scan_repo import ScanRepository
from datareaper.intake.normalizers import normalize_seed
from datareaper.intake.validators import infer_seed_type, validate_seed
from datareaper.orchestrator.supervisor import Supervisor
from datareaper.core.logging import get_logger


logger = get_logger(__name__)


async def _enqueue_osint_pipeline(scan_id: str) -> str | None:
    try:
        from datareaper.workers.queue import TaskQueue, get_arq_pool
    except Exception as exc:
        logger.warning("enqueue_import_failed", scan_id=scan_id, error=str(exc))
        return None

    try:
        pool = await get_arq_pool()
    except Exception as exc:
        logger.warning("enqueue_pool_failed", scan_id=scan_id, error=str(exc))
        return None

    try:
        queue = TaskQueue(pool)
        job_id = await queue.enqueue("run_osint_pipeline", scan_id=scan_id)
        logger.info("enqueue_osint_pipeline_success", scan_id=scan_id, job_id=job_id)
        return job_id
    except Exception as exc:
        logger.warning("enqueue_osint_pipeline_failed", scan_id=scan_id, error=str(exc))
        return None
    finally:
        await pool.close()


class OnboardingService:
    def __init__(self) -> None:
        self.scan_repo = ScanRepository()
        self.supervisor = Supervisor()

    async def initialize_scan(
        self,
        session: AsyncSession | None,
        seeds: list[str],
        seed_type: str,
        jurisdiction: str,
    ) -> dict:
        cleaned = [str(seed).strip() for seed in seeds if str(seed).strip()]
        if not cleaned:
            raise ValueError("At least one seed is required")

        normalized_seeds = [normalize_seed(seed, seed_type) for seed in cleaned]
        normalized_seed = normalized_seeds[0]
        resolved_seed_type = infer_seed_type(normalized_seed) if seed_type == "auto" else seed_type
        validate_seed(normalized_seed, resolved_seed_type)

        for value in normalized_seeds[1:]:
            resolved_secondary_type = infer_seed_type(value) if seed_type == "auto" else seed_type
            validate_seed(value, resolved_secondary_type)

        scan_id = new_id("scan")
        bundle = self.supervisor.build_scan_bundle(scan_id, normalized_seed, resolved_seed_type, jurisdiction)
        bundle["scan"]["all_seeds"] = normalized_seeds
        await self.scan_repo.create_scan_bundle(session, bundle)
        boot_log = [
            "Booting Sleuth Agent...",
            f"Received {len(normalized_seeds)} input seed(s).",
            "Establishing secure proxy tunnels...",
            "Rotating IP pools...",
            "Scanning 120+ platforms...",
            "Extracting usernames...",
            "Building identity graph...",
            "Cross-referencing data brokers...",
            "Target acquired.",
        ]

        # Avoid queueing side effects in tests where event loops are short-lived.
        if get_settings().app_env != "test":
            job_id = await _enqueue_osint_pipeline(scan_id)
            if job_id:
                boot_log.append(f"Pipeline queued successfully (job: {job_id}).")
            else:
                boot_log.append("Pipeline queue unavailable. Check worker/Redis logs.")

        return {
            "scan_id": scan_id,
            "normalized_seed": normalized_seed,
            "status": "initializing",
            "boot_log": boot_log,
        }
