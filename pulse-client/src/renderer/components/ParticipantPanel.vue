<template>
  <div v-if="roomStore.currentRoomName" class="squad-panel">
    <div class="squad-head">Participants</div>
    <div class="squad-list">
      <div
        v-for="p in roomStore.participants"
        :key="p.connectionId"
        class="squad-member"
        :class="{
          speaking: activeSpeakers.includes(p.userId),
          'ps-active': p.userId === roomStore.prioritySpeakerId,
        }"
      >
        <div class="sq-av-wrap">
          <span
            class="sq-av"
            :style="{ background: avatarColor(p.displayName) }"
          >
            {{ initials(p.displayName) }}
          </span>
          <span
            v-if="activeSpeakers.includes(p.userId)"
            class="sq-speaking-ring"
          />
          <span
            v-else-if="p.isDeafened"
            class="sq-deafen-badge"
            title="Deafened"
          >
            <svg
              viewBox="0 0 12 12"
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 7V5a4 4 0 0 1 8 0v2" />
              <path d="M1 7h2v3H1z" />
              <path d="M9 7h2v3H9z" />
              <line x1="2" y1="2" x2="10" y2="10" />
            </svg>
          </span>
          <span v-else-if="p.isMuted" class="sq-mute-badge" title="Muted">
            <svg
              viewBox="0 0 12 12"
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </span>
        </div>
        <div class="sq-info">
          <div class="sq-name-row">
            <span class="sq-name">{{ p.displayName }}</span>
            <span
              v-if="p.userId === roomStore.prioritySpeakerId"
              class="ps-badge"
              title="Priority Speaker"
            >
              ★
            </span>
          </div>
          <span
            class="sq-status"
            :class="{
              'sq-status--muted': p.isMuted && !p.isDeafened,
              'sq-status--deafened': p.isDeafened,
              'sq-status--speaking': activeSpeakers.includes(p.userId),
            }"
          >
            {{
              activeSpeakers.includes(p.userId)
                ? "🎙 speaking"
                : p.isDeafened
                  ? "deafened"
                  : p.isMuted
                    ? "muted"
                    : "in room"
            }}
          </span>
        </div>
        <button
          v-if="whisperStore.isAdmin"
          class="ps-btn"
          :class="{
            'ps-btn--active': p.userId === roomStore.prioritySpeakerId,
          }"
          :title="
            p.userId === roomStore.prioritySpeakerId
              ? 'Remove priority speaker'
              : 'Assign priority speaker'
          "
          @click="emit('toggle-priority-speaker', p.userId)"
        >
          ★
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoomStore } from "../stores/room";
import { useWhisperStore } from "../stores/whisper";

const props = defineProps<{
  activeSpeakers: string[];
}>();

const emit = defineEmits<{
  "toggle-priority-speaker": [userId: string];
}>();

const roomStore = useRoomStore();
const whisperStore = useWhisperStore();

void props;

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
</script>

<style scoped>
.squad-panel {
  width: 320px;
  flex: 0 0 320px;
  border-left: 1px solid var(--c-border);
  background: var(--c-side);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.squad-head {
  padding: 16px 14px 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--c-ink-4);
  border-bottom: 1px solid var(--c-border);
  flex: 0 0 auto;
}
.squad-list {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 10px;
  scrollbar-width: thin;
  scrollbar-color: var(--c-border-2) transparent;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.squad-member {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 6px;
  border-radius: var(--radius-sm);
  cursor: default;
}
.squad-member.speaking {
  background: var(--voice-soft);
}
.sq-av-wrap {
  position: relative;
  flex: 0 0 auto;
}
.sq-av {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sq-speaking-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid var(--voice);
  animation: ring-pulse 1.2s ease-in-out infinite;
}
@keyframes ring-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.08);
  }
}
.sq-info {
  min-width: 0;
  flex: 1 1 auto;
}
.sq-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sq-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sq-status {
  display: block;
  font-size: 11px;
  color: var(--c-ink-4);
}
.sq-status--speaking {
  color: var(--voice);
}
.sq-status--muted {
  color: var(--live);
}
.sq-status--deafened {
  color: var(--warn);
}
.sq-mute-badge,
.sq-deafen-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--c-bg);
  color: #fff;
}
.sq-mute-badge {
  background: var(--live);
}
.sq-deafen-badge {
  background: var(--warn);
  color: #1a1b1e;
}
.ps-badge {
  font-size: 11px;
  color: var(--accent);
  line-height: 1;
  flex: 0 0 auto;
}
.squad-member.ps-active {
  background: rgba(var(--accent-rgb, 99, 102, 241), 0.08);
}
.ps-btn {
  margin-left: auto;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-ink-5);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.1s,
    background 0.1s;
  padding: 0;
}
.ps-btn:hover {
  color: var(--accent);
  background: var(--c-side-2);
}
.ps-btn--active {
  color: var(--accent);
  border-color: var(--accent);
}
</style>
