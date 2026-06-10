# Phase 4: Whisper Side-Channel - Research

**Researched:** 2026-06-10
**Domain:** SignalR hub extension, multi-room LiveKit management, Electron IPC per-group PTT, Pinia whisper store, Vue panel tab UI
**Confidence:** HIGH (all findings from direct codebase inspection)

## Summary

Phase 4 adds a private parallel audio layer (whisper groups) on top of the existing voice infrastructure. Every major integration point has been inspected from source. The primary technical challenge is that `useLiveKit.ts` currently models exactly one LiveKit room via a single module-level variable; Phase 4 requires parallel rooms. A targeted refactor converts that variable into a `Map<string, Room>` keyed by a room-name slug, while keeping the existing main-room path functionally identical.

The second challenge is PTT. The existing implementation does NOT use `globalShortcut` — it uses `uiohook-napi` (a low-level keyboard hook) via a `getPttKeycode()` lookup and `ptt:keydown` / `ptt:keyup` IPC events. Whisper per-group PTT must follow the same pattern: store a key per group in `electron-store`, listen in the `uIOhook` keydown/keyup callback (already running), and send `whisper-ptt:keydown:{groupId}` / `whisper-ptt:keyup:{groupId}` IPC events to the renderer.

On the server, `PresenceHub` has no `OnConnectedAsync` override yet. It must be added to push whisper group tokens to reconnecting members. Admin identity is currently validated via `room.CreatedByUserId` (room-scoped); whisper admin validation reads `PULSE_ADMIN_USER_ID` from `IConfiguration` instead.

**Primary recommendation:** Treat this phase as three parallel tracks — (A) server hub + token generation, (B) `useLiveKit` Map refactor + whisper room management, (C) Electron IPC + Whisper panel UI — then wire them together.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Whisper groups are server-scoped (not room-scoped). Members hear each other regardless of which voice room they are in.
- **D-02:** Multiple named whisper groups can exist simultaneously on the server.
- **D-03:** A user can be a member of multiple whisper groups simultaneously — they connect to each group's LiveKit room.
- **D-04:** Whisper group state is ephemeral / in-memory only — no DB persistence.
- **D-05:** Audio isolation uses separate LiveKit rooms (cryptographic, not volume-based).
- **D-06:** Server pushes `JoinWhisperGroups` on `OnConnectedAsync` with tokens for all groups the user belongs to.
- **D-07:** `WhisperGroupMemberAdded` pushed to online user with LiveKit token when added mid-session.
- **D-08:** `WhisperGroupMemberRemoved` pushed to online user; client disconnects from that whisper LiveKit room immediately.
- **D-09:** Whisper group management restricted to server admin.
- **D-10:** Server admin identified via `PULSE_ADMIN_USER_ID` env var / config. Checked on every admin-gated hub call.
- **D-11:** Room-creator admin (`room.createdByUserId`) unchanged; whisper admin is a separate concept.
- **D-12:** Admin can add/remove individual members at any time, plus dissolve the entire group.
- **D-13:** Membership drawn from full registered user list; offline users auto-connect on next `OnConnectedAsync`.
- **D-14:** Three transmit modes per-user per-group: both-simultaneously (always on), PTT-per-group (global hotkey), whisper-only (main room mic disabled).
- **D-15:** Whisper PTT keys are per-group global hotkeys (registered via Electron hook, consistent with existing PTT).
- **D-16:** Suppress-main-room-mic-while-whisper-PTT is a separate per-user toggle stored client-side.
- **D-17:** Transmit mode and PTT binding stored client-side (electron-store), not on server.
- **D-18:** Dedicated Whisper panel sidebar tab, always visible when connected; empty state shown when no groups.
- **D-19:** Per-group visibility modes: `hidden` (invisible to non-members), `existence` (name + count), `full` (name + member list).
- **D-20:** Group card shows: group name, visibility badge, member list (per visibility), speaking indicators, transmit mode selector + PTT key-capture for members.
- **D-21:** Admin sees create-group button and per-card edit/dissolve controls. Non-admin members see cards without management controls.
- **D-22:** Speaking indicators driven by `ActiveSpeakersChanged` event from each whisper LiveKit room — same as main room pattern.

