---
phase: 03-priority-speaker
plan: "01"
subsystem: server/presence
tags: [priority-speaker, signalr, presencehub, admin]
dependency_graph:
  requires: ["02-05"]
  provides: ["PRIOR-01", "PRIOR-02", "PRIOR-03"]
  affects: ["Pulse.Server/Hubs/PresenceHub.cs", "Pulse.Server/Models/Room.cs", "Pulse.Server/Controllers/RoomsController.cs"]
tech_stack:
  added: []
  patterns: ["ConcurrentDictionary per-room state pattern"]
key_files:
  modified:
    - Pulse.Server/Hubs/PresenceHub.cs
    - Pulse.Server/Models/Room.cs
    - Pulse.Server/Controllers/RoomsController.cs
decisions:
  - "CreatedByUserId (nullable Guid) added to Room model — temp admin identity stamps room creator at creation time"
  - "_prioritySpeakers ConcurrentDictionary<string,string> tracks roomName -> userId in-memory (no DB persistence needed for ephemeral role)"
  - "Admin validation uses room.CreatedByUserId == callerUserId — room creator is the sole admin"
  - "Late-joiner sync: PrioritySpeakerChanged sent to Clients.Caller in JoinRoom if priority speaker active"
  - "Room deletion clears _prioritySpeakers entry via TryRemove"
metrics:
  duration: "part of combined phase-3 commit"
  completed: "2026-06-10"
  tasks_completed: 6
  tasks_total: 6
  files_modified: 3
---

# Phase 03 Plan 01: Server-Side Priority Speaker State Summary

PresenceHub gains `AssignPrioritySpeaker`/`RemovePrioritySpeaker` hub methods with admin validation; Room model gains `CreatedByUserId` for admin identity; late-joiners receive current priority speaker state.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend ParticipantInfo with IsPrioritySpeaker | 35a07b0 | PresenceHub.cs |
| 2 | Add _prioritySpeakers ConcurrentDictionary | 35a07b0 | PresenceHub.cs |
| 3 | AssignPrioritySpeaker hub method | 35a07b0 | PresenceHub.cs |
| 4 | RemovePrioritySpeaker hub method | 35a07b0 | PresenceHub.cs |
| 5 | Late-joiner sync in JoinRoom | 35a07b0 | PresenceHub.cs |
| 6 | Clear priority speaker on room delete | 35a07b0 | PresenceHub.cs |

## What Was Built

**Server state:** `ParticipantInfo` record extended with `IsPrioritySpeaker` flag. `_prioritySpeakers ConcurrentDictionary<string, string>` tracks roomName → userId mapping in memory.

**Admin hub methods:** `AssignPrioritySpeaker(roomName, targetUserId)` validates the caller is the room creator (via `Room.CreatedByUserId`), updates the in-memory dict, patches participant flags, and broadcasts `PrioritySpeakerChanged` with the userId to all room members. `RemovePrioritySpeaker(roomName)` clears the dict entry and broadcasts `null`.

**Room model:** `CreatedByUserId (nullable Guid)` added to `Room`. `RoomsController.CreateRoom` stamps the authenticated caller's userId; `GET /rooms` returns `createdByUserId` in the response.

**Late-joiner sync:** `JoinRoom` sends `PrioritySpeakerChanged` to `Clients.Caller` if a priority speaker is active in the room.

**Room cleanup:** `_prioritySpeakers.TryRemove` called in `DeleteRoomAndBroadcast`.

## Deviations from Plan

None — implemented exactly as planned.

## Known Stubs

None.

## Threat Flags

None — admin validation correctly gates on room creator identity. No unauthenticated paths.

## Self-Check: PASSED

- [x] PresenceHub.cs has AssignPrioritySpeaker and RemovePrioritySpeaker methods
- [x] Room.cs has CreatedByUserId property
- [x] RoomsController stamps and returns createdByUserId
- [x] Commit 35a07b0 covers all server-side changes
