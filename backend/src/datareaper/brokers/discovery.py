from __future__ import annotations


def discover_brokers(identity: dict) -> list[str]:
    if identity.get("name"):
        return ["Apollo.io", "Spokeo", "Whitepages"]
    return []
