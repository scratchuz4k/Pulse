---
status: partial
phase: 03-priority-speaker
source: [03-VERIFICATION.md]
started: 2026-06-10T16:00:00.000Z
updated: 2026-06-10T16:00:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Admin assignment controls
expected: Room creator sees assign/remove button per participant; non-creator sees no button
result: [pending]

### 2. Audio ducking
expected: When PS speaks, other participants' audio drops to ~15% volume; when PS stops, audio restores to 100%
result: [pending]

### 3. Visual ★ badge
expected: ★ badge appears on priority speaker's participant row for all users in the room
result: [pending]

### 4. Late-joiner sync
expected: User joining a room with active PS immediately sees the ★ badge without needing any action
result: [pending]

### 5. PS reassignment
expected: Admin assigns PS to user A then user B — badge moves to B, ducking follows B
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
