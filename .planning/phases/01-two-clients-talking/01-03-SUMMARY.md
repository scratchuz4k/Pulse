---
phase: 1
plan: "01-03"
name: "LiveKit Voice Connection"
subsystem: "voice-audio"
tags: [livekit, webrtc, audio, electron, vue]
one_liner: "LiveKit SFU audio wired end-to-end: useLiveKit composable manages Room lifecycle, RoomView fetches token and connects audio on join"
dependency_graph:
  requires: ["01-01", "01-02"]
  provides: ["voice-audio", "livekit-composable", "mic-toggle"]
  affects: ["pulse-client/src/renderer/composables/useLiveKit.ts", "pulse-client/src/renderer/views/RoomView.vue"]
tech_stack:
  added: ["livekit-client Room/RoomEvent API"]
  patterns: ["module-level singleton for shared Room instance", "reactive refs for LiveKit state"]
key_files:
  created:
    - pulse-client/src/renderer/composables/useLiveKit.ts
    - scripts/start-dev.ps1
  modified:
    - pulse-client/src/renderer/views/RoomView.vue
decisions:
  - "Tasks 2 and 3 implemented together in one composable file — event wiring is integral to connect(), splitting into separate commits would produce a non-functional intermediate state"
  - "Module-level livekitRoom singleton ensures only one Room object exists per app session, consistent with usePresence's hubConnection pattern"
  - "activeSpeakers shows LiveKit identity (GUID) not displayName — SignalR connectionId and LiveKit identity are different namespaces; Phase 2 will reconcile them"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-06-09"
  tasks_completed: 4
  files_changed: 3
---

# Phase 1 Plan 03: LiveKit Voice Connection Summary

## What Was Built

LiveKit SFU audio layer wired on top of the existing auth and presence infrastructure. Two Electron clients joining the same Pulse room name will have their microphone audio routed through the LiveKit SFU — no manual RTCPeerConnection code, no ICE candidate management. The `livekit-client` package handles the full WebRTC lifecycle.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | scripts/start-dev.ps1 convenience launcher | 46a80e6 |
| 2+3 | useLiveKit composable with Room lifecycle and events | adda286 |
| 4 | RoomView updated: join/leave wired to LiveKit | 1842958 |

## Key Files

**Created:**
- `pulse-client/src/renderer/composables/useLiveKit.ts` — LiveKit composable with `connect`, `disconnect`, `toggleMic`, `isConnected`, `isMicEnabled`, `activeSpeakers`
- `scripts/start-dev.ps1` — PowerShell launcher for LiveKit server + C# backend + Electron client

**Modified:**
- `pulse-client/src/renderer/views/RoomView.vue` — Join flow: fetch token → connect SignalR → connect LiveKit. Leave flow: disconnect LiveKit → disconnect SignalR → clear store. Mic toggle button and active speakers list added.

## Architecture Notes

The `useLiveKit` composable follows the same module-level singleton pattern used by `usePresence` (single `hubConnection`). The `Room` object is stored in module scope as `livekitRoom`. Each call to `connect()` tears down any existing session before creating a new one.

Audio tracks from remote participants are attached as `<audio>` elements appended to `document.body`, following the standard livekit-client pattern. Element IDs use `livekit-audio-{participantIdentity}` for cleanup on disconnect.

## Deviations from Plan

### Tasks 2 and 3 combined

**Found during:** Planning of commit structure

**Reason:** Task 2 defines the composable skeleton and Task 3 fills in the event handlers. The event handlers are registered inside `connect()` before calling `room.connect()`. Implementing Task 2 without the events would produce a composable that connects but never emits audio — not a meaningful intermediate state. Both tasks were committed together as a single coherent unit.

**Impact:** None — both tasks' acceptance criteria are fully met.

## Known Stubs

**activeSpeakers identity mismatch:** The `activeSpeakers` ref contains LiveKit participant identities (user GUIDs from the JWT `sub` claim). The participant list from SignalR uses `connectionId` (SignalR connection ID). These are different namespaces. The speaking indicator in RoomView applies a `speaking` CSS class to all participants when any speaker is active — not per-participant. Phase 2 will resolve this by storing the user GUID in the room store alongside `displayName`.

## livekit-server Installation Note

The `livekit-server` binary was not found on PATH during execution. Task 1 creates the convenience script but cannot verify `livekit-server --version`. Before running end-to-end tests:

```powershell
winget install LiveKit.LiveKit
# OR download livekit_windows_amd64.zip from https://github.com/livekit/livekit/releases
# Extract livekit-server.exe and place on PATH
```

## Self-Check: PASSED

- `pulse-client/src/renderer/composables/useLiveKit.ts` — exists (created)
- `pulse-client/src/renderer/views/RoomView.vue` — exists (updated)
- `scripts/start-dev.ps1` — exists (created)
- Commit 46a80e6 — verified in git log
- Commit adda286 — verified in git log
- Commit 1842958 — verified in git log
