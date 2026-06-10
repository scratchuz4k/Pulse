<template>
  <div class="room-root">
    <div class="page-body">
      <!-- VOICE view -->
      <div class="voice-view">
        <div class="feed-col">
          <div class="feed-topbar">
            <span class="feed-title">Voice Channels</span>
            <button class="create-btn" @click="showJoinForm = !showJoinForm">
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New room
            </button>
          </div>
          <div class="feed-scroll">
            <!-- Active room card -->
            <div v-if="roomStore.currentRoomName" class="room-card active-card">
              <div class="card-row card-head">
                <span class="type-chip voice-chip">🎙 VOICE</span>
                <span class="you-here-chip">you're here</span>
                <span class="card-name">{{ roomStore.currentRoomName }}</span>
                <span class="flames">🔥🔥🔥</span>
              </div>
              <div class="card-row card-people">
                <div class="av-stack">
                  <span
                    v-for="p in roomStore.participants.slice(0, 5)"
                    :key="p.connectionId"
                    class="av-sm"
                    :style="{ background: avatarColor(p.displayName) }"
                  >
                    {{ initials(p.displayName) }}
                  </span>
                  <span
                    v-if="roomStore.participants.length > 5"
                    class="av-sm av-more"
                  >
                    +{{ roomStore.participants.length - 5 }}
                  </span>
                </div>
                <span class="card-meta">
                  {{ roomStore.participants.length }} / 12
                </span>
              </div>
              <div class="heat-bar">
                <div
                  class="heat-fill"
                  :style="{
                    width:
                      Math.min(100, roomStore.participants.length * 12) + '%',
                  }"
                />
              </div>
            </div>

            <!-- Join form card -->
            <div
              v-if="showJoinForm || !roomStore.currentRoomName"
              class="join-card"
            >
              <div class="join-card-label">Join or create a room</div>
              <div class="join-row">
                <input
                  v-model="roomNameInput"
                  class="room-input"
                  type="text"
                  placeholder="Room name…"
                  @keydown.enter="handleJoin"
                />
                <button
                  class="jump-btn"
                  :disabled="joining || !roomNameInput.trim()"
                  @click="handleJoin"
                >
                  {{ joining ? "…" : "Jump in ▸" }}
                </button>
              </div>
              <div v-if="joinError" class="join-error">{{ joinError }}</div>
            </div>

            <!-- Other rooms -->
            <template v-for="room in roomStore.rooms" :key="room.id">
              <div
                v-if="
                  room.name !== roomStore.currentRoomName &&
                  room.participants.length > 0
                "
                class="room-card joinable"
                @click="handleJoinRoom(room.name)"
              >
                <div class="card-row card-head">
                  <span class="type-chip voice-chip">🎙 VOICE</span>
                  <span class="card-name">{{ room.name }}</span>
                </div>
                <div class="card-row card-people">
                  <div class="av-stack">
                    <span
                      v-for="p in room.participants.slice(0, 5)"
                      :key="p.userId"
                      class="av-sm"
                      :style="{ background: avatarColor(p.displayName) }"
                    >
                      {{ initials(p.displayName) }}
                    </span>
                    <span
                      v-if="room.participants.length > 5"
                      class="av-sm av-more"
                    >
                      +{{ room.participants.length - 5 }}
                    </span>
                  </div>
                  <span class="card-meta">
                    {{ room.participants.length }} in room
                  </span>
                </div>
                <div class="card-row">
                  <button
                    class="jump-btn"
                    :disabled="joining"
                    @click.stop="handleJoinRoom(room.name)"
                  >
                    Join ▸
                  </button>
                </div>
              </div>
            </template>

            <div
              v-if="roomStore.rooms.length === 0 && !roomStore.currentRoomName"
              class="empty-card"
            >
              <p>No voice rooms yet.</p>
            </div>
          </div>
        </div>

        <!-- Sidebar with tab switcher -->
        <div class="side-tabs">
          <div class="side-tab-bar">
            <button
              class="side-tab-btn"
              :class="{ active: sideTab === 'participants' }"
              @click="sideTab = 'participants'"
            >Participants</button>
            <button
              class="side-tab-btn"
              :class="{ active: sideTab === 'whisper' }"
              @click="sideTab = 'whisper'"
            >Whisper</button>
          </div>
          <ParticipantPanel
            v-if="sideTab === 'participants'"
            :active-speakers="activeSpeakers"
            @toggle-priority-speaker="togglePrioritySpeaker"
          />
          <WhisperPanel v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import ParticipantPanel from "../components/ParticipantPanel.vue";
