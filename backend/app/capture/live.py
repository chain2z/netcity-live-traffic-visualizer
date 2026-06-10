from __future__ import annotations

import asyncio
import ctypes
import ipaddress
import os
import platform
import socket
import threading
import time
from contextlib import suppress

from app.model.domain import Protocol, TrafficEvent
from app.model.messages import FailureReason

from .base import CaptureStartupError


class LiveCaptureSource:
    def __init__(self, interface: str | None = None) -> None:
        self.interface = interface
        self._queue: asyncio.Queue[TrafficEvent] = asyncio.Queue()
        self._stop_event = threading.Event()
        self._sniff_thread: threading.Thread | None = None
        self._arp_task: asyncio.Task[None] | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    async def probe(self) -> None:
        if os.getenv("NETCITY_FORCE_MOCK") == "1":
            raise CaptureStartupError(
                FailureReason.CAPTURE_INIT_ERROR,
                "Mock mode was requested with NETCITY_FORCE_MOCK=1.",
            )
        if platform.system() not in {"Windows", "Linux", "Darwin"}:
            raise CaptureStartupError(
                FailureReason.UNSUPPORTED_PLATFORM,
                f"Unsupported platform for live capture: {platform.system()}",
            )
        if not _has_capture_privileges():
            raise CaptureStartupError(
                FailureReason.INSUFFICIENT_PRIVILEGES,
                "Live capture requires administrator/root privileges.",
            )

        try:
            from scapy.all import conf, get_working_if  # type: ignore
        except Exception as exc:  # pragma: no cover - depends on host install
            raise CaptureStartupError(
                FailureReason.CAPTURE_INIT_ERROR,
                f"Scapy could not initialize: {exc}",
            ) from exc
        if platform.system() == "Windows" and not getattr(conf, "use_pcap", False):
            raise CaptureStartupError(
                FailureReason.CAPTURE_INIT_ERROR,
                "Npcap/libpcap is unavailable, so Windows live packet capture cannot start.",
            )

        iface = self.interface or get_working_if()
        if not iface or conf.iface is None:
            raise CaptureStartupError(
                FailureReason.NO_CAPTURE_INTERFACE,
                "No capture interface was available.",
            )
        self.interface = str(iface)

    async def start(self) -> None:
        await self.probe()
        self._loop = asyncio.get_running_loop()
        self._stop_event.clear()
        self._sniff_thread = threading.Thread(target=self._sniff_packets, daemon=True)
        self._sniff_thread.start()
        self._arp_task = asyncio.create_task(self._arp_discovery_loop())

    async def stop(self) -> None:
        self._stop_event.set()
        if self._arp_task:
            self._arp_task.cancel()
            with suppress(asyncio.CancelledError):
                await self._arp_task
        if self._sniff_thread and self._sniff_thread.is_alive():
            self._sniff_thread.join(timeout=2)

    async def events(self):
        while not self._stop_event.is_set():
            yield await self._queue.get()

    def _sniff_packets(self) -> None:
        try:
            from scapy.all import ICMP, IP, TCP, UDP, sniff  # type: ignore

            def handle(packet) -> None:
                if self._loop is None or IP not in packet:
                    return
                protocol: Protocol = "OTHER"
                port: int | None = None
                if TCP in packet:
                    protocol = "TCP"
                    port = int(packet[TCP].dport)
                elif UDP in packet:
                    protocol = "UDP"
                    port = int(packet[UDP].dport)
                elif ICMP in packet:
                    protocol = "ICMP"

                event = TrafficEvent(
                    ts=time.time(),
                    srcIp=str(packet[IP].src),
                    dstIp=str(packet[IP].dst),
                    protocol=protocol,
                    port=port,
                    bytes=len(packet),
                )
                self._loop.call_soon_threadsafe(self._queue.put_nowait, event)

            sniff(
                iface=self.interface,
                filter="ip",
                prn=handle,
                store=False,
                stop_filter=lambda _: self._stop_event.is_set(),
            )
        except Exception as exc:
            print(f"Live capture stopped: {exc}")

    async def _arp_discovery_loop(self) -> None:
        while not self._stop_event.is_set():
            await asyncio.to_thread(self._send_arp_probe)
            await asyncio.sleep(30)

    def _send_arp_probe(self) -> None:
        try:
            from scapy.all import ARP, Ether, get_if_addr, srp  # type: ignore

            iface = self.interface
            host_ip = get_if_addr(iface)
            network = ipaddress.ip_network(f"{host_ip}/24", strict=False)
            packet = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=str(network))
            answered, _ = srp(packet, timeout=1, verbose=False, iface=iface)
            if self._loop is None:
                return
            for _, response in answered:
                event = TrafficEvent(
                    ts=time.time(),
                    srcIp=str(response.psrc),
                    dstIp=str(host_ip),
                    protocol="OTHER",
                    port=None,
                    bytes=0,
                )
                self._loop.call_soon_threadsafe(self._queue.put_nowait, event)
        except Exception:
            return


def _has_capture_privileges() -> bool:
    if platform.system() == "Windows":
        try:
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        except Exception:
            return False
    if hasattr(os, "geteuid"):
        return os.geteuid() == 0
    with suppress(OSError):
        sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_IP)
        sock.close()
        return True
    return False
