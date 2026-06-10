from __future__ import annotations

import hashlib
import ipaddress
from collections import defaultdict

from app.analysis.trust_scorer import score_device
from app.model.domain import Connection, Device, ScoreBreakdown, TrafficEvent


class Aggregator:
    def __init__(self, blocklist: set[str] | None = None) -> None:
        self.blocklist = blocklist or set()
        self.devices: dict[str, Device] = {}
        self._device_by_ip: dict[str, str] = {}
        self.connections: dict[str, Connection] = {}
        self._pending_device_ids: set[str] = set()
        self._pending_connection_ids: set[str] = set()
        self._pending_events: list[TrafficEvent] = []
        self._top_destination_hosts: dict[str, dict[str, int]] = defaultdict(
            lambda: defaultdict(int)
        )

    def ingest(self, event: TrafficEvent) -> None:
        src_id = self._ensure_device(event.srcIp, event.ts)
        src_device = self.devices[src_id]
        dst_is_local = _is_private_ip(event.dstIp)

        if dst_is_local:
            dst_id = self._ensure_device(event.dstIp, event.ts)
            dst_device = self.devices[dst_id]
            dst_device.bytesIn += event.bytes
            dst_device.lastSeen = event.ts
            self._pending_device_ids.add(dst_id)

        src_device.bytesOut += event.bytes
        src_device.lastSeen = event.ts
        self._pending_device_ids.add(src_id)

        dst_host = _safe_reverse_dns(event.dstIp)
        connection_id = _connection_id(src_id, event.dstIp, event.protocol, event.port)
        connection = self.connections.get(connection_id)
        if connection is None:
            connection = Connection(
                id=connection_id,
                srcDeviceId=src_id,
                dstIp=event.dstIp,
                dstHost=dst_host,
                protocol=event.protocol,
                port=event.port,
                bytes=0,
                packetCount=0,
                lastSeen=event.ts,
            )
            self.connections[connection_id] = connection

        connection.bytes += event.bytes
        connection.packetCount += 1
        connection.lastSeen = event.ts
        if dst_host and connection.dstHost is None:
            connection.dstHost = dst_host
        self._top_destination_hosts[src_id][connection.dstHost or connection.dstIp] += event.bytes

        self._rescore_device(src_id)
        self._pending_connection_ids.add(connection_id)
        self._pending_events.append(event)

    def snapshot(self) -> tuple[list[Device], list[Connection]]:
        return list(self.devices.values()), list(self.connections.values())

    def delta(self) -> tuple[list[Device], list[Connection], list[TrafficEvent]]:
        devices = [self.devices[id_] for id_ in self._pending_device_ids if id_ in self.devices]
        connections = [
            self.connections[id_] for id_ in self._pending_connection_ids if id_ in self.connections
        ]
        events = self._pending_events[:]
        self._pending_device_ids.clear()
        self._pending_connection_ids.clear()
        self._pending_events.clear()
        return devices, connections, events

    def top_destinations(self, device_id: str, limit: int = 5) -> list[tuple[str, int]]:
        destinations = self._top_destination_hosts.get(device_id, {})
        return sorted(destinations.items(), key=lambda item: item[1], reverse=True)[:limit]

    def _ensure_device(self, ip: str, ts: float) -> str:
        if ip in self._device_by_ip:
            device_id = self._device_by_ip[ip]
            self.devices[device_id].lastSeen = ts
            return device_id

        device_id = _device_id(ip)
        device = Device(
            id=device_id,
            ip=ip,
            mac=None,
            hostname=_safe_reverse_dns(ip),
            vendor=None,
            firstSeen=ts,
            lastSeen=ts,
            bytesIn=0,
            bytesOut=0,
            trustScore=100,
            scoreBreakdown=ScoreBreakdown(
                geoSpread=0.0,
                destinationReputation=0.0,
                contactFrequency=0.0,
                knownTracker=0.0,
                finalScore=100,
            ),
        )
        self.devices[device_id] = device
        self._device_by_ip[ip] = device_id
        self._pending_device_ids.add(device_id)
        return device_id

    def _rescore_device(self, device_id: str) -> None:
        device = self.devices[device_id]
        breakdown = score_device(device, list(self.connections.values()), self.blocklist)
        device.scoreBreakdown = breakdown
        device.trustScore = breakdown.finalScore


def _device_id(ip: str) -> str:
    return hashlib.sha1(ip.encode("utf-8")).hexdigest()[:12]


def _connection_id(src_device_id: str, dst_ip: str, protocol: str, port: int | None) -> str:
    raw = f"{src_device_id}|{dst_ip}|{protocol}|{port or ''}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _safe_reverse_dns(ip: str) -> str | None:
    if _is_private_ip(ip):
        return None
    return _known_demo_host(ip)


def _known_demo_host(ip: str) -> str | None:
    demo_hosts = {
        "142.250.190.78": "clients4.google.com",
        "31.13.70.36": "graph.facebook.com",
        "34.117.59.81": "api.segment.io",
        "52.85.247.12": "telemetry.example.net",
        "1.1.1.1": "one.one.one.one",
        "8.8.8.8": "dns.google",
    }
    return demo_hosts.get(ip)


def _is_private_ip(ip: str) -> bool:
    try:
        parsed = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return parsed.is_private or parsed.is_loopback or parsed.is_link_local
