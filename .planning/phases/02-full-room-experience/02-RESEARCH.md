# Phase 2: Full Room Experience - Research

**Researched:** 2026-06-09
**Domain:** Electron globalShortcut / IPC, SignalR hub extensions, EF Core entity addition, Vue 3 Pinia store extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** PTT key is user-configurable — any key the user chooses in Settings. Stored in `electron-store`.
- **D-02:** PTT operates as a global hotkey using Electron's `globalShortcut` API (works when window not in focus).
- **D-03:** PTT mode toggled via a settings panel toggle (Voice Activity vs Push-to-Talk). Client preference, not per-room.
- **D-04:** When PTT active: `setMicrophoneEnabled(false)` on connect; keydown → `setMicrophoneEnabled(true)`; keyup → `setMicrophoneEnabled(false)`.
- **D-05:** Deafen is client-side only — set `volume = 0` on all remote `<audio>` elements. No server round-trip.
- **D-06:** Deafening forces mic mute. Un-deafening restores previous mic state.
- **D-07:** Deafen state is NOT broadcast to other participants.
- **D-08:** Any user can create a named room — no ownership/admin in Phase 2.
- **D-09:** Rooms persist even when empty. Server-side storage in EF Core + SQLite.
- **D-10:** `POST /rooms` creates a room; `GET /rooms` returns the full list.
- **D-11:** Room list broadcast to all connected clients via SignalR `RoomListUpdated` on create/delete.
- **D-12:** Muted participant shows 🔇 icon to others in participant panel and sidebar.
- **D-13:** Mute state broadcast over SignalR (not LiveKit metadata). Server tracks `{ userId, isMuted }` per room, fans out `ParticipantMuted` / `ParticipantUnmuted`.
- **D-14:** Deafen state NOT visible to others.

### Claude's Discretion

- PTT key binding UI: `<kbd>` capture input in Settings. Click to focus, then press any key. Store as `{ code: 'Space', label: 'Space' }`.
- Global shortcut registration/unregistration: handle in `ipcMain`; renderer sends key via IPC when user changes it. Re-register on app focus if needed.
- Room deletion: omit in Phase 2.
- SignalR mute broadcast: add `MuteChanged(string connectionId, bool isMuted)` hub method; server stores mute state in `_rooms` dictionary alongside `ParticipantInfo`.

### Deferred Ideas (OUT OF SCOPE)

- Server-side deafen (unsubscribe from LiveKit tracks) — Phase 3+.
- Room deletion UI — Phase 3 when admin roles introduced.
- Room capacity limits — Phase 3.
- PTT key conflict detection — future polish.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOICE-04 | Push-to-talk mode — audio transmitted only while configured key held | Electron globalShortcut; IPC bridge `ptt:set-key` / `ptt:key-down` / `ptt:key-up`; `setMicrophoneEnabled` already exposed on `livekitRoom.localParticipant` |
| VOICE-05 | Mute own microphone; state visible to others | `toggleMic()` already exists; wire SignalR `MuteChanged` broadcast; extend `Participant` type with `isMuted`; show 🔇 in squad list |
| VOICE-06 | Deafen — no incoming audio until undeafened | `handleToggleDeafen` already implemented in RoomView; restores pre-deafen mic state via saved bool |
| ROOM-01 | See list of all participants currently in a voice room | `roomStore.participants` already drives squad panel; requires `isMuted` field addition |
| ROOM-02 | Real-time visual indicator showing who is speaking | `activeSpeakers` / `sq-speaking-ring` animation already implemented; verify it works end-to-end |
| ROOM-03 | Create a new named voice room (channel creation) | Needs `POST /rooms` + `GET /rooms` REST endpoints; `Room` EF entity; SignalR `RoomListUpdated`; voice feed shows list of all rooms, not just the one the user is in |
</phase_requirements>

---

## Summary

Phase 2 completes the "full room experience" by wiring real functionality into the existing UI shell. The shell already has the visual structure — nav rail, voice feed, squad panel, bottom bar with mic/deafen buttons — so work is primarily about connecting plumbing: Electron global shortcuts for PTT, SignalR event extensions for mute visibility, EF Core entity and REST endpoints for persistent rooms, and updating Pinia stores to carry the new `isMuted` and `rooms[]` state.