### Claude's Discretion
- Naming convention for whisper LiveKit rooms (e.g., `whisper-{serverId}-{groupId}` or similar unique slug).
- Exact SignalR event names and hub method signatures (follow existing `PresenceHub` camelCase/PascalCase convention).
- How to surface Whisper panel tab in RoomView.vue layout.
- In-memory data structure for whisper groups in `PresenceHub` (follow `ConcurrentDictionary` pattern).

### Deferred Ideas (OUT OF SCOPE)
- Persistent whisper groups (DB-backed, survive server restart).
- Whisper group assignment by non-admin users.
- Web client / cross-platform whisper support.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WHISP-01 | Admin can define a whisper group — a named set of users who share a private audio side-channel | Server hub methods `CreateWhisperGroup`, `AddWhisperMember`, `RemoveWhisperMember`, `DissolveWhisperGroup`; admin check via `PULSE_ADMIN_USER_ID` |
| WHISP-02 | Users in a whisper group receive a secondary audio stream non-members cannot hear | Separate LiveKit room per group; token only issued to members; `useLiveKit` Map refactor connects to each group room |
| WHISP-03 | Whisper audio transmitted/received simultaneously with main room audio (not a separate mode) | `useLiveKit` Map supports N parallel rooms; `both-simultaneously` mode publishes mic to both rooms at once |
| WHISP-04 | Participants can see if a whisper group is active and whether they are a member | Whisper panel tab; `WhisperGroupsState` pushed on connect/change; `useWhisperStore` exposes groups + membership to UI |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Whisper group CRUD (create/add/remove/dissolve) | API / Backend (PresenceHub) | — | Admin-only mutations; must be server-authoritative |
| Group state broadcasting to clients | API / Backend (PresenceHub) | — | SignalR push to affected connection groups |
| Token generation for whisper LiveKit rooms | API / Backend (LiveKitService) | — | Cryptographic isolation — token must be server-minted |
| Multi-room LiveKit connection management | Frontend (useLiveKit) | — | Client connects to N rooms in parallel |
| Per-group PTT key registration | Electron Main (uIOhook) | Preload IPC bridge | Global hook runs in main process; event forwarded to renderer |
| Per-group transmit mode / PTT binding storage | Electron Main (electron-store) | — | Persisted preferences across sessions |
| Whisper group UI state | Frontend (useWhisperStore Pinia) | — | Drives Whisper panel reactivity |
| Whisper panel UI | Frontend (WhisperPanel.vue) | RoomView.vue layout | New component; added as sidebar tab alongside ParticipantPanel |
| Speaking indicators for whisper rooms | Frontend (useLiveKit) | useWhisperStore | `ActiveSpeakersChanged` per whisper room feeds store |
| Admin identity verification | API / Backend (PresenceHub) | IConfiguration | `PULSE_ADMIN_USER_ID` read once from config, compared to JWT claim |

---

## Standard Stack

### Core — Already In Project
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `livekit-client` | existing | Parallel whisper Room instances | Same SDK; `Room` constructor called per group |
| `@microsoft/signalr` | existing | Whisper event delivery (push tokens, membership changes) | Already wired in `usePresence.ts` |
| `pinia` | existing | `useWhisperStore` for group state | Matches `useRoomStore` pattern |
| `uiohook-napi` | existing | Per-group PTT global keyboard hook | Already running in `main/index.ts`; extend same listener |
| `electron-store` | existing | Persist per-group transmit mode + PTT binding | Same store used for `ptt.key` and `ptt.mode` |
| `Livekit.Server.Sdk.Dotnet` | existing | Whisper room token generation on server | `LiveKitService.GenerateRoomToken` reused unchanged |

**No new packages required.** [VERIFIED: codebase inspection]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `IConfiguration` (.NET) | existing | Read `PULSE_ADMIN_USER_ID` at hub call time | Admin check in every whisper management hub method |

---

## Package Legitimacy Audit

No new external packages introduced by Phase 4. All libraries are already installed in the project. Audit is N/A.

---

## Architecture Patterns

### System Architecture Diagram

