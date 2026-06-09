---
status: partial
phase: 02-full-room-experience
source: [02-VERIFICATION.md]
started: 2026-06-09
updated: 2026-06-09
---

## Current Test

[awaiting human testing]

## Tests

### 1. PTT global hotkey fires when app NOT focused
expected: Hold PTT key while another app is focused — mic activates (light turns orange), speaking ring appears in room. Release key — mic deactivates.
result: [pending]

### 2. PTT key survives app restart
expected: Set a PTT key in Settings, close and reopen the app — same key is shown in Settings and still works as PTT.
result: [pending]

### 3. Mute icon appears on remote client in real time
expected: User A clicks Mute — User B's participant panel shows 🔇 next to User A within ~1 second. Un-mute removes the icon.
result: [pending]

### 4. Deafen silences audio + restores mic state
expected: Deafen button silences all remote audio. If mic was on before deafening, un-deafen re-enables mic. If mic was muted before deafening, un-deafen leaves mic muted.
result: [pending]

### 5. Voice feed room cards + one-click join
expected: Voice tab shows a card for every persisted room. Clicking "Join ▸" on a card connects to that room without typing. Room list updates live when another user creates a room.
result: [pending]

### 6. Speaking ring animation during actual speech
expected: When a participant speaks, their avatar in the squad panel and bottom bar gets the animated orange ring. Ring stops when they stop speaking.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