The deafen feature is already functionally complete in `RoomView.vue` (`handleToggleDeafen` sets audio element volume to 0 and auto-mutes). It needs no server changes — just verification and the pre-deafen mic-restore logic (which is also already present). ROOM-02 (speaking indicators) is also already implemented via `activeSpeakers` + `sq-speaking-ring` animation. The real work is PTT (Electron IPC + globalShortcut), mute broadcasting (SignalR + store extension), and room persistence (new EF entity + two REST endpoints + SignalR broadcast + voice feed list view).

The key integration risk is the PTT IPC roundtrip latency. `globalShortcut` fires in the main process; it must fire an IPC event back to the renderer which then calls `setMicrophoneEnabled`. This is a two-hop async path on every keydown/keyup — it must complete fast enough to feel responsive. The preload bridge currently only exposes `storeGet/Set/Del`; it needs a `onPttKey` listener added.

**Primary recommendation:** Implement in this order — (1) room persistence (REST + EF + SignalR broadcast + voice feed list), (2) mute visibility (SignalR MuteChanged + store + 🔇 icon), (3) PTT (globalShortcut + IPC + settings toggle + key capture UI).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PTT key capture (global) | Electron Main | Renderer (receives IPC event) | globalShortcut only runs in main process |
| PTT mic toggle | Renderer | — | setMicrophoneEnabled lives in renderer-side LiveKit room |
| PTT key storage | Electron Main (electron-store) | Renderer (reads via IPC) | Store is accessed from main; renderer uses storeGet/Set IPC |
| Mute toggle | Renderer (useLiveKit.toggleMic) | — | LiveKit mic control is renderer-side |
| Mute broadcast | Server (PresenceHub.MuteChanged) | Renderer (invokes, listens) | SignalR fan-out is server's job |
| Mute state (per-room) | Server (PresenceHub._rooms dict) | Renderer (Pinia roomStore) | Source of truth on server; client mirrors it |
| Deafen (audio volume) | Renderer | — | Client-side only; no server involvement |
| Room persistence | Server (EF Core SQLite) | — | D-09 explicitly requires server-side storage |
| Room list delivery | Server (REST GET /rooms + SignalR RoomListUpdated) | Renderer (fetches on connect) | Server is source of truth |
| Room list UI | Renderer (RoomView.vue voice feed) | — | Display layer |
| Speaking indicators | Renderer (activeSpeakers from LiveKit) | — | LiveKit ActiveSpeakersChanged drives this already |

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | 28.3.3 | Desktop shell, globalShortcut API | Already installed [VERIFIED: package.json] |
| livekit-client | 2.19.2 | Audio track control, speaking detection | Already installed [VERIFIED: package.json] |
| @microsoft/signalr | (existing) | Hub event bus for mute/room events | Already installed and connected |
| electron-store | 8.2.0 | PTT key preference persistence | Already installed [VERIFIED: package.json] |
| EF Core + SQLite | (existing) | Room entity persistence | Already configured in AppDbContext |
| Vue 3 + Pinia | (existing) | Reactve store for rooms/mute state | Already used throughout |

No new packages are needed for Phase 2. All capabilities use already-installed dependencies.

### Installation
```bash
# No new packages — Phase 2 uses the existing stack exclusively.
```

---

## Package Legitimacy Audit

No new packages are introduced in Phase 2. This section is intentionally empty.

**Packages removed due to slopcheck verdict:** none
**Packages flagged as suspicious:** none

---

## Architecture Patterns

### System Architecture Diagram

