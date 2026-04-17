from __future__ import annotations

from datareaper.observability.metrics import record_event
from datareaper.realtime.event_bus import event_bus


async def publish(channel: str, payload: dict) -> None:
    await event_bus.publish(channel, payload)
    record_event(str(payload.get("type") or channel))
