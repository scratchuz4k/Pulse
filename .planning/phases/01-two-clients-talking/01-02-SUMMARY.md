---
phase: 1
plan: "01-02"
name: "Electron+Vue Client Shell"
subsystem: pulse-client
tags: [electron, vue3, typescript, signalr, pinia, vue-router, electron-store]
one_liner: "Electron+Vue 3 desktop client scaffolded with JWT auth flow, secure IPC token storage via electron-store, SignalR presence composable, and LiveKit token fetching"
dependency_graph:
  requires: []
  provides:
    - pulse-client Electron+Vue shell
    - useAuth composable (register/login/logout/refresh/fetchLiveKitToken)
    - usePresence composable (SignalR /hubs/presence)
    - auth and room Pinia stores
    - LoginView and RoomView
  affects:
    - Plan 01-03 (LiveKit audio — mounts into livekit-audio-placeholder)
tech_stack:
  added:
    - electron@28
    - electron-vite@2
    - vue@3
    - pinia@2
    - vue-router@4
    - "@microsoft/signalr@8"
    - electron-store@8
    - node-machine-id@1
    - livekit-client@2
    - "@electron-toolkit/utils"
    - "@electron-toolkit/tsconfig"
  patterns:
    - Composition API (script setup)
    - Pinia stores with setup() style
    - contextBridge IPC for renderer↔main communication
    - Hash history router (Electron-compatible)
key_files:
  created:
    - pulse-client/package.json
    - pulse-client/electron.vite.config.ts
    - pulse-client/src/main/index.ts
    - pulse-client/src/preload/index.ts
    - pulse-client/src/renderer/main.ts
    - pulse-client/src/renderer/App.vue
    - pulse-client/src/renderer/env.d.ts
    - pulse-client/src/renderer/router/index.ts
    - pulse-client/src/renderer/stores/auth.ts
    - pulse-client/src/renderer/stores/room.ts
    - pulse-client/src/renderer/composables/useAuth.ts
    - pulse-client/src/renderer/composables/usePresence.ts
    - pulse-client/src/renderer/views/LoginView.vue
    - pulse-client/src/renderer/views/RoomView.vue
    - pulse-client/.env.development
  modified: []
decisions:
  - "Used createWebHashHistory (not createWebHistory) for Electron compatibility — file:// protocol does not support HTML5 history"
  - "electron-toolkit packages added as dependencies (not devDependencies) because they are imported at runtime in main process"
  - "Manually scaffolded project instead of npm create electron-vite (interactive CLI not usable in non-TTY environment)"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-06-09"
  tasks_completed: 6
  tasks_total: 6
  files_created: 16
---

# Phase 1 Plan 02: Electron+Vue Client Shell Summary

Electron+Vue 3 desktop client scaffolded with JWT auth flow, secure IPC token storage via electron-store, SignalR presence composable, and LiveKit token fetching ready for Plan 01-03.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Scaffold project with electron-vite-vue | 31bdfca | Done |
| 2 | Configure Pinia, Vue Router, App.vue | 975b198 | Done |
| 3 | Preload bridge for secure token storage | 6f34ff9 | Done |
| 4 | Auth store and useAuth composable | 2ae542a | Done |
| 5 | Room store and usePresence composable | 3aaef79 | Done |
| 6 | LoginView and RoomView | 7b9e1aa | Done |

## What Was Built

### Project Shell (Tasks 1-2)
- `electron-vite` project with main/preload/renderer split
- Pinia + Vue Router installed and wired in `main.ts`
- Hash history router (required for Electron `file://` protocol)
- `/login` → LoginView, `/room` → RoomView (requiresAuth)
- Navigation guard: unauthenticated access to `/room` redirects to `/login`
- `App.vue` renders `<RouterView />` only

