from __future__ import annotations


def run(scan_id: str) -> dict:
    return {"job": "run_osint_pipeline", "scan_id": scan_id, "status": "queued"}
