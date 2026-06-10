# Coding-Agent Prompt — "NetCity" Real-Time Network Traffic Visualizer

> Copy everything below this line into your coding agent (Claude Code, Cursor Agent, Codex, etc.). It is fully self-contained.

---

## 1. Role for the Coding Agent

You are an expert full-stack engineer specializing in real-time systems, network programming, and data visualization. Build the **initial scaffold** for the project described below with clean architecture, fully typed interfaces, sensible defaults, and clear module boundaries. Produce a project that installs and runs locally on the first pass. Favor simple, maintainable, extensible structure over cleverness. Do **not** build features marked "Do not build yet."

---

## 2. Project Summary

**NetCity** is a locally-run web application that captures a user's own network traffic and renders it as a live, animated **isometric city**. Each device on the network is a *building* (size scales with bandwidth usage), and each active connection is a *road* with little *packet-cars* driving along it. Layered on top is a **privacy audit**: every device receives a transparent, rule-based **trust score** derived from where it phones home, how often, and to whom (including matches against a known-tracker blocklist).

**Problem it solves:** Home-network activity is invisible and intangible. People don't realize their smart devices constantly contact ad-trackers and overseas servers. NetCity makes that activity *visible, spatial, and interpretable* at a glance.

**Operating model:** Local-only, single-user, no authentication, no cloud, no persistence beyond runtime. The app's primary data source is **live packet capture** of the host machine's own traffic plus ARP-based device discovery. When live capture cannot start (missing privileges, no capture interface, unsupported platform), the app **automatically falls back to a bundled mock/replay data source** and displays a clearly visible banner stating (a) that the displayed data is mock, and (b) the specific reason live capture failed.

---

## 3. Chosen Tech Stack

**Do not substitute these without strong reason.**

### Backend
- **Language:** Python 3.11+
- **Framework:** FastAPI (async, native WebSocket support)
- **Packet capture:** Scapy (sniffing + ARP discovery)
- **Realtime transport:** WebSocket (FastAPI native)
- **Trust scoring:** Rule-based heuristic module (pure Python, no ML)
- **Tracker detection:** Bundled hosts-file format blocklist (StevenBlack-style; ship a small bundled copy, loader must parse standard hosts format)
- **Testing:** pytest
- **Tooling:** `uv` (or `poetry` if `uv` unavailable) for deps, `ruff` for lint/format

### Frontend
- **Framework:** React + TypeScript via Vite
- **Rendering:** PixiJS (WebGL 2D) for the isometric city and animated packet-cars
- **Building visuals:** Placeholder sprite assets loaded from an assets directory (designed to be swapped later), not procedurally drawn
- **State management:** Zustand
- **Styling/UI:** Tailwind CSS + shadcn/ui (for HUD, side panels, banners)
- **Testing:** Vitest
- **Tooling:** pnpm, eslint + prettier

### Deployment / Dev
- **Local only.** Provide run scripts as the primary path. Provide a `docker-compose.yml` as a documented secondary option, noting that packet capture requires `--net=host` + privileged mode.

---

## 4. Scope Boundary

### Build now (Initial Frame / Skeleton)
- Monorepo layout (`backend/`, `frontend/`, root tooling).
- FastAPI app with a working WebSocket endpoint streaming a `snapshot` then periodic `delta` messages.
- A `TrafficSource` abstraction with **two working implementations**:
  - `LiveCaptureSource` — Scapy-based capture of **this host's traffic + ARP device discovery**. Fully implemented.
  - `MockReplaySource` — replays a bundled **sanitized real capture fixture** (realistic, messy data).
