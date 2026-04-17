from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from datareaper.core.exceptions import ResourceNotFoundError
from datareaper.db.in_memory import memory_store
from datareaper.db.models.broker_case import BrokerCase
from datareaper.db.models.email_message import EmailMessage
from datareaper.db.models.email_thread import EmailThread
from datareaper.db.repositories.scan_repo import ScanRepository


class BattleRepository:
    def __init__(self) -> None:
        self.scan_repo = ScanRepository()

    async def get_threads(self, session: AsyncSession | None, scan_id: str) -> dict:
        bundle = await self.scan_repo.load_scan_bundle(session, scan_id)
        return {
            "scan_id": scan_id,
            "targets": bundle["targets"],
            "selected_thread": next(iter(bundle["threads"].values()), None),
        }

    async def get_thread(self, session: AsyncSession | None, target_id: str) -> dict:
        if session is None:
            thread = memory_store.get_thread(target_id)
            if thread is None:
                raise ResourceNotFoundError(f"Target thread {target_id} not found")
            return thread

        target = await session.get(BrokerCase, target_id)
        if target is None:
            raise ResourceNotFoundError(f"Target thread {target_id} not found")
        thread_result = await session.execute(
            select(EmailThread).where(EmailThread.broker_case_id == target_id)
        )
        thread = thread_result.scalars().first()
        if thread is None:
            raise ResourceNotFoundError(f"Target thread {target_id} not found")
        message_result = await session.execute(
            select(EmailMessage).where(EmailMessage.thread_id == thread.id)
        )
        messages = [
            {
                "id": message.id,
                "type": message.direction,
                "content": message.body,
                "timestamp": message.display_timestamp,
                "metadata": message.metadata_json or {},
            }
            for message in message_result.scalars().all()
        ]
        return {
            "thread_id": thread.id,
            "target_id": target_id,
            "broker_name": target.broker_name,
            "status": target.status,
            "messages": messages,
        }
