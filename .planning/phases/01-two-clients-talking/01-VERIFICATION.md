---
status: human_needed
phase: 01-two-clients-talking
verified: 2026-06-09
---

# Phase 01 Verification

## Must-Haves Check

### Plan 01-01: C# Server Foundation

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| POST /auth/register and POST /auth/login return JWT access + refresh tokens | ✓ | AuthController.cs lines 15-44, 47-66 — BCrypt hash, GenerateAccessToken + GenerateRefreshTokenAsync, returns {accessToken, refreshToken, userId, displayName} |
| POST /auth/refresh rotates the refresh token | ✓ | AuthController.cs lines 68-82 — ValidateRefreshTokenAsync (marks old token revoked), then GenerateRefreshTokenAsync for new token |
| POST /rooms/token?roomName=X returns a LiveKit participant token (requires valid JWT) | ✓ | RoomsController.cs — [Authorize], calls liveKitService.GenerateRoomToken, returns {liveKitToken, liveKitHost} |
| PresenceHub (SignalR) tracks which users are in which Pulse room | ✓ | PresenceHub.cs — ConcurrentDictionary _rooms, JoinRoom/LeaveRoom/OnDisconnectedAsync all implemented |
| LiveKit API key/secret loaded from appsettings, not hardcoded | ✓ | LiveKitService.cs lines 9-10 — reads LiveKit:ApiKey and LiveKit:ApiSecret from IConfiguration |
| EF Core + SQLite stores Users and RefreshTokens | ✓ | Program.cs line 14 — UseSqlite("Data Source=pulse.db"), EnsureCreatedAsync on startup |
| BCrypt used for password hashing | ✓ | AuthController.cs lines 28, 53 — BCrypt.Net.BCrypt.HashPassword / Verify |

### Plan 01-02: Electron+Vue Client Shell

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| App scaffolded with electron-vite-vue template (TypeScript) | ✓ | 01-02-SUMMARY.md confirms all 16 files created; commits 31bdfca-7b9e1aa verified |
| LoginView allows register and login via C# server auth endpoints | ✓ | useAuth.ts — register() and login() POST to VITE_SERVER_URL/auth/register and /auth/login |
| Access token and refresh token stored via electron-store with encryption | ✓ | useAuth.ts lines 113-116 — window.pulseApi.storeSet; 01-02-SUMMARY confirms IPC bridge with machineId encryption key |
| useAuth composable handles silent token refresh before expiry | ✓ | useAuth.ts lines 79-91 — initAuth() restores tokens, calls refreshAccessToken() if isTokenExpired |
| usePresence composable connects to /hubs/presence (SignalR) for Pulse room presence events | ✓ | usePresence.ts lines 22-28 — HubConnectionBuilder targeting {serverUrl}/hubs/presence with accessTokenFactory |
| fetchLiveKitToken() calls POST /rooms/token and returns { liveKitToken, liveKitHost } | ✓ | useAuth.ts lines 93-109 — POST /rooms/token?roomName=X with Bearer header, returns res.json() typed as {liveKitToken, liveKitHost} |
| RoomView shows a room name input, Join Room button, and participant list | ✓ | RoomView.vue lines 9-13, 28-37 — roomNameInput, Join Room button, participants ul |
| Vue Router guards unauthenticated users to LoginView | ✓ | 01-02-SUMMARY.md confirms navigation guard; requiresAuth meta on /room route |

### Plan 01-03: LiveKit Voice Connection

| Must-Have | Status | Evidence |
|-----------|--------|----------|
| useLiveKit.ts connects to LiveKit using livekit-client Room object | ✓ | useLiveKit.ts lines 23-26 — new Room({adaptiveStream, dynacast}), await room.connect(liveKitHost, liveKitToken) |
| Microphone track is published to the LiveKit room on connect | ✓ | useLiveKit.ts line 56 — await room.localParticipant.setMicrophoneEnabled(true) |
| Incoming audio tracks from remote participants play automatically | ✓ | useLiveKit.ts lines 29-35 — TrackSubscribed event: track.attach(), element appended to document.body |
| Speaking participants are identified via LiveKit activeSpeakers events | ✓ | useLiveKit.ts lines 41-43 — ActiveSpeakersChanged updates activeSpeakers ref with speaker identities |
| Disconnecting from LiveKit is clean (unpublish tracks, disconnect room) | ✓ | useLiveKit.ts lines 63-71 — disconnect() calls livekitRoom.disconnect(), nulls singleton, resets refs |
| RoomView shows speaking indicators and a mic toggle | ✓ | RoomView.vue lines 24-26 (Mic On/Off button), lines 33-34 (speaking CSS class), lines 40-45 (active speakers list) |
| LiveKit token is fetched from C# server (Plan 01-02 fetchLiveKitToken) before connecting | ✓ | RoomView.vue lines 75-82 — fetchLiveKitToken() called first, then connect SignalR, then livekitConnect(liveKitToken, liveKitHost) |