- A **source orchestrator** that attempts live capture first, and on failure falls back to mock while reporting a structured failure reason (enum + human message) that is surfaced to the frontend.
- `analysis/` aggregation (per-device and per-connection rollups) + a working rule-based `trust_scorer` with clearly labeled placeholder weights.
- Hosts-file blocklist loader + a small bundled blocklist file.
- Typed domain model shared in spirit across backend (Python) and frontend (TypeScript).
- React + Vite + TS app: Zustand store, WebSocket client with reconnect, PixiJS scene rendering buildings (from placeholder sprites) + roads + animated packet-cars driven by live store state.
- Device detail panel (click a building → IP/MAC/hostname, top destinations, trust score breakdown).
- A persistent **data-source status banner** that shows LIVE vs MOCK and, when mock, the reason live failed.
- Basic pytest (backend) and Vitest (frontend) suites covering scorer, aggregator, and message decoding.
- README + `docs/architecture.md` + `docker-compose.yml`.

### Stub / mock now
- The bundled blocklist may be a small representative subset (note in README how to swap in the full StevenBlack list).
- The sanitized capture fixture should be small but realistic; include a script or note describing how it was/should be sanitized.

### Do not build yet (Later Additions)
- GeoIP / world-map view.
- Weekly PDF "privacy report card."
- LLM threat-narrator or natural-language query.
- Historical recording + scrubbable timeline.
- Anomaly alerting beyond a simple "new device appeared" visual cue (the cue is optional and may be left as a TODO seam).
- Full promiscuous LAN sniffing (monitor mode / port mirroring). Design `LiveCaptureSource` so this could be added later, but only implement this-host + ARP discovery now.

---

## 5. Functional Requirements

The scaffold must include:

1. A WebSocket endpoint that, on connect, sends a `Snapshot` of current devices + connections, then streams `Delta` updates on an interval.
2. Live capture of the host's own traffic and ARP-based discovery of other devices on the LAN.
3. Automatic, graceful fallback to mock data with a structured, user-visible reason when live capture cannot start.
4. Per-device and per-connection aggregation (bytes in/out, packet counts, destinations, protocols, ports, first/last seen).
5. A transparent rule-based trust score per device, with a breakdown exposing each contributing factor (geo-spread placeholder, destination reputation, contact frequency, known-tracker match).
6. A hosts-file blocklist loader feeding the known-tracker factor.
7. An isometric city rendered in PixiJS: buildings sized by bandwidth, roads for active connections, animated packet-cars whose density/speed reflect traffic.
8. Click-to-select a building, opening a detail panel with the device's data and score breakdown.
9. A status banner reflecting current data-source mode (LIVE / MOCK + reason).

---

## 6. Non-Functional Requirements

- **Type safety:** Strict TypeScript on the frontend; Python type hints throughout, checked-friendly (`ruff`/mypy-compatible). The WS message schema must be explicitly typed on both sides.
- **Modularity:** Capture, analysis, streaming, and API are separate backend modules; net/store/render/ui are separate frontend modules. Swapping the render layer or adding a new `TrafficSource` must not require touching unrelated modules.
- **Extensibility:** Leave clean seams for Later Additions (e.g., a `GeoResolver` interface stub, a `TrafficSource` registry) without implementing them.
- **Maintainability:** Business logic lives only in the backend (`capture/` + `analysis/`); the frontend holds view-state and animation only and never parses raw packets.
- **Performance:** PixiJS scene should sustain ~60fps with a few hundred animated cars. Aggregation and WS deltas must not block the capture loop (use async / a queue between capture and stream).
- **Accessibility:** HUD and panels keyboard-navigable; sufficient contrast; the city has a non-color-only way to read trust (e.g., a label/icon, not just hue).
- **Security/privacy basics:** No outbound third-party calls at runtime (on-brand for a privacy tool). No secrets in the repo. Capture only the host's own traffic. Document that the tool must only be run on networks the user owns.
- **Testing:** Pure logic (trust scorer, aggregator, message codec) must be unit-tested.

---

## 7. Architecture and File Structure

