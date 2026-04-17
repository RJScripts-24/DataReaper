from __future__ import annotations

import arq

from datareaper.core.config import get_settings
from datareaper.observability.metrics import increment_metric


async def get_arq_pool():
    settings = get_settings()
    return await arq.create_pool(
        arq.connections.RedisSettings.from_dsn(settings.effective_arq_redis_url)
    )


class TaskQueue:
    def __init__(self, pool) -> None:
        self.pool = pool

    async def enqueue(self, function_name: str, **kwargs) -> str:
        job = await self.pool.enqueue_job(function_name, **kwargs)
        increment_metric("jobs_enqueued")
        return job.job_id

    async def enqueue_in(self, function_name: str, delay_seconds: int, **kwargs) -> str:
        job = await self.pool.enqueue_job(function_name, _defer_by=delay_seconds, **kwargs)
        increment_metric("jobs_deferred")
        return job.job_id
