from __future__ import annotations

from datareaper.comms.gmail_client import GmailClient


def dispatch_notice(to_email: str, subject: str, body: str) -> dict:
    return GmailClient().send_message(to_email, subject, body)
