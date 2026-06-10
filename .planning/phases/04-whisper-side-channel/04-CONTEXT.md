# Phase 4: Whisper Side-Channel - Context

**Gathered:** 2026-06-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a persistent, server-scoped private audio side-channel system. Admin can create named whisper groups from the full server user list; members hear each other on a separate LiveKit audio room that non-members cannot hear, simultaneously with their main voice room audio. A dedicated Whisper panel (sidebar tab) surfaces group state, membership, speaking indicators, and per-group PTT binding. All participants see what their visibility mode allows.

</domain>

<decisions>
## Implementation Decisions

### Whisper Group Scope
- **D-01:** Whisper groups are **server-scoped**, not room-scoped. Members hear each other in whisper regardless of which voice room they are in (or if they are in none). The whisper LiveKit room is a persistent server-level construct, not per-voice-room.
- **D-02:** Multiple named whisper groups can exist simultaneously on the server.
- **D-03:** A user can be a member of multiple whisper groups at the same time — they connect to each group's LiveKit room and hear all groups simultaneously.
- **D-04:** Whisper group state is **ephemeral / in-memory only** — consistent with priority speaker pattern. No DB persistence; admin recreates groups after server restart.

### Audio Isolation
- **D-05:** Whisper audio isolation uses **separate LiveKit rooms** — each whisper group gets its own hidden LiveKit room. Non-members never receive a token for that room, providing cryptographic isolation (not volume-based obfuscation).
- **D-06:** When a user joins the server and is a member of active whisper groups, the server includes whisper LiveKit tokens in the `JoinWhisperGroups` SignalR notification (pushed on connect). Client connects to each whisper LiveKit room automatically.
- **D-07:** When admin adds a user to a whisper group while they are already online, server pushes a `WhisperGroupMemberAdded` SignalR event to that user's connection with the whisper LiveKit token. Client connects immediately — no user action required.
- **D-08:** When admin removes a user from a whisper group while online, server pushes `WhisperGroupMemberRemoved`. Client disconnects from that whisper LiveKit room immediately.

### Admin & Server Admin
- **D-09:** Whisper group management (create, add/remove members, dissolve) is restricted to the **server admin**.
- **D-10:** Server admin is identified via **config/env var** — a specific user ID or username is designated in server config (`PULSE_ADMIN_USER_ID` or similar). The server checks this on every admin-gated hub call. No UI for changing admin at runtime.
- **D-11:** The existing room-creator admin (`room.createdByUserId`) remains unchanged for room-level features (priority speaker). Whisper admin is a separate, higher-level concept.

### Group Membership Management
- **D-12:** Admin can add or remove **individual members** at any time while a group exists, plus dissolve the entire group.
- **D-13:** Membership is drawn from the **full registered server user list** — admin can add offline users. Offline users auto-connect to their whisper LiveKit room when they come online and the server pushes their group tokens on `OnConnectedAsync`.

### Whisper Transmit Behavior (per-user, per-group setting)
- **D-14:** Three transmit modes are available, configurable per-user per-group in the Whisper panel:
  1. **Both simultaneously (always on)** — mic publishes to main voice room + whisper group at the same time.
  2. **PTT for whisper** — a per-group global hotkey (Electron `globalShortcut`) that the user binds in the Whisper panel. Holding it transmits to that whisper group.
  3. **Whisper-only mode** — main room mic is disabled; user speaks only into the whisper group.
- **D-15:** Whisper PTT keys are **per-group** (not one global key) and are **global hotkeys** registered via `globalShortcut` — work even when Pulse is not focused, consistent with existing PTT binding.
- **D-16:** When whisper PTT is held, whether it **suppresses the main room mic** is a separate per-user configurable toggle (suppress-while-whisper-PTT: yes/no). Both options are available.
- **D-17:** Transmit mode and PTT binding are stored client-side (electron-store or equivalent), not on the server. They are per-user preferences on this machine.

### Visibility / UI Treatment
- **D-18:** Whisper groups get a **dedicated sidebar tab** (Whisper panel) alongside the existing ParticipantPanel. It is always visible to all participants when connected; an empty state is shown when no groups exist.
- **D-19:** Each whisper group has an admin-configurable **visibility mode** set at creation time:
  - `hidden` — non-members see nothing (group is invisible to them).
  - `existence` — non-members see group name + member count only, not member identities.
  - `full` — all participants see group name and member list.
- **D-20:** The Whisper panel uses a **list of group cards**. Each card shows: group name, visibility badge, member list with avatar + name (per visibility mode), speaking indicators (pulsing/highlighted when a member is actively speaking in that whisper room), and — for members — the transmit mode selector and PTT key-capture input.
- **D-21:** Admin sees **create group** button (inline form: group name, visibility mode, member picker from full user list) and per-card **edit/dissolve** controls. Non-admin members see their group cards without management controls.
- **D-22:** Speaking indicators in the Whisper panel are driven by the `ActiveSpeakersChanged` event from each whisper LiveKit room — same pattern as main room `activeSpeakers` in `useLiveKit.ts`.

