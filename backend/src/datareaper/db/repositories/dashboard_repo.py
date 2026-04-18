from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from datareaper.db.repositories.scan_repo import ScanRepository


class DashboardRepository:
    def __init__(self) -> None:
        self.scan_repo = ScanRepository()

    async def get_dashboard(self, session: AsyncSession | None, scan_id: str) -> dict:
        bundle = await self.scan_repo.load_scan_bundle(session, scan_id)
        targets = bundle["targets"]
        events = bundle.get("events", [])

        brokers_scanned = len(targets)
        deletions_secured = sum(1 for target in targets if str(target.get("status", "")).lower() == "resolved")
        active_disputes = max(brokers_scanned - deletions_secured, 0)
        exposures_from_events = sum(
            1 for event in events if str(event.get("type", "")).lower() == "exposure_found"
        )
        exposures_found = max(brokers_scanned, exposures_from_events)

        threat_breakdown = {
            "emails_exposed": sum("Email" in target["dataTypes"] for target in targets),
            "phone_leaks": sum("Phone" in target["dataTypes"] for target in targets),
            "location_traces": sum("Location" in target["dataTypes"] or "Address" in target["dataTypes"] for target in targets),
            "social_profiles": max(1, len(bundle["accounts"])),
        }

        return {
            "scan_id": scan_id,
            "stats": [
                {"title": "Brokers Scanned", "value": brokers_scanned, "delta": 0, "label": "Active reconnaissance"},
                {"title": "Exposures Found", "value": exposures_found, "delta": 0, "label": "Active threats detected"},
                {"title": "Deletions Secured", "value": deletions_secured, "delta": 0, "label": "Successfully removed"},
                {"title": "Active Legal Disputes", "value": active_disputes, "delta": 0, "label": "Awaiting response"},
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