```
Admin user (renderer)
  │  createWhisperGroup / addMember / removeMember / dissolveGroup
  ▼
PresenceHub (SignalR)
  ├── validates caller == PULSE_ADMIN_USER_ID (IConfiguration)
  ├── mutates _whisperGroups ConcurrentDictionary
  ├── pushes WhisperGroupsUpdated → Clients.All (respects visibility mode)
  └── pushes WhisperGroupMemberAdded/Removed → Clients.Client(targetConnId)
        │  includes LiveKit token for whisper room
        ▼
useLiveKit.ts (renderer)
  ├── whisperRooms: Map<string, Room>   ← new
  ├── connectWhisper(groupId, token, host)
  │     creates Room, attaches audio elements with id `whisper-audio-{groupId}-{identity}`
  │     subscribes ActiveSpeakersChanged → whisperSpeakers Map<groupId, string[]>
  └── disconnectWhisper(groupId)

useWhisperStore (Pinia)
  ├── groups: WhisperGroup[]   (visibility-filtered by server)
  ├── whisperSpeakers: Map<groupId, string[]>
  └── transmitMode / pttBinding per groupId (loaded from electron-store)

WhisperPanel.vue
  ├── tab switcher in RoomView.vue .voice-view (alongside ParticipantPanel)
  ├── group cards (name, visibility badge, members, speaking ring)
  └── member controls: transmit mode selector + PTT key-capture input

Electron main/index.ts
  ├── store keys: whisper.{groupId}.mode, whisper.{groupId}.pttKey
  ├── uIOhook keydown/keyup extended: checks all registered whisper PTT keycodes
  └── IPC events: whisper-ptt:keydown:{groupId} / whisper-ptt:keyup:{groupId}
```

### Recommended Project Structure
```
pulse-client/src/renderer/
├── composables/
│   ├── useLiveKit.ts         # MODIFIED: livekitRoom → Map, add connectWhisper/disconnectWhisper
│   ├── usePresence.ts        # MODIFIED: register WhisperGroup* SignalR listeners
│   └── usePtt.ts             # unchanged (main-room PTT only)
├── stores/
│   ├── room.ts               # unchanged
│   └── whisper.ts            # NEW: useWhisperStore
└── components/
    ├── ParticipantPanel.vue  # unchanged
    └── WhisperPanel.vue      # NEW

Pulse.Server/Hubs/
└── PresenceHub.cs            # MODIFIED: whisper records, hub methods, OnConnectedAsync
```

---

## Critical Code Analysis

### 1. `useLiveKit.ts` — livekitRoom Refactor

**Current state (lines 9, 73–76):**
```typescript
let livekitRoom: Room | null = null  // module-level singleton

async function connect(...): Promise<void> {
  if (livekitRoom) {           // ← kills any existing room on new connect
    await livekitRoom.disconnect()
    livekitRoom = null
  }
  ...
}
```

**Problem:** `connect()` unconditionally disconnects the existing room. If called again for a whisper group, it would kill the main room.

**Required refactor — rename module vars and add whisper map:**
```typescript
// [ASSUMED] — exact variable names are Claude's discretion per CONTEXT.md
let mainRoom: Room | null = null                        // renamed from livekitRoom
const whisperRooms = new Map<string, Room>()            // keyed by groupId

// Existing connect() → renamed connectMain() or parameterized
// New connectWhisper(groupId: string, token: string, host: string)
// New disconnectWhisper(groupId: string)
```

**What breaks when you change `livekitRoom`:**
- `connect()` must be renamed or accept a `roomKey` param — RoomView.vue calls `livekitConnect` directly
- `disconnect()` currently nulls `livekitRoom` → must only disconnect the main room
- `switchInput()` / `switchOutput()` reference `livekitRoom` directly (lines 138, 149) → must iterate main + whisper rooms
- `toggleMic()` references `livekitRoom` (line 165) → main room only (whisper mic publishing is separate)
- `applyDucking()` queries `audio[id^="livekit-audio-"]` — whisper audio elements MUST use a different prefix (`whisper-audio-{groupId}-`) to avoid the ducking selector catching them [VERIFIED: codebase inspection, line 54-56]

**`switchOutput` caveat:** Line 144 also queries `audio[id^="livekit-audio-"]` to apply `setSinkId`. Must extend to also match `audio[id^="whisper-audio-"]` so whisper rooms use the same output device. [VERIFIED: codebase inspection]

**Returned values:** `isConnected`, `isMicEnabled`, `activeSpeakers` are all main-room signals. Whisper equivalents (`whisperActiveSpeakers` per group) belong in `useWhisperStore`, not in `useLiveKit`'s public API — keeps the composable surface clean.

---

### 2. `PresenceHub.cs` — ConcurrentDictionary Structure

