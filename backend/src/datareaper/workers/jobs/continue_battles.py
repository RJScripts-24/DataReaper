from __future__ import annotations


def run(scan_id: str) -> dict:
    return {"job": "continue_battles", "scan_id": scan_id, "status": "queued"}
