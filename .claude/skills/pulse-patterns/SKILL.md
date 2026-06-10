# Pulse Codebase Patterns

Quick-reference for agents working on Pulse. Read this instead of re-scanning the source files listed below — patterns are verified against the actual code.

---

## Stack

- **Server:** C# .NET 10, SignalR (`PresenceHub`), EF Core + SQLite, LiveKit Server SDK
- **Client:** Electron + Vue 3 + TypeScript, Pinia stores, `@livekit/components-js` / `livekit-client`, `uiohook-napi` for global hotkeys
- **Voice transport:** LiveKit SFU (self-hosted). Server mints JWT tokens; client connects via `livekit-client` Room API.

---

## SignalR Hub (`PresenceHub.cs`)

**Naming conventions:**
- Hub methods (client → server): `PascalCase` — e.g. `AssignPrioritySpeaker`, `CreateWhisperGroup`
- Client events (server → client): `camelCase` on SignalR, consumed via `hubConnection.on('EventName', ...)` in TypeScript

**In-memory state pattern — always `ConcurrentDictionary`:**
```csharp
// Existing patterns to follow:
private static readonly ConcurrentDictionary<string, RoomInfo> _rooms = new();
private static readonly ConcurrentDictionary<string, string> _prioritySpeakers = new(); // roomId → userId
private static readonly ConcurrentDictionary<string, string> _connectionToRoom = new(); // connId → roomId
```
New whisper state follows same pattern. No DB — ephemeral/in-memory.

**Admin check pattern (existing room-level):**
```csharp
if (room.CreatedByUserId?.ToString() != callerUserId) throw new HubException("Not admin");
```
Whisper admin uses env var: `PULSE_ADMIN_USER_ID`. Check: `Environment.GetEnvironmentVariable("PULSE_ADMIN_USER_ID") == callerUserId`.

**Caller identity:**
```csharp
var callerUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
```

**Push to specific user:** Try `Clients.User(userId)` first (SignalR built-in JWT user routing). Fall back to `_userToConnection` map if JWT claims don't wire up correctly.

**`OnConnectedAsync`:** Not yet overridden in base Hub — add override to push whisper tokens on connect.

**LiveKit token generation (existing):**
```csharp
// LiveKitService.GenerateRoomToken(roomName, userId, displayName)
// ILiveKitService interface — inject, don't instantiate directly
```

---

## Client — PTT System (`main/index.ts`)

**CRITICAL: Uses `uiohook-napi`, NOT Electron `globalShortcut`.**

```typescript
// Single listener, already running (do NOT call uIOhook.start() again):
uIOhook.on('keydown', (e) => {
  if (e.keycode === getPttKeycode()) {
    mainWindow?.webContents.send('ptt:keydown')
  }
  // Extend here for whisper PTT — check multiple keys in same handler
})
uIOhook.on('keyup', (e) => { ... })
uIOhook.start() // called once — DO NOT call again
```

**Key mapping:** `ACCELERATOR_TO_UIOHOOK` map covers A-Z, F1-F12, common modifiers. If accelerator not in map → reject (return false from IPC handler).

**electron-store key pattern:**
- Main PTT: `ptt.key`, `ptt.mode`
- Whisper PTT: `whisper.{groupId}.pttKey`, `whisper.{groupId}.transmitMode`, `whisper.{groupId}.suppressMain`

---

## Client — LiveKit (`useLiveKit.ts`)

**Current state (pre-Phase 4):** Single module-level `livekitRoom: Room | null`.

**Phase 4 refactor:** `livekitRoom` → `mainRoom` + `whisperRooms: Map<string, Room>`.

**Key functions (current):**
```typescript
connect(token, host, options)   // connects main room — currently tears down existing room
applyDucking(enable)            // queries audio[id^="livekit-audio-"] — LANDMINE: whisper audio must use different prefix
setPrioritySpeaker(userId, isP) // sets gain on main room audio elements
switchOutput(deviceId)          // queries same prefix as applyDucking
```

**Phase 4 audio prefix rule:**
- Main room audio elements: `id="livekit-audio-{identity}"` (existing, don't change)
- Whisper room audio elements: `id="whisper-audio-{groupId}-{identity}"` (new — avoids ducking conflict)

**New functions to add:**
```typescript
connectWhisper(groupId, token, host): Promise<void>
disconnectWhisper(groupId): Promise<void>
getWhisperRoom(groupId): Room | undefined
whisperActiveSpeakers: Ref<Map<string, string[]>>  // groupId → speaking userId[]
```

---

## Client — Presence (`usePresence.ts`)

Registration pattern — inside `connect()` after hub connection established:
```typescript
hubConnection.on('PrioritySpeakerChanged', (payload) => { ... })
// Add new events here in same pattern
```

Invoke pattern:
```typescript
await hubConnection.invoke('MethodName', arg1, arg2)
```

---

## Client — PTT (`usePtt.ts`)

`codeToAccelerator(code: string): string | null` — converts `KeyboardEvent.code` to Electron accelerator string. Import this when handling key-capture UI; don't re-implement.

---

## Client — Stores (Pinia)

**Pattern (from `room.ts`):**
```typescript
export const useRoomStore = defineStore('room', () => {
  const foo = ref<Type>(initialValue)
  function doThing() { ... }
  return { foo, doThing }
})
// Composition API style — NO class syntax, NO options API
```

---

## UI Patterns (`ParticipantPanel.vue`)

**CSS variables in use:** `var(--c-side)`, `var(--c-border)`, `var(--c-border-2)`, `var(--c-side-2)`, `var(--accent)`, `var(--c-ink)`, `var(--c-ink-2)`, `var(--c-ink-4)`, `var(--c-ink-5)`, `var(--voice)`, `var(--voice-soft)`, `var(--live)`, `var(--warn)`, `var(--radius)`, `var(--radius-sm)`

**Panel dimensions:** `width: 220px; flex: 0 0 220px; border-left: 1px solid var(--c-border)`

**Speaking ring:** `.sq-speaking-ring { border: 2px solid var(--voice); animation: ring-pulse 1.2s ease-in-out infinite }`

**Avatar helpers:** `avatarColor(name)` and `initials(name)` — implemented in `ParticipantPanel.vue`, copy exact implementation (AV_COLORS array + hash logic).

---

## Auth

- JWT via `AuthController` (`/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`)
- `ITokenService` / `TokenService` generate access + refresh tokens
- Caller identity in hub: `Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value`

---

## Domain Models

- `Room` (`Room.cs`) — `Id`, `Name`, `CreatedByUserId`
- `User` (`User.cs`) — EF Core entity
- `RefreshToken` (`RefreshToken.cs`) — EF Core entity
- `AppDbContext` — registers all three, `OnModelCreating` configures indexes

---

## Dev Commands

```powershell
# Start server
cd Pulse.Server && dotnet run

# Start client (dev)
cd pulse-client && npm run dev

# Typecheck client
cd pulse-client && npm run typecheck

# Build client
cd pulse-client && npm run build
```

---

## What NOT to do

- Do NOT call `uIOhook.start()` more than once
- Do NOT use Electron `globalShortcut` for PTT (uiohook-napi is used instead)
- Do NOT query `audio[id^="livekit-audio-"]` for whisper audio (use `whisper-audio-{groupId}-` prefix)
- Do NOT create DB migrations for whisper state (ephemeral in-memory only)
- Do NOT add `globalShortcut.register()` calls — the uiohook handler is the single PTT mechanism