**Existing pattern (lines 14–21):**
```csharp
private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, ParticipantInfo>>
    _rooms = new(); // roomName -> { connectionId -> ParticipantInfo }

private static readonly ConcurrentDictionary<string, string>
    _connectionToRoom = new(); // connectionId -> roomName

private static readonly ConcurrentDictionary<string, string>
    _prioritySpeakers = new(); // roomName -> userId
```

**Required whisper structures — following exact same pattern:**
```csharp
// [ASSUMED] names; follow camelCase pattern
private record WhisperGroup(
    string GroupId,
    string Name,
    string Visibility,          // "hidden" | "existence" | "full"
    ConcurrentBag<string> MemberUserIds,
    string LiveKitRoomName      // e.g. "whisper-{groupId}"
);

private static readonly ConcurrentDictionary<string, WhisperGroup>
    _whisperGroups = new(); // groupId -> WhisperGroup

// Reverse lookup: userId -> set of groupIds they belong to
private static readonly ConcurrentDictionary<string, ConcurrentBag<string>>
    _userToWhisperGroups = new(); // userId -> { groupId, ... }

// Connection reverse lookup: userId -> connectionId (needed to push to specific user)
private static readonly ConcurrentDictionary<string, string>
    _userToConnection = new(); // userId -> connectionId (set on connect, cleared on disconnect)
```

**Why `_userToConnection` is needed:** `Clients.Client(connectionId)` requires a connectionId. Currently nothing maps userId → connectionId. D-07 and D-08 require pushing to a specific online user. This lookup must be populated in `OnConnectedAsync` and cleared in `OnDisconnectedAsync`. [VERIFIED: codebase inspection — no such map exists currently]

---

### 3. `OnConnectedAsync` Override

**Current state:** Not overridden. `OnDisconnectedAsync` IS overridden (line 74).

**Required override:**
```csharp
public override async Task OnConnectedAsync()
{
    var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                 ?? Context.User?.FindFirst("sub")?.Value ?? "";
    var displayName = Context.User?.FindFirst("displayName")?.Value ?? "Unknown";
    
    // Register reverse lookup
    _userToConnection[userId] = Context.ConnectionId;
    
    // Find all whisper groups this user belongs to
    var memberGroups = _whisperGroups.Values
        .Where(g => g.MemberUserIds.Contains(userId))
        .ToList();
    
    if (memberGroups.Any())
    {
        var tokens = memberGroups.Select(g => new {
            groupId = g.GroupId,
            groupName = g.Name,
            liveKitToken = _liveKitService.GenerateRoomToken(g.LiveKitRoomName, userId, displayName),
            liveKitHost = _liveKitService.GetLiveKitHost()
        });
        await Clients.Caller.SendAsync("JoinWhisperGroups", tokens);
    }
    
    await base.OnConnectedAsync();
}
```

**Note:** `PresenceHub` is currently injected with `AppDbContext` via constructor (`PresenceHub(AppDbContext db)`). To access `ILiveKitService` in `OnConnectedAsync`, it must also be injected: `PresenceHub(AppDbContext db, ILiveKitService liveKitService)`. `ILiveKitService` is already registered as `AddScoped` in `Program.cs` (line 17). [VERIFIED: codebase inspection]

---

### 4. Admin Check Pattern

**Existing admin check (lines 122–125):**
```csharp
var callerUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                   ?? Context.User?.FindFirst("sub")?.Value;
var room = await db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
if (room == null || room.CreatedByUserId?.ToString() != callerUserId) return;
```

**Whisper admin check pattern — no DB query needed:**
```csharp
// [ASSUMED] config key name; "Pulse:AdminUserId" follows existing appsettings convention
private bool IsServerAdmin()
{
    var callerUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                       ?? Context.User?.FindFirst("sub")?.Value;
    var adminUserId = _configuration["Pulse:AdminUserId"]
                      ?? Environment.GetEnvironmentVariable("PULSE_ADMIN_USER_ID");
    return !string.IsNullOrEmpty(callerUserId) && callerUserId == adminUserId;
}
```

**Registration in Program.cs:** `PULSE_ADMIN_USER_ID` is read from environment; no new service registration needed — `IConfiguration` already injected into `PresenceHub` if constructor is updated. [VERIFIED: existing Program.cs pattern]

---

### 5. Electron IPC — Per-Group Whisper PTT

