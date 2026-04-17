from __future__ import annotations

import asyncio

from datareaper.osint.username_discovery import discover_usernames


def _run_async(coro):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    return []


def run(state: dict) -> dict:
    state.setdefault("node_history", []).append("username_pivot")
    accounts = state.get("accounts") or []
    account_rows = [row for row in accounts if isinstance(row, dict)]
    seed_value = str(state.get("normalized_seed") or state.get("seed") or "")
    usernames: list[str] = []

    if account_rows:
        discovered = _run_async(discover_usernames(account_rows, original_seeds=[seed_value]))
        if isinstance(discovered, list):
            usernames = [str(item) for item in discovered if item]

    state["usernames"] = usernames
    state["stage"] = "username_pivot"
    state["progress"] = max(int(state.get("progress", 0)), 30)
    return state
