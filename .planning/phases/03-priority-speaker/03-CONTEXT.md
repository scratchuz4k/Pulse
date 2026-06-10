# Phase 3 Context: Priority Speaker

## Goal
Admin can assign priority speaker; when they talk, everyone else gets ducked.

## Key Decisions

**Admin = room creator** (`Room.CreatedByUserId`). Temporary stop-gap until server-level admin lands. Client checks `room.createdByUserId === authStore.userId`.

**Ducking via HTML audio element volume** — not Web Audio API. `useLiveKit.ts` already creates `<audio id="livekit-audio-${identity}">` elements. Set `.volume = 0.15` on all remote audio elements except the priority speaker's when they're speaking; restore to `1.0` when they stop.

**Trigger:** `RoomEvent.ActiveSpeakersChanged` in LiveKit. If priority speaker is in `activeSpeakers`, duck. When they leave `activeSpeakers`, restore.

**State broadcast:** SignalR `PresenceHub` — consistent with mute/deafen pattern. New hub methods: `AssignPrioritySpeaker(roomName, userId)` and `RemovePrioritySpeaker(roomName)`. Broadcast event: `PrioritySpeakerChanged(userId | null)`.

**In-memory state** — `prioritySpeakerId` stored in PresenceHub alongside mute/deafen state. No DB persistence needed.

**`ParticipantInfo` record** gets `IsPrioritySpeaker` flag so the full state is conveyed on `RoomJoined`.

## Duck Level
Default: 15% volume (≈−16dB). Will be hardcoded for now; configurable later.

## Requirements
- PRIOR-01: Admin assigns/removes priority speaker role
- PRIOR-02: Audio ducked when priority speaker transmits
- PRIOR-03: Audio restored when priority speaker stops transmitting
- PRIOR-04: All participants see who holds the priority speaker role
