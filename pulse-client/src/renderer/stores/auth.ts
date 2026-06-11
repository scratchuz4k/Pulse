import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const userId = ref<string | null>(null)
  const displayName = ref<string | null>(null)
  const isAdmin = ref(false)

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
    isAdmin.value = false
  }

  return { accessToken, refreshToken, userId, displayName, isAdmin, setTokens, clearTokens }
})