### Secure Token Bridge (Task 3)
- Preload uses `contextBridge.exposeInMainWorld('pulseApi', ...)` — no `require` in renderer
- Main process creates `electron-store` with `encryptionKey` derived from `machineId()`
- Three IPC channels: `store:get`, `store:set`, `store:del`
- `window.pulseApi` TypeScript declaration in `env.d.ts`

### Auth (Task 4)
- Pinia auth store: `accessToken`, `refreshToken`, `userId`, `displayName`
- `useAuth` composable: register/login (POST to C# server), logout, silent refresh, `initAuth` (restores tokens on startup)
- `fetchLiveKitToken(roomName)` calls `POST /rooms/token?roomName=X` with Bearer header
- JWT expiry check via base64 payload decode, comparing `exp` to `Date.now()/1000`
- All tokens stored via `window.pulseApi`, never localStorage

### Presence (Task 5)
- `useRoomStore`: `participants[]`, `setRoom`, `addParticipant`, `removeParticipant`, `clearRoom`
- `usePresence`: SignalR `HubConnectionBuilder` with `accessTokenFactory`, `withAutomaticReconnect`
- Handles `RoomJoined`, `ParticipantJoined`, `ParticipantLeft` hub messages
- `connectionState` ref: `disconnected | connecting | connected | error`

### Views (Task 6)
- `LoginView.vue`: displayName + password inputs, Register and Login buttons, error display
- `RoomView.vue`: join-room input + button, fetches LiveKit token (logs to console), connects SignalR, shows participant list, Leave Room and Logout buttons, `<div id="livekit-audio-placeholder">` for Plan 01-03

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Manually scaffolded instead of using npm create electron-vite**
- **Found during:** Task 1
- **Issue:** `npm create electron-vite@latest pulse-client -- --template vue-ts` entered interactive mode in non-TTY environment; could not complete
- **Fix:** Manually created all project files matching the electron-vite-vue-ts template structure
- **Files modified:** All pulse-client/ files

**2. [Rule 2 - Missing dependency] Added @electron-toolkit/utils and @electron-toolkit/tsconfig**
- **Found during:** Task 1 verification (build)
- **Issue:** `src/main/index.ts` imports `@electron-toolkit/utils`; not included in template deps
- **Fix:** `npm install @electron-toolkit/utils @electron-toolkit/tsconfig`

**3. [Rule 1 - Bug] Fixed HTML script src path**
- **Found during:** Task 1 build verification
- **Issue:** `index.html` used `/src/main.ts` (absolute) which Rollup could not resolve in electron-vite renderer context
- **Fix:** Changed to `./main.ts` (relative)
- **Files modified:** `src/renderer/index.html`

**4. [Rule 1 - Bug] Removed spurious `authStore.refreshToken.value` assignment in initAuth**
- **Found during:** Task 4 code review
- **Issue:** `initAuth` incorrectly accessed `.value` on the Pinia ref directly instead of using `setTokens`
- **Fix:** Removed the redundant line; `setTokens` handles all fields

## Known Stubs

None. All implemented functionality is wired. LiveKit audio is intentionally deferred to Plan 01-03 — the placeholder `<div id="livekit-audio-placeholder">` is the documented integration point, not a stub.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: csp-permissive | src/renderer/index.html | CSP allows connect-src to localhost:5000 and localhost:7880 (LiveKit dev). Must be tightened for production. |

## Self-Check: PASSED

- pulse-client/src/renderer/views/LoginView.vue: FOUND
- pulse-client/src/renderer/views/RoomView.vue: FOUND
- pulse-client/src/renderer/composables/useAuth.ts: FOUND
- pulse-client/src/renderer/composables/usePresence.ts: FOUND
- pulse-client/src/renderer/stores/auth.ts: FOUND
- pulse-client/src/renderer/stores/room.ts: FOUND
- pulse-client/src/renderer/router/index.ts: FOUND
- pulse-client/package.json: FOUND
- npm run build: exits 0 (verified)
- Commits 31bdfca, 975b198, 6f34ff9, 2ae542a, 3aaef79, 7b9e1aa: verified in git log
