from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from datareaper.core.exceptions import DataReaperError, ResourceNotFoundError


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ResourceNotFoundError)
    async def handle_not_found(_, exc: ResourceNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(DataReaperError)
    async def handle_app_error(_, exc: DataReaperError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": str(exc)})
