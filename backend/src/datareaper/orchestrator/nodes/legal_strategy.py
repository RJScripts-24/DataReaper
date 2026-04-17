from __future__ import annotations

from datareaper.legal.citation_builder import build_citations
from datareaper.legal.notice_builder import build_notice


def run(state: dict) -> dict:
    state.setdefault("node_history", []).append("legal_strategy")
    jurisdiction = str(state.get("jurisdiction") or "DPDP")
    seed = str(state.get("normalized_seed") or state.get("seed") or "")
    identity = state.get("identity") if isinstance(state.get("identity"), dict) else {}
    targets = [row for row in (state.get("targets") or []) if isinstance(row, dict)]

    citations = build_citations(jurisdiction)
    legal_requests: list[dict] = []
    for index, target in enumerate(targets, start=1):
        broker_name = str(target.get("broker_name") or "Data Broker")
        legal_requests.append(
            {
                "id": f"notice_{index}",
                "target_id": target.get("id"),
                "broker_name": broker_name,
                "to_email": target.get("opt_out_email")
                or f"privacy@{broker_name.lower().replace(' ', '')}.com",
                "subject": f"Data Deletion Request - {broker_name}",
                "body": build_notice(
                    jurisdiction,
                    seed,
                    identity=identity,
                    broker_name=broker_name,
                ),
                "citations": citations,
                "status": "drafted",
            }
        )

    state["legal_requests"] = legal_requests
    state["stage"] = "legal_strategy"
    state["progress"] = max(int(state.get("progress", 0)), 78)
    return state
