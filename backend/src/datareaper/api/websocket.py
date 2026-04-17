from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from datareaper.realtime.event_bus import event_bus

router = APIRouter()


@router.websocket("/scans/{scan_id}")
async def scan_updates(websocket: WebSocket, scan_id: str) -> None:
    await websocket.accept()
    await event_bus.connect(scan_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await event_bus.disconnect(scan_id, websocket)