```
netcity/
├── README.md                      # Setup, run (live + mock), privileges, caveats
├── docker-compose.yml             # Optional containerized run (documents --net=host + privileged)
├── docs/
│   └── architecture.md            # System overview, data flow, module boundaries
│
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py                # FastAPI app entry; wires source → analysis → stream
│   │   ├── model/
│   │   │   ├── __init__.py
│   │   │   ├── domain.py          # Device, Connection, TrafficEvent, ScoreBreakdown
│   │   │   └── messages.py        # Snapshot, Delta, WSMessage, SourceStatus + FailureReason enum
│   │   ├── capture/
│   │   │   ├── __init__.py
│   │   │   ├── base.py            # TrafficSource interface (Protocol/ABC)
│   │   │   ├── live.py            # LiveCaptureSource (Scapy: host sniff + ARP discovery)
│   │   │   ├── mock_replay.py     # MockReplaySource (replays bundled fixture)
│   │   │   └── orchestrator.py    # Try live, fall back to mock, expose SourceStatus
│   │   ├── analysis/
│   │   │   ├── __init__.py
│   │   │   ├── aggregator.py      # Rolls TrafficEvents into Device/Connection state
│   │   │   ├── trust_scorer.py    # Pure rule-based scoring + breakdown (placeholder weights)
│   │   │   └── blocklist.py       # Hosts-file parser/loader
│   │   ├── stream/
│   │   │   ├── __init__.py
│   │   │   └── ws.py              # WebSocket: emits Snapshot then Delta on interval
│   │   └── api/
│   │       ├── __init__.py
│   │       └── routes.py          # Minimal REST reads (e.g., GET /devices, GET /status)
│   ├── data/
│   │   ├── blocklist_hosts.txt    # Small bundled hosts-format blocklist (subset)
│   │   └── sample_capture.json    # Sanitized, realistic, messy replay fixture
│   ├── scripts/
│   │   └── sanitize_capture.py    # Notes/util describing how fixture was sanitized
│   └── tests/
│       ├── test_trust_scorer.py
│       ├── test_aggregator.py
│       └── test_messages.py       # (de)serialization of WS messages
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                # Layout: city canvas + HUD + banner + panel
        ├── types/
        │   ├── domain.ts          # Mirror of backend domain types
        │   └── messages.ts        # Mirror of WS message types
        ├── net/
        │   ├── client.ts          # WebSocket client w/ reconnect + backoff
        │   └── decode.ts          # Parse/validate incoming WS messages
        ├── store/
        │   └── cityStore.ts       # Zustand: devices, connections, sourceStatus, selection
        ├── render/
        │   ├── scene.ts           # PixiJS app + isometric grid + render loop
        │   ├── buildings.ts       # Sprite-based building layer (size by bandwidth)
        │   ├── roads.ts           # Connection road graph
        │   ├── cars.ts            # Animated packet-car system
        │   └── geo.ts             # GeoResolver interface STUB (Later Addition seam)
        ├── assets/
        │   └── sprites/           # Placeholder building sprites (swap later)
        └── ui/
            ├── SourceBanner.tsx   # LIVE / MOCK + failure reason
            ├── DetailPanel.tsx    # Selected device details + score breakdown
            ├── Hud.tsx            # Summary stats / controls
            └── Legend.tsx         # What sizes/colors/icons mean
```

---

## 8. Data Models / Types / Interfaces

Define these in `backend/app/model/` and mirror them in `frontend/src/types/`.

