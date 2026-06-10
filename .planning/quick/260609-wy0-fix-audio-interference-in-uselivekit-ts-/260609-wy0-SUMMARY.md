---
phase: quick
plan: 260609-wy0
subsystem: pulse-client/audio
tags: [livekit, audio, bug-fix]
dependency_graph:
  requires: []
  provides: [clean-livekit-audio-attachment]
  affects: [pulse-client/src/renderer/composables/useLiveKit.ts]
tech_stack:
  added: []
  patterns: [livekit-track-attach-detach]
key_files:
  created: []
  modified:
    - pulse-client/src/renderer/composables/useLiveKit.ts
decisions:
  - Use track.attach()/track.detach() per LiveKit SDK contract instead of manual MediaStream construction
  - Pass unlockLabels=false from connect() since LiveKit mic already unlocks device labels
metrics:
  duration: 5m
  completed: 2026-06-09
---

# Quick Fix 260609-wy0: Fix Audio Interference in useLiveKit.ts Summary

**One-liner:** Replaced manual `<audio>` element construction with LiveKit SDK `track.attach()/track.detach()` to eliminate double playback/echo from duplicate audio elements.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace manual audio element with track.attach()/track.detach() | ab8f807 | useLiveKit.ts |
| 2 | Avoid redundant getUserMedia in refreshDevices after mic is live | ab8f807 | useLiveKit.ts |

## What Changed

**Task 1 - TrackSubscribed handler:**
- Removed: `track.mediaStreamTrack`, `new MediaStream([raw])`, manual `document.createElement('audio')`, `el.play()`
- Added: `const el = track.attach()` — SDK creates and manages the audio element
- Preserved: `el.id = \`livekit-audio-${participant.identity}\`` (keeps `switchOutput` selector working)
- Preserved: `el.setSinkId(activeOutputId.value)` for output routing

**Task 1 - TrackUnsubscribed handler:**
- Replaced: `document.getElementById(...)?.remove()`
- Added: `track.detach().forEach((el) => el.remove())` — SDK cleans up its own elements
- Kept: `document.getElementById(...)?.remove()` as defensive backstop

**Task 2 - refreshDevices:**
- Added `unlockLabels: boolean = true` parameter
- When `false`, skips the `getUserMedia` block and goes straight to `enumerateDevices()`
- `connect()` now calls `refreshDevices(false)` — mic already live means labels already unlocked

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- File exists: `pulse-client/src/renderer/composables/useLiveKit.ts` — YES
- Commit ab8f807 exists — YES
- No `track.mediaStreamTrack` or `new MediaStream` remains in useLiveKit.ts — YES
- TypeScript check passes — YES
