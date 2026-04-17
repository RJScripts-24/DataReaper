from __future__ import annotations


def run(state: dict) -> dict:
    state.setdefault("node_history", []).append("username_pivot")
    return state
