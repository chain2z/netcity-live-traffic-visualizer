from __future__ import annotations

import asyncio
import json
from pathlib import Path

from app.data_paths import DATA_DIR
from app.model.domain import TrafficEvent


class MockReplaySource:
    def __init__(self, fixture_path: Path | None = None, interval_seconds: float = 0.35) -> None:
        self.fixture_path = fixture_path or DATA_DIR / "sample_capture.json"
        self.interval_seconds = interval_seconds
        self._queue: asyncio.Queue[TrafficEvent] = asyncio.Queue()
        self._task: asyncio.Task[None] | None = None
        self._stopped = asyncio.Event()

    async def probe(self) -> None:
        if not self.fixture_path.exists():
            raise FileNotFoundError(f"Mock replay fixture not found: {self.fixture_path}")

    async def start(self) -> None:
        await self.probe()
        self._stopped.clear()
        self._task = asyncio.create_task(self._replay_loop())

    async def stop(self) -> None:
        self._stopped.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def events(self):
        while not self._stopped.is_set():
            yield await self._queue.get()

    async def _replay_loop(self) -> None:
        raw_events = json.loads(self.fixture_path.read_text(encoding="utf-8"))
        events = [TrafficEvent.model_validate(item) for item in raw_events]
        if not events:
            return

        while not self._stopped.is_set():
            for event in events:
                if self._stopped.is_set():
                    break
                now = asyncio.get_running_loop().time()
                replayed = event.model_copy(update={"ts": now})
                await self._queue.put(replayed)
                await asyncio.sleep(self.interval_seconds)
