from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.runtime import Runtime
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.include_router(router)


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket) -> None:
    await stream_city(websocket, websocket.app.state.runtime)