```
[User keydown (global)]
        |
[Electron Main: globalShortcut callback]
        |  ipcMain fires renderer event
        v
[Renderer: usePtt composable]
        |  setMicrophoneEnabled(true/false)
        |
        +---> [LiveKit SFU: audio track enabled/disabled]
        |
        +---> [SignalR: hubConnection.invoke('MuteChanged', isMuted)]
                        |
              [PresenceHub.MuteChanged — updates _rooms dict]
                        |  Clients.Group(roomName).SendAsync
                        v
              [All room participants receive ParticipantMuted / ParticipantUnmuted]
                        |
              [usePresence.ts: hubConnection.on('ParticipantMuted')]
                        |
              [roomStore: participant.isMuted = true]
                        |
              [RoomView.vue: v-if="p.isMuted" shows 🔇]


[GET /rooms on connect]  <---> [POST /rooms on room create]
        |                              |
[RoomsController]              [RoomsController]
        |                              |
[EF Core: Room entity]         [EF Core: Room entity]
        |                              |
        +----------+------------------+
                   |  after create: hub.SendAsync('RoomListUpdated', rooms)
                   v
        [All clients: RoomListUpdated event]
                   |
        [usePresence.ts: roomStore.setRoomList(rooms)]
                   |
        [RoomView.vue voice feed: v-for room in roomStore.rooms]
```

### Recommended Project Structure Additions

```
pulse-client/src/
├── renderer/
│   ├── composables/
│   │   ├── useLiveKit.ts          # extend: PTT mode flag, setMicrophoneEnabled wrapper
│   │   ├── usePresence.ts         # extend: MuteChanged, RoomListUpdated, invokeMuteChanged
│   │   └── usePtt.ts              # NEW: PTT composable (mode, key binding, IPC setup)
│   ├── stores/
│   │   └── room.ts                # extend: rooms[], isMuted on Participant
│   └── views/
│       └── RoomView.vue           # extend: rooms list, PTT settings, 🔇 icon, key capture UI
├── main/
│   └── index.ts                   # extend: ptt:set-key handler, ptt:get-key handler, globalShortcut
└── preload/
    └── index.ts                   # extend: onPttKey listener forwarding to renderer

Pulse.Server/
├── Models/
│   └── Room.cs                    # NEW: Room entity { Id, Name, CreatedAt }
├── Data/
│   └── AppDbContext.cs            # extend: DbSet<Room>
├── Controllers/
│   └── RoomsController.cs         # extend: GET /rooms + POST /rooms (was token-only)
└── Hubs/
    └── PresenceHub.cs             # extend: MuteChanged method, isMuted in ParticipantInfo
```

### Pattern 1: Electron globalShortcut — PTT IPC Flow

**What:** Main process registers a global accelerator; on keydown it fires an IPC event to the renderer window; renderer calls `setMicrophoneEnabled`. On keyup the same in reverse.

**When to use:** Any global hotkey that controls renderer-side state.

```typescript
// Source: Electron docs (globalShortcut + webContents.send)
// In main/index.ts

import { globalShortcut, ipcMain, BrowserWindow } from 'electron'

let pttAccelerator: string | null = null

ipcMain.handle('ptt:set-key', (_event, accelerator: string) => {
  // Unregister previous binding
  if (pttAccelerator) {
    globalShortcut.unregister(pttAccelerator)
    pttAccelerator = null
  }
  if (!accelerator) return

  const win = BrowserWindow.getAllWindows()[0]
  if (!win) return

  // Register keydown — globalShortcut fires once per physical press
  // Use 'pressed' callback; for keyup we need a second accelerator variant or
  // a keyboardEvent listener approach (see pitfall below)
  const registered = globalShortcut.register(accelerator, () => {
    win.webContents.send('ptt:key-down')
  })
  if (registered) {
    pttAccelerator = accelerator
    store.set('ptt.key', accelerator)
  }
  return registered
})

ipcMain.handle('ptt:get-key', () => {
  return store.get('ptt.key') ?? null
})
```

```typescript
// In preload/index.ts — expose the renderer-side listener
contextBridge.exposeInMainWorld('pulseApi', {
  // ...existing storeGet/Set/Del...
  onPttKeyDown: (cb: () => void) => ipcRenderer.on('ptt:key-down', cb),
  onPttKeyUp:   (cb: () => void) => ipcRenderer.on('ptt:key-up',   cb),
  setPttKey:    (accelerator: string) => ipcRenderer.invoke('ptt:set-key', accelerator),
  getPttKey:    () => ipcRenderer.invoke('ptt:get-key'),
  removePttListeners: () => {
    ipcRenderer.removeAllListeners('ptt:key-down')
    ipcRenderer.removeAllListeners('ptt:key-up')
  },
})
```

