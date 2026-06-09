---
phase: 02-full-room-experience
plan: "03"
subsystem: client-voice-feed
tags: [vue, pinia, signalr, rooms, real-time]
dependency_graph:
  requires: [02-01]
  provides: [room-list-ui, one-click-join, room-creation-post]
  affects: [RoomView.vue, room store, usePresence]
tech_stack:
  added: []
  patterns: [pinia-reactive-list, signalr-event-listener, fetch-on-connect]
key_files:
  created: []
  modified:
    - pulse-client/src/renderer/stores/room.ts
    - pulse-client/src/renderer/composables/usePresence.ts
    - pulse-client/src/renderer/views/RoomView.vue
decisions:
  - createRoom errors are non-fatal in handleJoin (room may already exist server-side; join proceeds regardless)
  - roomStore.rooms v-for filters out the currentRoomName so active room card stays distinct
  - .room-card.joinable hover uses var(--accent) to match join button branding
metrics:
  duration: "~20 minutes"
  completed: 2026-06-09
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 02 Plan 03: Voice Feed Real-Time Room List Summary

**One-liner:** Wire GET /rooms + RoomListUpdated into roomStore so voice feed lists all server rooms with one-click join.

## What Was Built

Plan 03 completes the client-side wiring for the persistent room system delivered in Plan 01. The voice feed now shows every room stored on the server, updates live via SignalR, and lets users join any room with a single click.

### Task 1: roomStore rooms list + usePresence RoomListUpdated wiring

**stores/room.ts:**
- Added `export interface RoomInfo { id: number; name: string }`
- Added `const rooms = ref<RoomInfo[]>([])` reactive state
- Added `function setRoomList(list: RoomInfo[]): void` action
- Exported `rooms` and `setRoomList` in the store return object

**composables/usePresence.ts:**
- Added `hubConnection.on('RoomListUpdated', ...)` listener inside `connect()` — calls `roomStore.setRoomList(list)` on push from server
- After `hubConnection.start()` succeeds, fetches `GET ${serverUrl}/rooms` with Bearer token and populates `roomStore.setRoomList(list)`
- Added `createRoom(serverUrl, name)` async function: POSTs to `/rooms` with JSON body `{ name }`, throws descriptive Error on 409 or other non-ok response
- Exported `createRoom` in return object

### Task 2: Voice feed renders all rooms + New room creates via POST

**views/RoomView.vue:**
- Added `createRoom` to usePresence destructure
- Added `createRoomError` ref
- Updated `handleJoin` to call `createRoom(SERVER_URL, name)` before joining — errors caught and non-fatal
- Added `handleJoinRoom(name)` helper that sets `roomNameInput` and calls `handleJoin`
- Template: `v-for` over `roomStore.rooms` renders `.room-card.joinable` for every room the user is NOT currently in
- Each joinable card shows room name and a "Join ▸" button wired to `handleJoinRoom`
- Empty state ("No voice rooms yet.") shown when `roomStore.rooms` is empty and user is not in a room
- CSS: `.room-card.joinable { cursor: pointer }` and `.room-card.joinable:hover { border-color: var(--accent) }`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | c5767d1 | feat(02-03): roomStore rooms list + usePresence RoomListUpdated wiring |
| 2 | bdcb4df | feat(02-03): voice feed renders all rooms + one-click join + POST on create |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All data paths are wired: rooms flow from GET /rooms on connect and RoomListUpdated push into roomStore.rooms and are rendered live in the template.

## Threat Flags

None. New endpoints (GET/POST /rooms) were introduced in Plan 01 and are covered by the Plan 01 threat model. Client trims room name input before POST (T-02C-01 mitigated).

## Self-Check: PASSED

- pulse-client/src/renderer/stores/room.ts — modified, committed c5767d1
- pulse-client/src/renderer/composables/usePresence.ts — modified, committed c5767d1
- pulse-client/src/renderer/views/RoomView.vue — modified, committed bdcb4df
- Both commits exist in git log
