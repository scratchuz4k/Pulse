---
plan: "04-03"
phase: "04-whisper-side-channel"
status: complete
completed: 2026-06-10
---

# Plan 04-03: Whisper IPC, Store, and SignalR Wiring

## What Was Built

Four files wired together to connect server events to client state:

**main/index.ts:**
- `getWhisperPttKeycodes()` scans electron-store for `whisper.{groupId}.pttKey` entries
- Extended uIOhook `keydown`/`keyup` to broadcast `whisper-ptt:keydown` / `whisper-ptt:keyup` IPC with groupId
- 6 new ipcMain handlers: `whisper-ptt:set-key`, `whisper-ptt:get-key`, `whisper:set/get-transmit-mode`, `whisper:set/get-suppress-main`

**preload/index.ts:**
- 9 new entries in `pulseApi`: full whisper PTT key/mode/suppress IPC bridge + `onWhisperPttKeyDown`, `onWhisperPttKeyUp`, `removeWhisperPttListeners`

**stores/whisper.ts (new):**
- `useWhisperStore` Pinia composition store
- State: `groups`, `speakers`, `isAdmin`
- Computed: `myGroups` (member-only groups)
- Mutations: `setGroups`, `removeGroup`, `setSpeakers`, `clearSpeakers`, `setIsAdmin`

**usePresence.ts:**
- 5 SignalR event handlers: `JoinWhisperGroups`, `WhisperGroupMemberAdded`, `WhisperGroupMemberRemoved`, `WhisperGroupDissolved`, `WhisperGroupsUpdated`
- `watch(whisperActiveSpeakers, ...)` forwards per-group speaker maps into `useWhisperStore.setSpeakers`
- 4 hub invoke helpers: `createWhisperGroup`, `addWhisperMember`, `removeWhisperMember`, `dissolveWhisperGroup`

## Self-Check: PASSED

- `tsc --noEmit` produces 0 errors
- All SignalR handlers and IPC channels present per grep verification

## Key Files

- `pulse-client/src/main/index.ts`
- `pulse-client/src/preload/index.ts`
- `pulse-client/src/renderer/stores/whisper.ts`
- `pulse-client/src/renderer/composables/usePresence.ts`
