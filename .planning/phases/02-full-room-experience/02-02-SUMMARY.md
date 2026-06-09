---
phase: 02-full-room-experience
plan: "02"
subsystem: presence-mute
tags: [signalr, pinia, vue, mute, real-time]
dependency_graph:
  requires: [02-01]
  provides: [mute-broadcast, mute-ui]
  affects: [PresenceHub, room-store, usePresence, RoomView]
tech_stack:
  added: []
  patterns: [signalr-group-broadcast, pinia-reactive-mutation, vue-conditional-class]
key_files:
  created: []
  modified:
    - Pulse.Server/Hubs/PresenceHub.cs
    - pulse-client/src/renderer/stores/room.ts
    - pulse-client/src/renderer/composables/usePresence.ts
    - pulse-client/src/renderer/views/RoomView.vue
decisions:
  - Uses Context.ConnectionId as identity for MuteChanged — server assigns, client cannot spoof
  - broadcastMuteChanged passes !isMicEnabled.value (post-toggle state) since toggleMic updates the ref synchronously
  - muted vb-av ring uses var(--live) (red) matching existing muted-mic button color
metrics:
  duration: 15m
  completed: 2026-06-09
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
---

# Phase 2 Plan 02: Mute-State Visibility Summary

Real-time mute-state broadcast over SignalR with per-participant mute icons in squad panels and bottom bar.

## What Was Built

- **MuteChanged hub method** on `PresenceHub`: resolves caller's room via `_connectionToRoom`, updates `ParticipantInfo.IsMuted` with a record with-expression, and fans out `ParticipantMuted` or `ParticipantUnmuted` to the room group using `Context.ConnectionId` as the identity payload.
- **Pinia store update** (`room.ts`): `Participant` interface gains `isMuted: boolean`; `setRoom` maps incoming participants with `isMuted: false` default; `addParticipant` accepts optional `isMuted` param; new `setParticipantMuted(connectionId, isMuted)` action mutates participant in-place.
- **usePresence listeners** (`usePresence.ts`): `ParticipantMuted` and `ParticipantUnmuted` hub events registered inside `connect()`, each calling `roomStore.setParticipantMuted`. New exported function `broadcastMuteChanged(isMuted)` invokes `MuteChanged` on the hub.
- **RoomView.vue UI**: `handleToggleMic` now awaits `broadcastMuteChanged(!isMicEnabled.value)` after `toggleMic`; both squad panels (Hub tab and Voice tab) render a `🔇` span with `v-if="p.isMuted"`; bottom-bar avatars gain `:class="{ muted: p.isMuted }"` with a red ring CSS rule.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | MuteChanged hub method on server | da5e8ba |
| 2 | Pinia store + usePresence listeners + broadcastMuteChanged | 70e191e |
| 3 | Mute icon in RoomView + wire handleToggleMic | 3de89c0 |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — MuteChanged uses server-assigned `Context.ConnectionId`; client provides only the bool payload. Matches T-02B-01 mitigation in plan threat model.

## Self-Check: PASSED

- Pulse.Server/Hubs/PresenceHub.cs — modified (MuteChanged method added)
- pulse-client/src/renderer/stores/room.ts — modified (isMuted field + setParticipantMuted)
- pulse-client/src/renderer/composables/usePresence.ts — modified (listeners + broadcastMuteChanged)
- pulse-client/src/renderer/views/RoomView.vue — modified (mute icon + CSS + broadcast wiring)
- Commits da5e8ba, 70e191e, 3de89c0 present in git log
