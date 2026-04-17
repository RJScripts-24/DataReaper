from __future__ import annotations

from sqlalchemy import Boolean, Column, Integer, String, Text

from datareaper.db.base import Base, TimestampMixin
from datareaper.db.types import JSONType


class Broker(Base, TimestampMixin):
    __tablename__ = "brokers"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), unique=True)
    category = Column(String(64), nullable=True)
    priority = Column(String(32), nullable=True)
