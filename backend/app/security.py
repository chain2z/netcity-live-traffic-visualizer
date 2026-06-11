from __future__ import annotations

import os
from ipaddress import ip_address

from fastapi import WebSocket, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

DEFAULT_ALLOWED_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173",
}


class LocalOnlyAndOriginMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        client_host = request.client.host if request.client else None
        if not remote_access_enabled() and not is_local_client_host(client_host):
            return JSONResponse(
                {"detail": "NetCity only accepts local clients by default."},
                status_code=403,
            )

        origin = request.headers.get("origin")
        if not is_allowed_origin(origin):
            return JSONResponse(
                {"detail": "Origin is not allowed for this local NetCity instance."},
                status_code=403,
            )

        return await call_next(request)


def configured_allowed_origins() -> set[str]:
    configured = os.getenv("NETCITY_ALLOWED_ORIGINS")
    if not configured:
        return set(DEFAULT_ALLOWED_ORIGINS)

    origins = {normalize_origin(origin) for origin in configured.split(",") if origin.strip()}
    return origins or set(DEFAULT_ALLOWED_ORIGINS)


def is_allowed_origin(origin: str | None, allowed_origins: set[str] | None = None) -> bool:
    if origin is None:
        return True
    return normalize_origin(origin) in (allowed_origins or configured_allowed_origins())


def is_local_client_host(host: str | None) -> bool:
    if not host:
        return False
    if host == "localhost" or host == "testclient":
        return True
    try:
        return ip_address(host).is_loopback
    except ValueError:
        return False


def remote_access_enabled() -> bool:
    return os.getenv("NETCITY_ALLOW_REMOTE", "").lower() in {"1", "true", "yes"}


def websocket_request_allowed(websocket: WebSocket) -> bool:
    client_host = websocket.client.host if websocket.client else None
    if not remote_access_enabled() and not is_local_client_host(client_host):
        return False
    return is_allowed_origin(websocket.headers.get("origin"))


async def close_disallowed_websocket(websocket: WebSocket) -> None:
    await websocket.close(code=status.WS_1008_POLICY_VIOLATION)


def normalize_origin(origin: str) -> str:
    return origin.strip().rstrip("/")