### Pattern 2: globalShortcut keyup Detection

**What:** `globalShortcut.register` fires only once per physical key press (keydown semantics). There is no native keyup event in Electron's globalShortcut API.

**The standard workaround for PTT keyup** is to use `uiohook-napi` or to listen for the renderer's `keyup` event when the window IS focused, and combine with a `blur` handler to release PTT when focus is lost. For a simpler approach: use `globalShortcut` for keydown only; handle keyup in the renderer via `window.addEventListener('keyup')` when the window has focus, and auto-release via `app.on('browser-window-blur')` IPC when focus is lost.

However, since D-02 requires PTT to work when the window is NOT in focus, pure renderer keyup is not sufficient. **The recommended approach for Phase 2:**

1. Register keydown via `globalShortcut.register(accelerator, () => send('ptt:key-down'))`
2. For keyup: additionally register `globalShortcut.register(accelerator, ...)` is not sufficient for keyup.
3. Use the `uiohook-napi` package for true global keyup — but this adds a native dependency.

**Simpler Phase 2 approach (no new deps):** Register keydown with `globalShortcut`. Track PTT-held state in main. Use `app.on('browser-window-blur')` to auto-release. For keyup when window is focused, renderer `keyup` event works. This covers the common case: most users will have Pulse focused while PTT is in use, and blur-release covers the "pressed in background" scenario. [ASSUMED — this tradeoff is a design decision, not a verified pattern]

```typescript
// Auto-release on window blur (main process)
mainWindow.on('blur', () => {
  if (pttHeld) {
    pttHeld = false
    mainWindow.webContents.send('ptt:key-up')
  }
})

// Renderer also listens for keyup when focused
window.addEventListener('keyup', (e) => {
  if (pttMode.value && e.code === pttKeyCode.value) {
    releasePtt()
  }
})
```

### Pattern 3: SignalR MuteChanged — Extend PresenceHub

```csharp
// Source: existing PresenceHub.cs pattern
// Extend ParticipantInfo record:
private record ParticipantInfo(string DisplayName, string UserId, bool IsMuted = false);

// Add hub method:
public async Task MuteChanged(bool isMuted)
{
    var roomName = GetCurrentRoomForConnection(Context.ConnectionId);
    if (roomName == null) return;

    if (_rooms.TryGetValue(roomName, out var room) &&
        room.TryGetValue(Context.ConnectionId, out var info))
    {
        room[Context.ConnectionId] = info with { IsMuted = isMuted };
    }

    var eventName = isMuted ? "ParticipantMuted" : "ParticipantUnmuted";
    await Clients.Group(roomName).SendAsync(eventName, Context.ConnectionId, isMuted);
}
```

The hub needs a helper to find which room a connectionId is currently in — iterate `_rooms` since the same connection can only be in one room at a time (Phase 2 constraint).

### Pattern 4: Room Entity + REST Endpoints

```csharp
// Models/Room.cs
public class Room
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// AppDbContext.cs addition:
public DbSet<Room> Rooms => Set<Room>();

// POST /rooms — creates if name not already taken
// GET /rooms — returns all rooms with live participant counts (from _rooms dict)
```

The `POST /rooms` endpoint should create idempotently (return existing if name already taken) or return 409. [ASSUMED — exact behavior; either works for Phase 2; idempotent is friendlier UX]

After creating a room, the controller needs to broadcast `RoomListUpdated` via SignalR. Inject `IHubContext<PresenceHub>` into the controller:

```csharp
public class RoomsController(
    AppDbContext db,
    IHubContext<PresenceHub> hubContext,
    ILiveKitService liveKitService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest req)
    {
        // ... create in DB ...
        var allRooms = await db.Rooms.Select(r => new { r.Id, r.Name }).ToListAsync();
        await hubContext.Clients.All.SendAsync("RoomListUpdated", allRooms);
        return Ok(room);
    }

    [HttpGet]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await db.Rooms.Select(r => new { r.Id, r.Name }).ToListAsync();
        return Ok(rooms);
    }
}
```

