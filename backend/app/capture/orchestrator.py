from __future__ import annotations

from app.model.messages import SourceStatus

from .base import CaptureStartupError, TrafficSource
from .live import LiveCaptureSource
from .mock_replay import MockReplaySource


class SourceOrchestrator:
    def __init__(
        self,
        live_source: TrafficSource | None = None,
        mock_source: TrafficSource | None = None,
    ) -> None:
        self.live_source = live_source or LiveCaptureSource()
        self.mock_source = mock_source or MockReplaySource()
        self.source: TrafficSource | None = None
        self.status = SourceStatus(
            mode="MOCK",
            failureReason=None,
            message="Source has not started yet.",
        )

    async def start(self) -> TrafficSource:
        try:
            await self.live_source.probe()
            await self.live_source.start()
            self.source = self.live_source
            self.status = SourceStatus(
                mode="LIVE",
                failureReason=None,
                message="Capturing host traffic.",
            )
        except CaptureStartupError as exc:
            await self.mock_source.start()
            self.source = self.mock_source
            self.status = SourceStatus(
                mode="MOCK",
                failureReason=exc.reason,
                message=exc.message,
            )
        except Exception as exc:
            await self.mock_source.start()
            self.source = self.mock_source
            self.status = SourceStatus(
                mode="MOCK",
                failureReason="CAPTURE_INIT_ERROR",
                message=f"Live capture could not start: {exc}",
            )
        return self.source

    async def stop(self) -> None:
        if self.source:
            await self.source.stop()
