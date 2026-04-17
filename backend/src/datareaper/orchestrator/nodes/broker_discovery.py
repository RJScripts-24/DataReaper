from __future__ import annotations


def run(state: dict) -> dict:
    state.setdefault("node_history", []).append("broker_discovery")
    return state
