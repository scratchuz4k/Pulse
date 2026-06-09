# Phase 1: Two Clients Talking - Context

**Gathered:** 2026-06-09
**Updated:** 2026-06-09 (pivoted from P2P WebRTC to LiveKit SFU)
**Status:** Ready for planning

<domain>
## Phase Boundary

Prove the architecture: two or more Electron+Vue clients connect to a C# server, authenticate with JWT, join a LiveKit room, and hear each other in real time. The C# server issues LiveKit room tokens; LiveKit handles all WebRTC signaling and media routing. Server tracks room membership for the Pulse UI — LiveKit owns the audio transport.

</domain>

<decisions>
## Implementation Decisions

### Voice Transport
- **D-01:** Audio transport is **WebRTC via LiveKit SFU**. Clients connect to a LiveKit server, not directly to each other. LiveKit handles SDP negotiation, ICE, DTLS — the client uses the `livekit-client` JS SDK.
- **D-02:** Architecture is **SFU (Selective Forwarding Unit)** from Phase 1. P2P mesh was considered and rejected — user is planning for larger rooms. LiveKit scales to hundreds of participants.
- **D-03:** NAT traversal is handled entirely by LiveKit (it manages its own STUN/TURN internally). No custom ICE server config needed on the client.

### Signaling & Room Token Flow
- **D-04:** The C# server is the **token issuer**, not the media router. Flow:
  1. Client authenticates (JWT from C# server)
  2. Client calls C# server endpoint `POST /rooms/token?roomName=X`
  3. C# server calls LiveKit server API to create the room (if needed) and generate a participant token
  4. Client receives the LiveKit token and connects directly to LiveKit using `livekit-client`
- **D-05:** SignalR is **retained** for Pulse presence data — who is in which room, speaking indicators, room list updates. SignalR does NOT carry WebRTC signaling (LiveKit owns that). SignalR carries Pulse-specific events only.
- **D-06:** Client disconnect handling: LiveKit fires participant disconnect events; C# server listens via LiveKit webhooks (or tracks via SignalR `OnDisconnectedAsync`) to update Pulse room state.

### Server Architecture
- **D-07:** The `IAudioRouter` abstraction is **removed**. With LiveKit as the permanent SFU, the abstraction seam is unnecessary complexity. The C# server's role is: auth, LiveKit token generation, and Pulse presence state. It is not in the audio path at all.
- **D-08:** LiveKit server runs as a **separate process** alongside the C# server. In dev: `livekit-server --dev` (single binary, no Docker required). In production: LiveKit Cloud or self-hosted Docker.
- **D-09:** The C# server communicates with LiveKit using the **LiveKit Server SDK for .NET** (`Livekit.Server.Sdk.Dotnet` NuGet) to generate tokens. Room creation is implicit — LiveKit creates rooms automatically on first participant join.

### Client Framework
- **D-10:** Desktop client is **Electron + Vue 3 + TypeScript**. Same as originally planned.
- **D-11:** Audio/video is handled by the **`livekit-client`** npm package. No manual `RTCPeerConnection` code on the client — `livekit-client` manages the full WebRTC lifecycle.
- **D-12:** Pulse UI events (room list, presence) still come through **`@microsoft/signalr`** — separate from the LiveKit connection.
- **D-13:** The design files in `/Design/` are the UI reference (JSX → Vue 3 SFCs).

### Authentication
- **D-14:** Auth: **JWT + username/password** via C# server (unchanged).
- **D-15:** Token strategy: short-lived access token (30 min) + refresh token (7 days, DB-backed, rotated on use).
- **D-16:** Display name only — server assigns internal GUID. LiveKit participant identity = user GUID.
- **D-17:** LiveKit room token has a short TTL (1 hour). Client requests a fresh token each time it joins a room.

### Claude's Discretion
- LiveKit dev server: use `livekit-server --dev --bind 0.0.0.0` so both Electron windows on the same machine can reach it.
- LiveKit API key/secret for dev: hardcode in `appsettings.Development.json` (`LiveKit:ApiKey`, `LiveKit:ApiSecret`, `LiveKit:Host`). Do not commit these to git — add to `.gitignore`.
- JWT signing: HS256, same as before.
- Refresh token storage in Electron: `electron-store` with `encryptionKey` from `node-machine-id`.
- LiveKit token generation: use `Livekit.Server.Sdk.Dotnet` — do not implement JWT token generation manually for LiveKit (it has a specific format).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design & UI
- `Design/Guildhall Wireframes.html` — Full wireframe suite. Use as visual contract for Phase 1 client UI.
- `Design/direction-a.jsx`, `direction-b.jsx`, `direction-c.jsx` — Three layout directions (JSX, port to Vue)
- `Design/app-shared.jsx`, `app.css`, `wireframe.css` — Shared components and styles

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 1 covers: VOICE-01, VOICE-02, VOICE-03, SRV-01, SRV-02, SRV-03

### Project Context
- `.planning/PROJECT.md` — Core value, tech decisions, scope boundaries

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project.

### Established Patterns
- None yet — Phase 1 establishes the patterns all subsequent phases follow.

### Integration Points
- Phase 1 output (C# auth server, LiveKit token endpoint, SignalR presence hub, Vue+Electron shell with livekit-client) is the foundation every subsequent phase builds on.
- Phases 3 (Priority Speaker) and 4 (Whisper) will use LiveKit features: audio levels API for speaking detection, sub-rooms or selective subscriptions for whisper groups.

</code_context>

<specifics>
## Specific Ideas

- The design uses the name "Guildhall" internally; the product is **Pulse**. Use "Pulse" everywhere.
- LiveKit rooms are created implicitly — client joins with a token and LiveKit creates the room if it doesn't exist. No explicit "create room" API call needed in Phase 1.
- LiveKit participant identity should be the user's server-side GUID (not display name) for stable identity across reconnects.
- LiveKit `Room` object exposes `activeSpeakers` and `AudioLevel` events — these will be used in Phase 2 for speaking indicators without additional infrastructure.

</specifics>

<deferred>
## Deferred Ideas

- LiveKit Cloud vs self-hosted decision — Phase 1 uses local dev server; production deployment decided later
- Unique username enforcement — display name only for Phase 1
- LiveKit webhooks for server-side participant events — Phase 2 when presence needs to be authoritative
- Room persistence (rooms survive server restart) — Phase 2

</deferred>

---

*Phase: 1-Two Clients Talking*
*Context gathered: 2026-06-09 | Updated: 2026-06-09 (LiveKit SFU pivot)*
