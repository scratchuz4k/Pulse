<template>
  <div class="app-shell">

    <!-- ── Nav rail (3 tabs) ── -->
    <nav class="nav-rail">
      <div class="rail-logo">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </div>
      <div class="rail-sep" />

      <button class="rail-item" :class="{ active: activeNav === 'hub' }" title="Hub" @click="activeNav = 'hub'">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <span class="rail-label">Hub</span>
      </button>

      <button class="rail-item" :class="{ active: activeNav === 'text' }" title="Text" @click="activeNav = 'text'">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>
        </svg>
        <span class="rail-label">Text</span>
      </button>

      <button class="rail-item" :class="{ active: activeNav === 'voice' }" title="Voice" @click="activeNav = 'voice'">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
          <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3"/>
        </svg>
        <span class="rail-label">Voice</span>
      </button>

      <div class="rail-spacer" />

      <button class="rail-item rail-sm" title="Settings" @click="activeNav = 'settings'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>
        </svg>
      </button>
    </nav>

    <!-- ── Page content ── -->
    <div class="page-body" :class="{ 'has-voice-bar': isConnected }">

      <!-- HUB tab -->
      <div v-if="activeNav === 'hub'" class="hub-view">
        <div class="feed-col">
          <div class="feed-topbar">
            <span class="feed-title">Right now</span>
            <span class="sorted-chip">▾ sorted by heat</span>
          </div>
          <div class="feed-scroll">
            <div v-if="roomStore.currentRoomName" class="room-card active-card">
              <div class="card-row card-head">
                <span class="type-chip voice-chip">🎙 VOICE</span>
                <span class="you-here-chip">you're here</span>
                <span class="card-name">{{ roomStore.currentRoomName }}</span>
                <span class="flames">🔥🔥🔥</span>
              </div>
              <div class="card-row card-people">
                <div class="av-stack">
                  <span v-for="p in roomStore.participants.slice(0, 5)" :key="p.connectionId" class="av-sm" :style="{ background: avatarColor(p.displayName) }">{{ initials(p.displayName) }}</span>
                  <span v-if="roomStore.participants.length > 5" class="av-sm av-more">+{{ roomStore.participants.length - 5 }}</span>
                </div>
                <span class="card-meta">{{ roomStore.participants.length }} in room</span>
                <span v-if="activeSpeakers.length" class="card-speaking">· {{ speakerName }} speaking</span>
              </div>
              <div class="heat-bar">
                <div class="heat-fill" :style="{ width: Math.min(100, roomStore.participants.length * 12) + '%' }" />
              </div>
            </div>

            <div v-else class="empty-card">
              <p>No active voice rooms.</p>
              <p class="empty-hint">Go to Voice to create one.</p>
            </div>
          </div>
        </div>

        <div class="squad-panel">
          <div class="squad-head">In voice</div>
          <div v-if="roomStore.currentRoomName" class="squad-list">
            <div v-for="p in roomStore.participants" :key="p.connectionId" class="squad-member" :class="{ speaking: activeSpeakers.includes(p.userId) }">
              <div class="sq-av-wrap">
                <span class="sq-av" :style="{ background: avatarColor(p.displayName) }">{{ initials(p.displayName) }}</span>
                <span v-if="p.isDeafened" class="sq-deafen-badge" title="Deafened">
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 7V5a4 4 0 0 1 8 0v2"/><path d="M1 7h2v3H1z"/><path d="M9 7h2v3H9z"/><line x1="2" y1="2" x2="10" y2="10"/>
                  </svg>
                </span>
                <span v-else-if="p.isMuted" class="sq-mute-badge" title="Muted">
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
                  </svg>
                </span>
              </div>
              <div class="sq-info">
                <span class="sq-name">{{ p.displayName }}</span>
                <span class="sq-status" :class="{ 'sq-status--muted': p.isMuted && !p.isDeafened, 'sq-status--deafened': p.isDeafened, 'sq-status--speaking': activeSpeakers.includes(p.userId) }">
                  {{ activeSpeakers.includes(p.userId) ? '🎙 speaking' : p.isDeafened ? 'deafened' : p.isMuted ? 'muted' : 'listening' }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="squad-empty">Nobody in voice yet</div>
        </div>
      </div>

      <!-- TEXT tab placeholder -->
      <div v-else-if="activeNav === 'text'" class="placeholder-view">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>
        </svg>
        <p>Text channels — coming in Phase 5</p>
      </div>

      <!-- VOICE tab -->
      <div v-else-if="activeNav === 'voice'" class="voice-view">
        <div class="feed-col">
          <div class="feed-topbar">
            <span class="feed-title">Voice Channels</span>
            <button class="create-btn" @click="showJoinForm = !showJoinForm">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
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
                  <span v-for="p in roomStore.participants.slice(0, 5)" :key="p.connectionId" class="av-sm" :style="{ background: avatarColor(p.displayName) }">{{ initials(p.displayName) }}</span>
                  <span v-if="roomStore.participants.length > 5" class="av-sm av-more">+{{ roomStore.participants.length - 5 }}</span>
                </div>
                <span class="card-meta">{{ roomStore.participants.length }} / 12</span>
                <span v-if="activeSpeakers.length" class="card-speaking">· {{ speakerName }} speaking</span>
              </div>
              <div class="heat-bar">
                <div class="heat-fill" :style="{ width: Math.min(100, roomStore.participants.length * 12) + '%' }" />
              </div>
            </div>

            <!-- Join form card -->
            <div v-if="showJoinForm || !roomStore.currentRoomName" class="join-card">
              <div class="join-card-label">Join or create a room</div>
              <div class="join-row">
                <input
                  v-model="roomNameInput"
                  class="room-input"
                  type="text"
                  placeholder="Room name…"
                  @keydown.enter="handleJoin"
                />
                <button class="jump-btn" :disabled="joining || !roomNameInput.trim()" @click="handleJoin">
                  {{ joining ? '…' : 'Jump in ▸' }}
                </button>
              </div>
              <div v-if="joinError" class="join-error">{{ joinError }}</div>
            </div>

            <!-- Other rooms the user is NOT in -->
            <template v-for="room in roomStore.rooms" :key="room.id">
              <div
                v-if="room.name !== roomStore.currentRoomName"
                class="room-card joinable"
                @click="handleJoinRoom(room.name)"
              >
                <div class="card-row card-head">
                  <span class="type-chip voice-chip">🎙 VOICE</span>
                  <span class="card-name">{{ room.name }}</span>
                </div>
                <div class="card-row card-people">
                  <div class="av-stack">
                    <span v-for="p in room.participants.slice(0, 5)" :key="p.userId" class="av-sm" :style="{ background: avatarColor(p.displayName) }">{{ initials(p.displayName) }}</span>
                    <span v-if="room.participants.length > 5" class="av-sm av-more">+{{ room.participants.length - 5 }}</span>
                  </div>
                  <span class="card-meta">{{ room.participants.length }} in room</span>
                </div>
                <div class="card-row">
                  <button class="jump-btn" :disabled="joining" @click.stop="handleJoinRoom(room.name)">Join ▸</button>
                </div>
              </div>
            </template>

            <div v-if="roomStore.rooms.length === 0 && !roomStore.currentRoomName && !showJoinForm" class="empty-card">
              <p>No voice rooms yet.</p>
              <button class="jump-btn" style="margin-top: 12px" @click="showJoinForm = true">Create one ▸</button>
            </div>

          </div>
        </div>

        <!-- Right: participant panel -->
        <div class="squad-panel">
          <div class="squad-head">Participants</div>
          <div v-if="roomStore.currentRoomName" class="squad-list">
            <div v-for="p in roomStore.participants" :key="p.connectionId" class="squad-member" :class="{ speaking: activeSpeakers.includes(p.userId) }">
              <div class="sq-av-wrap">
                <span class="sq-av" :style="{ background: avatarColor(p.displayName) }">{{ initials(p.displayName) }}</span>
                <!-- ROOM-02: sq-speaking-ring visible when p.userId matches LiveKit speaker identity -->
                <span v-if="activeSpeakers.includes(p.userId)" class="sq-speaking-ring" />
                <span v-else-if="p.isDeafened" class="sq-deafen-badge" title="Deafened">
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 7V5a4 4 0 0 1 8 0v2"/><path d="M1 7h2v3H1z"/><path d="M9 7h2v3H9z"/><line x1="2" y1="2" x2="10" y2="10"/>
                  </svg>
                </span>
                <span v-else-if="p.isMuted" class="sq-mute-badge" title="Muted">
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
                  </svg>
                </span>
              </div>
              <div class="sq-info">
                <span class="sq-name">{{ p.displayName }}</span>
                <span class="sq-status" :class="{ 'sq-status--muted': p.isMuted && !p.isDeafened, 'sq-status--deafened': p.isDeafened, 'sq-status--speaking': activeSpeakers.includes(p.userId) }">
                  {{ activeSpeakers.includes(p.userId) ? '🎙 speaking' : p.isDeafened ? 'deafened' : p.isMuted ? 'muted' : 'in room' }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="squad-empty">No one in voice yet</div>
        </div>
      </div>

      <!-- SETTINGS tab -->
      <div v-else-if="activeNav === 'settings'" class="settings-view">
        <div class="settings-head">
          <h2>Settings</h2>
        </div>
        <div v-if="inputDevices.length" class="settings-section">
          <div class="settings-group-label">Audio</div>
          <label class="setting-label">
            Microphone
            <select class="setting-select" :value="activeInputId" @change="switchInput(($event.target as HTMLSelectElement).value)">
              <option v-for="d in inputDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label }}{{ d.deviceId === activeInputId ? ' ✓' : '' }}</option>
            </select>
          </label>
          <label class="setting-label">
            Speaker
            <select class="setting-select" :value="activeOutputId" @change="switchOutput(($event.target as HTMLSelectElement).value)">
              <option v-for="d in outputDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label }}{{ d.deviceId === activeOutputId ? ' ✓' : '' }}</option>
            </select>
          </label>
        </div>
        <div v-else class="settings-hint">Join a room first to configure audio devices.</div>
        <div class="settings-section" style="margin-top: 24px;">
          <div class="settings-group-label">Voice Mode</div>
          <label class="setting-label">
            Input Mode
            <div class="ptt-toggle">
              <button :class="['ptt-opt', !isPttMode && 'active']" @click="isPttMode = false">Voice Activity</button>
              <button :class="['ptt-opt', isPttMode && 'active']" @click="isPttMode = true">Push-to-Talk</button>
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
                @keydown="handleCaptureKeydown"
              >{{ isCapturing ? 'Press a key…' : (pttBinding ? pttBinding.label : 'Click to bind') }}</kbd>
            </div>
          </label>
        </div>
      </div>

    </div><!-- /page-body -->

    <!-- ── Bottom voice bar (when connected) ── -->
    <div v-if="isConnected" class="voice-bar">
      <div class="vb-left">
        <div class="vb-bars">
          <span /><span /><span /><span />
        </div>
        <div class="vb-info">
          <span class="vb-room-name">{{ roomStore.currentRoomName }} <span class="vb-count">{{ roomStore.participants.length }}/12</span></span>
          <span class="vb-speaking">{{ activeSpeakers.length ? speakerName + ' speaking' : 'Voice connected' }}</span>
        </div>
      </div>

      <div class="vb-avatars">
        <span v-for="p in roomStore.participants.slice(0, 4)" :key="p.connectionId" class="vb-av" :class="{ speaking: activeSpeakers.includes(p.userId), muted: p.isMuted }" :style="{ background: avatarColor(p.displayName) }" :title="p.displayName">{{ initials(p.displayName) }}</span>
        <span v-if="roomStore.participants.length > 4" class="vb-av vb-av-more">+{{ roomStore.participants.length - 4 }}</span>
      </div>

      <div class="vb-controls">
        <button class="vb-btn" :class="{ muted: !isMicEnabled || isDeafened }" :disabled="isDeafened" :title="isDeafened ? 'Muted (deafened)' : isMicEnabled ? 'Mute' : 'Unmute'" @click="handleToggleMic">
          <svg v-if="isMicEnabled" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 2l20 20M9 9v2a3 3 0 0 0 5 2M15 9.3V5a3 3 0 0 0-5.7-1.3M5 10a7 7 0 0 0 11 5.5M12 19v3"/>
          </svg>
        </button>

        <button class="vb-btn" :class="{ muted: isDeafened }" :title="isDeafened ? 'Undeafen' : 'Deafen'" @click="handleToggleDeafen">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="13" width="5" height="7" rx="2"/><rect x="17" y="13" width="5" height="7" rx="2"/>
            <path d="M22 18v1a3 3 0 0 1-3 3h-5"/>
          </svg>
        </button>

        <button class="vb-btn" title="Settings" @click="activeNav = 'settings'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>
          </svg>
        </button>

        <button class="vb-btn vb-leave" title="Leave room" @click="handleLeave">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>

      <!-- User identity -->
      <div class="vb-user">
        <span class="vb-user-av" :style="{ background: avatarColor(authStore.displayName || 'You') }">{{ initials(authStore.displayName || 'You') }}</span>
        <div class="vb-user-info">
          <span class="vb-user-name">{{ authStore.displayName }}</span>
          <button class="vb-logout" @click="handleLogout">log out</button>
        </div>
      </div>
    </div>

    <!-- User row when NOT in voice (no voice bar) -->
    <div v-else class="user-foot-simple">
      <span class="vb-user-av" :style="{ background: avatarColor(authStore.displayName || 'You') }">{{ initials(authStore.displayName || 'You') }}</span>
      <div class="vb-user-info">
        <span class="vb-user-name">{{ authStore.displayName }}</span>
        <span class="vb-status-text">Online</span>
      </div>
      <button class="logout-btn" title="Log out" @click="handleLogout">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRoomStore } from '../stores/room'
import { useAuth } from '../composables/useAuth'
import { usePresence } from '../composables/usePresence'
import { useLiveKit } from '../composables/useLiveKit'
import { usePtt } from '../composables/usePtt'

const authStore = useAuthStore()
const roomStore = useRoomStore()
const { logout, fetchLiveKitToken } = useAuth()
const { connect, joinRoom, leaveRoom, disconnect, connectionState, broadcastMuteChanged, broadcastDeafenChanged, createRoom } = usePresence()
const {
  connect: livekitConnect, disconnect: livekitDisconnect,
  toggleMic, switchInput, switchOutput,
  isConnected, isMicEnabled, activeSpeakers,
  inputDevices, outputDevices, activeInputId, activeOutputId,
} = useLiveKit()
const { isPttMode, pttBinding, isCapturing, startCapture, handleCaptureKeydown } = usePtt()

const activeNav = ref<'hub' | 'text' | 'voice' | 'settings'>('voice')
const roomNameInput = ref('')
const joining = ref(false)
const joinError = ref('')
const createRoomError = ref('')
const showJoinForm = ref(false)
const isDeafened = ref(false)
const prevMicEnabled = ref(false)

async function setMicEnabled(v: boolean): Promise<void> {
  if (isDeafened.value) return  // mic locked while deafened
  if (isMicEnabled.value !== v) {
    await toggleMic()
    await broadcastMuteChanged(!v)
  }
}

onMounted(() => {
  window.pulseApi.removePttListeners()
  window.pulseApi.onPttKeyDown(() => { if (isPttMode.value) setMicEnabled(true) })
  window.pulseApi.onPttKeyUp(() => { if (isPttMode.value) setMicEnabled(false) })
})

onUnmounted(() => {
  window.pulseApi.removePttListeners()
})

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

const AV_COLORS = ['#e8722e','#23c97d','#5750d6','#d6457f','#3a86c8','#7a52c7','#c2553f','#2aa39a','#b0843a','#5a6acf']
function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AV_COLORS[h % AV_COLORS.length]
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase()
}

