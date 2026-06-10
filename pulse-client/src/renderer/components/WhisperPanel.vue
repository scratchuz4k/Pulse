<template>
  <div v-if="roomStore.currentRoomName" class="whisper-panel">
    <div class="whisper-head">Whisper</div>

    <!-- Admin: create group form -->
    <div v-if="whisperStore.isAdmin" class="wc-create">
      <input
        v-model="createGroupId"
        type="text"
        placeholder="group-id"
      />
      <input
        v-model="createName"
        type="text"
        placeholder="Group name"
      />
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
        :class="{ 'is-member': group.isMember }"
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
              group.visibility === 'hidden'
                ? 'HIDDEN'
                : group.visibility === 'existence'
                  ? 'EXISTS'
                  : 'PUBLIC'
            }}
          </span>
          <!-- Admin controls -->
          <div v-if="whisperStore.isAdmin" class="wc-admin-btns">
            <button class="wc-dissolve-btn" @click="handleDissolve(group.groupId)">Dissolve</button>
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
          >
            <div class="wc-av-wrap">
              <span
                class="wc-av"
                :style="{ background: avatarColor(userId) }"
              >{{ initials(userId) }}</span>
              <span
                v-if="isSpeaking(group.groupId, userId)"
                class="wc-speaking-ring"
              />
            </div>
            <span class="wc-member-name">{{ userId }}</span>
            <button
              v-if="whisperStore.isAdmin"
              class="wc-remove-btn"
              title="Remove member"
              @click="handleRemoveMember(group.groupId, userId)"
            >×</button>
          </div>
        </div>

        <!-- Existence-visibility non-member count -->
        <div
          v-else-if="group.visibility === 'existence' && group.memberCount !== undefined"
          class="wc-member-count"
        >
          {{ group.memberCount }} member(s)
        </div>

        <!-- Admin: add member input -->
        <div v-if="whisperStore.isAdmin" class="wc-add-member">
          <input
            v-model="addMemberInput[group.groupId]"
            type="text"
            placeholder="userId"
          />
          <button class="wc-add-btn" @click="handleAddMember(group.groupId)">Add</button>
        </div>

        <!-- Member controls -->
        <div v-if="group.isMember" class="wc-transmit">
          <select
            :value="transmitModes[group.groupId] ?? 'both'"
            @change="(e) => handleTransmitChange(group.groupId, (e.target as HTMLSelectElement).value)"
          >
            <option value="both">Both (always on)</option>
            <option value="ptt">PTT only</option>
            <option value="whisperOnly">Whisper only</option>
          </select>

          <!-- PTT key binding -->
          <div
            v-if="(transmitModes[group.groupId] ?? 'both') === 'ptt'"
            class="wc-ptt-row"
          >
            <span>PTT Key:</span>
            <span
              class="wc-key-display"
              :class="{ capturing: capturingFor === group.groupId }"
              @click="capturingFor = group.groupId"
            >
              {{ capturingFor === group.groupId ? 'Press a key…' : (pttBindings[group.groupId] ?? 'Click to bind') }}
            </span>
            <button
              v-if="pttBindings[group.groupId]"
              class="wc-dissolve-btn"
              @click="clearPttKey(group.groupId)"
            >Clear</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { codeToAccelerator } from '../composables/usePtt'
import { useWhisperStore } from '../stores/whisper'
import { useRoomStore } from '../stores/room'
import { usePresence } from '../composables/usePresence'
import { useLiveKit } from '../composables/useLiveKit'

const whisperStore = useWhisperStore()
const roomStore = useRoomStore()
const { createWhisperGroup, addWhisperMember, removeWhisperMember, dissolveWhisperGroup } = usePresence()
const { getWhisperRoom, setMainMicEnabled } = useLiveKit()

const createGroupId = ref('')
const createName = ref('')
const createVisibility = ref<'hidden' | 'existence' | 'full'>('hidden')
const createError = ref('')
const capturingFor = ref<string | null>(null)
const transmitModes = ref<Record<string, string>>({})
const pttBindings = ref<Record<string, string | null>>({})
const addMemberInput = ref<Record<string, string>>({})

const AV_COLORS = [
  '#e8722e', '#23c97d', '#5750d6', '#d6457f', '#3a86c8',
  '#7a52c7', '#c2553f', '#2aa39a', '#b0843a', '#5a6acf',
]
function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase()
}

function isSpeaking(groupId: string, userId: string): boolean {
  return (whisperStore.speakers.get(groupId) ?? []).includes(userId)
}

function handleCreate(): void {
  createError.value = ''
  if (!/^[a-zA-Z0-9-]+$/.test(createGroupId.value)) {
    createError.value = 'ID: alphanumeric and hyphens only'
    return
  }
  if (!createName.value.trim()) {
    createError.value = 'Name required'
    return
  }
  createWhisperGroup(createGroupId.value.trim(), createName.value.trim(), createVisibility.value)
    .catch(e => { createError.value = String(e) })
  createGroupId.value = ''
  createName.value = ''
}

