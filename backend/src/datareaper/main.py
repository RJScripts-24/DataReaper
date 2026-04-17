from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from datareaper.api.errors import register_error_handlers
from datareaper.api.router import api_router
from datareaper.api.websocket import router as websocket_router
from datareaper.core.config import get_settings
from datareaper.core.constants import API_PREFIX, WS_PREFIX
from datareaper.lifespan import lifespan

settings = get_settings()
app = FastAPI(title=settings.app_name, debug=settings.app_debug, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=API_PREFIX)
app.include_router(websocket_router, prefix=WS_PREFIX)
register_error_handlers(app)


@app.get("/")
async def root() -> dict:
    return {"name": settings.app_name, "status": "ok"}
