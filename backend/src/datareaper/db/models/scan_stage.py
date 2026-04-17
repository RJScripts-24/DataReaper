from __future__ import annotations

from sqlalchemy import Boolean, Column, Integer, String, Text

from datareaper.db.base import Base, TimestampMixin
from datareaper.db.types import JSONType


class ScanStage(Base, TimestampMixin):
    __tablename__ = "scan_stages"

    id = Column(String(36), primary_key=True)
    scan_job_id = Column(String(36), nullable=True)
    name = Column(String(64))
    status = Column(String(32), default="pending")