```text
TrafficEvent      # internal, near-raw
  ts: float (epoch seconds)
  srcIp: string
  dstIp: string
  protocol: "TCP" | "UDP" | "ICMP" | "OTHER"
  port: int | null
  bytes: int

Device
  id: string                  # stable hash of mac|ip
  ip: string
  mac: string | null
  hostname: string | null
  vendor: string | null       # from MAC OUI if available, else null
  firstSeen: float
  lastSeen: float
  bytesIn: int
  bytesOut: int
  trustScore: int             # 0–100, higher = more trustworthy
  scoreBreakdown: ScoreBreakdown

Connection
  id: string
  srcDeviceId: string
  dstIp: string
  dstHost: string | null
  protocol: "TCP" | "UDP" | "ICMP" | "OTHER"
  port: int | null
  bytes: int
  packetCount: int
  lastSeen: float

ScoreBreakdown                # every factor explainable; placeholder weights, clearly labeled
  geoSpread: float            # placeholder (0 until GeoIP added later)
  destinationReputation: float
  contactFrequency: float
  knownTracker: float         # driven by blocklist matches
  finalScore: int

SourceStatus
  mode: "LIVE" | "MOCK"
  failureReason: FailureReason | null
  message: string             # human-readable explanation when MOCK

FailureReason (enum)
  INSUFFICIENT_PRIVILEGES
  NO_CAPTURE_INTERFACE
  UNSUPPORTED_PLATFORM
  CAPTURE_INIT_ERROR

WSMessage = Snapshot | Delta | StatusUpdate
  Snapshot:     { type: "snapshot", sourceStatus, devices[], connections[] }
  Delta:        { type: "delta", updatedDevices[], updatedConnections[], newEvents[] }
  StatusUpdate: { type: "status", sourceStatus }
```

The bundled `sample_capture.json` should contain a **sanitized, realistic, slightly messy** stream of `TrafficEvent`-shaped records (varied protocols, some chatty tracker-like destinations, a few devices) sufficient to populate a believable city for demos.

---

## 9. API / Service Layer

### WebSocket
- `WS /ws/stream`
  - On connect: send one `Snapshot`.
  - Then: send `Delta` messages on a fixed interval (e.g., every 500ms–1s) reflecting accumulated changes.
  - Send a `StatusUpdate` if the source mode changes during runtime.

### REST (minimal reads only)
- `GET /api/status` → current `SourceStatus`.
- `GET /api/devices` → current list of `Device`.

### Backend service seams
- `TrafficSource` (interface in `capture/base.py`): `start()`, `stop()`, and an async iterator / callback yielding `TrafficEvent`s; a `health()`/`probe()` that raises a typed failure mapped to `FailureReason`.
- `SourceOrchestrator` (`capture/orchestrator.py`): probes `LiveCaptureSource`; on typed failure, instantiates `MockReplaySource` and records the `SourceStatus`.
- `Aggregator` (`analysis/aggregator.py`): consumes `TrafficEvent`s, maintains device/connection state, exposes snapshot + diff.
- `score_device(device, connections, blocklist) -> ScoreBreakdown` (`analysis/trust_scorer.py`): pure function, unit-tested.
- `load_blocklist(path) -> set[str]` (`analysis/blocklist.py`): parses hosts-file format.
- `GeoResolver` (`render/geo.ts` stub + optional backend seam): interface only, returns nulls now.

---

## 10. UI / UX Requirements

- **Layout:** Full-viewport PixiJS city canvas as the centerpiece. Overlay a top **SourceBanner**, a corner **Hud** (summary stats), a **Legend**, and a slide-in **DetailPanel** on selection. Use Tailwind + shadcn/ui for all chrome; keep the canvas itself Pixi-rendered.
- **SourceBanner:** Always visible. Green-ish "LIVE — capturing host traffic" or amber "MOCK DATA — live capture unavailable: <reason message>". Must be unmistakable that data is simulated when in mock mode.
- **City:** Isometric grid. Buildings = devices, drawn from placeholder sprites, scaled by total bandwidth. Roads connect a device building to representations of its destinations; packet-cars animate along roads with density/speed tied to traffic volume. Trust must be readable without relying on color alone (e.g., a small badge or icon on the building, plus color).
- **DetailPanel:** On building click — device IP/MAC/hostname/vendor, bytes in/out, top destinations, and the full trust **score breakdown** with each factor shown.
- **Interactions:** Pan/zoom the city; click to select; Esc to deselect. Keyboard-navigable chrome.
- **Aesthetic:** Clean, modern, slightly "cyberpunk control-room" is welcome but keep it legible. Don't over-design; this is a scaffold.

