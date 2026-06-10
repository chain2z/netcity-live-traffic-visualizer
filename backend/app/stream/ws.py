from __future__ import annotations

import asyncio

from fastapi import WebSocket, WebSocketDisconnect

from app.model.messages import Delta, Snapshot
from app.runtime import Runtime


async def stream_city(
    websocket: WebSocket,
    runtime: Runtime,
    interval_seconds: float = 0.75,
) -> None:
    await websocket.accept()
    async with runtime.lock:
        devices, connections = runtime.aggregator.snapshot()
        snapshot = Snapshot(
            sourceStatus=runtime.orchestrator.status,
            devices=devices,
            connections=connections,
        )
    await websocket.send_json(snapshot.model_dump(mode="json"))

    try:
        while True:
            await asyncio.sleep(interval_seconds)
            async with runtime.lock:
                devices, connections, events = runtime.aggregator.delta()
            if not devices and not connections and not events:
                continue
            delta = Delta(
                updatedDevices=devices,
                updatedConnections=connections,
                newEvents=events,
            )
            await websocket.send_json(delta.model_dump(mode="json"))
    except WebSocketDisconnect:
        return
