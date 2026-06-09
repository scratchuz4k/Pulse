---
phase: 02-full-room-experience
plan: "01"
subsystem: server
tags: [rooms, persistence, signalr, ef-core]
dependency_graph:
  requires: []
  provides: [room-persistence, get-rooms, post-rooms, room-list-broadcast, connection-to-room-lookup]
  affects: [PresenceHub, RoomsController, AppDbContext]
tech_stack:
  added: []
  patterns: [EF Core DbSet with unique index, IHubContext broadcast from controller, ConcurrentDictionary reverse-lookup]
key_files:
  created:
    - Pulse.Server/Models/Room.cs
  modified:
    - Pulse.Server/Data/AppDbContext.cs
    - Pulse.Server/Controllers/RoomsController.cs
    - Pulse.Server/Hubs/PresenceHub.cs
decisions:
  - "Used record CreateRoomRequest for POST body binding (simple, idiomatic C# 12)"
  - "DbUpdateException catch for 409 — relies on unique DB index rather than pre-check to avoid TOCTOU race"
  - "_connectionToRoom cleared after foreach loop in OnDisconnectedAsync (connection is in exactly one room)"
metrics:
  duration: ~10min
  completed: 2026-06-09
---

# Phase 02 Plan 01: Room Persistence and SignalR Broadcast Summary

Room persistence added via EF Core Room entity, GET/POST /rooms endpoints, and SignalR RoomListUpdated broadcast. PresenceHub extended with connectionId-to-roomName reverse-lookup and IsMuted field on ParticipantInfo.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Room entity + AppDbContext extension | 145c16f | Room.cs, AppDbContext.cs |
| 2 | RoomsController GET + POST + SignalR broadcast | fa78c4c | RoomsController.cs |
| 3 | PresenceHub _connectionToRoom reverse-lookup | 42f7448 | PresenceHub.cs |

## What Was Built

- `Room` entity with `Id` (int PK), `Name` (string, unique index), `CreatedAt` (DateTime)
- `AppDbContext.Rooms` DbSet with unique index on Name via `OnModelCreating`
- `GET /rooms` — returns all persisted rooms ordered by name
- `POST /rooms` — validates name (required, max 80 chars), inserts, returns 201; duplicate returns 409
- `RoomListUpdated` SignalR broadcast sent to all clients after successful room creation
- `_connectionToRoom` reverse-lookup dict populated/cleared in JoinRoom, LeaveRoom, OnDisconnectedAsync
- `GetRoomForConnection` private helper for Plan 02 mute broadcast
- `ParticipantInfo` record extended with `IsMuted` field (default false)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — all threats in plan's threat model addressed:
- T-02A-01: Name validated (non-empty, max 80), EF parameterization handles SQL injection
- T-02A-02: Accepted (no rate limiting, dev-stage)
- T-02A-03: _connectionToRoom keyed by server-assigned Context.ConnectionId

## Dev Note

After this change, delete `Pulse.Server/pulse.db` before running the server. `EnsureCreated` does not apply schema changes to an existing database — the Room table will only appear in a freshly created DB.

## Self-Check: PASSED

- Pulse.Server/Models/Room.cs: FOUND
- Pulse.Server/Data/AppDbContext.cs: contains DbSet<Room>
- Pulse.Server/Controllers/RoomsController.cs: contains RoomListUpdated
- Pulse.Server/Hubs/PresenceHub.cs: contains _connectionToRoom
- Commits: 145c16f, fa78c4c, 42f7448
