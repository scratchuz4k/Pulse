# Phase 1: Two Clients Talking - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove the architecture: two Electron+Vue clients connect to a C# ASP.NET server via SignalR and establish a WebRTC peer-to-peer voice call. Both clients must register/login, join the same named room, and hear each other in real time. Server tracks room state only — no audio passes through the server in this phase.

</domain>

<decisions>
## Implementation Decisions

### Voice Transport
- **D-01:** Audio transport is **WebRTC** — browser-native API via Electron's Chromium. No C# WebRTC library needed on the client.
- **D-02:** For Phase 1, audio is **peer-to-peer** — once WebRTC connects, audio flows directly client-to-client. Server does not relay audio packets.
- **D-03:** NAT traversal: use a **public STUN server** (e.g., `stun.l.google.com:19302`) to start. No TURN server in Phase 1 — add if users behind strict NAT report connectivity failures.

### Signaling
- **D-04:** Signaling (SDP offer/answer, ICE candidates) travels over **SignalR** hub on the C# server. Typed hub methods. Clients send their SDP to the server, server routes it to the right peer.

### Server Architecture
- **D-05:** Server tracks: room registry (room name → list of connected SignalR connection IDs), user identity per connection. No audio data touches the server.
- **D-06:** Client disconnect handling via **SignalR `OnDisconnectedAsync`** — server removes the client from room state automatically on drop/crash.
- **D-07:** Audio relay logic sits behind an **interface/abstraction** even in Phase 1 (e.g., `IAudioRouter`). Phase 1 implementation is a no-op / P2P coordinator. Future phases plug in an SFU without rewiring the hub. This is a deliberate architectural seam.

### Client Framework
- **D-08:** Desktop client is **Electron** wrapping a **Vue 3** app. Electron handles OS integration (system tray, process management); Vue handles all UI. TypeScript preferred.
- **D-09:** The design files in `/Design/` (JSX wireframes, CSS) are the UI reference. They will need to be adapted from React JSX to Vue 3 SFCs — treat them as layout/design spec, not copy-paste source.
- **D-10:** WebRTC calls use the browser's native `RTCPeerConnection` API — no third-party WebRTC library on the client.
- **D-11:** Client communicates with the server via the **`@microsoft/signalr`** npm package (the official JS SignalR client).

### Authentication
- **D-12:** Auth: **JWT + username/password**. Server issues a JWT on login. Client stores it and attaches it to the SignalR connection as a Bearer token.
- **D-13:** Token strategy: **short-lived access token (15–60 min) + refresh token**. Refresh token is long-lived. Electron client handles silent refresh.
- **D-14:** Username is a **display name only** — no uniqueness enforced. Server assigns a unique internal GUID as the user's identity. Display name is for UI only in Phase 1.

### Claude's Discretion
- STUN server choice: use `stun.l.google.com:19302` as the default ICE server config. Add a second public STUN (`stun1.l.google.com:19302`) for redundancy.
- JWT signing: use HMAC-SHA256 (`HS256`) for Phase 1. Switch to RS256 if multi-server deployment becomes needed later.
- Refresh token storage in Electron: store in the OS keychain via `keytar` or in an encrypted local file — do not store in `localStorage`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design & UI
- `Design/Guildhall Wireframes.html` — Full wireframe suite showing the Pulse home, voice room layout, participant list, and speaking indicators. Use as the visual contract for Phase 1 client UI.
- `Design/direction-a.jsx` — Direction A: section sub-rail + channel list pattern
- `Design/direction-b.jsx` — Direction B: alternative layout
- `Design/direction-c.jsx` — Direction C: alternative layout
- `Design/app-shared.jsx` — Shared UI components referenced by all three directions
- `Design/app.css` + `Design/wireframe.css` — Styling system

### Requirements
- `.planning/REQUIREMENTS.md` — Full v1 requirements. Phase 1 covers: VOICE-01, VOICE-02, VOICE-03, SRV-01, SRV-02, SRV-03

### Project Context
- `.planning/PROJECT.md` — Core value, tech decisions, scope boundaries

No external ADRs or specs yet — all decisions captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project. No existing code to reuse.

### Established Patterns
- None yet — Phase 1 establishes the patterns all subsequent phases will follow.

### Integration Points
- Phase 1 output (SignalR hub, room state service, JWT auth, Vue+Electron shell) is the foundation every subsequent phase builds on.

</code_context>

<specifics>
## Specific Ideas

- The design uses the name "Guildhall" internally; the product is **Pulse**. Use "Pulse" everywhere in code and UI.
- The design files are JSX (React) — they need to be ported to Vue 3 Single File Components. Treat them as pixel-level design reference, not as runnable code.
- The `IAudioRouter` abstraction (D-07) is deliberate: when Phase 3 (Priority Speaker) arrives, swapping in an SFU or server-side mixer should not require touching the SignalR hub.

</specifics>

<deferred>
## Deferred Ideas

- TURN server / relay for strict-NAT users — Phase 1 uses STUN only; add TURN when connectivity complaints arise
- Unique username enforcement — deferred, display name only for Phase 1
- Multi-party WebRTC mesh (more than 2 clients) — Phase 2 handles this when full room experience is built
- SFU / server-side audio mixing for priority speaker and whispers — Phases 3 and 4

</deferred>

---

*Phase: 1-Two Clients Talking*
*Context gathered: 2026-06-09*
