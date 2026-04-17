from __future__ import annotations


def resolve_identity(clues: list[dict]) -> dict:
    identity = {"name": None, "location": None}
    for clue in clues:
        identity.update(clue)
    return identity