**Key finding: The project uses `uiohook-napi`, NOT Electron `globalShortcut`.** [VERIFIED: main/index.ts lines 117–129]

The existing hook is a single listener:
```typescript
uIOhook.on('keydown', (e) => {
  const code = getPttKeycode()  // reads single ptt.key from store
  if (code && e.keycode === code) {
    mainWindow?.webContents.send('ptt:keydown')
  }
})
```

**Required extension — multi-group lookup:**
```typescript
// [ASSUMED] exact function name
function getWhisperPttKeycodes(): Array<{ groupId: string; keycode: number }> {
  // iterate electron-store for all whisper.{groupId}.pttKey entries
  // return array of { groupId, keycode }
}

uIOhook.on('keydown', (e) => {
  // existing main PTT check
  const code = getPttKeycode()
  if (code && e.keycode === code) {
    mainWindow?.webContents.send('ptt:keydown')
  }
  // whisper per-group check
  for (const { groupId, keycode } of getWhisperPttKeycodes()) {
    if (e.keycode === keycode) {
      mainWindow?.webContents.send(`whisper-ptt:keydown`, groupId)
    }
  }
})
```

**IPC channel strategy:** Use a single `whisper-ptt:keydown` channel with `groupId` payload (cleaner than N separate `whisper-ptt:keydown:{groupId}` channels — avoids unbounded `ipcRenderer.on` registrations).

**Store key convention:** `whisper.{groupId}.pttKey` (string | null), `whisper.{groupId}.transmitMode` (`both` | `ptt` | `whisperOnly`), `whisper.{groupId}.suppressMain` (boolean). Follows existing `ptt.key` / `ptt.mode` key naming convention.

**Preload additions required:**
```typescript
// [ASSUMED] exact API names
setWhisperPttKey: (groupId: string, accelerator: string | null) => ipcRenderer.invoke('whisper-ptt:set-key', groupId, accelerator),
getWhisperPttKey: (groupId: string) => ipcRenderer.invoke('whisper-ptt:get-key', groupId),
getWhisperTransmitMode: (groupId: string) => ipcRenderer.invoke('whisper:get-transmit-mode', groupId),
setWhisperTransmitMode: (groupId: string, mode: string) => ipcRenderer.invoke('whisper:set-transmit-mode', groupId, mode),
onWhisperPttKeyDown: (cb: (groupId: string) => void) => ipcRenderer.on('whisper-ptt:keydown', (_e, gid) => cb(gid)),
onWhisperPttKeyUp: (cb: (groupId: string) => void) => ipcRenderer.on('whisper-ptt:keyup', (_e, gid) => cb(gid)),
removeWhisperPttListeners: () => {
  ipcRenderer.removeAllListeners('whisper-ptt:keydown')
  ipcRenderer.removeAllListeners('whisper-ptt:keyup')
}
```

---

### 6. RoomView.vue Layout — Whisper Panel Tab

**Current layout (template lines 146–151):**
```html
<div class="voice-view">         <!-- flex row -->
  <div class="feed-col">...</div>
  <ParticipantPanel ... />       <!-- width: 220px, flex: 0 0 220px -->
</div>
```

**Recommended approach:** Replace the single `<ParticipantPanel>` with a tab-switcher sidebar component that hosts both ParticipantPanel and WhisperPanel.

```html
<!-- [ASSUMED] exact tab implementation -->
<div class="voice-view">
  <div class="feed-col">...</div>
  <div class="side-tabs">
    <div class="side-tab-bar">
      <button :class="{active: sideTab==='participants'}" @click="sideTab='participants'">Participants</button>
      <button :class="{active: sideTab==='whisper'}" @click="sideTab='whisper'">Whisper</button>
    </div>
    <ParticipantPanel v-if="sideTab==='participants'" ... />
    <WhisperPanel v-else ... />
  </div>
</div>
```

**Width constraint:** `ParticipantPanel` is hard-coded to `width: 220px` in scoped CSS. The tab wrapper should inherit the same `flex: 0 0 220px` / `width: 220px` so the feed column width is unchanged.

