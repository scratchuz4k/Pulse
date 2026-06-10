---
plan: "04-01"
phase: "04-whisper-side-channel"
status: complete
completed: 2026-06-10
---

# Plan 04-01: Whisper Group Server Layer

## What Was Built

Added the full whisper group backend to `PresenceHub.cs`:

- Converted from primary constructor to explicit ctor with `_db`, `_liveKitService`, `_configuration` fields
- `WhisperGroup` record + three static `ConcurrentDictionary` stores (`_whisperGroups`, `_userToWhisperGroups`, `_userToConnection`)
- `IsServerAdmin()` guard using `Pulse:AdminUserId` config / `PULSE_ADMIN_USER_ID` env
- `OnConnectedAsync` override: registers userId→connectionId and pushes `JoinWhisperGroups` tokens to returning members
- `OnDisconnectedAsync` updated: clears `_userToConnection` before existing room cleanup
- `CreateWhisperGroup` / `AddWhisperMember` / `RemoveWhisperMember` / `DissolveWhisperGroup` hub methods — all admin-gated
- `BroadcastWhisperGroupsAsync`: per-recipient payload respecting hidden/existence/full visibility modes
- `ILiveKitService.GetLiveKitHost()` was already on the interface — no change needed

## Self-Check: PASSED

- `dotnet build` succeeds (0 CS errors; file-lock warning only from running server process)
- All 7 whisper methods present; existing hub methods (JoinRoom, LeaveRoom, MuteChanged, etc.) unchanged
- `_whisperGroups`, `_userToWhisperGroups`, `_userToConnection` declared

## Key Files

- `Pulse.Server/Hubs/PresenceHub.cs` — 285 lines, full whisper backend
