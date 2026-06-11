# NetCity

NetCity is a local-only real-time network traffic visualizer. It captures this host's traffic when possible, falls back to bundled mock replay data when capture cannot start, and renders traffic as an isometric city.

This is the initial scaffold described in `netcity-coding-agent-prompt.md`.

## Quick Start

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The API serves:

- `GET /api/status`
- `GET /api/devices`
- `WS /ws/stream`

### Frontend

```bash
cd frontend
corepack enable
corepack pnpm install
corepack pnpm dev
```

The Vite app expects the backend at `http://localhost:8000`.

On Windows, run the backend from an Administrator terminal for live capture.

## Security Model

NetCity is a local-only tool and intentionally has no authentication. The backend binds to localhost in the documented run command, rejects non-loopback clients by default, and only accepts browser origins from the local Vite app. WebSocket origin checks matter because browser CORS does not protect WebSocket streams.

To use a different local frontend origin, set:

```bash
NETCITY_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

`NETCITY_ALLOW_REMOTE=1` disables the loopback-only client check and should only be used on a trusted isolated network.

## Live vs Mock Data

NetCity tries `LiveCaptureSource` first. Live capture uses Scapy and usually requires administrator/root privileges plus a working capture driver such as Npcap on Windows. If live capture cannot start, NetCity automatically switches to `MockReplaySource` and shows a persistent banner with the structured failure reason.

You can force mock mode for demos:

```bash
NETCITY_FORCE_MOCK=1 uv run fastapi dev app/main.py
```

On PowerShell:

```powershell
$env:NETCITY_FORCE_MOCK = "1"
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Running With Capture Privileges

Only run NetCity on networks you own or are authorized to inspect. The live source is intentionally limited to this host's IP traffic plus ARP-based LAN discovery. Full promiscuous LAN sniffing, monitor mode, and port mirroring are later additions and are not implemented here.

### Windows Capture Troubleshooting

If `uv run python scripts/check_capture_env.py` prints `WARNING: No libpcap provider available ! pcap won't be used`, Scapy can import but cannot use the packet capture provider. Install or reinstall Npcap and enable the WinPcap API-compatible mode option, then restart the Administrator terminal.

## Blocklist

`backend/data/blocklist_hosts.txt` is a tiny hosts-file-format representative subset. To use the full StevenBlack list, replace this file with a standard hosts-format list. The loader ignores comments, blank lines, localhost entries, and malformed lines.

## Docker

`docker-compose.yml` is provided as a secondary development option. Packet capture inside Docker needs host networking and privileged mode; Docker Desktop platforms may still restrict capture behavior. Mock mode remains the reliable demo path.

## Checks

Backend:

```bash
cd backend
uv run pytest
uv run ruff check .
```

Frontend:

```bash
cd frontend
corepack pnpm test
corepack pnpm build
corepack pnpm lint
```
