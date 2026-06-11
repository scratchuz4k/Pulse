<template>
  <div class="connect-bar-root">
    <!-- Settings overlay -->
    <div v-if="showSettings" class="cb-settings-overlay">
      <div class="cb-settings-panel">
        <div class="settings-head">
          <button class="settings-back" @click="showSettings = false">← Back</button>
          <h2>Settings</h2>
        </div>
        <div v-if="inputDevices.length" class="settings-section">
          <div class="settings-group-label">Audio</div>
          <label class="setting-label">
            Microphone
            <select
              class="setting-select"
              :value="activeInputId"
              @change="switchInput(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="d in inputDevices" :key="d.deviceId" :value="d.deviceId">
                {{ d.label }}{{ d.deviceId === activeInputId ? " ✓" : "" }}
              </option>
            </select>
          </label>
          <label class="setting-label">
            Speaker
            <select
              class="setting-select"
              :value="activeOutputId"
              @change="switchOutput(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="d in outputDevices" :key="d.deviceId" :value="d.deviceId">
                {{ d.label }}{{ d.deviceId === activeOutputId ? " ✓" : "" }}
              </option>
            </select>
          </label>
        </div>
        <div v-else class="settings-hint">Join a room first to configure audio devices.</div>
        <div class="settings-section" style="margin-top: 24px">
          <div class="settings-group-label">Voice Mode</div>
          <label class="setting-label">
            Input Mode
            <div class="ptt-toggle">
              <button :class="['ptt-opt', !isPttMode && 'active']" @click="isPttMode = false">
                Voice Activity
              </button>
              <button :class="['ptt-opt', isPttMode && 'active']" @click="isPttMode = true">
                Push-to-Talk
              </button>
            </div>
          </label>
          <label v-if="isPttMode" class="setting-label">
            PTT Key
            <div class="ptt-key-row">
              <kbd
                class="ptt-key"
                :class="{ capturing: isCapturing }"
                tabindex="0"
                @click="startCapture"
              >
                {{ isCapturing ? "Press a key…" : (pttBinding?.label ?? "Click to bind") }}
              </kbd>
            </div>
          </label>
          <label class="setting-label">
            Whisper PTT Key
            <div class="ptt-key-row">
              <kbd
                class="ptt-key"
                :class="{ capturing: isCapturingWhisper }"
                tabindex="0"
                @click="startWhisperCapture"
              >
                {{ isCapturingWhisper ? "Press a key…" : (whisperPttBinding?.label ?? "Click to bind") }}
              </kbd>
              <button v-if="whisperPttBinding" class="ptt-clear" @click="clearWhisperPtt">×</button>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- Connect bar -->
    <div class="cb-bar">
      <!-- User section (always visible) -->
      <div class="cb-user">
        <span class="cb-avatar" :style="{ background: avatarColor(authStore.displayName || 'You') }">
          {{ initials(authStore.displayName || "You") }}
        </span>
        <div class="cb-user-info">
          <span class="cb-user-name">{{ authStore.displayName }}</span>
          <span class="cb-user-status" :class="{ 'cb-user-status--voice': isConnected }">
            {{ isConnected ? "Voice connected" : "Online" }}
          </span>
        </div>
      </div>

      <!-- Voice room info (only when connected) -->
      <div v-if="isConnected" class="cb-room">
        <div class="cb-room-bars">
          <span /><span /><span /><span />
        </div>
        <div class="cb-room-info">
          <span class="cb-room-name">{{ roomStore.currentRoomName }}</span>
          <span class="cb-room-count">{{ roomStore.participants.length }} / 12</span>
        </div>
      </div>

      <!-- Controls (right side) -->
      <div class="cb-controls">
        <!-- Mic (voice only) -->
        <button
          v-if="isConnected"
          class="cb-btn"
          :class="{ 'cb-btn--danger': !isMicEnabled || isDeafened }"
          :disabled="isDeafened"
          :title="isDeafened ? 'Muted (deafened)' : isMicEnabled ? 'Mute' : 'Unmute'"
          tabindex="-1"
          @click="handleToggleMic"
        >
          <svg v-if="isMicEnabled" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 2l20 20M9 9v2a3 3 0 0 0 5 2M15 9.3V5a3 3 0 0 0-5.7-1.3M5 10a7 7 0 0 0 11 5.5M12 19v3" />
          </svg>
        </button>

        <!-- Deafen (voice only) -->
        <button
          v-if="isConnected"
          class="cb-btn"
          :class="{ 'cb-btn--danger': isDeafened }"
          :title="isDeafened ? 'Undeafen' : 'Deafen'"
          tabindex="-1"
          @click="handleToggleDeafen"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
            <rect x="2" y="13" width="5" height="7" rx="2" />
            <rect x="17" y="13" width="5" height="7" rx="2" />
            <path d="M22 18v1a3 3 0 0 1-3 3h-5" />
          </svg>
        </button>

        <!-- Leave (voice only) -->
        <button
          v-if="isConnected"
          class="cb-btn cb-btn--leave"
          title="Leave room"
          tabindex="-1"
          @click="handleLeave"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>

        <div v-if="isConnected" class="cb-divider" />

        <!-- Settings -->
        <button class="cb-btn" title="Settings" @click="showSettings = true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
          </svg>
        </button>

        <!-- Logout -->
        <button class="cb-btn" title="Log out" @click="handleLogout">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useRoomStore } from "../stores/room";
