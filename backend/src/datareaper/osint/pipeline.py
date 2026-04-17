from __future__ import annotations

from datareaper.osint.account_discovery import discover_accounts
from datareaper.osint.graph_builder import build_graph
from datareaper.osint.identity_resolver import resolve_identity
from datareaper.osint.username_discovery import discover_usernames


def run_pipeline(seed: str) -> dict:
    accounts = discover_accounts(seed)
    usernames = discover_usernames(accounts)
    identity = resolve_identity(
        [
            {"name": "John Doe"},
            {"location": "Bangalore"},
            {"employer": "Tech Corp"},
        ]
    )
    graph = build_graph(seed, accounts, ["Apollo.io", "Spokeo", "Whitepages"], usernames, identity)
    return {"accounts": accounts, "usernames": usernames, "identity": identity, "graph": graph}
