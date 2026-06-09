import { useAuthStore } from '../stores/auth'
import { router } from '../router'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp < Date.now() / 1000
  } catch {
    return true
  }
}

function parseTokenPayload(token: string): { sub?: string; name?: string } {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return {}
  }
}

export function useAuth() {
  const authStore = useAuthStore()

  async function register(displayName: string, password: string): Promise<void> {
    const res = await fetch(`${SERVER_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, password })
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || `Register failed: ${res.status}`)
    }
    const data = await res.json()
    await _applyTokens(data.accessToken, data.refreshToken)
  }

  async function login(displayName: string, password: string): Promise<void> {
    const res = await fetch(`${SERVER_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, password })
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(body || `Login failed: ${res.status}`)
    }
    const data = await res.json()
    await _applyTokens(data.accessToken, data.refreshToken)
  }

  async function logout(): Promise<void> {
    authStore.clearTokens()
    await window.pulseApi.storeDel('accessToken')
    await window.pulseApi.storeDel('refreshToken')
    router.push('/login')
  }

  async function refreshAccessToken(): Promise<boolean> {
    const storedRefresh = authStore.refreshToken
    if (!storedRefresh) return false
    try {
      const res = await fetch(`${SERVER_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh })
      })
      if (!res.ok) return false
      const data = await res.json()
      await _applyTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      return false
    }
  }

  async function initAuth(): Promise<void> {
    const access = await window.pulseApi.storeGet('accessToken')
    const refresh = await window.pulseApi.storeGet('refreshToken')
    if (!access || !refresh) return

    const payload = parseTokenPayload(access)
    authStore.setTokens(access, refresh, payload.sub ?? '', payload.name ?? '')

    if (isTokenExpired(access)) {
      const ok = await refreshAccessToken()
      if (!ok) authStore.clearTokens()
    }
  }

  async function fetchLiveKitToken(
    roomName: string
  ): Promise<{ liveKitToken: string; liveKitHost: string }> {
    const res = await fetch(
      `${SERVER_URL}/rooms/token?roomName=${encodeURIComponent(roomName)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`
        }
      }
    )
    if (!res.ok) {
      throw new Error(`Failed to fetch LiveKit token: ${res.status}`)
    }
    return res.json()
  }

  async function _applyTokens(access: string, refresh: string): Promise<void> {
    const payload = parseTokenPayload(access)
    authStore.setTokens(access, refresh, payload.sub ?? '', payload.name ?? '')
    await window.pulseApi.storeSet('accessToken', access)
    await window.pulseApi.storeSet('refreshToken', refresh)
  }

  return { register, login, logout, refreshAccessToken, initAuth, fetchLiveKitToken }
}
