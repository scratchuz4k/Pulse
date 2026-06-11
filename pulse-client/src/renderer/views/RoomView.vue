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
            <!-- Active room -->
            <div v-if="roomStore.currentRoomName" class="ch-group">
              <div class="ch-group-header" @click="activeExpanded = !activeExpanded">
                <svg class="ch-chevron" :class="{ expanded: activeExpanded }" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5l3 3 3-3"/></svg>
                <span class="ch-group-name">{{ roomStore.currentRoomName }}</span>
                <span class="you-here-chip">here</span>
                <span class="ch-count">{{ roomStore.participants.length }}/12</span>
              </div>
              <div v-if="activeExpanded" class="ch-members">
                <div
                  v-for="p in roomStore.participants"
                  :key="p.connectionId"
                  class="ch-member"
                  :class="{ speaking: activeSpeakers.includes(p.userId), 'ps-active': p.userId === roomStore.prioritySpeakerId }"
                  :draggable="authStore.isAdmin"
                  @dragstart="authStore.isAdmin && onParticipantDragStart($event, p.userId)"
                >
                  <div class="ch-av-wrap">
                    <span class="ch-av" :style="{ background: avatarColor(p.displayName) }">{{ initials(p.displayName) }}</span>
                    <span v-if="activeSpeakers.includes(p.userId)" class="ch-speaking-ring" />
                  </div>
                  <span class="ch-name">{{ p.displayName }}</span>
                  <span v-if="p.userId === roomStore.prioritySpeakerId" class="ch-ps-badge" title="Priority Speaker">★</span>
                  <button
                    v-if="authStore.isAdmin"
                    class="ch-ps-btn"
                    :class="{ 'ch-ps-btn--active': p.userId === roomStore.prioritySpeakerId }"
                    :title="p.userId === roomStore.prioritySpeakerId ? 'Remove priority speaker' : 'Assign priority speaker'"
                    @click.stop="togglePrioritySpeaker(p.userId)"
                  >★</button>
                  <svg class="ch-drag-icon" viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
                    <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                    <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                    <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Other rooms -->
            <template v-for="room in roomStore.rooms" :key="room.id">
              <div
                v-if="room.name !== roomStore.currentRoomName && room.participants.length > 0"
                class="ch-group"
              >
                <div class="ch-group-header" @click="toggleRoom(room.name)">
                  <svg class="ch-chevron" :class="{ expanded: expandedRooms.has(room.name) }" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5l3 3 3-3"/></svg>
                  <span class="ch-group-name">{{ room.name }}</span>
                  <span class="ch-count">{{ room.participants.length }}</span>
                  <button class="ch-join-btn" :disabled="joining" @click.stop="handleJoinRoom(room.name)">Join ▸</button>
                </div>
                <div v-if="expandedRooms.has(room.name)" class="ch-members">
                  <div v-for="p in room.participants" :key="p.userId" class="ch-member">
                    <span class="ch-av" :style="{ background: avatarColor(p.displayName) }">{{ initials(p.displayName) }}</span>
                    <span class="ch-name">{{ p.displayName }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Join form -->
            <div v-if="showJoinForm || !roomStore.currentRoomName" class="join-card">
              <div class="join-card-label">Join or create a room</div>
              <div class="join-row">
                <input v-model="roomNameInput" class="room-input" type="text" placeholder="Room name…" @keydown.enter="handleJoin" />
                <button class="jump-btn" :disabled="joining || !roomNameInput.trim()" @click="handleJoin">{{ joining ? "…" : "Jump in ▸" }}</button>
              </div>
              <div v-if="joinError" class="join-error">{{ joinError }}</div>
            </div>

            <div v-if="roomStore.rooms.length === 0 && !roomStore.currentRoomName" class="empty-card">
              <p>No voice rooms yet.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRoomStore } from "../stores/room";