**`WhisperPanel` only visible when in a room** — currently `ParticipantPanel` already uses `v-if="roomStore.currentRoomName"`. Same guard applies.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-group audio isolation | Custom volume routing / track filtering | Separate LiveKit room per group (D-05) | Cryptographic — non-members literally cannot receive the stream |
| Global keyboard hook for whisper PTT | `globalShortcut` registration | `uiohook-napi` already running in main process | Project already uses uIOhook; globalShortcut is focus-dependent |
| Whisper room token security | Custom JWT or shared secret | `LiveKitService.GenerateRoomToken()` — same server method | Token TTL, room join grant, identity already handled |
| User ID → connectionId lookup | ConnectionId scan at call time | `_userToConnection` ConcurrentDictionary | O(1) lookup; scan is O(n) and races with disconnect |
| Whisper speaking indicator | Polling audio levels | `RoomEvent.ActiveSpeakersChanged` per whisper Room (D-22) | Same pattern as main room — already works |

---

## Common Pitfalls

### Pitfall 1: `connect()` kills the main room when called for whisper
**What goes wrong:** `useLiveKit.connect()` line 73–76 disconnects `livekitRoom` unconditionally before creating a new one. If a whisper connect reuses this function, the main voice room is destroyed.
**Why it happens:** Original design assumed one active room at a time.
**How to avoid:** Introduce a separate `connectWhisper(groupId, token, host)` function that adds to `whisperRooms` Map without touching `mainRoom`. Never call the main `connect()` for whisper rooms.
**Warning signs:** Main room audio drops when whisper panel is first opened.

### Pitfall 2: `applyDucking()` matches whisper audio elements
**What goes wrong:** `applyDucking()` selects all `audio[id^="livekit-audio-"]` elements and sets their volume to 0.15 during priority speaker. If whisper audio uses the same prefix, whisper audio gets ducked too.
**Why it happens:** `track.attach()` returns an `<audio>` element; the ID is set manually.
**How to avoid:** Use `id="whisper-audio-{groupId}-{identity}"` for whisper-room audio elements (confirmed in CONTEXT.md Existing Code Insights). Ducking selector is then safe.
**Warning signs:** Whisper audio becomes inaudible when priority speaker is talking.

### Pitfall 3: `switchOutput()` misses whisper audio elements
**What goes wrong:** `switchOutput()` line 144 queries only `audio[id^="livekit-audio-"]`. When user changes output device, whisper audio continues on the old device.
**How to avoid:** Extend the `querySelectorAll` to also match `audio[id^="whisper-audio-"]`, or query `audio[data-livekit]` with a data attribute set on all audio elements.

### Pitfall 4: `_userToConnection` staleness on reconnect
**What goes wrong:** If a user reconnects (SignalR reconnect), a new connectionId is assigned. `_userToConnection` still has the old one. Push to `Clients.Client(staleConnectionId)` silently fails.
**How to avoid:** Populate `_userToConnection[userId] = Context.ConnectionId` in `OnConnectedAsync` (overwrites previous entry). Clear in `OnDisconnectedAsync`.

### Pitfall 5: Whisper groups survive member's room leave
**What goes wrong:** Whisper groups are server-scoped (D-01). A user leaving the voice room should NOT disconnect from their whisper LiveKit rooms. `LeaveRoom` must not touch whisper connections.
**How to avoid:** `LeaveRoom` hub method and `OnDisconnectedAsync` must not dissolve whisper connections. Only `WhisperGroupMemberRemoved` or `DissolveWhisperGroup` triggers whisper disconnection.

### Pitfall 6: `WhisperGroupsUpdated` payload must respect visibility modes
**What goes wrong:** Server broadcasts full member list to all clients, violating `hidden` / `existence` visibility rules.
**How to avoid:** Shape the payload per-recipient: for each connected client, filter groups by `visibility` and omit member identities if not `full`. This requires either per-client sends (expensive) or a public-safe payload + a members-only payload.
**Recommended pattern:** Broadcast two payloads: one public payload (name, memberCount, visibility for non-hidden groups) to `Clients.All`, and one full payload to each member's connection.

### Pitfall 7: uIOhook keycode lookup for whisper PTT keys
**What goes wrong:** `ACCELERATOR_TO_UIOHOOK` map in `main/index.ts` covers A-Z, F1-F12, and common keys. If a user binds a key not in the map, `getWhisperPttKeycodes()` returns `0` (falsy) and the PTT never fires.
**How to avoid:** Use the same `ACCELERATOR_TO_UIOHOOK` lookup (already shared). Validate that the resolved keycode is non-zero before storing in whisper PTT config. Surface an error in the key-capture UI if the key is unmappable.