import { useAuth } from "../composables/useAuth";
import { usePresence } from "../composables/usePresence";
import { useLiveKit } from "../composables/useLiveKit";
import { usePtt } from "../composables/usePtt";
import { avatarColor, initials } from "../utils/avatar";

const router = useRouter();
const authStore = useAuthStore();
const roomStore = useRoomStore();
const { logout } = useAuth();
const { leaveRoom, disconnect, broadcastMuteChanged, broadcastDeafenChanged } = usePresence();
const {
  disconnect: livekitDisconnect,
  toggleMic,
  switchInput,
  switchOutput,
  isConnected,
  isMicEnabled,
  inputDevices,
  outputDevices,
  activeInputId,
  activeOutputId,
  applyMuteToWhisperRooms,
  applyDeafenToWhisperRooms,
  isDeafened,
  isExplicitlyMuted,
} = useLiveKit();
const { isPttMode, pttBinding, isCapturing, startCapture, whisperPttBinding, isCapturingWhisper, startWhisperCapture, clearWhisperPtt } = usePtt();

const showSettings = ref(false);
const prevMicEnabled = ref(false);

async function handleToggleMic(): Promise<void> {
  if (isDeafened.value) return;
  await toggleMic();
  isExplicitlyMuted.value = !isMicEnabled.value;
  await applyMuteToWhisperRooms(!isMicEnabled.value);
  await broadcastMuteChanged(!isMicEnabled.value);
}

async function handleToggleDeafen(): Promise<void> {
  if (!isDeafened.value) {
    prevMicEnabled.value = isMicEnabled.value;
    isDeafened.value = true;
    document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"]').forEach((el) => { el.volume = 0; });
    applyDeafenToWhisperRooms(true);
    if (isMicEnabled.value) await toggleMic();
    await applyMuteToWhisperRooms(true);
    await broadcastMuteChanged(true);
    await broadcastDeafenChanged(true);
  } else {
    isDeafened.value = false;
    isExplicitlyMuted.value = false;
    document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"]').forEach((el) => { el.volume = 1; });
    applyDeafenToWhisperRooms(false);
    if (prevMicEnabled.value && !isMicEnabled.value) await toggleMic();
    await applyMuteToWhisperRooms(false);
    await broadcastMuteChanged(!prevMicEnabled.value);
    await broadcastDeafenChanged(false);
  }
}

async function handleLeave(): Promise<void> {
  await livekitDisconnect();
  if (roomStore.currentRoomName) await leaveRoom(roomStore.currentRoomName);
  roomStore.clearRoom();
  isDeafened.value = false;
  isExplicitlyMuted.value = false;
  prevMicEnabled.value = false;
}

async function handleLogout(): Promise<void> {
  await livekitDisconnect();
  if (roomStore.currentRoomName) await leaveRoom(roomStore.currentRoomName);
  await disconnect();
  roomStore.clearRoom();
  isDeafened.value = false;
  isExplicitlyMuted.value = false;
  prevMicEnabled.value = false;
  await logout();
  router.push("/login");
}

defineExpose({ isDeafened, handleLeave });
</script>

<style scoped>
.connect-bar-root {
  flex: 0 0 auto;
  position: relative;
}

