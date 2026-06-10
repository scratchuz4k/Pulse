# Phase 2: Full Room Experience - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a complete, usable voice room: push-to-talk mode with a user-configurable global hotkey, mute/unmute with state visible to other participants, client-side deafen, room creation (rooms auto-delete when the last participant leaves), and a live participant list with speaking indicators. The layout shell (nav rail, voice feed, bottom control bar) has already been implemented in this session — Phase 2 wires real functionality into it.

</domain>

<decisions>
## Implementation Decisions

### Push-to-Talk
- **D-01:** PTT key is **user-configurable** — any key the user chooses in Settings. Stored in `electron-store`.
- **D-02:** PTT operates as a **global hotkey** using **`uiohook-napi`** for low-level keydown/keyup capture, so it works even when the Pulse window is not in focus. *(UAT-driven override 2026-06-10: originally specified Electron's `globalShortcut` API. UAT found `globalShortcut` only fires on key activation and does not deliver a reliable keyup, so PTT could activate the mic but never reliably released it. `uiohook-napi` provides true keydown/keyup events. The user-facing behavior — a non-exclusive global hotkey — is unchanged.)*
- **D-03:** PTT mode is toggled via a **settings panel toggle** (Voice Activity ↔ Push-to-Talk). Not a per-room choice — it's a client preference.
- **D-04:** When PTT is active: `setMicrophoneEnabled(false)` on connect; keydown → `setMicrophoneEnabled(true)`; keyup → `setMicrophoneEnabled(false)`.

### Deafen
- **D-05:** Deafen is **client-side only** — set `volume = 0` on all remote `<audio>` elements. No server round-trip or LiveKit unsubscribe needed for Phase 2.
- **D-06:** Deafening **forces mic mute** automatically (Discord convention). Un-deafening restores the previous mic state.
- **D-07:** Deafen state is **not broadcast** to other participants — it only affects what the local user hears.

### Room Creation & Persistence
- **D-08:** **Any user can create a named room** — no ownership or admin in Phase 2.
- **D-09:** Rooms **auto-delete when the last participant leaves** — when a room becomes empty (last leave or disconnect), the server removes the DB row and broadcasts an updated room list so every client's voice feed drops the room. *(UAT-driven override 2026-06-10: originally specified that rooms persist in the list even when empty until explicitly deleted. UAT showed empty rooms accumulating with no deletion path in Phase 2 — room deletion UI was deferred to Phase 3 — leaving dead rooms permanently in the list. The user updated the preference to auto-delete empty rooms. Still requires server-side room storage in the DB (EF Core + SQLite).)*
- **D-10:** A `POST /rooms` endpoint creates a room; `GET /rooms` returns the full list. The client polls or receives the list via SignalR on connect.
- **D-11:** Room list is broadcast to all connected clients via SignalR whenever a room is created or deleted, so every client's voice tab updates live.

### Mute State Visibility
- **D-12:** When a participant mutes their mic, **other participants see a 🔇 icon** next to that person's name in the participant panel and sidebar.
- **D-13:** Mute state is broadcast over **SignalR** (not LiveKit metadata) — the server tracks `{ userId, isMuted }` per room and fans it out as `ParticipantMuted` / `ParticipantUnmuted` events.
- **D-14:** Deafen state is **not visible** to others.

### UI Layout (already implemented)
- **D-15:** Three nav tabs: Hub, Text (placeholder), Voice. Voice tab shows room cards in a feed layout.
- **D-16:** Bottom voice bar appears when connected — shows room name, speaking status, avatar stack, mic/deafen/settings/leave controls.
- **D-17:** Room cards in the Voice tab show "you're here" chip, participant avatars, heat bar, and speaking status.

### Claude's Discretion
- PTT key binding UI: a simple `<kbd>` capture input in Settings (click to focus, then press any key). Store as `{ code: 'Space', label: 'Space' }`.
- Global shortcut registration/unregistration: handle in `ipcMain`; renderer sends the key via IPC when user changes it. Re-register on app focus if needed.
- Room deletion UI: omit in Phase 2 — empty rooms are removed automatically (D-09); manual room deletion arrives in Phase 3 with admin roles.
- SignalR mute broadcast: add `MuteChanged(string connectionId, bool isMuted)` hub method; server stores mute state in `_rooms` dictionary alongside `ParticipantInfo`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing implementation (Phase 1 output — read before touching any of these)
- `pulse-client/src/renderer/composables/useLiveKit.ts` — LiveKit room connection, mic toggle, device switching. PTT plugs into `setMicrophoneEnabled`.
- `pulse-client/src/renderer/composables/usePresence.ts` — SignalR hub connection. Mute broadcast events go here.
- `pulse-client/src/renderer/views/RoomView.vue` — Full UI shell with nav tabs, voice feed, bottom bar. All Phase 2 UI changes land here.
- `pulse-client/src/main/index.ts` — Electron main process. Global PTT hotkey capture (`uiohook-napi`) and IPC handlers go here.
- `Pulse.Server/Hubs/PresenceHub.cs` — SignalR hub. New hub methods (`MuteChanged`, `RoomCreated`, `RoomDeleted`) go here.
- `Pulse.Server/Program.cs` — Server entry point, CORS config.

### Requirements
- `.planning/REQUIREMENTS.md` — Phase 2 covers: VOICE-04, VOICE-05, VOICE-06, ROOM-01, ROOM-02, ROOM-03

### Design reference
- `Design/Guildhall Wireframes.html` — Wireframe variant 1 "Priority Feed" is the implemented layout. Use as visual reference for card styles and bottom bar.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useLiveKit.ts` → `toggleMic()` / `setMicrophoneEnabled()` — PTT keydown/keyup calls these directly.
- `usePresence.ts` → `hubConnection.on(...)` / `hubConnection.invoke(...)` — add mute event listeners and `MuteChanged` invocation here.
- `RoomView.vue` → participant list already rendered; add `isMuted` flag to `Participant` store type and show 🔇 icon conditionally.
- `PresenceHub.cs` → `_rooms` dict with `ParticipantInfo` — extend record to include `bool IsMuted`.
- EF Core + SQLite already set up for users/refresh tokens — add a `Room` entity for persistence.

### Established Patterns
- SignalR hub events follow `hubConnection.on('EventName', (args) => ...)` in `usePresence.ts`.
- Store shape: Pinia stores in `stores/` with `ref()` state and exported action functions.
- IPC pattern: `ipcMain.handle('key', handler)` in main, `window.electron.ipcRenderer.invoke('key', args)` in renderer (via preload).
- Global PTT capture: `uiohook-napi` `uIOhook.on('keydown'/'keyup', ...)` in the main process — translate the bound key code to uiohook keycodes and fire IPC events to the renderer on press/release.

### Integration Points
- PTT: renderer → IPC (`ptt:set-key`) → main registers the key with `uiohook-napi` → fires IPC events (keydown/keyup) back to renderer → renderer calls `setMicrophoneEnabled`.
- Room list: `GET /rooms` on connect + SignalR `RoomListUpdated` event keeps the voice feed in sync.
- Mute broadcast: `toggleMic()` in `useLiveKit` → also invoke `MuteChanged` on SignalR hub → server fans out to room participants → `usePresence` updates room store.

</code_context>

<specifics>
## Specific Ideas

- The voice feed already shows room cards with the correct visual style — just wire in real room list data from the API.
- Bottom bar already has mic/deafen buttons — add the mute icon in the participant list and sidebar.
- PTT key binding: show the currently bound key as a `<kbd>` element in the Settings tab; clicking it enters "listening" mode, next keypress captures the new binding.

</specifics>

<deferred>
## Deferred Ideas

- Server-side deafen (unsubscribe from LiveKit tracks) — Phase 3+ when bandwidth optimization matters.
- Manual room deletion UI — Phase 3 when admin roles are introduced (empty rooms already auto-delete per D-09).
- Room capacity limits — Phase 3.
- Unique PTT key conflict detection (e.g., key already bound by OS) — future polish.

</deferred>

---

*Phase: 2-Full Room Experience*
*Context gathered: 2026-06-09*