---

## Code Examples

### Existing admin check pattern (from PresenceHub.cs lines 120–125)
```csharp
// [VERIFIED: codebase inspection]
var callerUserId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                   ?? Context.User?.FindFirst("sub")?.Value;
var room = await db.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
if (room == null || room.CreatedByUserId?.ToString() != callerUserId) return;
```

### LiveKitService.GenerateRoomToken (from LiveKitService.cs)
```csharp
// [VERIFIED: codebase inspection]
public string GenerateRoomToken(string roomName, string participantIdentity, string participantName)
{
    var token = new AccessToken(apiKey, apiSecret)
        .WithIdentity(participantIdentity)
        .WithName(participantName)
        .WithGrants(new VideoGrants { RoomJoin = true, Room = roomName })
        .WithTtl(TimeSpan.FromHours(1))
        .ToJwt();
    return token;
}
```

### uIOhook PTT pattern (from main/index.ts lines 117–129)
```typescript
// [VERIFIED: codebase inspection]
uIOhook.on('keydown', (e) => {
  const code = getPttKeycode()
  if (code && e.keycode === code) {
    mainWindow?.webContents.send('ptt:keydown')
  }
})
uIOhook.start()  // already called once; do NOT call again for whisper keys
```

### RoomView.vue PTT wiring pattern (lines 239–253)
```typescript
// [VERIFIED: codebase inspection]
onMounted(() => {
  window.addEventListener('keydown', handlePttKeydown)
  window.pulseApi.onPttKeyDown(() => { if (isPttMode.value) setMicEnabled(true) })
  window.pulseApi.onPttKeyUp(() => { if (isPttMode.value) setMicEnabled(false) })
})
onUnmounted(() => {
  window.removeEventListener('keydown', handlePttKeydown)
  window.pulseApi.removePttListeners()
})
```

