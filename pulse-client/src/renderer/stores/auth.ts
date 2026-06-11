import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useServerStore } from './server'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const userId = ref<string | null>(null)
  const displayName = ref<string | null>(null)

  const isAdminOfActiveServer = computed(() => {
    const serverStore = useServerStore()
    const active = serverStore.activeServer
    if (!active || !userId.value) return false
    return active.ownerId === userId.value
  })

  function setTokens(
    access: string,
    refresh: string,
    uid: string,
    name: string
  ): void {
    accessToken.value = access
    refreshToken.value = refresh
    userId.value = uid
    displayName.value = name
  }

  function clearTokens(): void {
    accessToken.value = null
    refreshToken.value = null
    userId.value = null
    displayName.value = null
  }

  return { accessToken, refreshToken, userId, displayName, isAdminOfActiveServer, setTokens, clearTokens }
})
