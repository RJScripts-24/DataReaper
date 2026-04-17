from __future__ import annotations


def run(scan_id: str) -> dict:
    return {"job": "send_legal_requests", "scan_id": scan_id, "status": "queued"}
