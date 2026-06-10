---
status: human_needed
phase: 03-priority-speaker
verified: 2026-06-10
requirements_checked: [PRIOR-01, PRIOR-02, PRIOR-03, PRIOR-04]
must_haves_score: 4/4
---

# Phase 03 Verification: Priority Speaker

## Summary

All 4 PRIOR requirements have verified implementations in the codebase. Automated checks pass. Human testing required to confirm audio ducking and UI behavior at runtime.

## Requirements Check

### PRIOR-01 — Admin can assign priority speaker role ✅

- `PresenceHub.AssignPrioritySpeaker()` validates caller is room creator via `room.CreatedByUserId`
- `Room.CreatedByUserId` (nullable Guid) stamped at creation by `RoomsController`
- `roomStore.isAdmin` computed checks `createdByUserId === authStore.userId`
- Admin-only button rendered in `RoomView.vue` (`togglePrioritySpeaker` handler)
- **VERIFIED** in code

### PRIOR-02 — Priority speaker ducking (others lowered) ✅

- `applyDucking()` in `useLiveKit.ts` sets `el.volume = 0.15` for all non-PS audio elements when PS is in `activeSpeakers`
- Triggers on `RoomEvent.ActiveSpeakersChanged`
- **VERIFIED** in code

### PRIOR-03 — Volumes restore when priority speaker stops ✅

- `applyDucking()` sets `el.volume = 1.0` when PS is NOT in active speakers
- `setPrioritySpeaker(null)` immediately restores all volumes to 1.0
- **VERIFIED** in code

### PRIOR-04 — Visual indicator for priority speaker ✅

- ★ badge rendered in `RoomView.vue` when `participant.userId === roomStore.prioritySpeakerId`
- Visible to all participants (not admin-only)
- `PrioritySpeakerChanged` SignalR handler updates `roomStore.prioritySpeakerId`
- Late-joiner sync: `JoinRoom` sends current PS state to `Clients.Caller`
- **VERIFIED** in code

## Automated Checks

- [x] `AssignPrioritySpeaker` / `RemovePrioritySpeaker` hub methods exist in `PresenceHub.cs`
- [x] `_prioritySpeakers ConcurrentDictionary` present (roomName → userId)
- [x] `applyDucking()` targets `audio[id^="livekit-audio-"]` elements
- [x] `setPrioritySpeaker` exported from `useLiveKit`
- [x] `PrioritySpeakerChanged` handler in `usePresence.ts`
- [x] `isAdmin` computed in `room.ts`
- [x] `prioritySpeakerId` state in `room.ts`
- [x] `togglePrioritySpeaker` wired in `RoomView.vue`
- [x] `Room.CreatedByUserId` property exists
- [x] Late-joiner sync in `JoinRoom` (line 53-54 PresenceHub.cs)

## Human Verification Required

1. **Admin assignment:** Join a room as creator, open participant list — verify assign/remove button appears. Join as non-creator — verify button is absent.
2. **Ducking:** Assign PS to a user. Have PS speak — verify other participants' audio drops noticeably. PS stops speaking — verify audio restores.
3. **Visual badge:** Verify ★ badge appears on PS participant row for all users in the room.
4. **Late-joiner:** Join a room where PS is already assigned — verify badge appears immediately on join.
5. **Reassign:** Admin assigns PS to user A, then reassigns to user B — verify badge moves and ducking follows new PS.
