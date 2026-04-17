from __future__ import annotations

from collections import defaultdict

from fastapi import WebSocket


class EventBus:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        self._connections[channel].append(websocket)

    async def disconnect(self, channel: str, websocket: WebSocket) -> None:
        if websocket in self._connections[channel]:
            self._connections[channel].remove(websocket)

    async def publish(self, channel: str, payload: dict) -> None:
        for socket in list(self._connections[channel]):
            await socket.send_json(payload)


event_bus = EventBus()