const speakerName = computed(() => {
  if (!activeSpeakers.value.length) return ''
  const sp = roomStore.participants.find(p => p.userId === activeSpeakers.value[0])
  return sp?.displayName ?? ''
})

async function handleJoin(): Promise<void> {
  if (!roomNameInput.value.trim()) return
  joinError.value = ''
  createRoomError.value = ''
  joining.value = true
  showJoinForm.value = false
  try {
    // Create the room on the server (idempotent — server returns existing if name taken by POST design)
    await createRoom(SERVER_URL, roomNameInput.value.trim())
  } catch (e) {
    // Non-fatal: room may already exist, proceed to join
    console.warn('[handleJoin] createRoom:', e)
  }
  try {
    const { liveKitToken, liveKitHost } = await fetchLiveKitToken(roomNameInput.value.trim())
    await connect(SERVER_URL)
    await joinRoom(roomNameInput.value.trim())
    const desiredMic = !isPttMode.value && !isDeafened.value
    await livekitConnect(liveKitToken, liveKitHost, desiredMic)
    if (isDeafened.value) {
      document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"]').forEach(el => { el.volume = 0 })
      await broadcastMuteChanged(true)
    } else if (!desiredMic) {
      await broadcastMuteChanged(true)
    }
    roomNameInput.value = ''
    activeNav.value = 'voice'
  } catch (err: unknown) {
    joinError.value = err instanceof Error ? err.message : 'Failed to join'
    showJoinForm.value = true
  } finally {
    joining.value = false
  }
}

