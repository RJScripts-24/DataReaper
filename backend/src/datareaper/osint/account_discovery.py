from __future__ import annotations


def discover_accounts(seed: str) -> list[str]:
    return ["GitHub", "LinkedIn", "Twitter"] if "@" in seed else ["Telegram", "WhatsApp"]
