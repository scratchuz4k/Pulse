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
      <button @click="handleLeave">Leave Room</button>

      <h3>Participants</h3>
      <ul>
        <li v-for="p in roomStore.participants" :key="p.connectionId">
          {{ p.displayName }} <small>({{ p.connectionId }})</small>
        </li>
      </ul>

      <!-- Plan 01-03 will mount LiveKit audio here -->
      <div id="livekit-audio-placeholder"></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRoomStore } from '../stores/room'
import { useAuth } from '../composables/useAuth'
import { usePresence } from '../composables/usePresence'

const authStore = useAuthStore()
const roomStore = useRoomStore()
const { logout, fetchLiveKitToken } = useAuth()
const { connect, joinRoom, leaveRoom, disconnect, connectionState } = usePresence()

const roomNameInput = ref('')
const joining = ref(false)
const joinError = ref('')

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

async function handleJoin(): Promise<void> {
  joinError.value = ''
  joining.value = true
  try {
    const tokenData = await fetchLiveKitToken(roomNameInput.value)
    console.log('LiveKit token:', tokenData.liveKitToken)
    console.log('LiveKit host:', tokenData.liveKitHost)

    await connect(SERVER_URL)
    await joinRoom(roomNameInput.value)
  } catch (err: unknown) {
    joinError.value = err instanceof Error ? err.message : 'Failed to join room'
  } finally {
    joining.value = false
  }
}

async function handleLeave(): Promise<void> {
  if (roomStore.currentRoomName) {
    await leaveRoom(roomStore.currentRoomName)
  }
  await disconnect()
  roomStore.clearRoom()
}

async function handleLogout(): Promise<void> {
  await handleLeave()
  await logout()
}
</script>
