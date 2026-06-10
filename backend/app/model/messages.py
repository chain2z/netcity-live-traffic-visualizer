from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, Field

from app.model.domain import Connection, Device, TrafficEvent


class FailureReason(StrEnum):
    INSUFFICIENT_PRIVILEGES = "INSUFFICIENT_PRIVILEGES"
    NO_CAPTURE_INTERFACE = "NO_CAPTURE_INTERFACE"
    UNSUPPORTED_PLATFORM = "UNSUPPORTED_PLATFORM"
    CAPTURE_INIT_ERROR = "CAPTURE_INIT_ERROR"


class SourceStatus(BaseModel):
    mode: Literal["LIVE", "MOCK"]
    failureReason: FailureReason | None = None
    message: str


class Snapshot(BaseModel):
    type: Literal["snapshot"] = "snapshot"
    sourceStatus: SourceStatus
    devices: list[Device]
    connections: list[Connection]


class Delta(BaseModel):
    type: Literal["delta"] = "delta"
    updatedDevices: list[Device]
    updatedConnections: list[Connection]
    newEvents: list[TrafficEvent]


class StatusUpdate(BaseModel):
    type: Literal["status"] = "status"
    sourceStatus: SourceStatus


WSMessage = Annotated[Snapshot | Delta | StatusUpdate, Field(discriminator="type")]