async function handleJoinRoom(name: string): Promise<void> {
  roomNameInput.value = name
  await handleJoin()
}

async function handleLeave(): Promise<void> {
  await livekitDisconnect()
  if (roomStore.currentRoomName) await leaveRoom(roomStore.currentRoomName)
  await disconnect()
  roomStore.clearRoom()
  isDeafened.value = false
  prevMicEnabled.value = false
}

async function handleToggleMic(): Promise<void> {
  if (isDeafened.value) return  // mic locked while deafened
  await toggleMic()
  await broadcastMuteChanged(!isMicEnabled.value)
}

async function handleToggleDeafen(): Promise<void> {
  if (!isDeafened.value) {
    // About to deafen: save current mic state, then mute mic
    prevMicEnabled.value = isMicEnabled.value
    isDeafened.value = true
    document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"]').forEach(el => {
      el.volume = 0
    })
    if (isMicEnabled.value) await toggleMic()
    await broadcastMuteChanged(true)   // deafen forces mute — visible to others
    await broadcastDeafenChanged(true)
  } else {
    // About to undeafen: restore audio and restore previous mic state
    isDeafened.value = false
    document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"]').forEach(el => {
      el.volume = 1
    })
    if (prevMicEnabled.value && !isMicEnabled.value) await toggleMic()  // restore mic if it was on before
    await broadcastMuteChanged(!prevMicEnabled.value)  // restore mute state to match restored mic
    await broadcastDeafenChanged(false)
  }
}

