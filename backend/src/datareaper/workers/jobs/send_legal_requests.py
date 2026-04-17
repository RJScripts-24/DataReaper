from __future__ import annotations

from functools import lru_cache

from sqlalchemy import select

from datareaper.brokers.catalog import load_broker_catalog
from datareaper.comms.outbound_dispatcher import dispatch_notice
from datareaper.db.models.broker_case import BrokerCase
from datareaper.db.models.scan_job import ScanJob
from datareaper.db.models.seed import Seed
from datareaper.db.session import SessionLocal
from datareaper.legal.notice_builder import build_notice, build_notice_with_llm
from datareaper.realtime.publishers import publish


@lru_cache(maxsize=1)
def _broker_email_map() -> dict[str, str]:
    catalog = load_broker_catalog().get("brokers", [])
    return {
        str(item["name"]): str(item["opt_out_email"])
        for item in catalog
        if isinstance(item, dict) and item.get("name") and item.get("opt_out_email")
    }


def _get_opt_out_email(broker_name: str) -> str:
    mapping = _broker_email_map()
    if broker_name in mapping:
        return mapping[broker_name]
    safe = broker_name.lower().replace(" ", "").replace(".", "")
    return f"privacy@{safe}.com"


async def send_legal_requests(ctx: dict, scan_id: str) -> dict:
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
        return {"scan_id": scan_id, "status": "missing_scan"}

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
        recipient = _get_opt_out_email(case.broker_name)
        identity = {"name": None, "location": None}
        if llm is not None:
            notice = await build_notice_with_llm(
                case.jurisdiction,
                seed_value,
                identity,
                case.broker_name,
                llm,
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
    return {"scan_id": scan_id, "status": "ok", "notices_sent": sent}


def run(scan_id: str) -> dict:
    return {"job": "send_legal_requests", "scan_id": scan_id, "status": "queued"}