---

## 11. Implementation Instructions (in order)

1. **Project setup:** Initialize the monorepo. Backend with `uv`/`poetry` + `ruff`; frontend with Vite (React + TS) + pnpm + Tailwind + shadcn/ui + eslint/prettier. Add root README placeholder.
2. **Folder structure:** Create the full tree from Section 7, with empty/typed stub files.
3. **Core types:** Implement `model/domain.py` and `model/messages.py`; mirror in `types/domain.ts` and `types/messages.ts`. Keep the two in sync conceptually.
4. **Capture layer:** Implement `TrafficSource` interface, then `MockReplaySource` (working, drives the app from `sample_capture.json`), then `LiveCaptureSource` (Scapy host sniff + ARP discovery), then `SourceOrchestrator` (live-first, mock-fallback with typed `FailureReason`).
5. **Analysis layer:** Implement `aggregator.py`, `blocklist.py` (+ bundled `blocklist_hosts.txt`), and `trust_scorer.py` with clearly-labeled placeholder weights.
6. **Stream + API:** Implement `stream/ws.py` (snapshot + interval deltas + status updates) and `api/routes.py`. Wire everything in `main.py` with the capture loop decoupled from the WS loop via an async queue.
7. **Frontend transport + store:** Implement `net/client.ts` (reconnect/backoff), `net/decode.ts`, and `store/cityStore.ts`.
8. **Render layer:** Implement `render/scene.ts` (Pixi app + iso grid + loop), `buildings.ts` (placeholder sprites), `roads.ts`, `cars.ts`; add the `geo.ts` stub.
9. **UI chrome:** Implement `SourceBanner`, `Hud`, `Legend`, `DetailPanel`, and `App.tsx` layout.
10. **Tests:** Add pytest for scorer/aggregator/messages and Vitest for store + decode.
11. **Docs:** Write `README.md` (install, run mock-by-default note, run live with privileges, Docker caveat, how to swap the full blocklist, network-ownership warning) and `docs/architecture.md`.
12. **Do not overbuild.** Leave Later Additions as documented seams only.

---

## 12. Acceptance Criteria

- [ ] `backend` installs cleanly and `frontend` installs cleanly with the specified tooling.
- [ ] App runs locally; with no privileges it starts in **MOCK** mode and the banner shows a specific failure reason.
- [ ] When run with capture privileges on an owned network, **LIVE** mode captures host traffic and discovers devices via ARP.
- [ ] No TypeScript build errors; `ruff` and `eslint` pass.
- [ ] The PixiJS city renders buildings, roads, and animated packet-cars from the live store state.
- [ ] Clicking a building opens the DetailPanel with device data and a full trust-score breakdown.
- [ ] WebSocket delivers a snapshot then live deltas; mock data flows end-to-end through the app.
- [ ] Trust scorer, aggregator, and message codec have passing unit tests.
- [ ] Folder structure matches Section 7.
- [ ] README explains setup, both run modes, privileges, the Docker caveat, blocklist swapping, and the network-ownership warning.

---

## 13. Constraints (must NOT do)

- Do **not** add authentication, multi-user support, cloud deployment, or a database/persistence layer.
- Do **not** build any Later Addition: GeoIP/world map, PDF report, LLM features, history/timeline, full promiscuous sniffing, or alerting beyond an optional "new device" TODO seam.
- Do **not** make any outbound third-party network call at runtime.
- Do **not** hardcode secrets or commit large/full blocklists or real un-sanitized captures.
- Do **not** put business/packet logic in the frontend; the frontend never parses raw packets.
- Do **not** substitute the specified stack (FastAPI/Scapy/PixiJS/Zustand/Vite/Tailwind) without strong justification.
- Do **not** procedurally draw buildings — use swappable placeholder sprite assets.
- Do **not** skip the README, architecture doc, or the network-ownership/legal-use warning.
- Do **not** over-engineer: this is a first frame, not the final product.
