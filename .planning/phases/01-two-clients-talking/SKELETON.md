# Phase 1: Walking Skeleton — Pulse

**Mode:** Walking Skeleton (MVP Phase 1, greenfield)

## What the Skeleton Proves

> "Register → Login → Join Room → Hear Another Person"

By the end of Phase 1, two instances of the Pulse Electron client can:
1. Register an account and log in (JWT auth)
2. Connect to the C# server via SignalR
3. Join the same named voice room
4. Establish a WebRTC peer-to-peer audio connection
5. Hear each other's microphone in real time

This validates the entire technical architecture — server, signaling, auth, and audio transport — before any polish or secondary features are added.

## What the Skeleton Is NOT

- No UI styling — functional only, unstyled or minimal CSS
- No push-to-talk, mute, deafen, or priority speaker (Phase 2+)
- No text channels (Phase 5+)
- No TURN server (STUN only)
- No production hardening (no rate limiting, no persistent DB migrations)

## Components Scaffolded

### Server — `Pulse.Server/` (ASP.NET Core 8)
- `AuthController` — register, login, refresh endpoints
- `VoiceHub` — SignalR hub for SDP/ICE signaling
- `RoomService` — in-memory room state
- `TokenService` — JWT issue + refresh token management
- `IAudioRouter` + `P2PCoordinator` — abstraction seam for future SFU
- EF Core + SQLite for user and refresh token storage

### Client — `pulse-client/` (Electron + Vue 3 + Vite)
- `LoginView.vue` — register/login form
- `RoomView.vue` — room entry + peer list + mic toggle placeholder
- `useAuth.ts` — JWT storage + silent refresh
- `useSignalR.ts` — SignalR connection lifecycle
- `useWebRTC.ts` — RTCPeerConnection management (offer/answer/ICE)
- `auth.ts` + `room.ts` Pinia stores

## Success Criteria (End-to-End)

1. Client A registers and logs in → receives JWT
2. Client A connects to SignalR hub (Bearer token in query string)
3. Client A joins room "test-room" → server records membership
4. Client B does the same → server notifies A of B's arrival
5. A initiates WebRTC offer to B via SignalR relay
6. SDP exchange completes, ICE candidates exchange
7. WebRTC DTLS handshake succeeds → audio flows P2P
8. Both clients hear each other's microphone audio

## Dev Deployment

Run both server and client in development mode simultaneously:
```
# Terminal 1
cd Pulse.Server && dotnet run

# Terminal 2
cd pulse-client && npm run dev
```

No Docker, no CI/CD for the skeleton — local dev only.
