from __future__ import annotations


def _priority_weight(priority: str) -> int:
    normalized = priority.strip().lower()
    if normalized == "high":
        return 3
    if normalized == "low":
        return 1
    return 2


def _score_target(broker: dict, jurisdiction: str) -> int:
    base = _priority_weight(str(broker.get("priority") or "medium")) * 10
    data_types_score = len(list(broker.get("data_types") or []))
    jurisdictions = [str(item).upper() for item in list(broker.get("jurisdictions") or [])]
    jurisdiction_score = 5 if not jurisdictions or jurisdiction.upper() in jurisdictions else 0
    return base + data_types_score + jurisdiction_score


def run(state: dict) -> dict:
    state.setdefault("node_history", []).append("target_prioritization")
    jurisdiction = str(state.get("jurisdiction") or "DPDP")
    brokers = [row for row in (state.get("brokers") or []) if isinstance(row, dict)]

    ranked = sorted(
        brokers,
        key=lambda row: _score_target(row, jurisdiction),
        reverse=True,
    )

    targets: list[dict] = []
    for index, broker in enumerate(ranked, start=1):
        targets.append(
            {
                "id": f"target_{index}",
                "broker_name": str(broker.get("broker_name") or "Unknown"),
                "status": "discovered",
                "priority_score": _score_target(broker, jurisdiction),
                "jurisdiction": jurisdiction,
                "data_types": list(broker.get("data_types") or []),
                "opt_out_email": broker.get("opt_out_email"),
                "opt_out_url": broker.get("opt_out_url"),
            }
        )

    state["targets"] = targets
    state["stage"] = "target_prioritization"
    state["progress"] = max(int(state.get("progress", 0)), 70)
    return state
