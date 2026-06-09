# Phase 1: Two Clients Talking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-09
**Phase:** 1-Two Clients Talking
**Areas discussed:** Voice transport, Server audio role, Client framework, Auth & identity

---

## Voice Transport

| Option | Description | Selected |
|--------|-------------|----------|
| WebRTC | Industry standard for real-time voice. Browser-compatible, NAT traversal built in, Opus codec included. C# server handles signaling via SignalR. | ✓ |
| Custom UDP + Opus | Lower-level control. Manual packetization, jitter buffer, loss recovery. More work, full control. | |
| LiveKit / mediasoup | Pre-built SFU media server. Fastest to ship but adds external dependency. | |

**User's choice:** WebRTC

| Option | Description | Selected |
|--------|-------------|----------|
| SignalR | Microsoft's real-time hub for .NET. First-class WebSocket support, typed hub methods. Natural fit for C# server. | ✓ |
| Raw WebSockets | More control, less magic. Manual message protocol. | |
| REST polling | Clients poll HTTP endpoints. Simplest, adds latency. | |

**User's choice:** SignalR for signaling

| Option | Description | Selected |
|--------|-------------|----------|
| STUN only | Public STUN server. Works for most home networks. | Claude decides |
| Self-hosted TURN | Guarantees connectivity for everyone. Adds infrastructure. | |

**User's choice:** You decide (Claude chose: public STUN, add TURN later if needed)

| Option | Description | Selected |
|--------|-------------|----------|
| P2P audio, server signals only | Audio travels directly client-to-client once WebRTC connects. Simplest for Phase 1. | ✓ |
| Server relays audio from day one | All audio goes through server (SFU). Consistent but complex. | |

**User's choice:** Peer-to-peer audio, server signals only

---

## Server Audio Role

| Option | Description | Selected |
|--------|-------------|----------|
| Room state + connection map | Server knows rooms, who's in each, connection IDs. Clients ask server who to connect to. | ✓ |
| Minimal relay | Pure signaling relay, no state. Simpler, harder for future features. | |
| Full state + heartbeats | Everything tracked including last-seen timestamps. | |

**User's choice:** Room state + connection map

| Option | Description | Selected |
|--------|-------------|----------|
| SignalR OnDisconnected event | SignalR fires automatically, server removes client from room. | ✓ |
| Heartbeat + timeout | Client pings, server evicts on silence. More resilient, more complex. | |

**User's choice:** SignalR OnDisconnected event

| Option | Description | Selected |
|--------|-------------|----------|
| Design with SFU seams | IAudioRouter interface now, P2P in Phase 1, SFU plugs in later. | ✓ |
| P2P only, refactor later | Ship simplest thing, accept future rewire. | |

**User's choice:** Design with SFU seams

---

## Client Framework

| Option | Description | Selected |
|--------|-------------|----------|
| WPF | Mature, MVVM support, large community. Windows-only. | |
| Avalonia | Cross-platform XAML-like. Pick if Mac/Linux coming soon. | |
| WinUI 3 | Modern Windows UI, Fluent design. Smaller ecosystem. | |
| Electron | Desktop shell wrapping Chromium + Node.js. JS/TS frontend. | ✓ (Other) |

**User's choice:** Electron (freeform input)
**Notes:** This means the client is JS/TypeScript, not C#. Server remains C#. Design files are already JSX, pointing to this direction.

| Option | Description | Selected |
|--------|-------------|----------|
| React | Design files already JSX/React. Least friction. | |
| Vue | Lighter weight, simpler state management. | ✓ |
| Vanilla JS | No framework overhead. | |

**User's choice:** Vue

---

## Auth & Identity

| Option | Description | Selected |
|--------|-------------|----------|
| JWT + username/password | Server issues JWT on login, client attaches as Bearer token. Simple, stateless. | ✓ |
| Session cookies | Server-side sessions. More setup in Electron. | |
| API key per user | Static key on registration. Simplest, no revocation. | |

**User's choice:** JWT + username/password

| Option | Description | Selected |
|--------|-------------|----------|
| Long-lived token, no refresh | 24h–7d JWT. Simple, no refresh logic. | |
| Short-lived + refresh token | 15–60 min access token + long-lived refresh token. More secure. | ✓ |

**User's choice:** Short-lived + refresh token

| Option | Description | Selected |
|--------|-------------|----------|
| Display name only, no uniqueness | Server assigns GUID internally. Display name is just a label. | ✓ |
| Unique username required | DB lookup on sign-up enforces uniqueness. | |

**User's choice:** Display name only, no uniqueness

---

## Claude's Discretion

- STUN server: `stun.l.google.com:19302` + `stun1.l.google.com:19302` as default ICE config
- JWT signing: HMAC-SHA256 (`HS256`) for Phase 1
- Refresh token storage in Electron: OS keychain via `keytar` or encrypted local file

## Deferred Ideas

- TURN server for strict-NAT users
- Unique username enforcement
- Multi-party WebRTC mesh (3+ clients)
- SFU / server-side audio mixing (priority speaker, whispers — Phases 3 & 4)