function handleDissolve(groupId: string): void {
  if (!confirm(`Dissolve group "${groupId}"?`)) return
  dissolveWhisperGroup(groupId)
}

function handleAddMember(groupId: string): void {
  const userId = (addMemberInput.value[groupId] ?? '').trim()
  if (!userId) return
  addWhisperMember(groupId, userId).catch(e => { createError.value = String(e) })
  addMemberInput.value[groupId] = ''
}

function handleRemoveMember(groupId: string, userId: string): void {
  removeWhisperMember(groupId, userId).catch(e => { createError.value = String(e) })
}

async function handleTransmitChange(groupId: string, mode: string): Promise<void> {
  transmitModes.value[groupId] = mode
  window.pulseApi.setWhisperTransmitMode(groupId, mode)
  const whisperRoom = getWhisperRoom(groupId)
  if (mode === 'whisperOnly') {
    await setMainMicEnabled(false)
    await whisperRoom?.localParticipant?.setMicrophoneEnabled(true)
  } else if (mode === 'both') {
    await setMainMicEnabled(true)
    await whisperRoom?.localParticipant?.setMicrophoneEnabled(true)
  } else if (mode === 'ptt') {
    await setMainMicEnabled(true)
    await whisperRoom?.localParticipant?.setMicrophoneEnabled(false)
  }
}

function handleKeyCapture(groupId: string, code: string): void {
  const accelerator = codeToAccelerator(code)
  if (!accelerator) return
  window.pulseApi.setWhisperPttKey(groupId, accelerator).then(ok => {
    if (ok) pttBindings.value[groupId] = accelerator
    else createError.value = 'Key not bindable (unmappable key)'
  })
  capturingFor.value = null
}

function clearPttKey(groupId: string): void {
  window.pulseApi.setWhisperPttKey(groupId, null)
  pttBindings.value[groupId] = null
}

function onCaptureKeydown(e: KeyboardEvent): void {
  if (!capturingFor.value || e.repeat) return
  e.preventDefault()
  handleKeyCapture(capturingFor.value, e.code)
}

onMounted(async () => {
  for (const group of whisperStore.groups) {
    window.pulseApi.getWhisperTransmitMode(group.groupId).then(m => {
      transmitModes.value[group.groupId] = m
    })
    window.pulseApi.getWhisperPttKey(group.groupId).then(k => {
      pttBindings.value[group.groupId] = k
    })
  }
  window.addEventListener('keydown', onCaptureKeydown)

  window.pulseApi.onWhisperPttKeyDown(async (groupId: string) => {
    const whisperRoom = getWhisperRoom(groupId)
    const mode = transmitModes.value[groupId] ?? 'both'
    if (mode !== 'ptt') return
    await whisperRoom?.localParticipant?.setMicrophoneEnabled(true)
    const suppressMain = await window.pulseApi.getWhisperSuppressMain(groupId)
    if (suppressMain) await setMainMicEnabled(false)
  })

  window.pulseApi.onWhisperPttKeyUp(async (groupId: string) => {
    const whisperRoom = getWhisperRoom(groupId)
    const mode = transmitModes.value[groupId] ?? 'both'
    if (mode !== 'ptt') return
    await whisperRoom?.localParticipant?.setMicrophoneEnabled(false)
    await setMainMicEnabled(true)
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onCaptureKeydown)
  window.pulseApi.removeWhisperPttListeners()
})
</script>

<style scoped>
.whisper-panel {
  width: 220px;
  flex: 0 0 220px;
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
.wc-vis--hidden { color: var(--c-ink-4); }
.wc-vis--existence { color: var(--warn, #f0a500); }
.wc-vis--full { color: var(--voice); }
.wc-members {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.wc-member {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
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
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.08); }
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
.wc-transmit {
  margin-top: 4px;
}
.wc-transmit select {
  width: 100%;
  background: var(--c-bg);
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  color: var(--c-ink);
  font-size: 12px;
  padding: 3px 6px;
  font-family: inherit;
}
.wc-ptt-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--c-ink-4);
}
.wc-key-display {
  flex: 1 1 auto;
  font-size: 11px;
  font-family: monospace;
  background: var(--c-side-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  cursor: pointer;
  color: var(--c-ink-4);
}
.wc-key-display.capturing {
  border-color: var(--accent);
  color: var(--accent);
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
.wc-dissolve-btn:hover { color: var(--live); border-color: var(--live); }
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
.wc-remove-btn:hover { color: var(--live); }
.wc-add-member {
  display: flex;
  gap: 4px;
  margin-top: 2px;
}
.wc-add-member input {
  flex: 1 1 auto;
  background: var(--c-bg);
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  color: var(--c-ink);
  font-size: 11px;
  padding: 3px 6px;
  font-family: inherit;
}
.wc-add-btn {
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-ink-4);
  cursor: pointer;
  font-family: inherit;
}
.wc-add-btn:hover { color: var(--accent); border-color: var(--accent); }
</style>
