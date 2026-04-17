from __future__ import annotations

from sqlalchemy import select

from datareaper.brokers.discovery import discover_brokers, discover_brokers_async
from datareaper.core.ids import new_id
from datareaper.db.models.broker_case import BrokerCase
from datareaper.db.models.identity_profile import IdentityProfile
from datareaper.db.models.scan_job import ScanJob
from datareaper.db.session import SessionLocal
from datareaper.realtime.publishers import publish


async def discover_targets(ctx: dict, scan_id: str) -> dict:
    session = ctx.get("db_session")
    browser = ctx.get("browser")
    queue = ctx.get("queue")

    if session is None and SessionLocal is not None:
        async with SessionLocal() as managed_session:
            managed_ctx = {**ctx, "db_session": managed_session}
            return await discover_targets(managed_ctx, scan_id)

    if session is None:
        return {"scan_id": scan_id, "status": "skipped", "reason": "no_db_session"}

    scan = await session.get(ScanJob, scan_id)
    if scan is None:
        return {"scan_id": scan_id, "status": "missing_scan"}

    profile_result = await session.execute(
        select(IdentityProfile).where(IdentityProfile.scan_job_id == scan_id)
    )
    profile = profile_result.scalars().first()
    if profile is None:
        return {"scan_id": scan_id, "status": "skipped", "reason": "no_identity"}

    identity = {
        "name": profile.name,
        "real_name": profile.name,
        "location": profile.location,
    }

    if browser is not None:
        broker_rows = await discover_brokers_async(identity, browser)
    else:
        broker_rows = [{"broker_name": name} for name in discover_brokers(identity)]

    existing_result = await session.execute(
        select(BrokerCase).where(BrokerCase.scan_job_id == scan_id)
    )
    existing_names = {case.broker_name for case in existing_result.scalars().all()}

    created = 0
    jurisdiction = scan.jurisdiction or "DPDP"
    for broker in broker_rows:
        broker_name = str(broker.get("broker_name") or "Unknown")
        if broker_name in existing_names:
            continue
        case = BrokerCase(
            id=new_id("case"),
            scan_job_id=scan_id,
            broker_name=broker_name,
            status="discovered",
            jurisdiction=jurisdiction,
            last_activity_label="Target discovered",
            data_types=[],
        )
        session.add(case)
        existing_names.add(broker_name)
        created += 1

    scan.current_stage = "legal_dispatch"
    scan.progress = 80
    await session.commit()

    if queue is not None:
        await queue.enqueue("send_legal_requests", scan_id=scan_id)

    await publish(
        f"scan:{scan_id}",
        {
            "type": "stage_complete",
            "stage": "broker_discovery",
            "scan_id": scan_id,
            "count": created,
        },
    )
    return {"scan_id": scan_id, "status": "ok", "brokers_found": created}


def run(scan_id: str) -> dict:
    return {"job": "discover_targets", "scan_id": scan_id, "status": "queued"}
