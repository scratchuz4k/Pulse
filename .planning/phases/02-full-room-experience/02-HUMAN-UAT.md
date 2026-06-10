---
status: resolved
phase: 02-full-room-experience
source: [02-VERIFICATION.md]
started: 2026-06-09
updated: 2026-06-10
---

## Current Test

[testing complete]

## Tests

### 1. PTT global hotkey fires when app NOT focused
expected: Hold PTT key while another app is focused — mic activates (light turns orange), speaking ring appears in room. Release key — mic deactivates.
result: issue
reported: "PTT unmutes but never mutes back; also after adding the key can't use it in any other app"
severity: major

### 2. PTT key survives app restart
expected: Set a PTT key in Settings, close and reopen the app — same key is shown in Settings and still works as PTT.
result: issue
reported: "PTT key saving but voice activity/PTT mode setting not persisting — defaults back to voice activity on restart; also key still captures from other apps"
severity: major

### 3. Mute icon appears on remote client in real time
expected: User A clicks Mute — User B's participant panel shows 🔇 next to User A within ~1 second. Un-mute removes the icon.
result: pass

### 4. Deafen silences audio + restores mic state
expected: Deafen button silences all remote audio. If mic was on before deafening, un-deafen re-enables mic. If mic was muted before deafening, un-deafen leaves mic muted.
result: pass

### 5. Voice feed room cards + one-click join
expected: Voice tab shows a card for every persisted room. Clicking "Join ▸" on a card connects to that room without typing. Room list updates live when another user creates a room.
result: issue
reported: "joining while muted/deafened doesn't preserve that state — can hear and speak on join; live list updates work but users inside rooms not shown; rooms should hide when empty"
severity: major

### 6. Speaking ring animation during actual speech
expected: When a participant speaks, their avatar in the squad panel and bottom bar gets the animated orange ring. Ring stops when they stop speaking.
result: issue
reported: "ring animations work but bottom bar feels redundant and cluttered — user questions whether it's needed at all"
severity: minor

## Summary

total: 6
passed: 2
issues: 4
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "PTT key activates mic on keydown and deactivates on keyup, even when another app is focused; does not capture the key from other apps"
  status: resolved
  reason: "User reported: PTT unmutes but never mutes back; also after adding the key can't use it in any other app"
  severity: major
  test: 1
  root_cause: "Electron's globalShortcut.register() only fires on keydown with no keyup callback, and exclusively captures the key OS-wide so other apps can't receive it"
  artifacts:
    - path: "pulse-client/src/main/index.ts"
      issue: "globalShortcut.register used — keydown-only, no keyup, exclusive capture by design"
    - path: "pulse-client/src/renderer/composables/usePtt.ts"
      issue: "DOM keyup listener is dead code for PTT keys intercepted by globalShortcut"
  missing:
    - "Replace globalShortcut with uiohook-napi for keydown+keyup events without exclusive capture"
  debug_session: ""

- truth: "Joining a room while muted/deafened preserves mute/deafen state — can't hear or speak unexpectedly"
  status: resolved
  reason: "User reported: joining while muted/deafened resets state — can hear and speak on join"
  severity: major
  test: 5
  root_cause: "useLiveKit.connect() unconditionally calls setMicrophoneEnabled(true) on every join; handleJoin() only restores mute for PTT mode, ignores isDeafened and manual mute"
  artifacts:
    - path: "pulse-client/src/renderer/composables/useLiveKit.ts"
      issue: "connect() hardcodes mic enable (lines 98-104) with no state awareness"
    - path: "pulse-client/src/renderer/views/RoomView.vue"
      issue: "handleJoin() only checks isPttMode; ignores isDeafened and manual mute state"
  missing:
    - "After connect(), re-apply isDeafened and isMicEnabled desired state"
    - "If deafened: mute mic and set new audio elements volume to 0"
  debug_session: ""

- truth: "Room cards show participant list — users currently in the room are visible"
  status: resolved
  reason: "User reported: live list updates work but users inside rooms not shown"
  severity: major
  test: 5
  root_cause: "GET /rooms and RoomListUpdated SignalR event only return {id, name} — PresenceHub._rooms is never consulted for participant data in room list payloads"
  artifacts:
    - path: "Pulse.Server/Controllers/RoomsController.cs"
      issue: "GetRooms() selects only Id/Name, no participant data"
    - path: "Pulse.Server/Hubs/PresenceHub.cs"
      issue: "_rooms dictionary has participant data but is never exposed to room list callers"
    - path: "pulse-client/src/renderer/stores/room.ts"
      issue: "RoomInfo interface has no participant fields"
  missing:
    - "Expose GetRoomParticipants() helper from PresenceHub"
    - "Merge participant data into GetRooms() response and RoomListUpdated broadcast"
    - "Add participants field to RoomInfo and bind in room card template"
  debug_session: ""

- truth: "Speaking ring animation only shown where useful — bottom bar ring not duplicating squad panel"
  status: resolved
  reason: "User reported: bottom bar feels redundant and cluttered — questions whether it's needed"
  severity: minor
  test: 6
  root_cause: "Bottom bar speaking ring is a deliberate design choice that the user finds redundant given the squad panel already shows speaking state"
  artifacts:
    - path: "pulse-client/src/renderer/views/RoomView.vue"
      issue: "Bottom bar renders speaking ring indicators duplicating squad panel"
  missing:
    - "Remove or hide bottom bar speaking ring indicators"
  debug_session: ""

- truth: "Rooms are automatically deleted when the last participant leaves — empty rooms do not persist"
  status: resolved
  reason: "User clarification: rooms should cease to exist when empty, not just be hidden"
  severity: minor
  test: 5
  root_cause: "Feature not implemented — server does not track participant count per room or trigger deletion on last leave"
  artifacts:
    - path: "Pulse.Server/Hubs/PresenceHub.cs"
      issue: "LeaveRoom does not check if room is now empty and delete it"
    - path: "Pulse.Server/Controllers/RoomsController.cs"
      issue: "No auto-delete logic on empty room"
  missing:
    - "In PresenceHub.LeaveRoom, after removing participant check if room is empty and delete it"
    - "Broadcast RoomListUpdated after deletion"
  debug_session: ""

- truth: "Voice activity / PTT mode selection persists across restarts, not just the key binding"
  status: resolved
  reason: "User reported: key is saving but voice activity/PTT setting is not — defaults to voice activity on restart"
  severity: major
  test: 2
  root_cause: "isPttMode is a plain ref(false) never saved to electron-store; only ptt.key is persisted, no ptt.mode key exists anywhere"
  artifacts:
    - path: "pulse-client/src/renderer/composables/usePtt.ts"
      issue: "isPttMode initialized to false on every mount, no load/save logic"
    - path: "pulse-client/src/main/index.ts"
      issue: "electron-store only has ptt.key — no getPttMode/setPttMode IPC handlers"
  missing:
    - "Add ptt.mode to electron-store"
    - "Add getPttMode/setPttMode IPC handlers in main process"
    - "In usePtt onMounted, call getPttMode to restore persisted value"
    - "Watch isPttMode and call setPttMode on change"
  debug_session: ""
