from __future__ import annotations


def run(state: dict) -> dict:
    state.setdefault("node_history", []).append("legal_strategy")
    return state