import WhisperPanel from "../components/WhisperPanel.vue";
import { useRoomStore } from "../stores/room";
import { useAuth } from "../composables/useAuth";
import { usePresence } from "../composables/usePresence";
import { useLiveKit } from "../composables/useLiveKit";
import { usePtt, codeToAccelerator } from "../composables/usePtt";

const roomStore = useRoomStore();
const { fetchLiveKitToken } = useAuth();
const {
  connect,
  joinRoom,
  broadcastMuteChanged,
  createRoom,
  assignPrioritySpeaker,
  removePrioritySpeaker,
} = usePresence();
const {
  connect: livekitConnect,
  isConnected,
  isMicEnabled,
  activeSpeakers,
} = useLiveKit();
const { isPttMode, pttBinding } = usePtt();

const roomNameInput = ref("");
const joining = ref(false);
const sideTab = ref<'participants' | 'whisper'>('participants');
const joinError = ref("");
const showJoinForm = ref(false);

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const AV_COLORS = [
  "#e8722e",
  "#23c97d",
  "#5750d6",
  "#d6457f",
  "#3a86c8",
  "#7a52c7",
  "#c2553f",
  "#2aa39a",
  "#b0843a",
  "#5a6acf",
];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase();
}

function togglePrioritySpeaker(userId: string): void {
  if (!roomStore.currentRoomName) return;
  if (roomStore.prioritySpeakerId === userId) {
    removePrioritySpeaker(roomStore.currentRoomName);
  } else {
    assignPrioritySpeaker(roomStore.currentRoomName, userId);
  }
}

async function setMicEnabled(v: boolean): Promise<void> {
  // PTT mic toggling — only acts when in PTT mode
  if (isMicEnabled.value !== v) {
    await broadcastMuteChanged(!v);
  }
}

function handlePttKeydown(e: KeyboardEvent): void {
  if (!isPttMode.value || !pttBinding.value || e.repeat) return;
  if (codeToAccelerator(e.code) === pttBinding.value.accelerator)
    setMicEnabled(true);
}
function handlePttKeyup(e: KeyboardEvent): void {
  if (!isPttMode.value || !pttBinding.value) return;
  if (codeToAccelerator(e.code) === pttBinding.value.accelerator)
    setMicEnabled(false);
}

onMounted(() => {
  window.addEventListener("keydown", handlePttKeydown);
  window.addEventListener("keyup", handlePttKeyup);
  window.pulseApi.onPttKeyDown(() => {
    if (isPttMode.value) setMicEnabled(true);
  });
  window.pulseApi.onPttKeyUp(() => {
    if (isPttMode.value) setMicEnabled(false);
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", handlePttKeydown);
  window.removeEventListener("keyup", handlePttKeyup);
  window.pulseApi.removePttListeners();
});

async function handleJoin(): Promise<void> {
  if (!roomNameInput.value.trim()) return;
  joinError.value = "";
  joining.value = true;
  showJoinForm.value = false;
  try {
    await createRoom(SERVER_URL, roomNameInput.value.trim());
  } catch (e) {
    console.warn("[handleJoin] createRoom:", e);
  }
  try {
    const { liveKitToken, liveKitHost } = await fetchLiveKitToken(
      roomNameInput.value.trim(),
    );
    await connect(SERVER_URL);
    await joinRoom(roomNameInput.value.trim());
    const desiredMic = !isPttMode.value;
    await livekitConnect(liveKitToken, liveKitHost, desiredMic);
    if (!desiredMic) await broadcastMuteChanged(true);
    roomNameInput.value = "";
  } catch (err: unknown) {
    joinError.value = err instanceof Error ? err.message : "Failed to join";
    showJoinForm.value = true;
  } finally {
    joining.value = false;
  }
}

async function handleJoinRoom(name: string): Promise<void> {
  roomNameInput.value = name;
  await handleJoin();
}

void isConnected;
</script>

<style scoped>
.room-root {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.page-body {
  flex: 1 1 auto;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.voice-view {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.feed-col {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.feed-topbar {
  height: 52px;
  flex: 0 0 52px;
  padding: 0 22px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--c-border);
}

.feed-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--c-ink);
  letter-spacing: -0.02em;
}

.create-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-ink-3);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.1s,
    color 0.1s;
}
.create-btn:hover {
  background: var(--c-side-2);
  color: var(--c-ink-2);
}

.feed-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scrollbar-width: thin;
  scrollbar-color: var(--c-border-2) transparent;
}

