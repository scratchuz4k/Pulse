# Phase 4: Whisper Side-Channel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-10
**Phase:** 4-Whisper-Side-Channel
**Areas discussed:** Group scope (user-initiated clarification), Audio isolation, Multiple whisper groups, Whisper transmit behavior, Visibility / UI treatment, Whisper PTT hotkeys

---

## User-Initiated: Group Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Room-scoped (assumed) | Whisper group is tied to a specific voice room | |
| Server-scoped | Whisper group spans the whole server; members hear each other regardless of which room they're in | ✓ |

**User's choice:** Server-scoped — whisper groups are server-bound, not room-bound.
**Notes:** User clarified unprompted. Members can be added while offline (drawn from registered server user list). Two members in different voice rooms still hear each other in whisper.

---

## Audio Isolation Model

| Option | Description | Selected |
|--------|-------------|----------|
| Separate LiveKit room | Each group gets its own hidden LiveKit room; non-members never get a token | ✓ |
| LiveKit track permissions | Use LiveKit participant permissions to restrict subscriptions | |
| Best-effort / volume-only | Volume manipulation — not truly private | |

**User's choice:** Separate LiveKit room (recommended).
**Notes:** Server issues whisper LiveKit token on JoinRoom (or on connect via `OnConnectedAsync`). Client connects automatically.

---

## Multiple Whisper Groups

| Question | Options | Selected |
|----------|---------|----------|
| How many groups per server? | One at a time / Multiple named groups | Multiple named groups |
| Cross-room behavior | Hear each other only in same room / Hear across all rooms | Across all rooms |
| Persistence | Ephemeral in-memory / DB-persisted | Ephemeral |
| User in multiple groups? | Yes / No (one group max) | Yes |
| Add offline users? | All server users / Connected only | All server users |
| Individual member changes? | Add/remove + dissolve / Dissolve only | Add/remove + dissolve |
| Who manages groups? | Server admin / Any room admin | Server admin |
| How is server admin identified? | First registered user / Config/env var / First to connect | Config/env var |

**Notes:** Admin env var (`PULSE_ADMIN_USER_ID`). Server admin is distinct from room-creator admin (which remains for priority speaker). Online users get immediate SignalR push when added/removed. Offline users pick up their group tokens on `OnConnectedAsync`.

---

## Whisper Transmit Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Both simultaneously (always on) | Mic goes to main room + all whisper groups | ✓ (as one of 3 modes) |
| PTT for whisper | Separate key to speak to whisper group | ✓ (as one of 3 modes) |
| Whisper-only mode | Main room mic disabled; speak only to whisper | ✓ (as one of 3 modes) |

**User's choice:** All three modes — user-configurable per group.
**Notes:** Setting is per-user per-group, stored client-side. Default not specified — Claude's discretion (recommend "Both simultaneously").

---

## Visibility / UI Treatment

| Question | Options | Selected |
|----------|---------|----------|
| Where does whisper info live? | Whisper section in ParticipantPanel / Separate sidebar tab / Inline on participant rows | Separate sidebar tab |
| Non-member visibility | Group name + count only / Full member list / Nothing | Configurable per group (admin sets at creation) |
| Visibility modes | Hidden / Existence / Full | All three available |
| Speaking indicators? | Yes / No | Yes — same `activeSpeakers` pattern |
| Panel layout | Group cards / Flat list / Table/grid | List of group cards |
| Admin management location | In Whisper panel / Modal / Settings page | In Whisper panel (inline form) |
| Transmit mode control location | Per group card in Whisper panel / Settings / Topbar toggle | Per group card in Whisper panel |

---

## Whisper PTT Hotkeys

| Question | Options | Selected |
|----------|---------|----------|
| Per-group or global key? | One global whisper PTT key / Per-group PTT keys | Per-group PTT keys |
| Key binding location | In Whisper panel per group card / In app Settings | In Whisper panel per group card |
| PTT suppress main room? | Always suppresses / Never suppresses / Configurable | Configurable per-user toggle |
| Global vs app-only? | Global hotkey (Electron globalShortcut) / App-only | Global hotkey |

**Notes:** Follows existing `usePtt.ts` pattern. Multiple globalShortcut registrations (one per group with PTT mode active). Suppress toggle stored client-side alongside PTT binding.

---

## Claude's Discretion

- Naming convention for whisper LiveKit rooms (suggest: `whisper-{groupId}`)
- Exact SignalR event/method names (follow existing conventions)
- How Whisper panel tab is surfaced in layout
- In-memory data structure for whisper groups in `PresenceHub`
- Default transmit mode for new group membership (recommend: Both simultaneously)

## Deferred Ideas

- Persistent whisper groups (DB-backed) — future phase
- Whisper group assignment by non-admin users — out of scope v1 per REQUIREMENTS.md
- Web/cross-platform whisper support — after desktop ships
