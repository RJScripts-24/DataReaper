from __future__ import annotations

from functools import lru_cache
from urllib.parse import urlparse

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import select

from datareaper.brokers.catalog import load_broker_catalog
from datareaper.comms.outbound_dispatcher import dispatch_notice
from datareaper.core.exceptions import LLMProviderError
from datareaper.core.ids import new_id
from datareaper.core.logging import get_logger
from datareaper.db.models.activity_event import ActivityEvent
from datareaper.db.models.broker_case import BrokerCase
from datareaper.db.models.scan_job import ScanJob
from datareaper.db.models.seed import Seed
from datareaper.db.repositories.scan_repo import is_terminal_scan_status
from datareaper.db.session import SessionLocal
from datareaper.legal.notice_builder import build_notice, build_notice_with_llm
from datareaper.realtime.publishers import publish


logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _broker_email_map() -> dict[str, str]:
    catalog = load_broker_catalog().get("brokers", [])
    return {
        str(item["name"]): str(item["opt_out_email"])
        for item in catalog
        if isinstance(item, dict) and item.get("name") and item.get("opt_out_email")
    }


@lru_cache(maxsize=1)
def _broker_catalog_by_name() -> dict[str, dict]:
    catalog = load_broker_catalog().get("brokers", [])
    return {
        str(item["name"]): item
        for item in catalog
        if isinstance(item, dict) and item.get("name")
    }


def _broker_domains(broker_name: str) -> set[str]:
    broker = _broker_catalog_by_name().get(broker_name) or {}
    domains: set[str] = set()
    for field in ("search_url", "opt_out_url"):
        raw = str(broker.get(field) or "").strip()
        if not raw:
            continue
        host = urlparse(raw).netloc.lower().strip()
        if host.startswith("www."):
            host = host[4:]
        if host:
            domains.add(host)
    return domains


def _recipient_is_broker_aligned(recipient_domain: str, broker_name: str) -> bool:
    broker_domains = _broker_domains(broker_name)
    if not broker_domains:
        return True
    lowered = recipient_domain.lower().strip()
    return any(lowered == domain or lowered.endswith(f".{domain}") for domain in broker_domains)


def _resolve_dispatch_recipient(broker_name: str) -> tuple[str, str | None]:
    recipient = _get_opt_out_email(broker_name).strip().lower()
    if not recipient:
        return "", "missing_contact"

    try:
        normalized = validate_email(recipient, check_deliverability=True)
    except EmailNotValidError as exc:
        return "", f"invalid_email:{exc}"

    if not _recipient_is_broker_aligned(normalized.domain, broker_name):
        return "", "domain_mismatch"

    local_part = normalized.local_part.lower()
    if local_part in {"noreply", "no-reply", "donotreply", "do-not-reply"}:
        return "", "non_reply_mailbox"

    return normalized.email, None


def _get_opt_out_email(broker_name: str) -> str:
    mapping = _broker_email_map()
    return mapping.get(broker_name, "")


async def send_legal_requests(ctx: dict, scan_id: str) -> dict:
    logger.info("send_legal_requests_started", scan_id=scan_id)
    session = ctx.get("db_session")
    llm = ctx.get("llm")
    queue = ctx.get("queue")

    if session is None and SessionLocal is not None:
        async with SessionLocal() as managed_session:
            managed_ctx = {**ctx, "db_session": managed_session}
            return await send_legal_requests(managed_ctx, scan_id)

    if session is None:
        return {"scan_id": scan_id, "status": "skipped", "reason": "no_db_session"}

    scan = await session.get(ScanJob, scan_id)
    if scan is None:
        logger.warning("send_legal_requests_missing_scan", scan_id=scan_id)
        return {"scan_id": scan_id, "status": "missing_scan"}
    if is_terminal_scan_status(scan.status):
        logger.info("send_legal_requests_skipped_terminal", scan_id=scan_id, status=scan.status)
        return {"scan_id": scan_id, "status": "skipped_terminal", "scan_status": scan.status}

    seed = await session.get(Seed, scan.seed_id) if scan.seed_id else None
    seed_value = seed.normalized_value if seed is not None else ""

    cases_result = await session.execute(
        select(BrokerCase).where(
            BrokerCase.scan_job_id == scan_id,
            BrokerCase.status.in_(["discovered", "pending"]),
        )
    )
    cases = cases_result.scalars().all()

    sent = 0
    for case in cases:
        recipient, invalid_reason = _resolve_dispatch_recipient(case.broker_name)
        if not recipient:
            logger.warning(
                "send_legal_requests_invalid_opt_out_email",
                scan_id=scan_id,
                broker_name=case.broker_name,
                reason=invalid_reason,
            )
            session.add(
                ActivityEvent(
                    id=new_id("evt"),
                    scan_job_id=scan_id,
                    event_type="Legal",
                    message=f"Skipped legal dispatch for {case.broker_name}: invalid or unverified broker contact.",
                    payload={
                        "stage": "legal_dispatch",
                        "broker_name": case.broker_name,
                        "status": "skipped_invalid_contact",
                        "reason": invalid_reason,
                    },
                )
            )
            continue
        identity = {"name": None, "location": None}
        if llm is not None:
            try:
                notice = await build_notice_with_llm(
                    case.jurisdiction,
                    seed_value,
                    identity,
                    case.broker_name,
                    llm,
                )
            except LLMProviderError as exc:
                logger.warning(
                    "send_legal_requests_llm_fallback",
                    scan_id=scan_id,
                    broker_name=case.broker_name,
                    error=str(exc),
                )
                notice = build_notice(
                    case.jurisdiction,
                    seed_value,
                    identity,
                    case.broker_name,
                )
        else:
            notice = build_notice(
                case.jurisdiction,
                seed_value,
                identity,
                case.broker_name,
            )

        await dispatch_notice(
            session=session,
            broker_case_id=case.id,
            to_email=recipient,
            subject=f"Data Deletion Request - {case.broker_name}",
            body=notice,
        )
        sent += 1

    scan.current_stage = "inbox_monitoring"
    scan.progress = 90
    scan.status = "active"
    session.add(
        ActivityEvent(
            id=new_id("evt"),
            scan_job_id=scan_id,
            event_type="Legal",
            message=f"Legal dispatch completed. Notices sent={sent}.",
            payload={"stage": "legal_dispatch", "sent": sent},
        )
    )
    await session.commit()

    if queue is not None:
        await queue.enqueue("sync_inbox", scan_id=scan_id)

    await publish(
        f"scan:{scan_id}",
        {
            "type": "stage_complete",
            "stage": "legal_dispatch",
            "scan_id": scan_id,
            "sent": sent,
        },
    )
    logger.info("send_legal_requests_completed", scan_id=scan_id, notices_sent=sent)
    return {"scan_id": scan_id, "status": "ok", "notices_sent": sent}


def run(scan_id: str) -> dict:
    return {"job": "send_legal_requests", "scan_id": scan_id, "status": "queued"}
