from __future__ import annotations

from sqlalchemy import Boolean, Column, Integer, String, Text

from datareaper.db.base import Base, TimestampMixin
from datareaper.db.types import JSONType


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(320), nullable=True)
    display_name = Column(String(120), nullable=True)
