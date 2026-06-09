---
phase: 02-full-room-experience
plan: "05"
subsystem: renderer/voice
tags: [deafen, speaking-indicators, livekit, bug-fix]
dependency_graph:
  requires: ["02-04"]
  provides: ["VOICE-06", "ROOM-02"]
  affects: ["pulse-client/src/renderer/views/RoomView.vue"]
tech_stack:
  added: []
  patterns: ["prevMicEnabled save/restore pattern for stateful toggle"]
key_files:
  modified:
    - pulse-client/src/renderer/views/RoomView.vue
decisions:
  - "prevMicEnabled ref saved before deafen so undeafen can restore exact prior state"
  - "broadcastMuteChanged NOT called from handleToggleDeafen — deafen is client-side silent per D-07"
  - "toggleMic() called directly in deafen path to avoid double broadcast side-effect"
metrics:
  duration: "10 minutes"
  completed: "2026-06-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 02 Plan 05: Deafen Fix and Speaking Indicator Verification Summary

Deafen toggle now saves and restores previous mic state; speaking ring wiring confirmed to use userId matching LiveKit identity.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix deafen toggle — save and restore prevMicEnabled | f42cf64 | RoomView.vue |
| 2 | Verify speaking indicators — userId matching confirmed | df7e1b9 | RoomView.vue |

## What Was Built

**Task 1 — Deafen fix:**

The original `handleToggleDeafen` toggled `isDeafened` and muted the mic on deafen, but never restored the mic on undeafen. Fixed by:
- Adding `const prevMicEnabled = ref(false)` in script setup
- On deafen: `prevMicEnabled.value = isMicEnabled.value` before muting
- On undeafen: `if (prevMicEnabled.value && !isMicEnabled.value) await toggleMic()` restores mic only if it was on before
- `handleLeave` resets `prevMicEnabled.value = false`
- `broadcastMuteChanged` is intentionally NOT called — deafen is client-side per D-07

**Task 2 — Speaking indicators:**

All eight `activeSpeakers.includes(p.userId)` calls in the template confirmed to use `p.userId` (not `p.connectionId`). This is correct because LiveKit identity is set to `userId` in token generation. Inline comment added near `sq-speaking-ring` to document the ROOM-02 identity matching contract.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints or auth paths introduced. Deafen is client-side audio control only (T-02E-01 accepted by design).

## Self-Check: PASSED

- [x] pulse-client/src/renderer/views/RoomView.vue modified with prevMicEnabled fix
- [x] Commit f42cf64 exists (Task 1)
- [x] Commit df7e1b9 exists (Task 2)
- [x] grep confirms 4 prevMicEnabled occurrences
- [x] grep confirms 8 activeSpeakers.includes(p.userId) occurrences (all use userId)
