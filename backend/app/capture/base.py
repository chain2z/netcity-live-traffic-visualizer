from __future__ import annotations

from typing import Protocol as TypingProtocol

from app.model.messages import FailureReason


class CaptureStartupError(RuntimeError):
    def __init__(self, reason: FailureReason, message: str) -> None:
        super().__init__(message)
        self.reason = reason
        self.message = message


class TrafficSource(TypingProtocol):
    async def probe(self) -> None: ...

    async def start(self) -> None: ...

    async def stop(self) -> None: ...

    def events(self): ...
