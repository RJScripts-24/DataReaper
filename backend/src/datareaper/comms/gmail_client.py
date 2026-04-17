from __future__ import annotations


class GmailClient:
    def send_message(self, to_email: str, subject: str, body: str) -> dict:
        return {"to": to_email, "subject": subject, "body": body, "sent": True}
