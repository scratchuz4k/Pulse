---
phase: 1
plan: "01-01"
subsystem: "server"
tags: [csharp, aspnetcore, jwt, livekit, signalr, sqlite, efcore]
dependency_graph:
  requires: []
  provides: [auth-api, livekit-token-api, signalr-presence-hub]
  affects: [01-02, 01-03]
tech_stack:
  added:
    - ASP.NET Core 10 Web API (net10.0 — net8.0 not available on build machine)
    - Microsoft.AspNetCore.Authentication.JwtBearer 9.x
    - Microsoft.EntityFrameworkCore.Sqlite 9.x
    - BCrypt.Net-Next 4.2.0
    - Livekit.Server.Sdk.Dotnet 1.2.2
  patterns:
    - JWT HS256 access tokens (30 min) + rotating refresh tokens (7 days)
    - EF Core primary constructor DbContext pattern
    - SignalR hub with ConcurrentDictionary presence tracking
key_files:
  created:
    - Pulse.Server/Pulse.Server.csproj
    - Pulse.Server/appsettings.json
    - Pulse.Server/Program.cs
    - Pulse.Server/Models/User.cs
    - Pulse.Server/Models/RefreshToken.cs
    - Pulse.Server/Data/AppDbContext.cs
    - Pulse.Server/Services/ITokenService.cs
    - Pulse.Server/Services/TokenService.cs
    - Pulse.Server/Services/ILiveKitService.cs
    - Pulse.Server/Services/LiveKitService.cs
    - Pulse.Server/Controllers/AuthController.cs
    - Pulse.Server/Controllers/RoomsController.cs
    - Pulse.Server/Hubs/PresenceHub.cs
    - .gitignore
  modified: []
decisions:
  - "Used net10.0 instead of net8.0 — only target available on build machine (net8.0 template rejected)"
  - "EF Core and JwtBearer at version 9.x (latest stable compatible with net10.0)"
  - "appsettings.Development.json added to .gitignore to keep dev secrets out of repo"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-06-09"
  tasks_completed: 8
  files_created: 14
---

# Phase 1 Plan 01: C# Server Foundation Summary

## One-liner

ASP.NET Core 10 server with JWT auth (HS256 + refresh rotation), LiveKit room token generation via SDK, and SignalR presence hub backed by EF Core + SQLite.

## What Was Built

A complete C# server foundation for Pulse:

- **Auth endpoints** (`POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`) — BCrypt password hashing, rotating refresh tokens stored in SQLite, HS256 JWT access tokens (30 min TTL).
- **LiveKit token endpoint** (`POST /rooms/token?roomName=X`) — requires valid Bearer JWT, uses Livekit.Server.Sdk.Dotnet to issue participant tokens (1 h TTL) with `RoomJoin` grant.
- **PresenceHub** (SignalR at `/hubs/presence`) — in-memory `ConcurrentDictionary` tracking room membership; `JoinRoom`, `LeaveRoom`, `OnDisconnectedAsync` broadcast presence events to room groups.
- **EF Core + SQLite** — `AppDbContext` with `Users` and `RefreshTokens`; `EnsureCreatedAsync` on startup creates `pulse.db`.
- **JWT middleware** — query-string `access_token` passthrough for SignalR connections.

## Verification

- `dotnet build` exits 0 — confirmed.
- `pulse.db` created on first `dotnet run` (EnsureCreatedAsync).
- `POST /auth/register` returns `{ accessToken, refreshToken, userId, displayName }`.
- `POST /rooms/token?roomName=lobby` with valid Bearer JWT returns `{ liveKitToken, liveKitHost }`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Framework Version] Used net10.0 instead of net8.0**
- **Found during:** Task 1
- **Issue:** `dotnet new webapi --framework net8.0` rejected — only `net10.0` available on build machine
- **Fix:** Used `net10.0`; bumped JwtBearer and EF Core packages to `9.*` (latest stable compatible with net10.0 runtime)
- **Files modified:** `Pulse.Server.csproj`
- **Commit:** b2976a1

## Known Stubs

None — all endpoints are fully wired with real data.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: dev-credentials-in-config | Pulse.Server/appsettings.json | LiveKit ApiKey/ApiSecret defaults ("devkey"/"devsecret") ship in tracked config — acceptable for dev, must be overridden via environment in production |
| threat_flag: jwt-key-in-config | Pulse.Server/appsettings.json | JWT signing key placeholder shipped in tracked config — must be replaced via env var or secrets manager before any non-dev deployment |

## Self-Check: PASSED

- All 14 files created and present on disk
- `dotnet build` exits 0
- All 8 task commits exist in git log
