---
phase: 02-full-room-experience
reviewed: 2026-06-10T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - Pulse.Server/Controllers/RoomsController.cs
  - Pulse.Server/Hubs/PresenceHub.cs
  - pulse-client/src/main/index.ts
  - pulse-client/src/preload/index.ts
  - pulse-client/src/renderer/composables/useLiveKit.ts
  - pulse-client/src/renderer/composables/usePresence.ts
  - pulse-client/src/renderer/composables/usePtt.ts
  - pulse-client/src/renderer/stores/room.ts
  - pulse-client/src/renderer/views/RoomView.vue
findings:
  critical: 4
  warning: 7
  info: 4
  total: 15
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This phase implements PTT via uiohook-napi global key hook, PTT mode persistence via electron-store, room participant presence with auto-delete of empty rooms, join-with-mute/deafen state, and removal of the bottom-bar speaking ring.

The implementation is largely functional but has four critical issues: two IPC input-validation gaps that allow renderer-controlled writes to arbitrary electron-store keys, a permission handler that grants all permissions in production, and a crash in `initials()` when a participant has an empty display name. Several warnings cover race conditions, state desync between LiveKit mic and SignalR broadcast, and an audio element memory leak.

---

## Critical Issues

### CR-01: IPC handlers `store:get`, `store:set`, `store:del` accept arbitrary keys — renderer can read/write any store value

**File:** `pulse-client/src/main/index.ts:110-119`
**Issue:** The three generic store handlers accept any key string from the renderer with no validation or allowlist. Although `contextBridge` prevents untrusted web content from calling these directly, any renderer-side bug (XSS in a room name rendered in Vue, a compromised npm package that runs in the renderer process, etc.) gains unrestricted read/write access to the electron-store, including the encryption key and any future sensitive values (auth tokens, credentials). This is the standard "IPC over-exposure" vulnerability class for Electron apps.

```typescript
// CURRENT — no validation:
ipcMain.handle('store:get', (_event, key: string) => {
  return store.get(key)
})

// FIX — allowlist the keys the renderer is actually permitted to touch:
const ALLOWED_STORE_KEYS = new Set(['ptt.key', 'ptt.mode'])

ipcMain.handle('store:get', (_event, key: string) => {
  if (!ALLOWED_STORE_KEYS.has(key)) return undefined
  return store.get(key)
})

ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
  if (!ALLOWED_STORE_KEYS.has(key)) return
  store.set(key, value)
})

ipcMain.handle('store:del', (_event, key: string) => {
  if (!ALLOWED_STORE_KEYS.has(key)) return
  store.delete(key)
})
```

---

### CR-02: `setPermissionRequestHandler` grants all permissions unconditionally — comment says "dev" but no production guard

**File:** `pulse-client/src/main/index.ts:100-102`
**Issue:** The handler uses `callback(true)` for every permission request and the comment reads "grant all permissions in dev", but there is no `is.dev` guard. In a production build this handler remains active, meaning a malicious or compromised page loaded in the BrowserWindow (e.g., via open redirect or compromised CDN) can silently obtain camera, location, notifications, MIDI, and other sensitive OS permissions without the user ever seeing a prompt.

```typescript
// CURRENT:
session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
  callback(true) // grant all permissions in dev
})

// FIX — only bypass in dev; in production deny everything except audio:
session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
  if (is.dev) { callback(true); return }
  // Only audio is required for Pulse
  callback(permission === 'media')
})
```

---

### CR-03: `initials()` crashes with empty or whitespace-only display name

**File:** `pulse-client/src/renderer/views/RoomView.vue:414-417`
**Issue:** `initials('')` calls `p[0][0]` where `p` is `['']` after `split(/\s+/)`. `p[0]` is an empty string so `p[0][0]` is `undefined`; calling `.toUpperCase()` on `undefined` throws `TypeError: Cannot read properties of undefined`. This can be triggered by a server participant whose `displayName` claim is empty or a whitespace string, crashing the Vue render function for every component that calls `initials()`.

```typescript
// CURRENT:
function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase()
}

// FIX:
function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase()
}
```

---

### CR-04: `LeaveRoom` does not guard against broadcasting `ParticipantLeft` after the room is already deleted

**File:** `Pulse.Server/Hubs/PresenceHub.cs:51-62`
**Issue:** In `LeaveRoom`, after `room.TryRemove` succeeds and `room.IsEmpty` is true, `DeleteRoomAndBroadcast` is called which removes the room from `_rooms` and sends a `RoomListUpdated` to all clients. The code then falls through to `Clients.Group(roomName).SendAsync("ParticipantLeft", ...)`. At this point the room group still exists in SignalR's group routing table (SignalR does not auto-remove groups), so the message is sent. That is benign in itself, but the participant who just left has not yet been removed from the SignalR group (`Groups.RemoveFromGroupAsync` runs after the send). If another request races in and joins the same room name immediately after `_rooms.TryRemove` but before the DB delete in `DeleteRoomAndBroadcast`, both the room creation and deletion complete, leaving the DB and in-memory maps inconsistent.