async function handleLogout(): Promise<void> {
  await handleLeave()
  await logout()
}

void connectionState
</script>

<style scoped>
/* ── Shell ── */
.app-shell {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--c-bg);
}

/* ── Nav rail ── */
.nav-rail {
  width: 72px;
  flex: 0 0 72px;
  background: var(--c-rail);
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0 10px;
  gap: 2px;
}

.rail-logo {
  width: 40px; height: 40px;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
  margin-bottom: 4px;
}

.rail-sep {
  width: 28px; height: 1px;
  background: var(--c-border-2);
  flex: 0 0 auto; margin: 6px 0;
}

.rail-item {
  width: 56px;
  padding: 8px 0 6px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  border-radius: 10px;
  color: var(--c-ink-4);
  background: transparent; border: none; cursor: pointer;
  font-size: 11px; font-weight: 600; font-family: inherit;
  transition: color .12s, background .12s;
  flex: 0 0 auto;
}
.rail-item:hover { color: var(--c-ink-2); background: var(--c-side-2); }
.rail-item.active { color: var(--accent); }
.rail-item.active svg { stroke: var(--accent); }
.rail-label { line-height: 1; letter-spacing: .01em; }
.rail-sm { width: 36px; height: 36px; padding: 0; border-radius: 8px; flex-direction: row; gap: 0; font-size: 0; }

