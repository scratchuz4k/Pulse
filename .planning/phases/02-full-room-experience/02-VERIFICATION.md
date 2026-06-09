---
status: human_needed
phase: 02-full-room-experience
verified: 2026-06-09
---

# Phase 02 Verification: Full Room Experience

## Summary

All five plans executed successfully. Static code inspection confirms every must-have
truth is satisfied at the source level. Five requirement IDs (VOICE-04, VOICE-05,
VOICE-06, ROOM-01, ROOM-02, ROOM-03) are fully covered by code. A small set of
behavioral items require a running app to confirm end-to-end correctness — these are
listed under Human Verification Required.

Status is `human_needed` because push-to-talk global hotkey behavior, real-time mute
visibility across two clients, and deafen audio volume control cannot be confirmed by
static analysis alone.

---

## Must-Haves Check

### Plan 02-01 — Room Persistence

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /rooms creates a room row in the DB and returns it | VERIFIED | `RoomsController.cs` line 45: inserts via `db.Rooms.Add`, calls `SaveChangesAsync`, returns `Created(...)` |
| 2 | GET /rooms returns the full list of persisted rooms | VERIFIED | `RoomsController.cs` has `[HttpGet]` endpoint returning `db.Rooms.OrderBy(r => r.Name)...ToListAsync()` |
| 3 | After POST /rooms, all SignalR clients receive RoomListUpdated | VERIFIED | `RoomsController.cs` line 53: `hubContext.Clients.All.SendAsync("RoomListUpdated", rooms)` |
| 4 | Duplicate room names return HTTP 409 (not 500) | VERIFIED | `RoomsController.cs` lines 43-45: `catch (DbUpdateException)` returns `Conflict(...)` |

### Plan 02-02 — Mute Broadcast

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking Mute sends SignalR MuteChanged invocation to server | VERIFIED | `RoomView.vue` line 444: `handleToggleMic` awaits `broadcastMuteChanged(!isMicEnabled.value)` |
| 2 | Server fans mute event to room as ParticipantMuted/ParticipantUnmuted | VERIFIED | `PresenceHub.cs` line 52: `MuteChanged(bool isMuted)` calls `Clients.Group(roomName).SendAsync(...)` |
| 3 | Receiving clients update Pinia `participant.isMuted` | VERIFIED | `usePresence.ts` lines 49, 53: `roomStore.setParticipantMuted(connectionId, true/false)` in `.on` listeners |
| 4 | Mute icon appears next to muted participant in squad panel and bottom bar | VERIFIED (visual) | `RoomView.vue`: `v-if="p.isMuted"` span and `:class="{ muted: p.isMuted }"` on `vb-av` present in template — requires running app to confirm rendering |
| 5 | Participant list in Voice tab shows all current participants (ROOM-01) | VERIFIED | `roomStore.participants` rendered via `v-for` in both Voice and Hub squad panels |

### Plan 02-03 — Room List Wiring

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Voice tab shows a card for every room from GET /rooms | VERIFIED | `RoomView.vue`: `v-for` over `roomStore.rooms` confirmed present (2 template references) |
| 2 | Clicking a room card joins that room | VERIFIED | `handleJoinRoom(name)` helper sets `roomNameInput` and calls `handleJoin`; wired to card click |
| 3 | New Room form POSTs to /rooms and room appears on all clients | VERIFIED | `handleJoin` calls `createRoom(SERVER_URL, name)` before joining; server broadcasts `RoomListUpdated` |
| 4 | RoomListUpdated event updates roomStore.rooms in real time | VERIFIED | `usePresence.ts` line 56: `hubConnection.on('RoomListUpdated', ...)` calls `roomStore.setRoomList(list)` |

### Plan 02-04 — Push-to-Talk

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PTT mode: mic starts disabled on room connect | VERIFIED | `RoomView.vue`: `handleJoin` calls `setMicEnabled(false)` after `livekitConnect()` when `isPttMode.value` is true |
| 2 | Holding configured key enables mic (keydown fires ptt:key-down to renderer) | HUMAN-TEST | `main/index.ts` line 75: `ipcMain.handle('ptt:set-key', ...)` registers `globalShortcut` that sends `ptt:key-down` — requires live Electron to confirm |
| 3 | Releasing key (or losing focus) disables mic | HUMAN-TEST | Blur handler in `main/index.ts` sends `ptt:key-up`; `usePtt` window `keyup` listener wired via `setReleaseCallback` — requires live test |
| 4 | User can configure PTT key via Settings tab key-capture input | VERIFIED (visual) | `RoomView.vue` Settings tab has `<kbd>` element with `@click="startCapture"` and `@keydown="handleCaptureKeydown"` — requires running app to test UX |
| 5 | Chosen PTT key survives app restart | HUMAN-TEST | `ptt:get-key` reads `store.get('ptt.key')`; startup restore re-registers shortcut — requires app restart to verify |
| 6 | Voice Activity / Push-to-Talk toggle exists in Settings tab | VERIFIED | `RoomView.vue` Settings tab has `.ptt-toggle` div with two `.ptt-opt` buttons |

