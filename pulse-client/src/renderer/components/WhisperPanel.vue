<template>
  <div class="whisper-panel">
    <div class="whisper-head">Whisper</div>

    <!-- Admin: create group form -->
    <div v-if="authStore.isAdminOfActiveServer" class="wc-create">
      <input v-model="createName" type="text" placeholder="Group name" />
      <select v-model="createVisibility">
        <option value="hidden">Hidden</option>
        <option value="existence">Exists</option>
        <option value="full">Public</option>
      </select>
      <button class="wc-create-btn" @click="handleCreate">Create</button>
      <div v-if="createError" class="wc-create-err">{{ createError }}</div>
    </div>

    <!-- Empty state -->
    <div v-if="whisperStore.groups.length === 0" class="whisper-empty">
      No whisper groups.
    </div>

    <!-- Group list -->
    <div class="whisper-list">
      <div
        v-for="group in whisperStore.groups"
        :key="group.groupId"
        class="whisper-card"
        :class="{
          'is-member': group.isMember,
          'drag-over': dragOverGroup === group.groupId,
        }"
        @dragover.prevent="authStore.isAdminOfActiveServer && (dragOverGroup = group.groupId)"
        @dragleave="dragOverGroup = null"
        @drop.prevent="authStore.isAdminOfActiveServer && onDrop($event, group.groupId)"
      >
        <!-- Card header -->
        <div class="wc-head">
          <span class="wc-name">{{ group.name }}</span>
          <span
            class="wc-vis-badge"
            :class="{
              'wc-vis--hidden': group.visibility === 'hidden',
              'wc-vis--existence': group.visibility === 'existence',
              'wc-vis--full': group.visibility === 'full',
            }"
          >
            {{
              group.visibility === "hidden"
                ? "HIDDEN"
                : group.visibility === "existence"
                  ? "EXISTS"
                  : "PUBLIC"
            }}
          </span>
          <!-- Admin controls -->
          <div v-if="authStore.isAdminOfActiveServer" class="wc-admin-btns">
            <template v-if="dissolvePending === group.groupId">
              <span class="wc-dissolve-confirm-label">Sure?</span>
              <button
                class="wc-dissolve-btn wc-dissolve-btn--confirm"
                @click="confirmDissolve(group.groupId)"
              >
                Yes
              </button>
              <button class="wc-dissolve-btn" @click="dissolvePending = null">
                No
              </button>
            </template>
            <button
              v-else
              class="wc-dissolve-btn"
              @click="dissolvePending = group.groupId"
            >
              Dissolve
            </button>
          </div>
        </div>

        <!-- Member list (full or member view) -->
        <div
          v-if="group.memberUserIds && group.memberUserIds.length > 0"
          class="wc-members"
        >
          <div
            v-for="userId in group.memberUserIds"
            :key="userId"
            class="wc-member"
            :class="{ speaking: isSpeaking(group.groupId, userId) }"
          >
            <div class="wc-av-wrap">
              <span
                class="wc-av"
                :style="{ background: avatarColor(displayName(userId)) }"
              >
                {{ initials(displayName(userId)) }}
              </span>
              <span
                v-if="isSpeaking(group.groupId, userId)"
                class="wc-speaking-ring"
              />
            </div>
            <span class="wc-member-name">{{ displayName(userId) }}</span>
            <button
              v-if="authStore.isAdminOfActiveServer"
              class="wc-remove-btn"
              title="Remove member"
              @click="handleRemoveMember(group.groupId, userId)"
            >
              ×
            </button>
          </div>
        </div>

        <!-- Existence-visibility non-member count -->
        <div
          v-else-if="
            group.visibility === 'existence' && group.memberCount !== undefined
          "
          class="wc-member-count"
        >
          {{ group.memberCount }} member(s)
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useWhisperStore } from "../stores/whisper";
import { useRoomStore } from "../stores/room";
import { useAuthStore } from "../stores/auth";
import { useServerStore } from "../stores/server";
import { usePresence } from "../composables/usePresence";
import { useLiveKit } from "../composables/useLiveKit";
import { usePtt } from "../composables/usePtt";
import { useUsersStore } from "../stores/users";
import { avatarColor, initials } from "../utils/avatar";

const whisperStore = useWhisperStore();
const roomStore = useRoomStore();
const authStore = useAuthStore();
const serverStore = useServerStore();
const {
  createWhisperGroup,
  addWhisperMember,
  removeWhisperMember,
  dissolveWhisperGroup,
  broadcastMuteChanged,
} = usePresence();
const { getWhisperRoom, setMainMicEnabled, isDeafened, isExplicitlyMuted } =
  useLiveKit();
const { isPttMode } = usePtt();
const usersStore = useUsersStore();

const createName = ref("");
const dragOverGroup = ref<string | null>(null);
const createVisibility = ref<"hidden" | "existence" | "full">("hidden");
const createError = ref("");
const dissolvePending = ref<string | null>(null);

function isSpeaking(groupId: string, userId: string): boolean {
  const lower = userId.toLowerCase();
  return (whisperStore.speakers.get(groupId) ?? []).some(
    (id) => id.toLowerCase() === lower,
  );
}