.rail-spacer { flex: 1 1 auto; }

/* ── Page body ── */
.page-body {
  flex: 1 1 auto;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.page-body.has-voice-bar { height: calc(100vh - 56px); }

/* ── Feed layout (hub & voice share this) ── */
.hub-view, .voice-view {
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
  letter-spacing: -.02em;
}

.sorted-chip {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 20px;
  padding: 3px 10px;
  opacity: .8;
}

.create-btn {
  margin-left: auto;
  display: flex; align-items: center; gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--c-ink-3);
  font-size: 12px; font-weight: 600; font-family: inherit;
  cursor: pointer;
  transition: background .1s, color .1s;
}
.create-btn:hover { background: var(--c-side-2); color: var(--c-ink-2); }

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

/* ── Room card ── */
.room-card {
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius);
  padding: 14px 16px;
  background: var(--c-side);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color .15s;
}
.room-card.active-card {
  border-color: var(--voice);
  background: rgba(35, 201, 125, .05);
}
.room-card.joinable { cursor: pointer; }
.room-card.joinable:hover { border-color: var(--accent); }

.card-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.card-head { flex-wrap: nowrap; }

.type-chip {
  font-size: 11px; font-weight: 700; letter-spacing: .03em;
  border-radius: 20px; padding: 2px 9px; flex: 0 0 auto;
  border: 1.5px solid currentColor;
}
.voice-chip { color: var(--voice); }

