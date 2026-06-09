<template>
  <div class="room-view">
    <header>
      <h1>Pulse</h1>
      <span>Logged in as: {{ authStore.displayName }}</span>
      <button @click="handleLogout">Logout</button>
    </header>

    <section v-if="!roomStore.currentRoomName" class="join-section">
      <h2>Join a Room</h2>
      <input v-model="roomNameInput" type="text" placeholder="Room name" />
      <button :disabled="joining || !roomNameInput" @click="handleJoin">Join Room</button>
      <div v-if="joinError" class="error">{{ joinError }}</div>
    </section>

    <section v-else class="room-section">
      <h2>Room: {{ roomStore.currentRoomName }}</h2>
      <p>SignalR: {{ connectionState }}</p>
      <p>LiveKit: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>

      <div class="controls">
        <button @click="handleLeave">Leave Room</button>
        <button @click="handleToggleMic" :disabled="!isConnected">
          Mic: {{ isMicEnabled ? 'On' : 'Off' }}
        </button>
      </div>

      <h3>Participants</h3>
      <ul>
        <li
          v-for="p in roomStore.participants"
          :key="p.connectionId"
          :class="{ speaking: activeSpeakers.length > 0 }"
        >
          {{ p.displayName }}
          <small>({{ p.connectionId }})</small>
        </li>
      </ul>

      <div v-if="activeSpeakers.length > 0" class="active-speakers">
        <h4>Speaking now:</h4>
        <ul>
          <li v-for="identity in activeSpeakers" :key="identity">{{ identity }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRoomStore } from '../stores/room'
import { useAuth } from '../composables/useAuth'
import { usePresence } from '../composables/usePresence'
import { useLiveKit } from '../composables/useLiveKit'

const authStore = useAuthStore()
const roomStore = useRoomStore()
const { logout, fetchLiveKitToken } = useAuth()
const { connect, joinRoom, leaveRoom, disconnect, connectionState } = usePresence()
const { connect: livekitConnect, disconnect: livekitDisconnect, toggleMic, isConnected, isMicEnabled, activeSpeakers } = useLiveKit()

const roomNameInput = ref('')
const joining = ref(false)
const joinError = ref('')

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

async function handleJoin(): Promise<void> {
  joinError.value = ''
  joining.value = true
  try {
    // 1. Fetch LiveKit token from C# server
    const { liveKitToken, liveKitHost } = await fetchLiveKitToken(roomNameInput.value)

    // 2. Connect SignalR presence hub
    await connect(SERVER_URL)
    await joinRoom(roomNameInput.value)

    // 3. Connect LiveKit audio
    await livekitConnect(liveKitToken, liveKitHost)
  } catch (err: unknown) {
    joinError.value = err instanceof Error ? err.message : 'Failed to join room'
  } finally {
    joining.value = false
  }
}

async function handleLeave(): Promise<void> {
  // Disconnect LiveKit first, then presence
  await livekitDisconnect()
  if (roomStore.currentRoomName) {
    await leaveRoom(roomStore.currentRoomName)
  }
  await disconnect()
  roomStore.clearRoom()
}

async function handleToggleMic(): Promise<void> {
  await toggleMic()
}

async function handleLogout(): Promise<void> {
  await handleLeave()
  await logout()
}
</script>
