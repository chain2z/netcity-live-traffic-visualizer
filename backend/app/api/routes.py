from __future__ import annotations

from fastapi import APIRouter, Request

from app.model.domain import Device
from app.model.messages import SourceStatus
from app.runtime import Runtime

router = APIRouter(prefix="/api")


def get_runtime(request: Request) -> Runtime:
    return request.app.state.runtime


@router.get("/status", response_model=SourceStatus)
async def get_status(request: Request) -> SourceStatus:
    runtime = get_runtime(request)
    return runtime.orchestrator.status


@router.get("/devices", response_model=list[Device])
async def get_devices(request: Request) -> list[Device]:
    runtime = get_runtime(request)
    async with runtime.lock:
        devices, _ = runtime.aggregator.snapshot()
    return devices
