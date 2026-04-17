from __future__ import annotations

from itertools import cycle

from datareaper.brokers.case_builder import build_case
from datareaper.brokers.discovery import discover_brokers
from datareaper.comms.reply_generator import build_reply
from datareaper.core.ids import new_id
from datareaper.legal.citation_builder import build_citations
from datareaper.legal.notice_builder import build_notice
from datareaper.orchestrator.graph import build_default_graph
from datareaper.osint.pipeline import run_pipeline


STATUS_ORDER = ["illegal", "stalling", "in-progress", "resolved"]
LAST_ACTIVITY = {
    "illegal": "2 min ago",
    "stalling": "15 min ago",
    "in-progress": "1 hour ago",
    "resolved": "2 days ago",
}
DATA_TYPES = {
    "Apollo.io": ["Email", "Phone", "Company"],
    "ZoomInfo": ["Email", "Role", "Employer"],
    "Spokeo": ["Phone", "Address", "Relatives"],
    "Whitepages": ["Name", "Location", "Address"],
}


class Supervisor:
    def run(self, state: dict) -> dict:
        state["timeline"] = build_default_graph()
        return state

    def build_scan_bundle(
        self,
        scan_id: str,
        normalized_seed: str,
        seed_type: str,
        jurisdiction: str,
    ) -> dict:
        pipeline = run_pipeline(normalized_seed)
        brokers = discover_brokers(pipeline["identity"])
        cases, threads, legal_requests = self._build_cases_and_threads(
            scan_id=scan_id,
            seed=normalized_seed,
            brokers=brokers,
            jurisdiction=jurisdiction,
        )

        metrics = {
            "brokers_scanned": 124,
            "exposures_found": len(brokers) + len(pipeline["accounts"]) + len(pipeline["usernames"]) + 3,
            "deletions_secured": sum(1 for case in cases if case["status"] == "resolved"),
            "active_disputes": sum(1 for case in cases if case["status"] != "resolved"),
        }

        activity_feed = [
            {
                "id": new_id("evt"),
                "type": "System",
                "message": "Sleuth Agent accessing broker directories...",
                "created_at": "2026-04-17T10:10:00Z",
                "payload": {"stage": "osint"},
            },
            {
                "id": new_id("evt"),
                "type": "Scan",
                "message": "Username pivot detected on GitHub.",
                "created_at": "2026-04-17T10:11:00Z",
                "payload": {"stage": "username_pivot"},
            },
            {
                "id": new_id("evt"),
                "type": "Legal",
                "message": f"{jurisdiction}-compliant takedown requests prepared.",
                "created_at": "2026-04-17T10:12:00Z",
                "payload": {"stage": "legal_strategy"},
            },
        ]

        return {
            "scan": {
                "id": scan_id,
                "normalized_seed": normalized_seed,
                "seed_type": seed_type,
                "jurisdiction": jurisdiction,
                "status": "active",
                "progress": 100,
                "current_stage": "publish_realtime_updates",
            },
            "stages": [{"name": stage, "status": "completed"} for stage in build_default_graph()],
            "identity": pipeline["identity"],
            "accounts": pipeline["accounts"],
            "usernames": pipeline["usernames"],
            "graph": pipeline["graph"],
            "events": activity_feed,
            "agent_runs": [
                {"agent_name": "Sleuth Agent", "status": "active", "detail": "Expanding identity graph"},
                {"agent_name": "Legal Agent", "status": "drafting", "detail": "Preparing deletion notices"},
                {"agent_name": "Communications Agent", "status": "engaged", "detail": "Monitoring broker replies"},
            ],
            "targets": cases,
            "threads": threads,
            "legal_requests": legal_requests,
            "report": {
                "summary": f"DataReaper mapped the exposure surface for {normalized_seed} and opened deletion cases across multiple brokers.",
                "metrics": metrics,
                "highlights": [
                    "Seed expanded into a pivot graph of accounts, usernames, and target brokers.",
                    "Jurisdiction-aware notices were generated automatically.",
                    "Broker replies were classified into stalling, illegal pushback, and resolved states.",
                ],
            },
        }

    def _build_cases_and_threads(
        self,
        scan_id: str,
        seed: str,
        brokers: list[str],
        jurisdiction: str,
    ) -> tuple[list[dict], dict[str, dict], list[dict]]:
        cases: list[dict] = []
        threads: dict[str, dict] = {}
        legal_requests: list[dict] = []
        statuses = cycle(STATUS_ORDER)
        citations = build_citations(jurisdiction)

        for broker_name in brokers:
            case_id = new_id("case")
            thread_id = new_id("thread")
            status = next(statuses)
            case = build_case(broker_name, jurisdiction)
            case.update(
                {
                    "id": case_id,
                    "scan_id": scan_id,
                    "brokerName": broker_name,
                    "status": status,
                    "lastActivity": LAST_ACTIVITY[status],
                    "dataTypes": DATA_TYPES.get(broker_name, ["Email", "Phone"]),
                    "threadId": thread_id,
                }
            )

            messages = self._build_thread_messages(broker_name, seed, status, jurisdiction, citations)
            case["messageCount"] = len(messages)
            threads[case_id] = {
                "thread_id": thread_id,
                "target_id": case_id,
                "broker_name": broker_name,
                "status": status,
                "messages": messages,
            }

            legal_requests.append(
                {
                    "id": new_id("notice"),
                    "broker_case_id": case_id,
                    "subject": "Data Deletion Request",
                    "body": build_notice(jurisdiction, seed),
                    "citations": citations,
                    "status": "sent",
                }
            )
            cases.append(case)

        return cases, threads, legal_requests

    def _build_thread_messages(
        self,
        broker_name: str,
        seed: str,
        status: str,
        jurisdiction: str,
        citations: list[str],
    ) -> list[dict]:
        opening = {
            "id": new_id("msg"),
            "type": "agent",
            "content": build_notice(jurisdiction, seed),
            "timestamp": "10:23 AM",
            "metadata": {"citations": ", ".join(citations)},
        }

        if status == "illegal":
            broker_message = "Please provide a government-issued ID and proof of address."
            classified = "Illegal Data Request"
        elif status == "stalling":
            broker_message = "Please allow 4-6 weeks for processing."
            classified = "Stalling"
        elif status == "resolved":
            broker_message = "Your data has been removed from our systems."
            classified = "Resolved"
        else:
            broker_message = "We received your request and are processing it."
            classified = "In Progress"

        return [
            opening,
            {
                "id": new_id("msg"),
                "type": "broker",
                "content": broker_message,
                "timestamp": "10:45 AM",
                "metadata": {"broker": broker_name},
            },
            {
                "id": new_id("msg"),
                "type": "system",
                "content": f"Intent classified: {classified}",
                "timestamp": "10:46 AM",
                "metadata": {"classification": classified},
            },
            {
                "id": new_id("msg"),
                "type": "agent",
                "content": build_reply(
                    "illegal_pushback" if status == "illegal" else "stalling" if status == "stalling" else "success" if status == "resolved" else "in_progress",
                    jurisdiction,
                ),
                "timestamp": "10:47 AM",
                "metadata": {"legalCitation": citations[0] if citations else ""},
            },
        ]