.room-card {
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius);
  padding: 14px 16px;
  background: var(--c-side);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s;
}
.room-card.active-card {
  border-color: var(--voice);
  background: rgba(35, 201, 125, 0.05);
}
.room-card.joinable {
  cursor: pointer;
}
.room-card.joinable:hover {
  border-color: var(--accent);
}

.card-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.card-head {
  flex-wrap: nowrap;
}

.type-chip {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  border-radius: 20px;
  padding: 2px 9px;
  flex: 0 0 auto;
  border: 1.5px solid currentColor;
}
.voice-chip {
  color: var(--voice);
}

.you-here-chip {
  font-size: 11px;
  font-weight: 700;
  color: var(--voice);
  border: 1.5px solid var(--voice);
  border-radius: 20px;
  padding: 2px 9px;
  flex: 0 0 auto;
}

.card-name {
  flex: 1 1 auto;
  font-size: 16px;
  font-weight: 700;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flames {
  flex: 0 0 auto;
  font-size: 14px;
}

.av-stack {
  display: flex;
}
.av-sm {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--c-side);
  margin-left: -6px;
  flex: 0 0 auto;
}
.av-sm:first-child {
  margin-left: 0;
}
.av-more {
  background: var(--c-side-2);
  color: var(--c-ink-4);
}

.card-meta {
  font-size: 13px;
  color: var(--c-ink-4);
  font-weight: 500;
}

.heat-bar {
  height: 6px;
  background: var(--c-side-2);
  border-radius: 4px;
  overflow: hidden;
}
.heat-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.join-card {
  border: 1.5px dashed var(--c-border-2);
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.join-card-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.join-row {
  display: flex;
  gap: 8px;
}
.room-input {
  flex: 1 1 auto;
  height: 34px;
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  background: var(--c-bg);
  padding: 0 10px;
  font-size: 13px;
  font-family: inherit;
  color: var(--c-ink);
  outline: none;
}
.room-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
.room-input::placeholder {
  color: var(--c-ink-5);
}

.jump-btn {
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.12s;
}
.jump-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.jump-btn:not(:disabled):hover {
  opacity: 0.85;
}

.join-error {
  font-size: 12px;
  color: var(--live);
}

.empty-card {
  border: 1.5px dashed var(--c-border-2);
  border-radius: var(--radius);
  padding: 40px 24px;
  text-align: center;
  color: var(--c-ink-4);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-card p {
  margin: 0 0 4px;
  font-size: 14px;
}

.side-tabs {
  width: 220px;
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--c-border);
  background: var(--c-side);
  overflow: hidden;
}
.side-tab-bar {
  display: flex;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--c-border);
}
.side-tab-btn {
  flex: 1 1 50%;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--c-ink-4);
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.1s, border-color 0.1s;
}
.side-tab-btn.active {
  color: var(--c-ink);
  border-bottom-color: var(--accent);
}
.side-tab-btn:hover:not(.active) {
  color: var(--c-ink-2);
}
.side-tabs :deep(.squad-panel) {
  border-left: none;
  width: 100%;
  flex: 1 1 auto;
}
.side-tabs :deep(.whisper-panel) {
  border-left: none;
  width: 100%;
  flex: 1 1 auto;
}
</style>
