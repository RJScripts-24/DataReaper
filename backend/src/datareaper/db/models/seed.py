from __future__ import annotations

from sqlalchemy import Boolean, Column, Integer, String, Text

from datareaper.db.base import Base, TimestampMixin
from datareaper.db.types import JSONType


class Seed(Base, TimestampMixin):
    __tablename__ = "seeds"

    id = Column(String(36), primary_key=True)
    value = Column(String(320))
    seed_type = Column(String(24))
    normalized_value = Column(String(320))
