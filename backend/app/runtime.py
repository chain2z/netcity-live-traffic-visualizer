from __future__ import annotations

import asyncio

from app.analysis.aggregator import Aggregator
from app.analysis.blocklist import load_blocklist
from app.capture.orchestrator import SourceOrchestrator
from app.data_paths import DATA_DIR


class Runtime:
    def __init__(self) -> None:
        self.orchestrator = SourceOrchestrator()
        self.aggregator = Aggregator(load_blocklist(DATA_DIR / "blocklist_hosts.txt"))
        self.lock = asyncio.Lock()
        self._capture_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        source = await self.orchestrator.start()
        self._capture_task = asyncio.create_task(self._capture_loop(source))

    async def stop(self) -> None:
        if self._capture_task:
            self._capture_task.cancel()
            try:
                await self._capture_task
            except asyncio.CancelledError:
                pass
        await self.orchestrator.stop()

    async def _capture_loop(self, source) -> None:
        async for event in source.events():
            async with self.lock:
                self.aggregator.ingest(event)