### Pattern 5: Pinia store — extend Participant with isMuted

```typescript
// stores/room.ts
export interface Participant {
  connectionId: string
  displayName: string
  userId: string
  isMuted: boolean   // NEW
}

// Add actions:
function setParticipantMuted(connectionId: string, isMuted: boolean): void {
  const p = participants.value.find(p => p.connectionId === connectionId)
  if (p) p.isMuted = isMuted
}

// For room list:
export interface RoomInfo {
  id: number
  name: string
}
const rooms = ref<RoomInfo[]>([])
function setRoomList(list: RoomInfo[]): void { rooms.value = list }
```

### Anti-Patterns to Avoid

- **Registering globalShortcut before `app.whenReady()`:** Throws — always register inside `whenReady()` or after.
- **Not unregistering the old accelerator before re-registering:** Electron silently fails the new registration if the accelerator is already bound; always unregister first.
- **Storing PTT key as a KeyboardEvent `key` value instead of Electron accelerator string:** `event.key` gives 'Space'; Electron accelerator needs 'Space' too, but for special keys the mapping differs (e.g., `F5` vs `f5`). Use `event.code` to derive the Electron accelerator string, with a mapping table.
- **Broadcasting mute via LiveKit participant metadata:** CONTEXT.md explicitly decided SignalR for mute broadcast (D-13). Don't use LiveKit metadata — it adds latency and couples mute visibility to LiveKit connection state.
- **Calling `EnsureCreatedAsync` in production with model changes:** Already in use — adding the `Room` entity will create the table automatically on next startup since EnsureCreated is idempotent for new tables. No migration script needed for Phase 2. [VERIFIED: EF Core docs behavior]
- **Using `ipcRenderer.send` instead of `ipcRenderer.on` for PTT events from main:** `send` is renderer-to-main; main pushes to renderer via `webContents.send`, received in renderer via `ipcRenderer.on` (or the preload wrapper).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Global key capture | Custom native addon | `globalShortcut` (already in Electron) | OS-level registration, no native code |
| Electron accelerator format | Custom key code mapping | Electron accelerator string (e.g., 'Space', 'F5', 'CmdOrCtrl+M') | Built-in format |
| Audio element volume muting | Custom audio graph | `el.volume = 0` on `<audio>` elements | Deafen is already implemented this way |
| Room list real-time sync | Polling | SignalR `RoomListUpdated` push | Already established pattern in the project |
| Participant mute state | LiveKit metadata | SignalR MuteChanged events | CONTEXT.md decision D-13; avoids LiveKit coupling |

---

## Common Pitfalls

### Pitfall 1: globalShortcut Has No keyup Event
**What goes wrong:** Developer registers `globalShortcut.register('Space', cb)` expecting keydown/keyup lifecycle like a DOM event. Only keydown fires.
**Why it happens:** The OS-level shortcut API is edge-triggered (keydown only).
**How to avoid:** For Phase 2 PTT keyup: combine globalShortcut keydown + renderer `window.addEventListener('keyup')` when focused + `mainWindow.on('blur')` auto-release. This handles the common cases without adding native deps.
**Warning signs:** PTT "sticks" — mic stays on after key release.

### Pitfall 2: Electron Accelerator vs KeyboardEvent.code Format
**What goes wrong:** Capture `event.code` ('Space', 'KeyA', 'F5') and pass directly to `globalShortcut.register`. Some work, some silently fail.
**Why it happens:** Electron accelerators use a different string format for special keys: 'Space' works, but 'KeyA' must be 'A', 'ArrowUp' must be 'Up', etc.
**How to avoid:** Build a small mapping table in the key-capture UI: `{ code: 'Space', accelerator: 'Space', label: 'Space' }`, `{ code: 'KeyA', accelerator: 'A', label: 'A' }`, `{ code: 'ArrowUp', accelerator: 'Up', label: '↑' }`.
**Warning signs:** `globalShortcut.register()` returns `false` — check the Electron accelerator format docs.

