from __future__ import annotations

from datareaper.legal.data_minimization import is_excessive_request


def classify_intent(text: str) -> str:
    lowered = text.lower()
    if is_excessive_request(text):
        return "illegal_pushback"
    if "4-6 weeks" in lowered or "allow" in lowered:
        return "stalling"
    if "removed" in lowered or "deleted" in lowered:
        return "success"
    return "in_progress"