### SignalR listener registration pattern (from usePresence.ts lines 36–78)
```typescript
// [VERIFIED: codebase inspection]
hubConnection.on('PrioritySpeakerChanged', (userId: string | null) => {
  const { setPrioritySpeaker } = useLiveKit()
  setPrioritySpeaker(userId)
  roomStore.setPrioritySpeaker(userId)
})
// Whisper listeners follow same .on() registration inside connect()
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single LiveKit Room per session | Map of Rooms (main + N whisper) | Phase 4 | `livekitRoom` module var renamed; connect/disconnect API split |
| Room-scoped admin (createdByUserId) | Server-level admin (PULSE_ADMIN_USER_ID) | Phase 4 | New admin check helper; no DB query on whisper hub calls |
| No `OnConnectedAsync` override | Override pushes whisper tokens to returning members | Phase 4 | Required for D-06 / D-13 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Whisper LiveKit room name slug: `whisper-{groupId}` | Architecture Patterns | Low — any unique slug works; just must be consistent between server token gen and client |
| A2 | IPC channel: single `whisper-ptt:keydown` with groupId payload (not per-group channel names) | Electron IPC section | Low — either approach works; single channel is cleaner |
| A3 | New `PresenceHub` constructor signature: `(AppDbContext db, ILiveKitService liveKitService, IConfiguration configuration)` | Critical Code Analysis §3 | Medium — if ILiveKitService is not injectable into Hub, alternative is static helper; confirm registration scope |
| A4 | `whisper.{groupId}.pttKey` and `whisper.{groupId}.transmitMode` as electron-store key convention | Electron IPC section | Low — any stable key scheme works |
| A5 | Tab switcher approach for WhisperPanel (vs. second fixed column) | Architecture Patterns | Low — layout is Claude's discretion per CONTEXT.md |
| A6 | `_userToConnection` reverse map approach for userId→connectionId | Critical Code Analysis §2 | Medium — verify SignalR does not expose a built-in userId→connectionId lookup before implementing custom map |

---

## Open Questions

1. **SignalR built-in userId → connectionId lookup**
   - What we know: `IHubContext` and `Clients.User(userId)` exist in SignalR and route to all connections for a given user claim.
   - What's unclear: Whether `Clients.User(userId)` works with the JWT `sub`/NameIdentifier claim without additional `IUserIdProvider` configuration.
   - Recommendation: Test `Clients.User(userId).SendAsync(...)` first. If it routes correctly, the custom `_userToConnection` map is unnecessary and should be dropped.

2. **`WhisperGroupsUpdated` fan-out performance**
   - What we know: Per-recipient payload shaping (to respect visibility modes) requires iterating all connected clients or sending individual messages.
   - What's unclear: Whether per-client sends for a small server user count (~50?) are acceptable vs. building a more complex payload router.
   - Recommendation: For v1 with small user counts, send individual messages to each connected client. Document the O(n) behavior.

3. **Whisper mic publishing for `both-simultaneously` mode**
   - What we know: `setMicrophoneEnabled(true)` on the main room publishes to main. Whisper room is a separate `Room` instance.
   - What's unclear: Whether publishing to two rooms simultaneously requires calling `setMicrophoneEnabled(true)` on the whisper `Room` as well, and whether this triggers a second getUserMedia permission prompt.
   - Recommendation: Test in the whisper room instance — LiveKit SDK should reuse the existing mic track without prompting again if the same device is selected.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `uiohook-napi` | Per-group whisper PTT | Already in project | existing | — |
| `electron-store` | Persist whisper PTT/mode prefs | Already in project | existing | — |
| `livekit-client` | Whisper Room instances | Already in project | existing | — |
| LiveKit server | Whisper room token validation | Running (Phase 1-3 verified working) | existing | — |

No missing dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual integration testing (no automated test framework detected in project) |
| Config file | none |
| Quick run command | `npm run dev` (pulse-client) + `dotnet run` (Pulse.Server) |
| Full suite command | Same — manual verification |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WHISP-01 | Admin creates whisper group via hub method; non-admin is rejected | manual | — | ❌ no test infra |
| WHISP-02 | Non-member client cannot hear whisper audio (no token issued) | manual | — | ❌ |
| WHISP-03 | Whisper audio plays while main room audio also plays | manual | — | ❌ |
| WHISP-04 | All participants see whisper panel; member badge shown | manual | — | ❌ |

### Wave 0 Gaps
- No automated test framework exists in the project. All validation is manual E2E with two client instances.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT claim validation on every hub call (already in place) |
| V3 Session Management | yes | SignalR connection tied to JWT; reconnect re-validates |
| V4 Access Control | yes | `PULSE_ADMIN_USER_ID` check before any whisper mutation hub method |
| V5 Input Validation | yes | Group name / visibility mode validated server-side before insert |
| V6 Cryptography | yes | LiveKit token is server-minted JWT; never pass token through client |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client requests whisper token for a group they're not in | Spoofing | Token only generated server-side; membership checked before `GenerateRoomToken` call |
| Non-admin calls `CreateWhisperGroup` hub method | Elevation of privilege | `IsServerAdmin()` check returns immediately if caller != configured admin |
| Client-supplied groupId used as LiveKit room name without sanitization | Tampering | Sanitize groupId to alphanumeric + hyphens before appending to room name slug |
| Whisper group state pushed to wrong visibility tier | Information disclosure | Per-recipient payload shaping; `hidden` groups never appear in non-member payloads |

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `Pulse.Server/Hubs/PresenceHub.cs` (all hub patterns, ConcurrentDictionary structure)
- Direct codebase inspection — `pulse-client/src/renderer/composables/useLiveKit.ts` (single room var, audio element IDs, ducking selector)
- Direct codebase inspection — `pulse-client/src/main/index.ts` (uIOhook pattern, NOT globalShortcut; store key conventions)
- Direct codebase inspection — `pulse-client/src/preload/index.ts` (IPC bridge pattern)
- Direct codebase inspection — `pulse-client/src/renderer/views/RoomView.vue` (layout, PTT wiring)
- Direct codebase inspection — `pulse-client/src/renderer/components/ParticipantPanel.vue` (style tokens, component pattern)
- Direct codebase inspection — `Pulse.Server/Services/LiveKitService.cs` (token generation API)
- Direct codebase inspection — `Pulse.Server/Program.cs` (service registrations, DI setup)

### Secondary (MEDIUM confidence)
- `04-CONTEXT.md` locked decisions — all 22 decisions treated as authoritative design constraints

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in project; no new packages
- Architecture: HIGH — all integration points inspected from source
- Pitfalls: HIGH — derived from actual code paths, not generic advice
- Electron PTT mechanism: HIGH — critical finding that project uses `uiohook-napi`, not `globalShortcut`

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (stable codebase; extend if major refactors occur before planning)
