from __future__ import annotations

from sqlalchemy import Boolean, Column, Integer, String, Text

from datareaper.db.base import Base, TimestampMixin
from datareaper.db.types import JSONType


class IdentityAttribute(Base, TimestampMixin):
    __tablename__ = "identity_attributes"

    id = Column(String(36), primary_key=True)
    profile_id = Column(String(36), nullable=True)
    key = Column(String(64))
    value = Column(Text)