.you-here-chip {
  font-size: 11px; font-weight: 700;
  color: var(--voice);
  border: 1.5px solid var(--voice);
  border-radius: 20px; padding: 2px 9px; flex: 0 0 auto;
}

.card-name {
  flex: 1 1 auto;
  font-size: 16px; font-weight: 700;
  color: var(--c-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.flames { flex: 0 0 auto; font-size: 14px; }

.av-stack { display: flex; }
.av-sm {
  width: 24px; height: 24px;
  border-radius: 50%;
  color: #fff; font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--c-side);
  margin-left: -6px; flex: 0 0 auto;
}
.av-sm:first-child { margin-left: 0; }
.av-more { background: var(--c-side-2); color: var(--c-ink-4); }

.card-meta { font-size: 13px; color: var(--c-ink-4); font-weight: 500; }
.card-speaking { font-size: 13px; color: var(--voice); font-weight: 600; }

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
  transition: width .4s ease;
}

/* Join card */
.join-card {
  border: 1.5px dashed var(--c-border-2);
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.join-card-label { font-size: 12px; font-weight: 700; color: var(--c-ink-4); text-transform: uppercase; letter-spacing: .05em; }
.join-row { display: flex; gap: 8px; }
.room-input {
  flex: 1 1 auto;
  height: 34px;
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  background: var(--c-bg);
  padding: 0 10px;
  font-size: 13px; font-family: inherit;
  color: var(--c-ink);
  outline: none;
}
.room-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
.room-input::placeholder { color: var(--c-ink-5); }

.jump-btn {
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: #fff;
  font-size: 13px; font-weight: 700; font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity .12s;
}
.jump-btn:disabled { opacity: .4; cursor: default; }
.jump-btn:not(:disabled):hover { opacity: .85; }

.join-error { font-size: 12px; color: var(--live); }

/* Empty card */
.empty-card {
  border: 1.5px dashed var(--c-border-2);
  border-radius: var(--radius);
  padding: 40px 24px;
  text-align: center;
  color: var(--c-ink-4);
  display: flex; flex-direction: column; align-items: center;
}
.empty-card p { margin: 0 0 4px; font-size: 14px; }
.empty-hint { font-size: 12px; color: var(--c-ink-5); }

/* ── Squad / participants panel ── */
.squad-panel {
  width: 220px;
  flex: 0 0 220px;
  border-left: 1px solid var(--c-border);
  background: var(--c-side);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.squad-head {
  padding: 16px 14px 8px;
  font-size: 11px; font-weight: 700; letter-spacing: .07em;
  text-transform: uppercase; color: var(--c-ink-4);
  border-bottom: 1px solid var(--c-border);
  flex: 0 0 auto;
}
.squad-list {
  flex: 1 1 auto; overflow-y: auto; padding: 8px 10px;
  scrollbar-width: thin; scrollbar-color: var(--c-border-2) transparent;
  display: flex; flex-direction: column; gap: 2px;
}
.squad-member {
  display: flex; align-items: center; gap: 9px;
  padding: 6px 6px; border-radius: var(--radius-sm);
  cursor: default;
}
.squad-member.speaking { background: var(--voice-soft); }
.sq-av-wrap { position: relative; flex: 0 0 auto; }
.sq-av {
  width: 30px; height: 30px; border-radius: 50%;
  color: #fff; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.sq-speaking-ring {
  position: absolute; inset: -3px; border-radius: 50%;
  border: 2px solid var(--voice);
  animation: ring-pulse 1.2s ease-in-out infinite;
}
@keyframes ring-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .5; transform: scale(1.08); }
}
.sq-info { min-width: 0; }
.sq-name {
  display: block; font-size: 13px; font-weight: 600;
  color: var(--c-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sq-status { display: block; font-size: 11px; color: var(--c-ink-4); }
.sq-status--speaking { color: var(--voice); }
.sq-status--muted { color: var(--live); }
.sq-status--deafened { color: var(--warn); }
.sq-mute-badge, .sq-deafen-badge {
  position: absolute; bottom: -2px; right: -2px;
  width: 16px; height: 16px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid var(--c-bg);
  color: #fff;
}
.sq-mute-badge { background: var(--live); }
.sq-deafen-badge { background: var(--warn); color: #1a1b1e; }
.squad-empty { padding: 20px 14px; font-size: 13px; color: var(--c-ink-5); }

/* ── Placeholders ── */
.placeholder-view, .settings-view {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  padding: 40px;
  overflow: auto;
}
.placeholder-view {
  align-items: center; justify-content: center;
  color: var(--c-ink-5); gap: 14px;
}
.placeholder-view p { margin: 0; font-size: 15px; }

.settings-head { margin-bottom: 24px; }
.settings-head h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--c-ink); }
.settings-section { display: flex; flex-direction: column; gap: 16px; max-width: 400px; }
.settings-group-label {
  font-size: 11px; font-weight: 700; letter-spacing: .07em;
  text-transform: uppercase; color: var(--c-ink-4);
  padding-bottom: 4px; border-bottom: 1px solid var(--c-border);
}
.setting-label {
  display: flex; flex-direction: column; gap: 6px;
  font-size: 12px; font-weight: 600; color: var(--c-ink-3);
  text-transform: uppercase; letter-spacing: .04em;
}
.setting-select {
  padding: 8px 10px;
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  background: var(--c-side);
  font-size: 13px; font-family: inherit; color: var(--c-ink);
  outline: none; cursor: pointer;
}
.setting-select:focus { border-color: var(--accent); }
.settings-hint { font-size: 13px; color: var(--c-ink-4); }

/* ── Bottom voice bar ── */
.voice-bar {
  position: fixed; bottom: 0; left: 72px; right: 0;
  height: 56px;
  background: var(--c-rail);
  border-top: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  z-index: 10;
}

.vb-left { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; min-width: 0; }

.vb-bars {
  display: flex; align-items: flex-end; gap: 2px; height: 18px; flex: 0 0 auto;
}
.vb-bars span {
  width: 3px; border-radius: 2px; background: var(--voice);
  animation: bar-bounce 1.2s ease-in-out infinite;
}
.vb-bars span:nth-child(1) { height: 8px; animation-delay: 0s; }
.vb-bars span:nth-child(2) { height: 14px; animation-delay: .15s; }
.vb-bars span:nth-child(3) { height: 10px; animation-delay: .3s; }
.vb-bars span:nth-child(4) { height: 16px; animation-delay: .45s; }
@keyframes bar-bounce {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(.4); }
}

.vb-info { min-width: 0; }
.vb-room-name {
  display: block; font-size: 13px; font-weight: 700; color: var(--c-ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.vb-count { font-size: 11px; font-weight: 500; color: var(--c-ink-4); }
.vb-speaking { display: block; font-size: 11px; color: var(--voice); font-weight: 500; white-space: nowrap; }

.vb-avatars { display: flex; flex: 0 0 auto; }
.vb-av {
  width: 26px; height: 26px; border-radius: 50%;
  color: #fff; font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--c-rail);
  margin-left: -6px; flex: 0 0 auto;
  transition: box-shadow .15s;
}
.vb-av:first-child { margin-left: 0; }
.vb-av.speaking { box-shadow: 0 0 0 2px var(--voice); }
.vb-av.muted { box-shadow: 0 0 0 2px var(--live); }
.vb-av-more { background: var(--c-side-2); color: var(--c-ink-4); }

.vb-controls { display: flex; gap: 4px; margin-left: auto; }

.vb-btn {
  width: 36px; height: 36px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  background: var(--c-side-2); border: 1px solid var(--c-border);
  color: var(--c-ink-3); cursor: pointer;
  transition: background .1s, color .1s;
}
.vb-btn:hover { background: var(--c-border); color: var(--c-ink-2); }
.vb-btn.muted { background: rgba(240,71,71,.15); color: var(--live); border-color: rgba(240,71,71,.3); }
.vb-btn:disabled { opacity: .45; cursor: not-allowed; }
.vb-leave { background: rgba(240,71,71,.15); color: var(--live); border-color: rgba(240,71,71,.3); }
.vb-leave:hover { background: rgba(240,71,71,.28); }

.vb-user { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.vb-user-av {
  width: 30px; height: 30px; border-radius: 50%;
  color: #fff; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.vb-user-info { min-width: 0; }
.vb-user-name { display: block; font-size: 12px; font-weight: 700; color: var(--c-ink); white-space: nowrap; }
.vb-logout {
  display: block; font-size: 11px; color: var(--c-ink-4);
  background: none; border: none; cursor: pointer; font-family: inherit; padding: 0;
  text-align: left;
}
.vb-logout:hover { color: var(--live); }

/* ── Simple user footer (not in voice) ── */
.user-foot-simple {
  position: fixed; bottom: 0; left: 72px; right: 0;
  height: 52px;
  background: var(--c-rail);
  border-top: 1px solid var(--c-border);
  display: flex; align-items: center; gap: 10px;
  padding: 0 16px;
  z-index: 10;
}
.vb-status-text { display: block; font-size: 11px; color: var(--c-ink-4); }
.logout-btn {
  margin-left: auto;
  width: 30px; height: 30px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  background: transparent; border: none; color: var(--c-ink-4); cursor: pointer;
}
.logout-btn:hover { color: var(--live); }

/* ── PTT Settings ── */
.ptt-toggle { display: flex; border: 1px solid var(--c-border-2); border-radius: var(--radius-sm); overflow: hidden; width: fit-content; }
.ptt-opt { padding: 6px 14px; background: transparent; border: none; color: var(--c-ink-3); font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background .1s, color .1s; }
.ptt-opt.active { background: var(--accent); color: #fff; }
.ptt-key-row { display: flex; align-items: center; gap: 8px; }
kbd.ptt-key { display: inline-flex; align-items: center; justify-content: center; min-width: 60px; padding: 6px 12px; border: 1px solid var(--c-border-2); border-radius: 6px; background: var(--c-side-2); color: var(--c-ink); font-size: 13px; font-family: inherit; cursor: pointer; outline: none; transition: border-color .1s; }
kbd.ptt-key:focus, kbd.ptt-key.capturing { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
</style>
