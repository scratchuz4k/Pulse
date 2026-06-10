---
phase: 03-priority-speaker
plan: "02"
subsystem: renderer/audio
tags: [priority-speaker, audio-ducking, livekit, signalr]
dependency_graph:
  requires: ["03-01"]
  provides: ["PRIOR-02", "PRIOR-03"]
  affects: ["pulse-client/src/renderer/composables/useLiveKit.ts", "pulse-client/src/renderer/composables/usePresence.ts", "pulse-client/src/renderer/stores/room.ts"]
tech_stack:
  added: []
  patterns: ["HTMLAudioElement volume ducking via DOM query", "ref-based priority speaker state shared across composables"]
key_files:
  modified:
    - pulse-client/src/renderer/composables/useLiveKit.ts
    - pulse-client/src/renderer/composables/usePresence.ts
    - pulse-client/src/renderer/stores/room.ts
decisions:
  - "applyDucking() targets audio[id^='livekit-audio-'] elements and sets volume=0.15 when PS is speaking"
  - "setPrioritySpeaker() re-evaluates ducking immediately on assignment; restores all to 1.0 on removal"
  - "prioritySpeakerId ref exposed from useLiveKit so usePresence can drive ducking"
  - "roomStore.setPrioritySpeaker keeps UI reactive to PS changes"
metrics:
  duration: "part of combined phase-3 commit"
  completed: "2026-06-10"
  tasks_completed: 5
  tasks_total: 5
  files_modified: 3
---

# Phase 03 Plan 02: Client Audio Ducking + SignalR Wiring Summary

`useLiveKit` gains `applyDucking()` that drops non-PS audio to 15% volume when PS is speaking; `usePresence` wires `PrioritySpeakerChanged` to drive both ducking and room store.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add prioritySpeakerId ref to useLiveKit | 35a07b0 | useLiveKit.ts |
| 2 | Implement applyDucking() in useLiveKit | 35a07b0 | useLiveKit.ts |
| 3 | Expose setPrioritySpeaker from useLiveKit | 35a07b0 | useLiveKit.ts |
| 4 | Wire PrioritySpeakerChanged in usePresence | 35a07b0 | usePresence.ts |
| 5 | Add prioritySpeakerId to room store | 35a07b0 | room.ts |

## What Was Built

**Audio ducking:** `applyDucking(activeSpeakerIdentities)` in `useLiveKit.ts` queries all `audio[id^="livekit-audio-"]` elements. When the priority speaker identity is in the active speakers list, all other audio elements get `volume = 0.15`; they restore to `1.0` when PS stops speaking.

**setPrioritySpeaker:** Exposed from `useLiveKit` — updates `prioritySpeakerId.value`, calls `applyDucking()` immediately, and if userId is null restores all volumes to 1.0.

**SignalR wiring:** `usePresence` registers `PrioritySpeakerChanged` handler that calls `setPrioritySpeaker(userId)` and `roomStore.setPrioritySpeaker(userId)` — ducking and UI state update together.

**Room store:** `prioritySpeakerId ref` and `setPrioritySpeaker()` action added to `useRoomStore`. Exported for reactive UI consumption.

## Deviations from Plan

None — implemented exactly as planned.

## Known Stubs

None.

## Threat Flags

None — ducking is purely client-side DOM manipulation, no network paths.

## Self-Check: PASSED

- [x] useLiveKit.ts has prioritySpeakerId, applyDucking, setPrioritySpeaker
- [x] usePresence.ts has PrioritySpeakerChanged handler
- [x] room.ts has prioritySpeakerId and setPrioritySpeaker
- [x] Commit 35a07b0 covers all client audio changes