import { useAuthStore } from "../stores/auth";
import { useAuth } from "../composables/useAuth";
import { usePresence } from "../composables/usePresence";
import { useLiveKit } from "../composables/useLiveKit";
import { usePtt } from "../composables/usePtt";
import { avatarColor, initials } from "../utils/avatar";
import { SERVER_URL } from "../utils/config";

const roomStore = useRoomStore();
const authStore = useAuthStore();
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
const { isPttMode } = usePtt();

const roomNameInput = ref("");
const joining = ref(false);
const activeExpanded = ref(true);
const expandedRooms = ref(new Set<string>());

function toggleRoom(name: string): void {
  if (expandedRooms.value.has(name)) expandedRooms.value.delete(name);
  else expandedRooms.value.add(name);
}

const joinError = ref("");
const showJoinForm = ref(false);


function onParticipantDragStart(e: DragEvent, userId: string): void {
  e.dataTransfer?.setData('text/plain', userId)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
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

onMounted(() => {
  window.pulseApi.onPttKeyDown(() => {
    if (isPttMode.value) setMicEnabled(true);
  });
  window.pulseApi.onPttKeyUp(() => {
    if (isPttMode.value) setMicEnabled(false);
  });
});

onUnmounted(() => {
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
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--c-border-2) transparent;
}

.you-here-chip {
  font-size: 10px;
  font-weight: 700;
  color: var(--voice);
  border: 1.5px solid var(--voice);
  border-radius: 20px;
  padding: 1px 6px;
  flex: 0 0 auto;
}

/* Channel group (collapsable room row) */
.ch-group {
  display: flex;
  flex-direction: column;
}
.ch-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}
.ch-group-header:hover {
  background: var(--c-side-2);
}
.ch-chevron {
  flex: 0 0 auto;
  color: var(--c-ink-4);
  transition: transform 0.15s;
  transform: rotate(-90deg);
}
.ch-chevron.expanded {
  transform: rotate(0deg);
}
.ch-group-name {
  flex: 1 1 auto;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ch-count {
  font-size: 11px;
  color: var(--c-ink-4);
  flex: 0 0 auto;
}
.ch-join-btn {
  flex: 0 0 auto;
  height: 22px;
  padding: 0 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s;
}
.ch-group-header:hover .ch-join-btn {
  opacity: 1;
}
.ch-join-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.ch-members {
  display: flex;
  flex-direction: column;
  padding: 2px 0 2px 22px;
}
.ch-member {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 3px 8px 3px 4px;
  border-radius: var(--radius-sm);
  cursor: grab;
  user-select: none;
  transition: background 0.1s;
}
.ch-member:hover {
  background: var(--c-side-2);
}
.ch-member:active { cursor: grabbing; }
.ch-member.speaking { background: var(--voice-soft); }
.ch-av-wrap {
  position: relative;
  flex: 0 0 auto;
}
.ch-av {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.ch-speaking-ring {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 2px solid var(--voice);
  animation: ring-pulse 1.2s ease-in-out infinite;
}
@keyframes ring-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.08); }
}
.ch-name {
  flex: 1 1 auto;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ch-drag-icon {
  flex: 0 0 auto;
  color: var(--c-ink-5);
  opacity: 0;
  transition: opacity 0.1s;
}
.ch-member:hover .ch-drag-icon { opacity: 1; }
.ch-member.ps-active { background: rgba(240, 167, 0, 0.08); }
.ch-ps-badge {
  flex: 0 0 auto;
  font-size: 10px;
  color: var(--warn, #f0a500);
}
.ch-ps-btn {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  color: var(--c-ink-5);
  cursor: pointer;
  font-size: 11px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.1s, color 0.1s;
}
.ch-member:hover .ch-ps-btn { opacity: 1; }
.ch-ps-btn--active { color: var(--warn, #f0a500) !important; opacity: 1 !important; }
.ch-ps-btn:hover { color: var(--warn, #f0a500); }

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

</style>
