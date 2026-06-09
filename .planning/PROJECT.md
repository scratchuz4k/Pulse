# Pulse

## What This Is

Pulse is a real-time voice communication desktop application with a C# client-server architecture. It surfaces **what's happening right now** — who's talking, who's in a room, what's active — rather than presenting a static list of channels. Think Discord, but with a stronger focus on presence and activity.

## Core Value

**Always know where the energy is.** Users should be able to open Pulse and instantly see the most active voice rooms, join with one click, and communicate with nuance (priority override, private whispers).

## Who It's For

Teams or communities that coordinate over voice — gaming groups, work teams, hobby communities. The primary user is someone who wants to always know what's happening without having to check every channel manually.

## What It Does (Phase 1 Scope)

- **Voice rooms** — Users join named voice channels; all participants hear each other in real time
- **Priority speaker** — When a designated priority speaker talks, all other participants' audio is ducked (lowered in volume); they cut through the room
- **Whispers** — A low-volume secondary audio layer; specific users can be assigned to a whisper group and hear a separate audio stream that others in the channel cannot

## What It Does (Future — Phase 2+)

- **Text channels** — Standard text chat organized by category
- **Activity statistics** — Text channels ordered/surfaced by recent activity; a "Pulse" feed showing what's happening across the guild/server in real time

## Tech Stack (Decided)

- **Runtime:** C# (.NET)
- **Client:** Windows desktop first (WPF or similar); cross-platform (Avalonia/MAUI) and web client are future targets
- **Architecture:** Client-server; server handles signaling, mixing coordination, and state; clients connect to it
- **Voice transport:** TBD during planning (WebRTC, custom UDP with Opus, or a media server like mediasoup/LiveKit)

## Design

A full wireframe suite exists in `/Design/`. The UI concept is called "Guildhall" internally; the product is named **Pulse**. Three UI directions (A/B/C) have been sketched. Wireframes cover the Pulse home (activity feed) and a Command Center view. Use these as the visual contract during implementation.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Windows desktop first | Ship fastest, validate core experience before cross-platform investment | — Pending |
| C# client + server | Single language stack, strong typing, existing .NET audio ecosystem | — Pending |
| Priority speaker = audio ducking | Clearest UX metaphor — speaker cuts through without muting others | — Pending |
| Whisper = low-volume side channel | Parallel audio stream heard only by designated listeners, not a mute/unmute toggle | — Pending |

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can join a named voice room and hear all other participants
- [ ] User can speak and be heard by all room participants
- [ ] A priority speaker role can be assigned; when that user speaks, all others' audio is ducked
- [ ] A whisper group can be configured; whisper audio is heard only by designated listeners
- [ ] Server manages room state (who is connected, who has priority, who is in whisper group)
- [ ] Client displays who is in the current voice room
- [ ] Text channels exist per server/guild (Phase 2)
- [ ] Text channels are surfaced by activity level (Phase 2)
- [ ] Activity feed ("Pulse" view) shows live cross-channel activity (Phase 2)

### Out of Scope (v1)

- Video — voice-only first
- Mobile clients — Windows desktop first
- Web client — future milestone after desktop is stable
- Cross-platform desktop (Avalonia/MAUI) — after Windows client ships

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-09 after initialization*