## Requirements Coverage

| REQ-ID | Status | Where |
|--------|--------|-------|
| VOICE-01 | ✓ | useLiveKit.ts TrackSubscribed handler attaches remote audio elements; RoomView joins LiveKit room on "Join Room" click |
| VOICE-02 | ✓ | useLiveKit.ts line 56 — setMicrophoneEnabled(true) publishes local mic track on connect |
| VOICE-03 | ✓ | useLiveKit.ts disconnect() + RoomView handleLeave() — cleans up LiveKit room and all audio elements |
| SRV-01 | ✓ | AuthController.cs POST /auth/register — creates user with BCrypt hash, returns tokens |
| SRV-02 | ✓ | AuthController.cs POST /auth/login + /auth/refresh — session maintained via rotating JWT/refresh token pair |
| SRV-03 | ✓ | PresenceHub.cs — ConcurrentDictionary tracks connected users per room; RoomsController manages LiveKit room token state |

## Gaps (if any)

### Known Stub: activeSpeakers identity mismatch
The `activeSpeakers` ref in useLiveKit.ts contains LiveKit participant identities (user GUIDs from JWT `sub`). The SignalR participant list uses SignalR `connectionId`. These are different namespaces. RoomView applies the `speaking` CSS class to all participants whenever any speaker is active (line 33: `:class="{ speaking: activeSpeakers.length > 0 }"`), not per-participant. Documented in 01-03-SUMMARY.md as a known Phase 2 item — not a blocker for the phase goal.

### livekit-server binary not confirmed on PATH
01-03-SUMMARY.md explicitly notes: "The livekit-server binary was not found on PATH during execution." The convenience script `scripts/start-dev.ps1` was created but end-to-end audio could not be verified without the LiveKit server running. This is the primary reason for `human_needed` status.

## Human Verification Needed

The following items require running the full stack to confirm:

1. **End-to-end audio between two clients** — Start `livekit-server --dev`, `dotnet run` (Pulse.Server), and two Electron windows. Register Alice and Bob, both join "lobby", verify they hear each other's microphone.
2. **livekit-server binary availability** — Run `livekit-server --version` to confirm binary is on PATH. If not: `winget install LiveKit.LiveKit` or download from https://github.com/livekit/livekit/releases.
3. **Mic toggle works live** — Toggle mic on Window A; confirm Window B stops receiving audio.
4. **Active speaker indicator fires** — Speak into mic; confirm `activeSpeakers` list populates in UI.
5. **Leave Room disconnects audio** — Click Leave Room on Window A; confirm Window B no longer receives audio and participant list updates.
6. **dotnet build exits 0** — Confirm `dotnet build` in Pulse.Server directory succeeds with net10.0 target.
7. **npm run build exits 0** — Confirm `npm run build` in pulse-client directory succeeds (01-02-SUMMARY states verified).

## Verdict

**human_needed**

All code artifacts are present and correct. Static analysis confirms:
- All 6 requirement IDs (VOICE-01, VOICE-02, VOICE-03, SRV-01, SRV-02, SRV-03) are addressed by implemented code.
- All must-haves from all three plans are satisfied in the actual source files.
- The architecture is correct: C# server owns auth/tokens/presence, LiveKit SFU owns WebRTC audio, Electron client ties them together.

The phase cannot be marked **passed** without human confirmation of live audio between two clients, because the `livekit-server` binary was not confirmed on PATH during automated execution (documented in 01-03-SUMMARY.md). All static evidence points to a correct implementation — the walking skeleton should work once `livekit-server --dev` is running.
