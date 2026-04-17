from __future__ import annotations

from pydantic import BaseModel


class BrokerTargetSchema(BaseModel):
    id: str
    broker_name: str
    status: str
    last_activity: str
    message_count: int
    data_types: list[str]
