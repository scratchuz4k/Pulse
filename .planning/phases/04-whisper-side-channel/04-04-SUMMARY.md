---
plan: "04-04"
phase: "04-whisper-side-channel"
status: complete
completed: 2026-06-10
---

# Plan 04-04: WhisperPanel UI + RoomView Tab Switcher

## What Was Built

**WhisperPanel.vue (new component):**
- Group cards with name, visibility badge (HIDDEN/EXISTS/PUBLIC styled with distinct colors), member list
- Speaking ring animation on members actively speaking in that whisper room (driven by `whisperStore.speakers`)
- Transmit mode selector: Both (always on) / PTT only / Whisper only — saved via `pulseApi.setWhisperTransmitMode`
- PTT key-capture input: click to bind, keydown capture, clear button; unmappable keys surface error
- `whisper-ptt:keydown` IPC: enables mic on correct whisper Room; suppresses main mic if `suppressMain` setting is true
- `whisper-ptt:keyup` IPC: disables whisper mic, restores main mic
- `whisperOnly` transmit mode: disables main room mic, enables whisper room mic immediately
- Admin create-group form (groupId / name / visibility, with client-side groupId pattern validation) gated by `whisperStore.isAdmin`
- Admin per-card Add Member input and Remove (×) button per member
- Admin Dissolve button with confirm dialog
- Empty state paragraph when no groups
- `onUnmounted` cleanup: removes PTT listeners and capture keydown listener

**RoomView.vue updates:**
- Import `WhisperPanel`; add `sideTab` ref
- Replace single `<ParticipantPanel>` with `.side-tabs` wrapper containing tab bar + `v-if`/`v-else` panels
- `.side-tab-btn.active` highlighted with `var(--accent)` border-bottom
- `:deep(.squad-panel)` and `:deep(.whisper-panel)` strip inner border-left to avoid double border

**useLiveKit.ts:** added `setMainMicEnabled(enabled)` helper exported in return object

**env.d.ts:** added full whisper IPC API to `PulseApi` interface (9 new members)

## Self-Check: PASSED

- `tsc --noEmit` produces 0 errors
- All must-have truths satisfied: speaking ring, transmit modes, PTT key binding, admin controls, tab switcher, empty state

## Key Files

- `pulse-client/src/renderer/components/WhisperPanel.vue`
- `pulse-client/src/renderer/views/RoomView.vue`
- `pulse-client/src/renderer/composables/useLiveKit.ts`
- `pulse-client/src/renderer/env.d.ts`
