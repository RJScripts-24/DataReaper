from __future__ import annotations


def run(scan_id: str) -> dict:
    return {"job": "cleanup_old_events", "scan_id": scan_id, "status": "queued"}
