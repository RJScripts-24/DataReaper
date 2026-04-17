from __future__ import annotations


def run(scan_id: str) -> dict:
    return {"job": "build_report_snapshot", "scan_id": scan_id, "status": "queued"}
