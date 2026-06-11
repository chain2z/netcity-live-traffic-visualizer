from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.runtime import Runtime
from app.security import (
    LocalOnlyAndOriginMiddleware,
    close_disallowed_websocket,
    configured_allowed_origins,
    websocket_request_allowed,
)
from app.stream.ws import stream_city


@asynccontextmanager
async def lifespan(app: FastAPI):
    runtime = Runtime()
    app.state.runtime = runtime
    await runtime.start()
    try:
        yield
    finally:
        await runtime.stop()


app = FastAPI(title="NetCity", lifespan=lifespan)
app.add_middleware(LocalOnlyAndOriginMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(configured_allowed_origins()),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket) -> None:
    if not websocket_request_allowed(websocket):
        await close_disallowed_websocket(websocket)
        return
    await stream_city(websocket, websocket.app.state.runtime)