The deeper correctness problem: `OnDisconnectedAsync` iterates `_rooms` and removes the connection. If the connection was already manually `LeaveRoom`-ed and the room deleted, the iteration still checks all rooms. Because `room.TryRemove` returns false for a connection that has already been removed, this is safe — but if both `LeaveRoom` and `OnDisconnectedAsync` fire nearly simultaneously (client calls LeaveRoom then disconnects), both can observe a non-empty room, each call `room.TryRemove`, one succeeds, one fails, only one sends `ParticipantLeft`. The real bug: `LeaveRoom` should remove from the SignalR group **before** broadcasting:

```csharp
public async Task LeaveRoom(string roomName)
{
    // Remove from SignalR group first so this connection doesn't receive its own leave broadcast
    await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
    _connectionToRoom.TryRemove(Context.ConnectionId, out _);

    if (_rooms.TryGetValue(roomName, out var room))
    {
        room.TryRemove(Context.ConnectionId, out _);
        if (room.IsEmpty)
            await DeleteRoomAndBroadcast(roomName);
        else
            await Clients.Group(roomName).SendAsync("ParticipantLeft", Context.ConnectionId);
    }
}
```

Note the original code sends `ParticipantLeft` even when the room is deleted and `RoomListUpdated` already covers that case — clients should ignore `ParticipantLeft` for a room they no longer hold, but it is noise and ordering-dependent.

---

## Warnings

### WR-01: `handleToggleMic` broadcasts stale mute state due to async timing

**File:** `pulse-client/src/renderer/views/RoomView.vue:474-478`
**Issue:** `toggleMic()` flips `isMicEnabled.value` inside LiveKit asynchronously. `broadcastMuteChanged(!isMicEnabled.value)` reads `isMicEnabled.value` immediately after `await toggleMic()`. If `toggleMic` fails (mic permission denied mid-session), `isMicEnabled` is not updated but the broadcast still fires with the wrong value.

```typescript
// FIX — capture the intended new value before calling toggleMic:
async function handleToggleMic(): Promise<void> {
  if (isDeafened.value) return
  const newMuted = isMicEnabled.value  // current=enabled means we are about to mute
  await toggleMic()
  await broadcastMuteChanged(newMuted)
}
```

---

### WR-02: `setMicEnabled` (used by PTT) does not broadcast mute state changes

**File:** `pulse-client/src/renderer/views/RoomView.vue:388-393`
**Issue:** `setMicEnabled` calls `toggleMic()` (LiveKit mic toggle) but only calls `broadcastMuteChanged(!v)` in one branch. The condition `if (isMicEnabled.value !== v)` prevents calling when state already matches, which is correct. But when PTT triggers mic-on (`setMicEnabled(true)`) and `isMicEnabled.value` is already `false`, it calls `toggleMic()` then `broadcastMuteChanged(!v)` = `broadcastMuteChanged(false)` — correct. When PTT releases (`setMicEnabled(false)`) and `isMicEnabled.value` is `true`, it calls `toggleMic()` then `broadcastMuteChanged(true)` — correct. The logic appears correct here but is fragile: `broadcastMuteChanged(!v)` is semantically reversed (`!v` is the new mute state). If the parameter semantics ever change, this will silently invert. Rename or add a comment clarifying the inversion.

---

### WR-03: Audio elements leak from `document.body` when `disconnect()` is called without unsubscribing tracks

**File:** `pulse-client/src/renderer/composables/useLiveKit.ts:130-138`
**Issue:** `disconnect()` calls `livekitRoom.disconnect()` which fires `RoomEvent.Disconnected` and `RoomEvent.TrackUnsubscribed` for each remote track. `TrackUnsubscribed` calls `track.detach()` and removes the DOM element. However if LiveKit's disconnect event fires before all `TrackUnsubscribed` events are processed (or if the room is garbage-collected before events flush), `audio[id^="livekit-audio-"]` elements can remain orphaned in `document.body`. There is no explicit cleanup sweep in `disconnect()`.

```typescript
async function disconnect(): Promise<void> {
  if (livekitRoom) {
    await livekitRoom.disconnect()
    livekitRoom = null
  }
  // Defensive sweep in case TrackUnsubscribed events did not fire for all tracks
  document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"]').forEach(el => el.remove())
  isConnected.value = false
  isMicEnabled.value = false
  activeSpeakers.value = []
}
```

---

### WR-04: `connect()` in `usePresence` can be called multiple times concurrently — double-connect race

**File:** `pulse-client/src/renderer/composables/usePresence.ts:15-18`
**Issue:** `connect()` checks `if (hubConnection)` and calls `disconnect()` first. `disconnect()` is `async` and properly awaited. However `hubConnection` is a module-level variable shared across all composable instances. If two callers invoke `connect()` concurrently (e.g., rapid join clicks before the first completes), both observe `hubConnection === null` at the time of the check, both create a new `HubConnection`, and the second one overwrites the first — leaving the first connection open and untracked. The `joining` flag in `RoomView.vue` mitigates this at the UI layer, but it is not enforced inside the composable.

