from __future__ import annotations

from datetime import UTC, datetime


def run(state: dict) -> dict:
    state.setdefault("node_history", []).append("publish_realtime_updates")
    now = datetime.now(UTC).isoformat()
    scan_id = state.get("scan_id")
    targets = [row for row in (state.get("targets") or []) if isinstance(row, dict)]
    events = [row for row in (state.get("events") or []) if isinstance(row, dict)]

    event = {
        "type": "stage_complete",
        "stage": "publish_realtime_updates",
        "scan_id": scan_id,
        "created_at": now,
        "payload": {
            "targets": len(targets),
            "resolved": sum(1 for row in targets if row.get("status") == "resolved"),
            "active": sum(1 for row in targets if row.get("status") != "resolved"),
        },
    }
    events.append(event)

    state["events"] = events
    state["stage"] = "publish_realtime_updates"
    state["progress"] = 100
    state["completed_at"] = now
    return state
