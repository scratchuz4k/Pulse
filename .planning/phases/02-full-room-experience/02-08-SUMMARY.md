---
phase: 02-full-room-experience
plan: "08"
subsystem: presence
tags: [participants, room-list, auto-delete, signalr, vue]
dependency_graph:
  requires: []
  provides: [participant-enriched-room-list, empty-room-auto-delete]
  affects: [Pulse.Server/Hubs/PresenceHub.cs, Pulse.Server/Controllers/RoomsController.cs, pulse-client/src/renderer/stores/room.ts, pulse-client/src/renderer/views/RoomView.vue]
tech_stack:
  added: []
  patterns: [AppDbContext-injected-hub, BuildRoomListPayload-static-helper]
key_files:
  created: []
  modified:
    - Pulse.Server/Hubs/PresenceHub.cs
    - Pulse.Server/Controllers/RoomsController.cs
    - pulse-client/src/renderer/stores/room.ts
    - pulse-client/src/renderer/composables/usePresence.ts
    - pulse-client/src/renderer/views/RoomView.vue
decisions:
  - AppDbContext injected via primary constructor into PresenceHub (SignalR hubs are transient; scoped DbContext injection is safe)
  - DeleteRoomAndBroadcast private helper centralises empty-room delete + broadcast logic (avoids duplication between LeaveRoom and OnDisconnectedAsync)
  - DbUpdateConcurrencyException swallowed on room delete (row already gone by concurrent request; benign)
  - setRoomList defaults participants to [] to guard against partial payloads from older server versions
metrics:
  duration: "~15 min"
  completed: "2026-06-10"
  tasks_completed: 2
  files_changed: 5
---

# Phase 02 Plan 08: Room Participant Cards + Auto-Delete Empty Rooms Summary

Participant-enriched room list with DB-backed auto-deletion of empty rooms and live avatar stacks on Voice tab room cards.

## What Was Built

### Task 1: Server — expose room participants + auto-delete empty rooms

**PresenceHub.cs**
- Added `GetRoomParticipants(string roomName)` public static helper returning `{ displayName, userId }` per participant from the in-memory `_rooms` dictionary.
- Added `BuildRoomListPayload(IEnumerable<(int Id, string Name)> rooms)` public static helper mapping each room name to its participants via `GetRoomParticipants`.
- Injected `AppDbContext db` via primary constructor (SignalR hubs are transient — scoped DbContext injection is valid).
- `LeaveRoom`: after `TryRemove`, checks `room.IsEmpty` and calls `DeleteRoomAndBroadcast`.
- `OnDisconnectedAsync`: same empty-check + `DeleteRoomAndBroadcast` call after each successful `TryRemove`.
- `DeleteRoomAndBroadcast` (private async helper): removes room from `_rooms`, deletes DB row via `FirstOrDefaultAsync` + `Remove` + `SaveChangesAsync` (concurrency exception swallowed), then queries remaining rooms and broadcasts enriched `RoomListUpdated` to all clients.

**RoomsController.cs**
- `GET /rooms`: now returns `BuildRoomListPayload(...)` instead of bare `{Id, Name}`.
- `POST /rooms`: `RoomListUpdated` broadcast now uses `BuildRoomListPayload(...)`.

### Task 2: Client — bind participants on room cards

**room.ts**
- Added `RoomParticipantSummary { displayName, userId }` interface.
- Extended `RoomInfo` with `participants: RoomParticipantSummary[]`.
- `setRoomList` now defaults `participants` to `[]` if absent.

**usePresence.ts**
- `RoomListUpdated` listener and `/rooms` initial fetch both typed to the new `participants` shape.

**RoomView.vue** (Voice tab joinable room cards)
- Added avatar stack (`.av-stack` / `.av-sm`) showing up to 5 participant initials using existing `avatarColor` / `initials` helpers.
- Added overflow badge `+N` when more than 5 participants.
- Added `{{ room.participants.length }} in room` count label.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `dotnet build Pulse.Server/Pulse.Server.csproj -clp:ErrorsOnly` — build succeeded, 0 errors.
- `npx vue-tsc --noEmit` — exit 0, no type errors.

## Known Stubs

None. All participant data is wired from live server payloads.

## Threat Flags

No new security surface beyond what the plan's threat model already covers (T-02I-01 and T-02I-02).

## Self-Check: PASSED

- `Pulse.Server/Hubs/PresenceHub.cs` — modified and committed (8e23783)
- `Pulse.Server/Controllers/RoomsController.cs` — modified and committed (8e23783)
- `pulse-client/src/renderer/stores/room.ts` — modified and committed (b2f2cb5)
- `pulse-client/src/renderer/composables/usePresence.ts` — modified and committed (b2f2cb5)
- `pulse-client/src/renderer/views/RoomView.vue` — modified and committed (b2f2cb5)