```typescript
// FIX — add a connecting guard:
let connectingPromise: Promise<void> | null = null

async function connect(serverUrl: string): Promise<void> {
  if (connectingPromise) return connectingPromise
  connectingPromise = _connect(serverUrl).finally(() => { connectingPromise = null })
  return connectingPromise
}
```

---

### WR-05: `handleJoin` calls `connect(SERVER_URL)` on every join — reconnects even when already connected

**File:** `pulse-client/src/renderer/views/RoomView.vue:440`
**Issue:** Every call to `handleJoin` calls `connect(SERVER_URL)` unconditionally, which triggers `disconnect()` (tearing down the existing SignalR connection and all its event handlers) then reconnects. If the user joins a second room while already in one, they will briefly lose presence for all rooms between the disconnect and reconnect. The fix is to call `connect` only when not already connected.

```typescript
if (connectionState.value !== 'connected') {
  await connect(SERVER_URL)
}
await joinRoom(roomNameInput.value.trim())
```

---

### WR-06: `ptt:set-key` IPC handler does not validate the accelerator string length or character set

**File:** `pulse-client/src/main/index.ts:130-137`
**Issue:** The handler checks `!accelerator || typeof accelerator !== 'string' || !accelerator.trim()` but does not bound the string length or restrict characters before storing it to `electron-store`. A very long string (e.g., 100 KB) passed from a compromised renderer would be persisted to disk. Add a length cap.

```typescript
ipcMain.handle('ptt:set-key', (_event, accelerator: string | null) => {
  if (!accelerator || typeof accelerator !== 'string' || !accelerator.trim()) return false
  if (accelerator.length > 32) return false   // add this guard
  const keycode = acceleratorToUiohookKey(accelerator)
  if (keycode === null) return false
  currentPttKeycode = keycode
  store.set('ptt.key', accelerator)
  return true
})
```

---

### WR-07: `DeleteRoomAndBroadcast` can be called concurrently for the same room from `OnDisconnectedAsync`

**File:** `Pulse.Server/Hubs/PresenceHub.cs:114-133`
**Issue:** `DeleteRoomAndBroadcast` first calls `_rooms.TryRemove(roomName, out _)`. If two connections disconnect simultaneously and both observe the room as empty (e.g., exactly two participants disconnect at the same instant), both paths call `DeleteRoomAndBroadcast`. The first call removes from `_rooms` (`TryRemove` succeeds), then deletes from DB. The second call's `TryRemove` returns `false` (already gone) but the method body does not check the return value — it proceeds to query the DB for a room that may already be deleted, finds nothing (`dbRoom == null`), and then broadcasts another `RoomListUpdated`. This double broadcast is harmless but indicates the guard is missing.

```csharp
private async Task DeleteRoomAndBroadcast(string roomName)
{
    if (!_rooms.TryRemove(roomName, out _))
        return;  // another concurrent call already handled this room
    // ...rest of method
}
```

---

## Info

### IN-01: `console.log` calls left in production code

**File:** `pulse-client/src/renderer/composables/useLiveKit.ts:24,43,44,94`
**Issue:** Multiple `console.log` and `console.error` calls are present in the composable. These will appear in production renderer DevTools output and may leak device label information. Consider a debug-only logging wrapper or strip with a build plugin.

---

### IN-02: Magic number `12` used as participant cap in two places with no constant

**File:** `pulse-client/src/renderer/views/RoomView.vue:145,289`
**Issue:** The capacity cap `12` appears as a hardcoded magic number in the voice tab participant count display and the voice bar. There is no server-side enforcement of this cap visible in the reviewed files. Define a constant or pull from configuration.

---

### IN-03: `createRoomError` ref is declared but never displayed in the template

**File:** `pulse-client/src/renderer/views/RoomView.vue:383`
**Issue:** `const createRoomError = ref('')` is declared and assigned in `handleJoin` (the `catch` block clears it via `createRoomError.value = ''` only), but no template element binds to it. Error messages from `createRoom` failures are silently swallowed. The `joinError` ref is displayed; `createRoomError` appears to be an unused leftover.

---

### IN-04: `watch` for `isPttMode` is registered inside `onMounted` — watcher is created on every component mount and survives unmount

**File:** `pulse-client/src/renderer/composables/usePtt.ts:38`
**Issue:** `watch(isPttMode, ...)` is called inside `onMounted`. Since `isPttMode` is module-level (defined at the top of `usePtt`), each time a component that calls `usePtt()` mounts, a new watcher is added on the same ref. If the component is unmounted and remounted multiple times, duplicate watchers accumulate. The `watch` call should be at the top level of `usePtt()`, not inside `onMounted`.

```typescript
// FIX — move watch outside onMounted:
export function usePtt() {
  // ...
  watch(isPttMode, (v) => { window.pulseApi.setPttMode(v) })  // move here

  onMounted(async () => {
    const saved = await window.pulseApi.getPttKey()
    if (saved) pttBinding.value = { accelerator: saved, label: saved }
    const savedMode = await window.pulseApi.getPttMode()
    isPttMode.value = savedMode
    // remove the watch from here
  })
  // ...
}
```

---

_Reviewed: 2026-06-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