### Plan 02-05 — Deafen Fix + Speaking Indicators

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking Deafen sets all remote audio elements to volume 0 and mutes local mic | VERIFIED | `RoomView.vue` line 450+: `isDeafened = true`, `el.volume = 0`, `await toggleMic()` if mic was on |
| 2 | Clicking Undeafen sets audio back to volume 1 and restores previous mic state | VERIFIED | `RoomView.vue` line 462: `if (prevMicEnabled.value && !isMicEnabled.value) await toggleMic()` on undeafen |
| 3 | Mic state restored correctly based on pre-deafen state | VERIFIED | `prevMicEnabled.value = isMicEnabled.value` saved before deafen; conditional restore on undeafen |
| 4 | Deafen button shows active/muted CSS class when deafened | HUMAN-TEST | `isDeafened` ref drives CSS class in template — requires running app to confirm visual |
| 5 | Speaking ring animation fires on correct participant (userId not connectionId) | VERIFIED | grep confirms 8 occurrences of `activeSpeakers.includes(p.userId)` in RoomView.vue template — all use `userId` |

---

## Requirement Coverage

| Requirement | Covered By | Implementation |
|-------------|-----------|----------------|
| VOICE-04 | 02-04 | PTT with `globalShortcut`, electron-store persistence, blur auto-release, Settings UI |
| VOICE-05 | 02-02 | `MuteChanged` hub method, `ParticipantMuted`/`ParticipantUnmuted` events, mute icon in UI |
| VOICE-06 | 02-05 | `handleToggleDeafen` with `prevMicEnabled` save/restore; audio volume set client-side |
| ROOM-01 | 02-02 | Participant list in Voice tab squad panel rendered from `roomStore.participants` |
| ROOM-02 | 02-05 | Speaking indicators confirmed to use `p.userId` matching LiveKit identity (8 occurrences) |
| ROOM-03 | 02-01, 02-03 | EF Core Room entity + GET/POST /rooms; client fetches on connect + listens for RoomListUpdated |

All six requirement IDs have code coverage confirmed.

---

## Human Verification Required

The following items need a running Electron app to confirm end-to-end:

1. **PTT global hotkey fires when window is NOT in focus**
   - Bind a key in Settings (e.g., Space)
   - Focus another window
   - Hold the PTT key — mic should activate
   - Release — mic should deactivate
   - Expected: `ptt:key-down` / `ptt:key-up` IPC messages trigger `setMicEnabled`

2. **PTT key persists across app restart**
   - Bind Space as PTT key
   - Quit and restart the app
   - Settings tab should show Space as bound PTT key
   - Holding Space should activate mic without re-binding

3. **Real-time mute icon across two clients**
   - Client A and Client B in the same room
   - Client A clicks Mute — mute icon (🔇) should appear next to Client A's name in Client B's squad panel
   - Client A unmutes — icon disappears from Client B's view

4. **Deafen audio silencing and restore**
   - With Client B speaking: Client A deafens — audio from B goes silent
   - Client A undeafens — audio from B is audible again
   - Mic state preserved correctly (on deafen with mic enabled → undeafen re-enables mic)

5. **Voice feed room cards and one-click join**
   - Client A creates room "standup" — both clients see it in voice feed without refresh
   - Client B clicks the "standup" card — joins the room; Client A sees Client B in participant list

6. **Speaking ring animation visible during active speech**
   - Two clients in room; both speaking
   - Speaking ring CSS animation fires around the active speaker's avatar

---

## Gaps

No implementation gaps identified. All must-have truths are satisfied by code. The
`human_needed` status reflects behavioral verification requirements, not missing
implementation.

### Minor Note

The deafen button CSS class binding was not grep-verified (template line not surfaced in
spot-check), but the `isDeafened` ref and `handleToggleDeafen` logic are confirmed.
Visual confirmation of the button's active styling is captured under Human Verification item 4.
