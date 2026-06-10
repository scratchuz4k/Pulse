---
phase: 02-full-room-experience
plan: "06"
subsystem: ptt
tags: [electron, uiohook, ptt, global-hook, native-module]
dependency_graph:
  requires: []
  provides: [global-ptt-keydown-keyup]
  affects: [pulse-client/src/main/index.ts, pulse-client/src/renderer/composables/usePtt.ts]
tech_stack:
  added: [uiohook-napi@^1.5.5]
  patterns: [uiohook global keydown/keyup hook, accelerator-to-keycode mapping]
key_files:
  created: []
  modified:
    - pulse-client/package.json
    - pulse-client/src/main/index.ts
    - pulse-client/src/renderer/composables/usePtt.ts
    - pulse-client/src/renderer/views/RoomView.vue
decisions:
  - acceleratorToUiohookKey maps UiohookKey.Enter not Return (UiohookKey has Enter, not Return)
  - Digit keys looked up via Digit0-9 keyname in UiohookKey
  - pttHeld guard debounces repeated uiohook keydown events while key is held
  - blur fallback retained for any missed keyup events (belt-and-suspenders)
  - externalizeDepsPlugin in electron-vite auto-externalizes uiohook-napi — no extra config needed
metrics:
  duration: "~15 minutes"
  completed: "2026-06-10"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 02 Plan 06: PTT via uiohook-napi (non-exclusive global hook) Summary

PTT replaced from exclusive globalShortcut (keydown-only) to uiohook-napi global hook delivering real keydown+keyup even when Pulse is not focused, without stealing the key from other apps.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add uiohook-napi dependency | 4874d29 | package.json, package-lock.json |
| 2 | Replace globalShortcut with uiohook-napi in main process | cceafe3 | src/main/index.ts |
| 3 | Remove dead focused-window keyup release path | bdbe4d5 | usePtt.ts, RoomView.vue |

## What Was Built

- **`acceleratorToUiohookKey()`** in `index.ts`: maps Electron-style accelerator strings (A-Z, 0-9, F1-F12, Space, Return, Backspace, Tab, Escape, arrow keys) to uiohook keycodes via the `UiohookKey` enum.
- **`uIOhook.on('keydown')`** with `pttHeld` debounce guard: fires `ptt:key-down` once on first press, ignores repeated events while held.
- **`uIOhook.on('keyup')`**: fires `ptt:key-up` when the PTT key is released.
- **`uIOhook.start()`** called after window creation; **`uIOhook.stop()`** on `window-all-closed`.
- Removed `globalShortcut` import and all `register`/`unregister`/`unregisterAll` calls.
- Removed `setReleaseCallback`, `_onRelease`, `handleWindowKeyUp`, and `window` keyup event listeners from `usePtt.ts`.
- Removed `setReleaseCallback` call from `RoomView.vue` `onMounted`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] UiohookKey.Return does not exist — key is UiohookKey.Enter**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** The plan's accelerator mapping used `Return` as the UiohookKey key name, but uiohook-napi uses `Enter` (matching DOM standards). TypeScript caught this as a type error.
- **Fix:** Changed `NAMED['Return']` to map to `'Enter'` instead of `'Return'`.
- **Files modified:** `pulse-client/src/main/index.ts`
- **Commit:** cceafe3

**2. [Rule 1 - Bug] Unused `permission` parameter caused TS6133 error**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** `session.defaultSession.setPermissionRequestHandler` callback had `permission` named but unused.
- **Fix:** Renamed to `_permission` to satisfy TypeScript noUnusedLocals.
- **Files modified:** `pulse-client/src/main/index.ts`
- **Commit:** cceafe3

## Known Stubs

None — all PTT logic is wired end-to-end.

## Threat Flags

No new threat surface beyond what is documented in the plan's threat model (T-02G-01, T-02G-SC).

## Self-Check: PASSED

- index.ts: FOUND
- usePtt.ts: FOUND
- SUMMARY.md: FOUND
- Commit 4874d29 (chore - uiohook-napi dep): FOUND
- Commit cceafe3 (feat - replace globalShortcut): FOUND
- Commit bdbe4d5 (refactor - remove dead keyup path): FOUND
