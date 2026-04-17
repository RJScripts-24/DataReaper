from __future__ import annotations

from datareaper.legal.notice_builder import build_notice


def build_reply(intent: str, jurisdiction: str) -> str:
    if intent == "illegal_pushback":
        return "Your request for additional identification is excessive and unlawful."
    if intent == "stalling":
        return "Please comply within the statutory response window."
    if intent == "success":
        return "Acknowledged. We will mark this deletion as resolved."
    return build_notice(jurisdiction, "user@email.com")
