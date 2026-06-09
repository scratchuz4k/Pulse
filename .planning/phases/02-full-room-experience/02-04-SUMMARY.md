---
phase: 02-full-room-experience
plan: 04
subsystem: ptt
tags: [ptt, ipc, globalShortcut, electron-store, vue-composable, settings-ui]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [ptt-ipc, ptt-composable, ptt-settings-ui]
  affects: [RoomView, main-process, preload-bridge]
tech_stack:
  added: []
  patterns: [electron-globalShortcut, ipc-bridge, vue-composable, keydown-capture]
key_files:
  created:
    - pulse-client/src/renderer/composables/usePtt.ts
  modified:
    - pulse-client/src/main/index.ts
    - pulse-client/src/preload/index.ts
    - pulse-client/src/renderer/views/RoomView.vue
decisions:
  - accelerator-validation-in-ipc-handler: validate accelerator is non-empty string before globalShortcut.register (T-02D-01 mitigated)
  - setReleaseCallback-pattern: usePtt exposes setReleaseCallback so RoomView can wire mic release for focused-window keyup (globalShortcut does not fire keyup)
  - setMicEnabled-wrapper: RoomView wraps toggleMic + broadcastMuteChanged so PTT release keeps mute icon in sync with other participants
metrics:
  duration: 15m
  completed: 2026-06-09
---

# Phase 2 Plan 4: Push-to-Talk (PTT) with Configurable Global Hotkey Summary

**One-liner:** PTT mode with electron globalShortcut, electron-store persistence, blur auto-release, and Settings UI for VA/PTT toggle + key capture.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Main PTT IPC handlers + preload bridge | b1214c6 | main/index.ts, preload/index.ts |
| 2 | usePtt composable + Settings UI + connect integration | db7677d | composables/usePtt.ts, views/RoomView.vue |

## What Was Built

### Task 1: Main process + preload bridge
- `globalShortcut` added to electron imports
- `mainWindow` hoisted to module scope so blur handler and PTT startup restore can access it
- `ptt:get-key` IPC handler reads `ptt.key` from electron-store
- `ptt:set-key` IPC handler: unregisters old shortcut, validates accelerator string (non-empty check + Electron's own reject-on-invalid), registers globalShortcut that sends `ptt:key-down` to renderer, stores to electron-store
- Blur handler: when window loses focus with `pttHeld === true`, sends `ptt:key-up` to renderer and clears `pttHeld`
- Startup restore: reads `ptt.key` from store on app launch and registers globalShortcut automatically
- `globalShortcut.unregisterAll()` on `window-all-closed`
- Preload: exposes `onPttKeyDown`, `onPttKeyUp`, `setPttKey`, `getPttKey`, `removePttListeners` on `window.pulseApi`

### Task 2: usePtt composable + RoomView integration
- `codeToAccelerator(code)` maps `KeyboardEvent.code` to Electron accelerator strings (Space→Space, KeyA→A, Digit1→1, ArrowUp→Up, F-keys pass through)
- `usePtt()` composable: `isPttMode`, `pttBinding`, `isCapturing` refs; `startCapture`, `handleCaptureKeydown`, `setReleaseCallback`
- `setReleaseCallback` pattern: globalShortcut fires no keyup event; composable's `window.addEventListener('keyup', ...)` catches focused-window key release and calls the callback wired by RoomView
- RoomView wires `onPttKeyDown` → `setMicEnabled(true)` and `onPttKeyUp` → `setMicEnabled(false)` in `onMounted`
- `setMicEnabled(v)` wrapper: calls `toggleMic()` only when state differs, then `broadcastMuteChanged(!v)` to keep remote mute icon in sync
- `handleJoin`: calls `setMicEnabled(false)` after `livekitConnect()` when `isPttMode` is true
- Settings tab: Voice Mode section with Voice Activity / Push-to-Talk toggle; PTT Key `<kbd>` capture element shown when PTT mode active
- Scoped CSS for toggle group, active state, kbd capture with focus/capturing ring

## Deviations from Plan

### Auto-added functionality

**1. [Rule 2 - Missing Critical Functionality] setReleaseCallback for focused-window PTT keyup**
- **Found during:** Task 2 implementation
- **Issue:** `globalShortcut` in Electron fires only keydown, not keyup. The plan's window `keyup` listener in the composable had no path to call `setMicEnabled(false)` since that function lives in RoomView.
- **Fix:** Added `setReleaseCallback(fn)` to `usePtt()` return value. RoomView calls `setReleaseCallback(() => { if (isPttMode.value) setMicEnabled(false) })` in `onMounted`.
- **Files modified:** composables/usePtt.ts, views/RoomView.vue

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-02D-01 | `ptt:set-key` validates accelerator is a non-empty string before calling `globalShortcut.register`; `register()` returns false for invalid strings and the handler returns false to the renderer |
| T-02D-03 | `removePttListeners()` called in `onMounted` before adding new listeners; also called in `onUnmounted` |

## Self-Check: PASSED

- pulse-client/src/renderer/composables/usePtt.ts: EXISTS
- pulse-client/src/main/index.ts: modified (ptt:set-key present)
- pulse-client/src/preload/index.ts: modified (removePttListeners present)
- pulse-client/src/renderer/views/RoomView.vue: modified (isPttMode used 4+ times)
- Commit b1214c6: EXISTS
- Commit db7677d: EXISTS
