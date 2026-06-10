# NetCity Architecture

NetCity is a local-only single-user app. Runtime data flows one way:

```text
TrafficSource -> async queue -> Aggregator -> WebSocket snapshots/deltas -> Zustand store -> PixiJS city
```

## Backend Boundaries

- `capture/` owns packet acquisition and replay. `LiveCaptureSource` implements host traffic capture plus ARP discovery. `MockReplaySource` replays bundled sanitized events. `SourceOrchestrator` chooses live first and falls back to mock with a typed status.
- `analysis/` owns business logic. The aggregator rolls `TrafficEvent` records into device and connection state. The trust scorer is pure and rule-based, with placeholder weights clearly named for later tuning.
- `stream/` owns WebSocket transport. It sends one snapshot on connect, then deltas on an interval.
- `api/` provides minimal read-only REST endpoints.
- `model/` contains the explicit WebSocket and domain schemas.

## Frontend Boundaries

- `net/` connects to the backend and decodes messages.
- `store/` owns view state and backend-derived state.
- `render/` owns PixiJS scene construction and animation only. It never parses raw packets.
- `ui/` owns accessible chrome: data-source banner, HUD, legend, and detail panel.

## Extension Seams

- Add future sources by implementing `TrafficSource` and registering them with the orchestrator.
- Add GeoIP through the frontend `GeoResolver` interface and a future backend resolver, without changing rendering callers.
- Historical timelines, reports, LLM narration, and anomaly systems are intentionally not implemented in this scaffold.

## Privacy And Runtime Calls

The app makes no outbound third-party calls at runtime. Live packet capture is constrained to this host's traffic plus ARP discovery and must only be used on networks the user owns or has permission to inspect.
