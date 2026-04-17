from __future__ import annotations


def broker_matches(query: str, broker_name: str) -> bool:
    return query.lower() in broker_name.lower()