function displayName(userId: string): string {
  const inRoom = roomStore.participants.find((p) => p.userId === userId);
  if (inRoom) return inRoom.displayName;
  return usersStore.displayName(userId);
}

function handleCreate(): void {
  createError.value = "";
  if (!createName.value.trim()) {
    createError.value = "Name required";
    return;
  }
  createWhisperGroup(serverStore.activeServerId!, createName.value.trim(), createVisibility.value).catch(
    (e) => {
      createError.value = String(e);
    },
  );
  createName.value = "";
}

function onDrop(e: DragEvent, groupId: string): void {
  dragOverGroup.value = null;
  const userId = e.dataTransfer?.getData("text/plain");
  if (!userId) return;
  addWhisperMember(groupId, userId).catch((err) => {
    createError.value = String(err);
  });
}

function confirmDissolve(groupId: string): void {
  dissolvePending.value = null;
  dissolveWhisperGroup(groupId);
}

function handleRemoveMember(groupId: string, userId: string): void {
  removeWhisperMember(groupId, userId).catch((e) => {
    createError.value = String(e);
  });
}

onMounted(() => {
  window.pulseApi.onWhisperPttKeyDown(async () => {
    if (isDeafened.value || isExplicitlyMuted.value) return;
    const myGroups = whisperStore.myGroups;
    if (myGroups.length === 0) return;
    await setMainMicEnabled(false);
    await broadcastMuteChanged(true);
    for (const group of myGroups) {
      const room = getWhisperRoom(group.groupId);
      await room?.localParticipant.setMicrophoneEnabled(true, {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      });
    }
  });

  window.pulseApi.onWhisperPttKeyUp(async () => {
    const myGroups = whisperStore.myGroups;
    for (const group of myGroups) {
      await getWhisperRoom(
        group.groupId,
      )?.localParticipant.setMicrophoneEnabled(false);
    }
    const restoreMain =
      !isPttMode.value && !isExplicitlyMuted.value && !isDeafened.value;
    await setMainMicEnabled(restoreMain);
    await broadcastMuteChanged(!restoreMain);
  });
});

onUnmounted(() => {
  window.pulseApi.removeWhisperPttListeners();
});
</script>

<style scoped>
.whisper-panel {
  width: 100%;
  flex: 1 1 auto;
  border-left: 1px solid var(--c-border);
  background: var(--c-side);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.whisper-head {
  padding: 16px 14px 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--c-ink-4);
  border-bottom: 1px solid var(--c-border);
  flex: 0 0 auto;
}
.whisper-list {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 8px 10px;
  scrollbar-width: thin;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.whisper-card {
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius);
  padding: 10px;
  background: var(--c-bg);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.whisper-card.is-member {
  border-color: var(--accent);
  background: rgba(99, 102, 241, 0.05);
}
.wc-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.wc-name {
  flex: 1 1 auto;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wc-vis-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  border-radius: 20px;
  padding: 1px 6px;
  border: 1.5px solid currentColor;
  flex: 0 0 auto;
}
.wc-vis--hidden {
  color: var(--c-ink-4);
}
.wc-vis--existence {
  color: var(--warn, #f0a500);
}
.wc-vis--full {
  color: var(--voice);
}
.wc-members {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wc-member {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  transition: background 0.1s;
}
.wc-member.speaking {
  background: var(--voice-soft);
}
.wc-av-wrap {
  position: relative;
  flex: 0 0 auto;
}
.wc-av {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wc-speaking-ring {
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
.wc-member-name {
  flex: 1 1 auto;
  font-size: 11px;
  color: var(--c-ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wc-member-count {
  font-size: 11px;
  color: var(--c-ink-4);
}
.whisper-card.drag-over {
  border-color: var(--accent);
  background: rgba(99, 102, 241, 0.1);
}
.wc-create {
  padding: 8px 10px;
  border-bottom: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wc-create input,
.wc-create select {
  width: 100%;
  background: var(--c-bg);
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  color: var(--c-ink);
  font-size: 12px;
  padding: 4px 6px;
  font-family: inherit;
  box-sizing: border-box;
}
.wc-create-btn {
  align-self: flex-end;
  height: 26px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
}
.wc-create-err {
  font-size: 11px;
  color: var(--live);
}
.whisper-empty {
  padding: 24px 14px;
  text-align: center;
  font-size: 13px;
  color: var(--c-ink-4);
}
.wc-admin-btns {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.wc-dissolve-btn,
.wc-edit-btn {
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-ink-4);
  cursor: pointer;
  font-family: inherit;
}
.wc-dissolve-btn:hover {
  color: var(--live);
  border-color: var(--live);
}
.wc-dissolve-btn--confirm {
  color: var(--live);
  border-color: var(--live);
}
.wc-dissolve-confirm-label {
  font-size: 10px;
  color: var(--c-ink-4);
}
.wc-remove-btn {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--c-ink-4);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wc-remove-btn:hover {
  color: var(--live);
}
</style>
