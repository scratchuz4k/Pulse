---
phase: 02-full-room-experience
plan: "09"
subsystem: livekit-ux
tags: [livekit, mute, deafen, join-state, voice-bar, vue]
dependency_graph:
  requires: [room-participant-presence]
  provides: [join-preserves-av-state, clean-voice-bar]
  affects: [pulse-client/src/renderer/composables/useLiveKit.ts, pulse-client/src/renderer/views/RoomView.vue]
tech_stack:
  added: []
  patterns: [optional param default, post-connect volume pass, conditional broadcastMuteChanged]
key_files:
  created: []
  modified:
    - pulse-client/src/renderer/composables/useLiveKit.ts
    - pulse-client/src/renderer/views/RoomView.vue
decisions:
  - desiredMic computed as !isPttMode && !isDeafened before livekitConnect call
  - Post-connect volume-zero pass covers tracks subscribed during connect when deafened at join
  - broadcastMuteChanged(true) sent when joining muted/deafened so peers see correct icon
  - speaking CSS binding removed from vb-av; squad panel already shows speaking state
metrics:
  duration: "~20 minutes"
  completed: "2026-06-10"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 2
---

# Phase 02 Plan 09: Join-With-State + Clean Voice Bar Summary

Joining a room now respects the user's mute/deafen state. The bottom voice bar no longer shows redundant speaking rings that duplicated the squad panel.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | connect() respects desiredMicEnabled | 6e6a2fa | useLiveKit.ts |
| 2 | Re-apply mute/deafen on join in RoomView | 1504d1f | RoomView.vue |
| 3 | Remove redundant bottom-bar speaking ring | fba108d | RoomView.vue |

## What Was Built

- **`useLiveKit.connect()`**: added optional `desiredMicEnabled: boolean = true` parameter. `setMicrophoneEnabled` now receives the desired state instead of hardcoded `true`; `isMicEnabled.value` set accordingly.
- **`handleJoin()`**: computes `desiredMic = !isPttMode.value && !isDeafened.value` before calling LiveKit connect. If joining while deafened: post-connect volume-zero pass silences remote audio; `broadcastMuteChanged(true)` notifies peers. If joining muted (PTT mode): `broadcastMuteChanged(true)` notifies peers. Removed the old `if (isPttMode.value) await setMicEnabled(false)` trailing line.
- **Bottom voice bar**: removed `speaking` class binding from `.vb-av` avatars and deleted the `.vb-av.speaking` CSS rule. Muted ring preserved. Squad panel speaking indicator unchanged.

## Deviations from Plan

None — implementation matched plan exactly.

## Known Stubs

None.

## Threat Flags

T-02J-01 (unintended mic-on at join leaking audio) mitigated — connect() now publishes mic only when desiredMic is true.

## Self-Check: PASSED

- useLiveKit.ts connect() desiredMicEnabled param: FOUND
- RoomView.vue desiredMic computed before livekitConnect: FOUND
- RoomView.vue post-connect deafen volume pass: FOUND
- RoomView.vue old `if (isPttMode.value) await setMicEnabled(false)` line: REMOVED
- vb-av speaking class binding: REMOVED
- .vb-av.speaking CSS rule: REMOVED
- Commit 6e6a2fa (feat - connect desiredMicEnabled): FOUND
- Commit 1504d1f (feat - re-apply mute/deafen on join): FOUND
- Commit fba108d (feat - remove bottom-bar speaking ring): FOUND