### Claude's Discretion
- Naming convention for whisper LiveKit rooms (e.g., `whisper-{serverId}-{groupId}` or similar unique slug).
- Exact SignalR event names and hub method signatures (follow existing `PresenceHub` naming patterns: camelCase events, PascalCase hub methods).
- How to surface the Whisper panel tab in the existing layout (alongside or replacing the current ParticipantPanel, or as a tab switcher).
- In-memory data structure for whisper groups in `PresenceHub` (follow `ConcurrentDictionary` pattern used for `_rooms` and `_prioritySpeakers`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Server — existing patterns to extend
- `Pulse.Server/Hubs/PresenceHub.cs` — SignalR hub; whisper hub methods go here. Follow existing `ConcurrentDictionary`, `ParticipantInfo`, admin-check, and broadcast patterns exactly.
- `Pulse.Server/Services/LiveKitService.cs` — token generation; whisper room tokens use same service.
- `Pulse.Server/Services/ILiveKitService.cs` — token service interface.
- `Pulse.Server/Program.cs` — where new config values (admin user ID env var) are registered.

### Client — existing patterns to extend
- `pulse-client/src/renderer/composables/useLiveKit.ts` — `connect()`, `applyDucking()`, `setPrioritySpeaker()`; whisper LiveKit room management adds parallel `Room` instances.
- `pulse-client/src/renderer/composables/usePresence.ts` — SignalR listener registration; whisper group events registered here.
- `pulse-client/src/renderer/composables/usePtt.ts` — `globalShortcut` PTT pattern; whisper PTT per-group reuses this approach.
- `pulse-client/src/renderer/stores/room.ts` — Pinia store; whisper group state likely goes in a new `useWhisperStore`.
- `pulse-client/src/renderer/views/RoomView.vue` — layout reference; Whisper panel tab added alongside ParticipantPanel.
- `pulse-client/src/renderer/components/ParticipantPanel.vue` — UI component reference for panel styling and layout conventions.

### Requirements
- `.planning/REQUIREMENTS.md` §Whisper — WHISP-01 through WHISP-04 are the four requirements this phase must satisfy.
- `.planning/ROADMAP.md` §Phase 4 — success criteria to verify against.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useLiveKit.ts` `connect()` — can be called multiple times for multiple LiveKit rooms; module-level `livekitRoom` variable needs to become a map keyed by room name to support parallel whisper rooms.
- `useLiveKit.ts` `applyDucking()` — pattern for querying `audio[id^="livekit-audio-"]`; whisper audio elements need a distinct ID prefix (e.g., `whisper-audio-{groupId}-{identity}`) to avoid collision.
- `usePtt.ts` — `globalShortcut` registration/deregistration pattern; whisper PTT per-group follows same flow but registers multiple keys.
- `PresenceHub.cs` `ConcurrentDictionary` pattern — `_rooms`, `_prioritySpeakers`, `_connectionToRoom` all use this; whisper groups follow the same structure.
- `ParticipantPanel.vue` — style tokens (`var(--c-side)`, `var(--c-border)`, `var(--accent)`, avatar color helpers) reuse for Whisper panel cards.

### Established Patterns
- SignalR hub methods are PascalCase (`AssignPrioritySpeaker`); client-emitted events are camelCase (`PrioritySpeakerChanged`). Follow this convention.
- Admin check: server validates caller against a trusted identity before acting. Existing pattern is `room.CreatedByUserId?.ToString() != callerUserId` — whisper admin check will compare against the configured admin user ID env var.
- In-memory state only — no DB migration needed (consistent with `_prioritySpeakers`).
- `RoomJoined` response pattern — server returns enriched state on join; whisper join similarly returns group state + token.

### Integration Points
- `PresenceHub.OnConnectedAsync` (currently implicit via `Hub`) — need to override to push whisper group tokens to newly-connected users who are members.
- `RoomView.vue` layout — the `<ParticipantPanel>` slot must accommodate a tab switcher or the Whisper panel appears as a second column/panel.
- Electron `main/index.ts` — whisper PTT `globalShortcut` registrations added alongside existing PTT logic.
- `preload/index.ts` — IPC bridge for whisper PTT key events (same pattern as existing `onPttKeyDown`/`onPttKeyUp`).

</code_context>

<specifics>
## Specific Ideas

- Whisper group members can be offline when added; they receive their whisper LiveKit token via SignalR push on next connect (`OnConnectedAsync`).
- Admin uses env var (`PULSE_ADMIN_USER_ID` or similar) to designate server admin — no runtime UI for this.
- Whisper PTT key suppress-main-room behavior is a per-user toggle stored client-side, alongside the PTT binding.
- The Whisper panel card uses the same avatar color helper (`avatarColor(name)`) already in `RoomView.vue`.

</specifics>

<deferred>
## Deferred Ideas

- Persistent whisper groups (DB-backed, survive server restart) — deferred to a future phase; in-memory is sufficient for v1.
- Whisper group assignment by non-admin users — v1 is admin-only per REQUIREMENTS.md.
- Web client / cross-platform whisper support — after Windows desktop ships.

</deferred>

---

*Phase: 4-Whisper-Side-Channel*
*Context gathered: 2026-06-10*
