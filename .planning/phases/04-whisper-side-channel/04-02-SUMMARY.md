---
plan: "04-02"
phase: "04-whisper-side-channel"
status: complete
completed: 2026-06-10
---

# Plan 04-02: Multi-Room LiveKit Support

## What Was Built

Refactored `useLiveKit.ts` to support N parallel LiveKit rooms:

- Renamed module-level singleton `livekitRoom` → `mainRoom`
- Added `whisperRooms = new Map<string, Room>()` for parallel whisper room instances
- Added `whisperActiveSpeakers = ref<Map<string, string[]>>(new Map())` for per-group speaker tracking
- `connectWhisper(groupId, token, host)`: creates parallel Room, attaches audio with `whisper-audio-{groupId}-{identity}` id prefix, tracks `ActiveSpeakersChanged` per group, cleans up on disconnect
- `disconnectWhisper(groupId)`: disconnects only that whisper room; main room unaffected
- `getWhisperRoom(groupId)`: exposes Room instance for PTT mic control (Plan 04-04)
- `switchOutput` extended: querySelectorAll now covers both `livekit-audio-` and `whisper-audio-` prefixes
- `applyDucking` unchanged: `livekit-audio-` prefix isolates ducking from whisper audio
- All new functions exported in return object

## Self-Check: PASSED

- `tsc --noEmit` produces 0 errors
- `mainRoom` present ≥5 times; `livekitRoom` absent
- `whisper-audio-${groupId}-${participant.identity}` id prefix used in `connectWhisper`
- `switchOutput` queries both prefixes

## Key Files

- `pulse-client/src/renderer/composables/useLiveKit.ts`