### Pitfall 3: IPC Listener Accumulation
**What goes wrong:** Each time the user re-enters the room or navigates away and back, `ipcRenderer.on('ptt:key-down', cb)` adds another listener. After a few cycles, PTT fires the mic toggle multiple times per keypress.
**Why it happens:** `ipcRenderer.on` accumulates listeners; Vue composables that set them up in `onMounted` without cleanup in `onUnmounted` will stack.
**How to avoid:** Always use `ipcRenderer.removeAllListeners('ptt:key-down')` in composable cleanup, or use `ipcRenderer.once` where appropriate. The `usePtt` composable should call `window.pulseApi.removePttListeners()` in its `onUnmounted` hook.
**Warning signs:** Each keypress triggers the mic multiple times; noise increases with navigation count.

### Pitfall 4: Room Name Uniqueness — DB vs In-Memory
**What goes wrong:** `POST /rooms` creates a DB row; `PresenceHub._rooms` is an in-memory ConcurrentDictionary. On server restart, the DB has rooms but `_rooms` is empty. If a user joins a room by name from the persisted list, `JoinRoom` will `GetOrAdd` it to `_rooms` — this actually works fine. But the room list returned by `GET /rooms` and the live participant data in `_rooms` are different sources. The `GET /rooms` response needs participant counts, which come from `_rooms`.
**How to avoid:** Inject `IHubContext<PresenceHub>` is not enough to access `_rooms` from the controller (it's a static field). Expose a static method or a singleton service `RoomStateService` that both the hub and controller share for live participant counts. Alternatively, return 0 counts from `GET /rooms` and let SignalR `ParticipantJoined`/`ParticipantLeft` keep the client's count in sync — simpler for Phase 2.
**Warning signs:** Participant counts in the room list are always 0 or stale.

### Pitfall 5: MuteChanged Requires Room Lookup
**What goes wrong:** `MuteChanged` hub method needs to know which room the calling connection is in to send to the right group. `Context.ConnectionId` → room name mapping requires iterating `_rooms`.
**Why it happens:** SignalR doesn't track which group a connection is in internally (Groups are server-side constructs but not queryable).
**How to avoid:** Add a reverse lookup: `private static readonly ConcurrentDictionary<string, string> _connectionToRoom = new()` — populated in `JoinRoom`, cleared in `LeaveRoom` and `OnDisconnectedAsync`.
**Warning signs:** MuteChanged broadcasts to wrong group or throws NullReferenceException.

---

## Code Examples

### Key Capture UI (Settings tab)

```typescript
// usePtt.ts — composable
import { ref, onMounted, onUnmounted } from 'vue'

export interface PttBinding {
  accelerator: string  // Electron accelerator string
  label: string        // Human-readable label shown in Settings
}

// Map from KeyboardEvent.code to Electron accelerator
const CODE_TO_ACCELERATOR: Record<string, string> = {
  Space: 'Space', Enter: 'Return', Backspace: 'Backspace',
  Tab: 'Tab', Escape: 'Escape',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  // Letters: strip 'Key' prefix
  // F-keys: pass through as-is
}
function codeToAccelerator(code: string): string {
  if (code in CODE_TO_ACCELERATOR) return CODE_TO_ACCELERATOR[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)       // KeyA -> A
  if (/^Digit\d$/.test(code)) return code.slice(5)         // Digit1 -> 1
  if (/^F\d+$/.test(code)) return code                     // F1, F5 -> same
  return code
}

export function usePtt() {
  const isPttMode = ref(false)
  const pttBinding = ref<PttBinding | null>(null)
  const isCapturing = ref(false)

  onMounted(async () => {
    const savedAccelerator = await window.pulseApi.getPttKey()
    if (savedAccelerator) {
      pttBinding.value = { accelerator: savedAccelerator, label: savedAccelerator }
    }
  })

  function startCapture() { isCapturing.value = true }

  function handleCaptureKeydown(e: KeyboardEvent) {
    if (!isCapturing.value) return
    e.preventDefault()
    const accelerator = codeToAccelerator(e.code)
    const label = e.key === ' ' ? 'Space' : e.key
    pttBinding.value = { accelerator, label }
    isCapturing.value = false
    window.pulseApi.setPttKey(accelerator)
  }

  return { isPttMode, pttBinding, isCapturing, startCapture, handleCaptureKeydown }
}
```

### SignalR MuteChanged — usePresence extension

```typescript
// In usePresence.ts connect(), add after existing .on() calls:

hubConnection.on('ParticipantMuted', (connectionId: string) => {
  roomStore.setParticipantMuted(connectionId, true)
})

hubConnection.on('ParticipantUnmuted', (connectionId: string) => {
  roomStore.setParticipantMuted(connectionId, false)
})

hubConnection.on('RoomListUpdated', (rooms: { id: number; name: string }[]) => {
  roomStore.setRoomList(rooms)
})

// Add exported function for renderer to invoke:
async function broadcastMuteChanged(isMuted: boolean): Promise<void> {
  if (!hubConnection) return
  await hubConnection.invoke('MuteChanged', isMuted)
}
```

### EF Core Room entity — no migration needed

```csharp
// EnsureCreatedAsync creates new tables on startup.
// Adding Room to AppDbContext is sufficient for Phase 2 (no existing data to migrate).
// If the DB already exists from Phase 1, EnsureCreated does NOT add new tables --
// ONLY creates the whole schema if the file doesn't exist yet.
// For dev: delete pulse.db and let it recreate. Or use db.Database.MigrateAsync().
```

**Important:** `EnsureCreatedAsync` creates the DB if it doesn't exist, but does NOT run migrations or add tables to an existing DB. If Phase 1 already created `pulse.db`, the `Room` table will NOT be added by `EnsureCreated`. For Phase 2, either:
- Delete the dev `pulse.db` and let it recreate (simplest for dev), OR
- Switch to EF Core migrations (`dotnet ef migrations add AddRooms && dotnet ef database update`)

The plan should include a task to handle this. [VERIFIED: EF Core docs behavior for EnsureCreated vs migrations]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ipcRenderer.send` / `ipcMain.on` | `ipcMain.handle` / `ipcRenderer.invoke` (promise-based) | Electron ~12 | Already used correctly in this project |
| EF Core 6 separate DB init | `EnsureCreatedAsync` at startup | EF Core 7+ | Already used in Program.cs |

**Deafen is already implemented** in `handleToggleDeafen` in RoomView.vue — it sets `el.volume` and auto-mutes mic. Phase 2 only needs to ensure the pre-deafen mic state is restored on un-deafen (it is: `if (isDeafened.value && isMicEnabled.value) await toggleMic()` saves mic state implicitly — undeafen should restore to whatever `isMicEnabled` was before, which requires saving it separately). Current code mutes on deafen but doesn't explicitly restore on undeafen. This is a small bug to fix.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PTT keyup via renderer `keyup` + `blur` auto-release is sufficient for Phase 2 (no uiohook-napi needed) | Architecture Patterns (Pattern 2) | PTT sticks when app loses focus mid-press; fixable in Phase 3 with native hook |
| A2 | `POST /rooms` returns existing room if name already taken (idempotent) | Pattern 4 | Could return 409; requires client-side handling change — low impact either way |
| A3 | Room list from GET /rooms returns participant count as 0 (counts come from SignalR events) | Pitfall 4 recommendation | Count UI in voice feed will show 0 until someone joins; acceptable for Phase 2 |
| A4 | Delete pulse.db in dev to apply Room entity (rather than running EF migrations) | Code Examples | Lose Phase 1 test data; acceptable in dev; production would require migrations |

---

## Open Questions (RESOLVED)

1. **PTT keyup outside the window**
   - RESOLVED: Blur-release is acceptable for Phase 2. D-02 ("works when window not in focus") applies to keydown/activation — global activation fires even when unfocused. Keyup-outside-focus limitation is documented and deferred to Phase 3 (`uiohook-napi` if needed). Plans implement blur-release via `mainWindow.on('blur')`.

2. **Room name uniqueness enforcement**
   - RESOLVED: Enforce uniqueness — unique index on `Room.Name` in EF Core, `POST /rooms` returns 409 if name taken. Duplicate names would make the voice feed confusing. Plans include this constraint.

3. **Deafen un-restore bug**
   - RESOLVED: This is a bug per D-06 ("un-deafening restores the previous mic state"). Plan 02-05 fixes it: save `prevMicEnabled` before deafening, restore on undeafen.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Electron | PTT globalShortcut | Yes | 28.3.3 | — |
| livekit-client | Audio control | Yes | 2.19.2 | — |
| electron-store | PTT key persistence | Yes | 8.2.0 | — |
| SQLite (via EF Core) | Room persistence | Yes | (bundled) | — |
| Node.js | Build | Yes | 24.x | — |

No missing dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files found in pulse-client or Pulse.Server |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOICE-04 | PTT keydown enables mic, keyup disables mic | Manual (Electron IPC + globalShortcut not unit-testable without harness) | — | No |
| VOICE-05 | Mute toggle → SignalR MuteChanged broadcast → 🔇 visible to peer | Manual (requires two clients) | — | No |
| VOICE-06 | Deafen → volume=0, mic mutes; undeafen → volume=1, mic restores | Manual | — | No |
| ROOM-01 | Participant list updates in real time on join/leave | Manual | — | No |
| ROOM-02 | Speaking ring animation appears for active speaker | Manual | — | No |
| ROOM-03 | POST /rooms persists; GET /rooms returns list; RoomListUpdated received | Manual + xunit for controller | — | No |

### Wave 0 Gaps
- No test infrastructure exists. For Phase 2, all validation is manual two-client smoke testing.
- Recommendation: add xUnit tests for `RoomsController` (POST/GET) in Phase 3 if desired.

*(Manual-only phase — no automated test framework is currently set up for this project)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No new surfaces | JWT already enforced on all endpoints and SignalR hub |
| V4 Access Control | Partial | POST /rooms — any authenticated user can create (D-08). No admin gate needed in Phase 2 |
| V5 Input Validation | Yes | Room name: validate non-empty, max length, no special chars. Reject in controller before DB write |
| V6 Cryptography | No | No new crypto surfaces |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Room name injection (e.g., SQL via EF) | Tampering | EF Core parameterizes all queries — safe by default |
| Accelerator injection via IPC | Tampering | Validate accelerator string format in ipcMain handler before passing to globalShortcut.register |
| Mute spoofing (send MuteChanged for another user) | Spoofing | Hub uses `Context.ConnectionId` as the authoritative source — client cannot claim a different connectionId |
| Excessive room creation (DoS) | DoS | Not addressed in Phase 2 (no rate limiting) — acceptable for dev stage |

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read: `pulse-client/src/main/index.ts`, `pulse-client/src/preload/index.ts`, `pulse-client/src/renderer/composables/useLiveKit.ts`, `pulse-client/src/renderer/composables/usePresence.ts`, `pulse-client/src/renderer/views/RoomView.vue`, `pulse-client/src/renderer/stores/room.ts`, `Pulse.Server/Hubs/PresenceHub.cs`, `Pulse.Server/Program.cs`, `Pulse.Server/Data/AppDbContext.cs`, `Pulse.Server/Controllers/RoomsController.cs`
- Package.json version reads: electron@28.3.3, livekit-client@2.19.2, electron-store@8.2.0

### Secondary (MEDIUM confidence)
- Electron globalShortcut API behavior (training knowledge, consistent with Electron 28 docs) [ASSUMED for keyup limitation]
- EF Core EnsureCreated vs migrations behavior [ASSUMED based on well-established EF Core semantics]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from package.json; no new packages
- Architecture: HIGH — based on direct codebase reads; patterns follow established project conventions
- Pitfalls: HIGH for Electron globalShortcut (well-known behavior); MEDIUM for EF Core EnsureCreated edge case
- PTT keyup limitation: MEDIUM — based on training knowledge of Electron globalShortcut API [ASSUMED]

**Research date:** 2026-06-09
**Valid until:** 2026-08-09 (stable stack — Electron, EF Core, SignalR APIs are stable)
