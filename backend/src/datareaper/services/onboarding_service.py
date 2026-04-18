from __future__ import annotations

from time import perf_counter

from sqlalchemy.ext.asyncio import AsyncSession

from datareaper.core.config import get_settings
from datareaper.core.ids import new_id
from datareaper.db.repositories.scan_repo import ScanRepository
from datareaper.intake.normalizers import normalize_seed
from datareaper.intake.validators import infer_seed_type, validate_seed
from datareaper.orchestrator.supervisor import Supervisor
from datareaper.core.logging import get_logger


logger = get_logger(__name__)


def _mask_seed(seed: str) -> str:
    value = seed.strip()
    if not value:
        return value

    if "@" in value:
        local, _, domain = value.partition("@")
        if not local:
            return f"***@{domain}"
        return f"{local[0]}***@{domain}"

    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) >= 4:
        return f"***{digits[-4:]}"

    return "***"


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
        started = perf_counter()
        logger.info(
            "onboarding_initialize_started",
            seeds_count=len(seeds),
            seed_type=seed_type,
            jurisdiction=jurisdiction,
        )

        if session is None:
            logger.error("onboarding_initialize_missing_db_session")
            raise RuntimeError("Database session unavailable")

        cleaned = [str(seed).strip() for seed in seeds if str(seed).strip()]
        if not cleaned:
            raise ValueError("At least one seed is required")

        logger.info(
            "onboarding_initialize_seeds_cleaned",
            cleaned_count=len(cleaned),
            masked_preview=[_mask_seed(seed) for seed in cleaned[:3]],
        )

        normalized_started = perf_counter()
        normalized_seeds = [normalize_seed(seed, seed_type) for seed in cleaned]
        normalized_seed = normalized_seeds[0]
        resolved_seed_type = infer_seed_type(normalized_seed) if seed_type == "auto" else seed_type
        validate_seed(normalized_seed, resolved_seed_type)

        for value in normalized_seeds[1:]:
            resolved_secondary_type = infer_seed_type(value) if seed_type == "auto" else seed_type
            validate_seed(value, resolved_secondary_type)

        logger.info(
            "onboarding_initialize_seeds_validated",
            normalized_count=len(normalized_seeds),
            resolved_seed_type=resolved_seed_type,
            duration_ms=round((perf_counter() - normalized_started) * 1000, 2),
        )

        bundle_started = perf_counter()
        scan_id = new_id("scan")
        bundle = self.supervisor.build_scan_bundle(scan_id, normalized_seed, resolved_seed_type, jurisdiction)
        bundle["scan"]["all_seeds"] = normalized_seeds
        logger.info(
            "onboarding_initialize_bundle_built",
            scan_id=scan_id,
            duration_ms=round((perf_counter() - bundle_started) * 1000, 2),
        )

        persistence_started = perf_counter()
        try:
            await self.scan_repo.create_scan_bundle(session, bundle)
        except Exception as exc:
            logger.exception(
                "onboarding_initialize_persist_failed",
                scan_id=scan_id,
                duration_ms=round((perf_counter() - persistence_started) * 1000, 2),
                error=str(exc),
            )
            raise

        logger.info(
            "onboarding_initialize_persist_succeeded",
            scan_id=scan_id,
            duration_ms=round((perf_counter() - persistence_started) * 1000, 2),
        )

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
            queue_started = perf_counter()
            job_id = await _enqueue_osint_pipeline(scan_id)
            if job_id:
                boot_log.append(f"Pipeline queued successfully (job: {job_id}).")
            else:
                boot_log.append("Pipeline queue unavailable. Check worker/Redis logs.")
            logger.info(
                "onboarding_initialize_queue_step_finished",
                scan_id=scan_id,
                job_id=job_id,
                duration_ms=round((perf_counter() - queue_started) * 1000, 2),
            )

        logger.info(
            "onboarding_initialize_completed",
            scan_id=scan_id,
            duration_ms=round((perf_counter() - started) * 1000, 2),
        )

        return {
            "scan_id": scan_id,
            "normalized_seed": normalized_seed,
            "status": "initializing",
            "boot_log": boot_log,
        }
