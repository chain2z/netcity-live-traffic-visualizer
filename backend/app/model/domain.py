from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Protocol = Literal["TCP", "UDP", "ICMP", "OTHER"]


class TrafficEvent(BaseModel):
    ts: float
    srcIp: str
    dstIp: str
    protocol: Protocol
    port: int | None = None
    bytes: int = Field(ge=0)


class ScoreBreakdown(BaseModel):
    geoSpread: float
    destinationReputation: float
    contactFrequency: float
    knownTracker: float
    finalScore: int = Field(ge=0, le=100)


class Device(BaseModel):
    id: str
    ip: str
    mac: str | None = None
    hostname: str | None = None
    vendor: str | None = None
    firstSeen: float
    lastSeen: float
    bytesIn: int = 0
    bytesOut: int = 0
    trustScore: int = Field(ge=0, le=100, default=100)
    scoreBreakdown: ScoreBreakdown = Field(
        default_factory=lambda: ScoreBreakdown(
            geoSpread=0.0,
            destinationReputation=0.0,
            contactFrequency=0.0,
            knownTracker=0.0,
            finalScore=100,
        )
    )


class Connection(BaseModel):
    id: str
    srcDeviceId: str
    dstIp: str
    dstHost: str | None = None
    protocol: Protocol
    port: int | None = None
    bytes: int = 0
    packetCount: int = 0
    lastSeen: float
