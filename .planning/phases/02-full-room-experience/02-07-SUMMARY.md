---
phase: 02-full-room-experience
plan: "07"
subsystem: ptt
tags: [electron, ptt, persistence, electron-store, ipc]
dependency_graph:
  requires: [global-ptt-keydown-keyup]
  provides: [ptt-mode-persistence]
  affects: [pulse-client/src/main/index.ts, pulse-client/src/preload/index.ts, pulse-client/src/renderer/composables/usePtt.ts]
tech_stack:
  added: []
  patterns: [electron-store IPC get/set, vue watch for persistence]
key_files:
  created: []
  modified:
    - pulse-client/src/main/index.ts
    - pulse-client/src/preload/index.ts
    - pulse-client/src/renderer/composables/usePtt.ts
decisions:
  - watch registered after isPttMode.value set to avoid overwriting store on mount
  - coerce to boolean (!!enabled) in set-mode handler to prevent non-boolean corruption
metrics:
  duration: "~10 minutes"
  completed: "2026-06-10"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 02 Plan 07: PTT Mode Persistence Summary

Voice-Activity vs Push-to-Talk selection now survives app restarts. `ptt.mode` is persisted in electron-store; the renderer restores it on mount and watches it for changes.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add ptt.mode store + IPC handlers (main + preload) | ad54184 | src/main/index.ts, src/preload/index.ts |
| 2 | Restore and persist isPttMode in usePtt | a8f3ea4 | composables/usePtt.ts |

## What Was Built

- **`ptt:get-mode`** IPC handler: returns `store.get('ptt.mode') ?? false` — defaults to Voice Activity.
- **`ptt:set-mode`** IPC handler: `store.set('ptt.mode', !!enabled)` — coerces to boolean.
- **Preload bridge**: `getPttMode` and `setPttMode` exposed on `window.pulseApi`.
- **`usePtt.ts`** `onMounted`: after loading saved key, calls `getPttMode()` and sets `isPttMode.value = savedMode`.
- **`watch(isPttMode, …)`**: registered after restore so toggling in Settings persists immediately without overwriting on mount.

## Deviations from Plan

None — implementation matched plan exactly.

## Known Stubs

None.

## Threat Flags

T-02H-01 (Tampering via ptt:set-mode) mitigated via `!!enabled` coercion.

## Self-Check: PASSED

- main/index.ts ptt:get-mode handler: FOUND (line 124)
- main/index.ts ptt:set-mode handler: FOUND (line 126)
- preload/index.ts getPttMode: FOUND (line 11)
- preload/index.ts setPttMode: FOUND (line 12)
- usePtt.ts getPttMode on mount: FOUND (line 36)
- usePtt.ts watch(isPttMode): FOUND (line 38)
- Commit ad54184 (feat - IPC handlers): FOUND
- Commit a8f3ea4 (feat - usePtt restore): FOUND
