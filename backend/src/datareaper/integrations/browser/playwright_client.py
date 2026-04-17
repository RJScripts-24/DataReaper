from __future__ import annotations


class PlaywrightClient:
    def fetch(self, url: str) -> dict:
        return {"url": url, "status": "fetched"}
