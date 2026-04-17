"""Contract-aligned /v1 API endpoints consumed by the React frontend."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import secrets
from typing import Any, TypeVar

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from datareaper.api.deps import DbSession, get_onboarding_service
from datareaper.core.config import get_settings
from datareaper.core.exceptions import ResourceNotFoundError
from datareaper.db.in_memory import memory_store
from datareaper.db.models.broker_case import BrokerCase
from datareaper.db.repositories.dashboard_repo import DashboardRepository
from datareaper.db.repositories.scan_repo import ScanRepository
from datareaper.schemas.api_v1 import (
    ActivityLog,
    ActivityLogPage,
    AgentStatus,
    AgentStatusesResponse,
    ApiError,
    CreateMessageRequest,
    CreateScanRequest,
    CreateScanResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    DashboardStats,
    DashboardSummary,
    DashboardTrends,
    EngagementDetail,
    EngagementMessage,
    EngagementSummary,
    EscalateEngagementRequest,
    EscalateEngagementResponse,
    IdentityGraphEdge,
    IdentityGraphFilters,
    IdentityGraphNode,
    IdentityGraphPayload,
    MessageMetadata,
    MessagePage,
    PageInfo,
    PivotChain,
    PivotColumn,
    PivotEdge,
    PivotSummaryItem,
    RadarTarget,
    RadarTargetsResponse,
    RouteHints,
    Scan,
    SeedInput,
    ThreatBreakdownItem,
)
from datareaper.services.onboarding_service import OnboardingService

router = APIRouter()

_SCAN_REPO = ScanRepository()
_DASHBOARD_REPO = DashboardRepository()
_SESSION_TTL = timedelta(hours=8)
_SESSIONS: dict[str, datetime] = {}
_MANUAL_MESSAGES: dict[tuple[str, str], list[EngagementMessage]] = {}
T = TypeVar("T")


def _api_error(status_code: int, code: str, message: str, details: list[dict[str, Any]] | None = None) -> JSONResponse:
    payload = ApiError(code=code, message=message, details=details)
    return JSONResponse(status_code=status_code, content=payload.model_dump(mode="json", exclude_none=True))


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_datetime(value: str | None) -> datetime:
    if not value:
        return _now_utc()
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return _now_utc()


def _scan_status(internal_status: str | None, current_stage: str | None) -> str:
    status = (internal_status or "").strip().lower()
    stage = (current_stage or "").strip().lower()

    if status in {"completed", "resolved"}:
        return "completed"
    if status in {"failed", "error", "cancelled"}:
        return "failed"
    if status in {"queued"}:
        return "queued"
    if status in {"discovering", "identifying", "engaging", "stabilizing"}:
        return status

    if "discover" in stage or "osint" in stage:
        return "discovering"
    if "identity" in stage or "graph" in stage:
        return "identifying"
    if "engage" in stage or "legal" in stage or "publish" in stage:
        return "engaging"

    return "discovering"


def _threat_type_from_target(target: dict[str, Any], index: int) -> str:
    data_types = [str(item).lower() for item in target.get("dataTypes", [])]
    if any("email" in item for item in data_types):
        return "email"
    if any("phone" in item for item in data_types):
        return "phone"
    if any("location" in item or "address" in item for item in data_types):
        return "location"
    return ["email", "phone", "location"][index % 3]


def _radar_status_from_engagement(status: str) -> str:
    normalized = status.lower()
    if normalized == "resolved":
        return "Identified"
    if normalized == "illegal":
        return "Deletion in progress"
    return "Scanning"


def _activity_color(activity_type: str) -> str:
    return {
        "System": "#a0a0a0",
        "Scan": "#4f7d5c",
        "Match": "#4f7d5c",
        "Legal": "#b94a48",
        "Comm": "#d17a22",
    }.get(activity_type, "#4a6fa5")


def _agent_mode(name: str) -> str:
    lowered = name.lower()
    if "sleuth" in lowered:
        return "SLEUTH"
    if "legal" in lowered:
        return "LEGAL"
    if "comm" in lowered:
        return "COMMS"
    return "DELETION"


def _parse_cursor(cursor: str | None) -> int:
    if not cursor:
        return 0
    value = int(cursor)
    return max(0, value)


def _paginate(items: list[T], cursor: str | None, limit: int) -> tuple[list[T], PageInfo]:
    offset = _parse_cursor(cursor)
    page_items = items[offset : offset + limit]
    next_offset = offset + limit
    has_more = next_offset < len(items)
    return page_items, PageInfo(nextCursor=str(next_offset) if has_more else None, hasMore=has_more)


def _trend_from_value(value: int) -> list[int]:
    base = max(0, int(value))
    if base == 0:
        return [0] * 8
    step = max(1, base // 8)
    trend = [max(0, base - step * (7 - idx)) for idx in range(8)]
    trend[-1] = base
    return trend


def _message_metadata(raw: dict[str, Any] | None) -> MessageMetadata | None:
    if not raw:
        return None
    return MessageMetadata(
        classification=raw.get("classification"),
        legalCitation=raw.get("legalCitation") or raw.get("citations"),
        explanation=raw.get("explanation"),
    )


async def _load_bundle(db: DbSession, scan_id: str) -> dict[str, Any]:
    return await _SCAN_REPO.load_scan_bundle(db, scan_id)


@router.post("/sessions", response_model=CreateSessionResponse, status_code=201)
async def create_session(payload: CreateSessionRequest) -> CreateSessionResponse:
    _ = payload
    session_id = f"ses_{secrets.token_hex(12)}"
    expires_at = _now_utc() + _SESSION_TTL
    _SESSIONS[session_id] = expires_at
    return CreateSessionResponse(sessionId=session_id, expiresAt=expires_at)


@router.post("/scans", response_model=CreateScanResponse, status_code=202)
async def create_scan(
    payload: CreateScanRequest,
    db: DbSession,
    service: OnboardingService = Depends(get_onboarding_service),
):
    try:
        active_scan_ids = await _SCAN_REPO.list_active_scan_ids(db)
    except Exception:
        active_scan_ids = []

    if active_scan_ids:
        return _api_error(409, "scan_in_progress", "A scan is already in progress.")

    jurisdiction = payload.jurisdictionHint if payload.jurisdictionHint != "AUTO" else get_settings().default_jurisdiction

    try:
        created = await service.initialize_scan(
            db,
            seeds=[payload.seed.value],
            seed_type=payload.seed.type,
            jurisdiction=jurisdiction,
        )
    except ValueError as exc:
        return _api_error(400, "invalid_seed", str(exc))
    except Exception as exc:
        return _api_error(400, "scan_create_failed", str(exc))

    now = _now_utc()
    return CreateScanResponse(
        scanId=str(created["scan_id"]),
        status="discovering",
        startedAt=now,
        routeHints=RouteHints(),
        estimatedDuration=180,
    )


@router.get("/scans/{scanId}", response_model=Scan)
async def get_scan(scanId: str, db: DbSession):
    try:
        bundle = await _load_bundle(db, scanId)
    except ResourceNotFoundError:
        return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

    scan = bundle.get("scan", {})
    seed = SeedInput(type=scan.get("seed_type", "email"), value=scan.get("normalized_seed", ""))
    created = _parse_datetime(scan.get("created_at") or scan.get("updated_at"))
    updated = _parse_datetime(scan.get("updated_at"))
    status = _scan_status(scan.get("status"), scan.get("current_stage"))

    return Scan(
        scanId=scanId,
        seed=seed,
        status=status,
        progress=int(scan.get("progress", 0)),
        createdAt=created,
        updatedAt=updated,
    )


@router.get("/scans/{scanId}/dashboard/summary", response_model=DashboardSummary)
async def get_dashboard_summary(scanId: str, db: DbSession):
    try:
        dashboard = await _DASHBOARD_REPO.get_dashboard(db, scanId)
    except ResourceNotFoundError:
        return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

    stats_by_title = {item.get("title", ""): int(item.get("value", 0)) for item in dashboard.get("stats", [])}
    stats = DashboardStats(
        brokersScanned=stats_by_title.get("Brokers Scanned", 0),
        exposuresFound=stats_by_title.get("Exposures Found", 0),
        deletionsSecured=stats_by_title.get("Deletions Secured", 0),
        activeDisputes=stats_by_title.get("Active Legal Disputes", 0),
    )

    trends = DashboardTrends(
        brokersScanned=_trend_from_value(stats.brokersScanned),
        exposuresFound=_trend_from_value(stats.exposuresFound),
        deletionsSecured=_trend_from_value(stats.deletionsSecured),
        activeDisputes=_trend_from_value(stats.activeDisputes),
    )

    threat_raw = dashboard.get("threat_breakdown", {})
    threat_counts = {
        "email": int(threat_raw.get("emails_exposed", 0)),
        "phone": int(threat_raw.get("phone_leaks", 0)),
        "location": int(threat_raw.get("location_traces", 0)),
    }
    total = max(sum(threat_counts.values()), 1)
    threat_breakdown = [
        ThreatBreakdownItem(type=key, count=value, percentOfTotal=round((value / total) * 100, 2))
        for key, value in threat_counts.items()
    ]

    return DashboardSummary(scanId=scanId, stats=stats, trends=trends, threatBreakdown=threat_breakdown)


@router.get("/scans/{scanId}/dashboard/radar-targets", response_model=RadarTargetsResponse)
async def get_radar_targets(scanId: str, db: DbSession, limit: int = Query(default=50, ge=1, le=200)):
    try:
        bundle = await _load_bundle(db, scanId)
    except ResourceNotFoundError:
        return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

    targets = bundle.get("targets", [])[:limit]
    colors = {"email": "#4a6fa5", "phone": "#d17a22", "location": "#b94a48"}
    items: list[RadarTarget] = []

    for idx, target in enumerate(targets):
        threat_type = _threat_type_from_target(target, idx)
        items.append(
            RadarTarget(
                id=idx + 1,
                angle=float((35 + idx * 52) % 360),
                distance=float(min(95, 28 + idx * 9)),
                broker=str(target.get("brokerName", "Unknown Broker")),
                status=_radar_status_from_engagement(str(target.get("status", "stalling"))),
                color=colors[threat_type],
                type=threat_type,
                confidence=min(99, 62 + idx * 4),
            )
        )

    return RadarTargetsResponse(scanId=scanId, items=items)


@router.get("/scans/{scanId}/dashboard/activity-logs", response_model=ActivityLogPage)
async def get_activity_logs(
    scanId: str,
    db: DbSession,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    types: str | None = None,
):
    try:
        bundle = await _load_bundle(db, scanId)
    except ResourceNotFoundError:
        return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

    events = list(reversed(bundle.get("events", [])))
    if types:
        allowed = {item.strip() for item in types.split(",") if item.strip()}
        events = [event for event in events if event.get("type") in allowed]

    try:
        paged_events, page_info = _paginate(events, cursor, limit)
    except ValueError:
        return _api_error(400, "invalid_cursor", "Cursor must be a numeric offset.")

    items = [
        ActivityLog(
            id=index + 1,
            type=event.get("type", "System"),
            message=str(event.get("message", "")),
            color=_activity_color(str(event.get("type", "System"))),
            createdAt=_parse_datetime(event.get("created_at")),
        )
        for index, event in enumerate(paged_events)
    ]

    return ActivityLogPage(items=items, pageInfo=page_info)


@router.get("/scans/{scanId}/dashboard/agents", response_model=AgentStatusesResponse)
async def get_dashboard_agents(scanId: str, db: DbSession):
    try:
        bundle = await _load_bundle(db, scanId)
    except ResourceNotFoundError:
        return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

    agents = [
        AgentStatus(
            name=str(agent.get("agent_name", "Agent")),
            mode=_agent_mode(str(agent.get("agent_name", "Agent"))),
            status=str(agent.get("status", "active")).title(),
            task=str(agent.get("detail", "Processing")),
            progress=min(100, 25 + idx * 25),
        )
        for idx, agent in enumerate(bundle.get("agent_runs", []))
    ]

    return AgentStatusesResponse(scanId=scanId, agents=agents)


@router.get("/scans/{scanId}/dashboard/pivot-chain", response_model=PivotChain)
async def get_pivot_chain(scanId: str, db: DbSession):
    try:
        bundle = await _load_bundle(db, scanId)
    except ResourceNotFoundError:
        return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

    emails = [str(bundle.get("scan", {}).get("normalized_seed", ""))]
    usernames = [str(item) for item in bundle.get("usernames", [])]
    platforms = [str(item) for item in bundle.get("accounts", [])]
    brokers = [str(item.get("brokerName", "")) for item in bundle.get("targets", [])]

    columns = [
        PivotColumn(label="Emails", values=emails),
        PivotColumn(label="Usernames", values=usernames),
        PivotColumn(label="Platforms", values=platforms),
        PivotColumn(label="Brokers", values=brokers),
    ]

    edges: list[PivotEdge] = []
    for idx in range(min(len(emails), len(usernames))):
        edges.append(PivotEdge(fromColumn=0, fromIndex=idx, toColumn=1, toIndex=idx))
    for idx in range(min(len(usernames), len(platforms))):
        edges.append(PivotEdge(fromColumn=1, fromIndex=idx, toColumn=2, toIndex=idx))
    for idx in range(min(len(platforms), len(brokers))):
        edges.append(PivotEdge(fromColumn=2, fromIndex=idx, toColumn=3, toIndex=idx))

    summary = [
        PivotSummaryItem(label="Total Identities", value=len(set(usernames + emails)), max=max(1, len(usernames + emails) + 5)),
        PivotSummaryItem(label="Usernames Extracted", value=len(usernames), max=max(1, len(usernames) + 5)),
        PivotSummaryItem(label="Platforms Scanned", value=len(platforms), max=max(1, len(platforms) + 5)),
        PivotSummaryItem(label="Brokers Matched", value=len(brokers), max=max(1, len(brokers) + 5)),
    ]

    return PivotChain(scanId=scanId, columns=columns, edges=edges, summary=summary)


@router.get("/scans/{scanId}/identity-graph", response_model=IdentityGraphPayload)
async def get_identity_graph(
    scanId: str,
    db: DbSession,
    includePlatforms: bool = True,
    includeIdentity: bool = True,
    includeTargets: bool = True,
):
    try:
        bundle = await _load_bundle(db, scanId)
    except ResourceNotFoundError:
        return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

    all_nodes = bundle.get("graph", {}).get("nodes", [])
    all_edges = bundle.get("graph", {}).get("edges", [])

    def include_node(node_type: str) -> bool:
        if node_type == "platform":
            return includePlatforms
        if node_type in {"identity", "username", "seed"}:
            return includeIdentity
        if node_type == "target":
            return includeTargets
        return True

    edge_pairs = [(str(edge.get("source", "")), str(edge.get("target", ""))) for edge in all_edges]
    allowed_nodes = [node for node in all_nodes if include_node(str(node.get("type", "")))]
    allowed_ids = {str(node.get("id", "")) for node in allowed_nodes}

    nodes: list[IdentityGraphNode] = []
    for idx, node in enumerate(allowed_nodes):
        node_id = str(node.get("id", ""))
        connections = [
            right if left == node_id else left
            for left, right in edge_pairs
            if (left == node_id or right == node_id) and left in allowed_ids and right in allowed_ids
        ]

        nodes.append(
            IdentityGraphNode(
                id=node_id,
                type=str(node.get("type", "identity")),
                label=str(node.get("label", node_id)),
                x=float(node.get("x", 0)),
                y=float(node.get("y", 0)),
                connections=connections,
                revealStep=idx,
                data=node.get("data") or None,
            )
        )

    edges = [
        IdentityGraphEdge(fromNodeId=left, toNodeId=right)
        for left, right in edge_pairs
        if left in allowed_ids and right in allowed_ids
    ]

    return IdentityGraphPayload(
        scanId=scanId,
        nodes=nodes,
        edges=edges,
        filters=IdentityGraphFilters(
            showPlatforms=includePlatforms,
            showIdentity=includeIdentity,
            showTargets=includeTargets,
        ),
    )


@router.get("/scans/{scanId}/identity-graph/nodes/{nodeId}", response_model=IdentityGraphNode)
async def get_identity_graph_node(scanId: str, nodeId: str, db: DbSession):
    graph = await get_identity_graph(scanId, db)
    if isinstance(graph, JSONResponse):
        return graph

    for node in graph.nodes:
        if node.id == nodeId:
            return node

    return _api_error(404, "node_not_found", f"Node '{nodeId}' was not found for scan '{scanId}'.")


@router.get("/scans/{scanId}/war-room/engagements")
async def list_engagements(
    scanId: str,
    db: DbSession,
    statuses: str | None = None,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
):
    try:
        bundle = await _load_bundle(db, scanId)
    except ResourceNotFoundError:
        return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

    items = [
        EngagementSummary(
            id=str(target.get("id")),
            brokerName=str(target.get("brokerName", "Unknown Broker")),
            status=str(target.get("status", "stalling")),
            lastActivity=str(target.get("lastActivity", "unknown")),
            messageCount=int(target.get("messageCount", 0))
            + len(_MANUAL_MESSAGES.get((scanId, str(target.get("id"))), [])),
        )
        for target in bundle.get("targets", [])
    ]

    if statuses:
        allowed = {item.strip() for item in statuses.split(",") if item.strip()}
        items = [item for item in items if item.status in allowed]

    try:
        paged_items, page_info = _paginate(items, cursor, limit)
    except ValueError:
        return _api_error(400, "invalid_cursor", "Cursor must be a numeric offset.")

    return {
        "scanId": scanId,
        "items": [item.model_dump(mode="json") for item in paged_items],
        "pageInfo": page_info.model_dump(mode="json"),
    }


@router.get("/scans/{scanId}/war-room/engagements/{engagementId}", response_model=EngagementDetail)
async def get_engagement(scanId: str, engagementId: str, db: DbSession):
    try:
        bundle = await _load_bundle(db, scanId)
    except ResourceNotFoundError:
        return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

    target = next((item for item in bundle.get("targets", []) if item.get("id") == engagementId), None)
    if target is None:
        return _api_error(404, "engagement_not_found", f"Engagement '{engagementId}' was not found.")

    thread = bundle.get("threads", {}).get(engagementId, {})
    messages = [
        EngagementMessage(
            id=str(message.get("id")),
            type=str(message.get("type", "system")),
            content=str(message.get("content", "")),
            timestamp=str(message.get("timestamp", "")),
            metadata=_message_metadata(message.get("metadata")),
        )
        for message in thread.get("messages", [])
    ]

    messages.extend(_MANUAL_MESSAGES.get((scanId, engagementId), []))

    return EngagementDetail(
        id=str(target.get("id")),
        brokerName=str(target.get("brokerName", "Unknown Broker")),
        status=str(target.get("status", "stalling")),
        lastActivity=str(target.get("lastActivity", "unknown")),
        messageCount=int(target.get("messageCount", len(messages))),
        conversation=messages,
    )


@router.get("/scans/{scanId}/war-room/engagements/{engagementId}/messages", response_model=MessagePage)
async def list_engagement_messages(
    scanId: str,
    engagementId: str,
    db: DbSession,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
):
    detail = await get_engagement(scanId, engagementId, db)
    if isinstance(detail, JSONResponse):
        return detail

    messages = list(reversed(detail.conversation))
    try:
        paged_messages, page_info = _paginate(messages, cursor, limit)
    except ValueError:
        return _api_error(400, "invalid_cursor", "Cursor must be a numeric offset.")

    return MessagePage(items=paged_messages, pageInfo=page_info)


@router.post(
    "/scans/{scanId}/war-room/engagements/{engagementId}/messages",
    response_model=EngagementMessage,
    status_code=201,
)
async def create_engagement_message(
    scanId: str,
    engagementId: str,
    payload: CreateMessageRequest,
    db: DbSession,
):
    content = payload.content.strip()
    if not content:
        return _api_error(400, "invalid_message", "Message content cannot be empty.")

    timestamp = _now_utc().isoformat().replace("+00:00", "Z")
    message = EngagementMessage(
        id=f"msg_{secrets.token_hex(6)}",
        type=payload.type,
        content=content,
        timestamp=timestamp,
        metadata=payload.metadata,
    )

    if db is None:
        bundle = memory_store._scans.get(scanId)  # noqa: SLF001
        if bundle is None:
            return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

        target = next((item for item in bundle.get("targets", []) if item.get("id") == engagementId), None)
        if target is None:
            return _api_error(404, "engagement_not_found", f"Engagement '{engagementId}' was not found.")

        threads = bundle.setdefault("threads", {})
        thread = threads.setdefault(engagementId, {"messages": []})
        thread.setdefault("messages", []).append(message.model_dump(mode="json", exclude_none=True))

        target["lastActivity"] = "just now"
        target["messageCount"] = int(target.get("messageCount", 0)) + 1

        memory_store._scans[scanId] = bundle  # noqa: SLF001
    else:
        target = await db.get(BrokerCase, engagementId)
        if target is None or target.scan_job_id != scanId:
            return _api_error(404, "engagement_not_found", f"Engagement '{engagementId}' was not found.")
        target.last_activity_label = "just now"
        await db.commit()
        _MANUAL_MESSAGES.setdefault((scanId, engagementId), []).append(message)

    return message


def _escalation_status(reason_code: str) -> str:
    if reason_code in {"illegal_request", "non_compliance"}:
        return "illegal"
    return "stalling"


@router.post(
    "/scans/{scanId}/war-room/engagements/{engagementId}/actions/escalate",
    response_model=EscalateEngagementResponse,
    status_code=202,
)
async def escalate_engagement(
    scanId: str,
    engagementId: str,
    payload: EscalateEngagementRequest,
    db: DbSession,
):
    status = _escalation_status(payload.reasonCode)

    if db is None:
        bundle = memory_store._scans.get(scanId)  # noqa: SLF001
        if bundle is None:
            return _api_error(404, "scan_not_found", f"Scan '{scanId}' was not found.")

        updated = False
        for target in bundle.get("targets", []):
            if target.get("id") == engagementId:
                target["status"] = status
                target["lastActivity"] = "just now"
                updated = True
                break
        if not updated:
            return _api_error(404, "engagement_not_found", f"Engagement '{engagementId}' was not found.")

        thread = bundle.get("threads", {}).get(engagementId)
        if thread is not None:
            thread["status"] = status
            thread.setdefault("messages", []).append(
                {
                    "id": f"msg_{secrets.token_hex(6)}",
                    "type": "system",
                    "content": f"Escalation queued: {payload.reasonCode}",
                    "timestamp": "now",
                    "metadata": {"classification": "Warning", "legalCitation": payload.legalFramework},
                }
            )

        memory_store._scans[scanId] = bundle  # noqa: SLF001
    else:
        target = await db.get(BrokerCase, engagementId)
        if target is None or target.scan_job_id != scanId:
            return _api_error(404, "engagement_not_found", f"Engagement '{engagementId}' was not found.")
        target.status = status
        target.last_activity_label = "just now"
        await db.commit()

    return EscalateEngagementResponse(
        accepted=True,
        engagementId=engagementId,
        queuedAt=_now_utc(),
    )
