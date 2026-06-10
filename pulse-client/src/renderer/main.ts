import './assets/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'
import { usePresence } from './composables/usePresence'
import { useRoomStore } from './stores/room'

const pinia = createPinia()
createApp(App).use(pinia).use(router).mount('#app')

// Explicitly leave the room before the window closes so the server doesn't
// wait for the keep-alive timeout to detect the disconnection.
window.addEventListener('beforeunload', () => {
  const roomStore = useRoomStore()
  if (roomStore.currentRoomName) {
    const { leaveRoom } = usePresence()
    leaveRoom(roomStore.currentRoomName).catch(() => {})
  }
})