/* ── Settings overlay ── */
.cb-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}
.cb-settings-panel {
  width: 100%;
  background: var(--c-bg);
  border-top: 1px solid var(--c-border);
  padding: 32px 40px 40px;
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100vh;
  overflow-y: auto;
}
.settings-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}
.settings-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--c-ink);
}
.settings-back {
  background: none;
  border: none;
  color: var(--c-ink-4);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  padding: 0;
}
.settings-back:hover { color: var(--c-ink); }
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 400px;
}
.settings-group-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--c-ink-4);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--c-border);
}
.setting-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.setting-select {
  padding: 8px 10px;
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  background: var(--c-side);
  font-size: 13px;
  font-family: inherit;
  color: var(--c-ink);
  outline: none;
  cursor: pointer;
}
.setting-select:focus { border-color: var(--accent); }
.settings-hint {
  font-size: 13px;
  color: var(--c-ink-4);
}
.ptt-toggle {
  display: flex;
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  overflow: hidden;
  width: fit-content;
}
.ptt-opt {
  padding: 6px 14px;
  background: transparent;
  border: none;
  color: var(--c-ink-3);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.ptt-opt.active { background: var(--accent); color: #fff; }
.ptt-key-row { display: flex; align-items: center; gap: 8px; }
kbd.ptt-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 6px 12px;
  border: 1px solid var(--c-border-2);
  border-radius: 6px;
  background: var(--c-side-2);
  color: var(--c-ink);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
  transition: border-color 0.1s;
}
kbd.ptt-key:focus,
kbd.ptt-key.capturing {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
button.ptt-clear {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--c-ink-4);
  cursor: pointer;
  font-size: 15px;
  padding: 0;
  line-height: 1;
}
button.ptt-clear:hover { color: var(--live); }

/* ── Bar ── */
.cb-bar {
  height: 52px;
  background: var(--c-rail);
  border-top: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
}

/* User section */
.cb-user {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}
.cb-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.cb-user-info { min-width: 0; }
.cb-user-name {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink);
  white-space: nowrap;
}
.cb-user-status {
  display: block;
  font-size: 11px;
  color: var(--c-ink-5);
}
.cb-user-status--voice { color: var(--voice); }

/* Room info */
.cb-room {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
  padding-left: 12px;
  border-left: 1px solid var(--c-border);
}
.cb-room-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
  flex: 0 0 auto;
}
.cb-room-bars span {
  width: 3px;
  border-radius: 2px;
  background: var(--voice);
  animation: bar-bounce 1.2s ease-in-out infinite;
}
.cb-room-bars span:nth-child(1) { height: 6px;  animation-delay: 0s; }
.cb-room-bars span:nth-child(2) { height: 12px; animation-delay: 0.15s; }
.cb-room-bars span:nth-child(3) { height: 8px;  animation-delay: 0.3s; }
.cb-room-bars span:nth-child(4) { height: 14px; animation-delay: 0.45s; }
@keyframes bar-bounce {
  0%, 100% { transform: scaleY(1); }
  50%       { transform: scaleY(0.4); }
}
.cb-room-info { min-width: 0; }
.cb-room-name {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cb-room-count {
  display: block;
  font-size: 11px;
  color: var(--c-ink-4);
}

/* Controls */
.cb-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
  margin-left: auto;
}
.cb-divider {
  width: 1px;
  height: 20px;
  background: var(--c-border);
  margin: 0 4px;
}
.cb-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  color: var(--c-ink-4);
  cursor: pointer;
  transition: background 0.1s, color 0.1s, border-color 0.1s;
  flex: 0 0 auto;
}
.cb-btn:hover {
  background: var(--c-side-2);
  color: var(--c-ink-2);
  border-color: var(--c-border);
}
.cb-btn--danger {
  background: rgba(240, 71, 71, 0.12);
  color: var(--live);
  border-color: rgba(240, 71, 71, 0.25);
}
.cb-btn--danger:hover {
  background: rgba(240, 71, 71, 0.22);
  border-color: rgba(240, 71, 71, 0.4);
}
.cb-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cb-btn--leave {
  background: rgba(240, 71, 71, 0.12);
  color: var(--live);
  border-color: rgba(240, 71, 71, 0.25);
}
.cb-btn--leave:hover {
  background: rgba(240, 71, 71, 0.22);
  border-color: rgba(240, 71, 71, 0.4);
}
</style>
