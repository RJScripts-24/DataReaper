from __future__ import annotations


class InMemoryQueue:
    def __init__(self) -> None:
        self.items: list[dict] = []

    def enqueue(self, payload: dict) -> None:
        self.items.append(payload)
