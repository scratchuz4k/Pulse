---
phase: 03-priority-speaker
plan: "03"
subsystem: renderer/ui
tags: [priority-speaker, admin-ui, roomview, badge]
dependency_graph:
  requires: ["03-01", "03-02"]
  provides: ["PRIOR-01", "PRIOR-04"]
  affects: ["pulse-client/src/renderer/views/RoomView.vue", "pulse-client/src/renderer/stores/room.ts"]
tech_stack:
  added: []
  patterns: ["isAdmin computed from createdByUserId vs authStore.userId", "togglePrioritySpeaker click handler pattern"]
key_files:
  modified:
    - pulse-client/src/renderer/views/RoomView.vue
    - pulse-client/src/renderer/stores/room.ts
decisions:
  - "isAdmin computed in room store: checks room.createdByUserId === authStore.userId for current room"
  - "★ badge shown to all participants when userId === prioritySpeakerId"
  - "assign/remove button visible only to isAdmin — single togglePrioritySpeaker() handler"
  - "ps-active CSS class on PS participant row for visual highlight"
metrics:
  duration: "part of combined phase-3 commit"
  completed: "2026-06-10"
  tasks_completed: 5
  tasks_total: 5
  files_modified: 2
---

# Phase 03 Plan 03: Admin UI + Priority Speaker Indicator Summary

RoomView shows ★ badge on the priority speaker for all participants; room creator sees assign/remove button per participant; `isAdmin` computed drives visibility.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Read room store and RoomView for context | 35a07b0 | — |
| 2 | Add isAdmin computed to room store | 35a07b0 | room.ts |
| 3 | Expose assignPrioritySpeaker/removePrioritySpeaker from usePresence | 35a07b0 | usePresence.ts |
| 4 | Add ★ badge + admin controls to participant list in RoomView | 35a07b0 | RoomView.vue |
| 5 | Add CSS for badge, button, ps-active highlight | 35a07b0 | RoomView.vue |

## What Was Built

**isAdmin computed:** Room store computes `isAdmin` by finding the current room in `roomList` and comparing `room.createdByUserId` to `authStore.userId`. Exported for template consumption.

**Priority speaker badge:** ★ icon rendered on participant row when `p.userId === roomStore.prioritySpeakerId`. Visible to all participants.

**Admin controls:** Assign/remove button shown only when `roomStore.isAdmin`. Single `togglePrioritySpeaker(userId)` handler — calls `presence.removePrioritySpeaker()` if that participant is already PS, otherwise `presence.assignPrioritySpeaker()`.

**ps-active highlight:** CSS class applied to the priority speaker's participant row for a visual distinction.

**usePresence methods:** `assignPrioritySpeaker(roomName, userId)` and `removePrioritySpeaker(roomName)` exposed — invoke corresponding SignalR hub methods.

## Deviations from Plan

None — implemented exactly as planned.

## Known Stubs

None.

## Threat Flags

None — admin button is UI-only gated; server re-validates admin status in hub method before acting.

## Self-Check: PASSED

- [x] RoomView.vue has ★ badge conditional on prioritySpeakerId
- [x] RoomView.vue has assign/remove button gated on isAdmin
- [x] room.ts has isAdmin computed
- [x] usePresence.ts exposes assignPrioritySpeaker and removePrioritySpeaker
- [x] Commit 35a07b0 covers all UI changes
