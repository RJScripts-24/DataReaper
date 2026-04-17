from __future__ import annotations

from urllib.parse import urlparse

from datareaper.core.ids import new_id
from datareaper.db.models.activity_event import ActivityEvent
from datareaper.db.models.discovered_account import DiscoveredAccount
from datareaper.db.models.graph_edge import GraphEdge
from datareaper.db.models.graph_node import GraphNode
from datareaper.db.models.identity_profile import IdentityProfile
from datareaper.db.models.scan_job import ScanJob
from datareaper.db.models.seed import Seed
from datareaper.db.session import SessionLocal
from datareaper.osint.pipeline import run_osint_loop
from datareaper.realtime.publishers import publish


def _platform_from_url(url: str) -> str:
    host = urlparse(url).netloc.lower().split(":", 1)[0]
    if host.startswith("www."):
        host = host[4:]
    return host.split(".", 1)[0] if host else "unknown"


def _username_from_url(url: str) -> str:
    parts = [part for part in urlparse(url).path.split("/") if part]
    return parts[-1] if parts else ""


def _normalize_confidence(raw: object) -> int:
    if isinstance(raw, (int, float)):
        value = float(raw)
        if value <= 1.0:
            value *= 100.0
        return max(0, min(int(round(value)), 100))
    return 85


async def run_osint_pipeline(ctx: dict, scan_id: str) -> dict:
    session = ctx.get("db_session")
    llm = ctx.get("llm")
    browser = ctx.get("browser")
    queue = ctx.get("queue")

    if session is None and SessionLocal is not None:
        async with SessionLocal() as managed_session:
            managed_ctx = {**ctx, "db_session": managed_session}
            return await run_osint_pipeline(managed_ctx, scan_id)

    if session is None:
        return {"scan_id": scan_id, "status": "skipped", "reason": "no_db_session"}

    scan = await session.get(ScanJob, scan_id)
    if scan is None:
        return {"scan_id": scan_id, "status": "missing_scan"}
    seed = await session.get(Seed, scan.seed_id) if scan.seed_id else None
    seed_value = seed.normalized_value if seed else ""

    pipeline = await run_osint_loop([seed_value], max_depth=2, llm=llm, browser=browser)
    accounts = list(pipeline.get("accounts") or [])
    profiles = list(pipeline.get("profiles") or [])
    identity = dict(pipeline.get("identity") or {"real_name": None, "location": None})
    graph = dict(pipeline.get("graph") or {"nodes": [], "edges": []})
    boot_log = [str(line) for line in (pipeline.get("boot_log") or []) if str(line).strip()]
    real_name = (
        identity.get("real_name")
        or identity.get("name")
        or f"Unknown Target ({seed_value})"
    )

    profile_id = new_id("profile")
    session.add(
        IdentityProfile(
            id=profile_id,
            scan_job_id=scan_id,
            name=real_name,
            location=identity.get("location") or "Unknown Location",
            summary=identity,
        )
    )
    for row in accounts:
        profile_url = str(row.get("url") or "")
        session.add(
            DiscoveredAccount(
                id=new_id("acct"),
                scan_job_id=scan_id,
                profile_id=profile_id,
                platform=str(row.get("platform") or _platform_from_url(profile_url)),
                username=str(row.get("username") or _username_from_url(profile_url)),
                profile_url=profile_url,
                confidence=_normalize_confidence(row.get("confidence", 0.85)),
            )
        )

    for line in boot_log:
        session.add(
            ActivityEvent(
                id=new_id("evt"),
                scan_job_id=scan_id,
                event_type="boot_log",
                message=line,
                payload={"stage": "osint_recursive"},
            )
        )

    for node in graph.get("nodes", []):
        session.add(
            GraphNode(
                id=new_id("node"),
                scan_job_id=scan_id,
                node_key=node.get("id"),
                node_type=node.get("type"),
                label=node.get("label"),
                pos_x=node.get("x", 0),
                pos_y=node.get("y", 0),
                payload=node.get("data", {}),
            )
        )
    for edge in graph.get("edges", []):
        session.add(
            GraphEdge(
                id=new_id("edge"),
                scan_job_id=scan_id,
                source_node_key=edge.get("source"),
                target_node_key=edge.get("target"),
                relationship=edge.get("relationship"),
            )
        )

    scan.current_stage = "broker_discovery"
    scan.progress = max(scan.progress or 0, 60)
    await session.commit()

    if queue is not None:
        await queue.enqueue("discover_targets", scan_id=scan_id)
    await publish(
        f"scan:{scan_id}",
        {
            "type": "stage_complete",
            "stage": "osint",
            "scan_id": scan_id,
            "accounts": len(accounts),
            "profiles": len(profiles),
            "boot_log_entries": len(boot_log),
        },
    )
    return {
        "scan_id": scan_id,
        "status": "ok",
        "accounts": len(accounts),
        "profiles": len(profiles),
        "boot_log": boot_log,
    }


def run(scan_id: str) -> dict:
    return {"job": "run_osint_pipeline", "scan_id": scan_id, "status": "queued"}
