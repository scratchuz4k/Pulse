# Phase 3 Research: Priority Speaker

## Architecture Findings (from graphify + direct file reads)

### Audio Element Pattern
`useLiveKit.ts` appends raw `<audio>` elements to `document.body` on `TrackSubscribed`:
```
el.id = `livekit-audio-${participant.identity}`
```
**Ducking approach:** Set `el.volume` on these elements directly — no Web Audio API needed. When priority speaker is active: set all remote audio els to `0.15` except the priority speaker's. Restore to `1.0` when they stop.

LiveKit `identity` = userId (string). The `ActiveSpeakersChanged` event fires with the currently speaking participants — use this to trigger duck/restore.

### State Broadcast: SignalR is the right channel
PresenceHub already handles mute/deafen state via the same pattern:
- Server method called by admin → updates in-memory state → broadcasts to room group
- Client handles the event in `usePresence.ts`

No need for LiveKit metadata. Keep it consistent with existing patterns.

### Admin Check
`GET /rooms` now returns `createdByUserId`. Client compares against auth store userId to determine if current user is admin. No server-side admin validation needed for the assign action since it's already `[Authorize]` — but should add a check in the hub method.

### In-Memory vs DB
Priority speaker is a session state (like mute/deafen) — in-memory in PresenceHub is correct. It resets when the room empties, which is the right behavior.

### `ParticipantInfo` record in PresenceHub
Currently: `(DisplayName, UserId, IsMuted, IsDeafened)`. Add `IsPrioritySpeaker` flag to keep participant info self-contained.

## Approach

**3 plans:**
1. Server: Add `AssignPrioritySpeaker` / `RemovePrioritySpeaker` hub methods + broadcast
2. Client composable: Audio ducking in `useLiveKit.ts` + SignalR wiring in `usePresence.ts`
3. UI: Admin assign/remove button + priority speaker indicator for all participants
