from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from datareaper.db.repositories.scan_repo import ScanRepository


class DashboardRepository:
    def __init__(self) -> None:
        self.scan_repo = ScanRepository()

    async def get_dashboard(self, session: AsyncSession | None, scan_id: str) -> dict:
        bundle = await self.scan_repo.load_scan_bundle(session, scan_id)
        metrics = bundle["report"]["metrics"]
        targets = bundle["targets"]

        threat_breakdown = {
            "emails_exposed": sum("Email" in target["dataTypes"] for target in targets),
            "phone_leaks": sum("Phone" in target["dataTypes"] for target in targets),
            "location_traces": sum("Location" in target["dataTypes"] or "Address" in target["dataTypes"] for target in targets),
            "social_profiles": max(1, len(bundle["accounts"])),
        }

        return {
            "scan_id": scan_id,
            "stats": [
                {"title": "Brokers Scanned", "value": metrics["brokers_scanned"], "delta": 0, "label": "Active reconnaissance"},
                {"title": "Exposures Found", "value": metrics["exposures_found"], "delta": 0, "label": "Active threats detected"},
                {"title": "Deletions Secured", "value": metrics["deletions_secured"], "delta": 0, "label": "Successfully removed"},
                {"title": "Active Legal Disputes", "value": metrics["active_disputes"], "delta": 0, "label": "Awaiting response"},
            ],
            "threat_breakdown": threat_breakdown,
            "radar_targets": [
                {
                    "id": target["id"],
                    "broker": target["brokerName"],
                    "status": target["status"],
                    "angle": 35 + (index * 55),
                    "distance": 30 + (index * 10),
                    "severity": "critical" if target["status"] == "illegal" else "high" if target["status"] == "stalling" else "medium",
                }
                for index, target in enumerate(targets)
            ],
            "activity_feed": bundle["events"],
            "agent_statuses": [
                {"name": agent["agent_name"], "status": agent["status"], "detail": agent["detail"]}
                for agent in bundle["agent_runs"]
            ],
        }
