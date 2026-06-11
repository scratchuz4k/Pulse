<template>
  <MainTemplate>
    <div class="dash-root">
      <div class="dash-topbar">
        <span class="dash-title">Servers</span>
      </div>
      <div class="dash-body">
        <!-- Empty state -->
        <template v-if="serverStore.servers.length === 0">
          <div class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <h2 class="empty-heading">No servers yet</h2>
            <p class="empty-sub">Create a server or join one with an invite code.</p>
            <div class="empty-actions">
              <button class="btn-primary" @click="showCreateModal = true">Create a server</button>
              <button class="btn-secondary" @click="showJoinModal = true">Join with invite code</button>
            </div>
          </div>
        </template>

        <!-- Server card grid -->
        <template v-else>
          <div class="server-grid">
            <div
              v-for="server in serverStore.servers"
              :key="server.id"
              class="server-card"
            >
              <div class="server-card-name">{{ server.name }}</div>
              <div class="server-card-code">Code: {{ server.inviteCode }}</div>
              <button class="btn-primary server-enter-btn" @click="selectServer(server.id)">Enter</button>
            </div>
          </div>
          <div class="dash-footer-actions">
            <button class="btn-secondary" @click="showCreateModal = true">Create a server</button>
            <button class="btn-secondary" @click="showJoinModal = true">Join with invite code</button>
          </div>
        </template>
      </div>
    </div>

    <!-- Create Server modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-box">
        <h3 class="modal-title">Create a server</h3>
        <input
          v-model="createName"
          class="modal-input"
          placeholder="Server name"
          maxlength="80"
          @keydown.enter="createServer"
        />
        <p v-if="createError" class="modal-error">{{ createError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showCreateModal = false; createName = ''; createError = ''">Cancel</button>
          <button class="btn-primary" :disabled="loading" @click="createServer">Create</button>
        </div>
      </div>
    </div>

    <!-- Join Server modal -->
    <div v-if="showJoinModal" class="modal-overlay" @click.self="showJoinModal = false">
      <div class="modal-box">
        <h3 class="modal-title">Join a server</h3>
        <input
          v-model="joinCode"
          class="modal-input"
          placeholder="Invite code"
          @keydown.enter="joinServer"
        />
        <p v-if="joinError" class="modal-error">{{ joinError }}</p>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showJoinModal = false; joinCode = ''; joinError = ''">Cancel</button>
          <button class="btn-primary" :disabled="loading" @click="joinServer">Join</button>
        </div>
      </div>
    </div>
  </MainTemplate>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainTemplate from '@renderer/layouts/MainTemplate.vue'
import { useServerStore } from '@renderer/stores/server'
import { useAuthStore } from '@renderer/stores/auth'
import { SERVER_URL } from '@renderer/utils/config'

const serverStore = useServerStore()
const authStore = useAuthStore()
const router = useRouter()

const showCreateModal = ref(false)
const showJoinModal = ref(false)
const createName = ref('')
const joinCode = ref('')
const createError = ref('')
const joinError = ref('')
const loading = ref(false)

onMounted(async () => {
  try {
    const res = await fetch(`${SERVER_URL}/servers/me`, {
      headers: { Authorization: `Bearer ${authStore.accessToken}` }
    })
    if (res.ok) {
      const data = await res.json()
      serverStore.setServers(data)
    }
  } catch (e) {
    console.error('[DashBoard] failed to load servers:', e)
  }
})

function selectServer(id: number): void {
  serverStore.setActiveServer(id)
  router.push('/server')
}

async function createServer(): Promise<void> {
  if (!createName.value.trim()) return
  loading.value = true
  createError.value = ''
  try {
    const res = await fetch(`${SERVER_URL}/servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`
      },
      body: JSON.stringify({ name: createName.value.trim() })
    })
    if (res.ok) {
      const data = await res.json()
      serverStore.setServers([...serverStore.servers, data])
      serverStore.setActiveServer(data.id)
      showCreateModal.value = false
      createName.value = ''
      router.push('/server')
    } else {
      const err = await res.json()
      createError.value = err.error ?? 'Failed to create server.'
    }
  } catch (e) {
    createError.value = 'Network error.'
  } finally {
    loading.value = false
  }
}

async function joinServer(): Promise<void> {
  if (!joinCode.value.trim()) return
  loading.value = true
  joinError.value = ''
  try {
    const res = await fetch(`${SERVER_URL}/servers/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`
      },
      body: JSON.stringify({ inviteCode: joinCode.value.trim() })
    })
    if (res.ok) {
      const data = await res.json()
      serverStore.setServers([...serverStore.servers, data])
      serverStore.setActiveServer(data.id)
      showJoinModal.value = false
      joinCode.value = ''
      router.push('/server')
    } else {
      joinError.value = 'Invalid invite code.'
    }
  } catch (e) {
    joinError.value = 'Network error.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dash-root {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.dash-topbar {
  height: 52px;
  flex: 0 0 52px;
  padding: 0 22px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--c-border);
}

.dash-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--c-ink);
  letter-spacing: -0.02em;
}

.dash-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--c-border-2) transparent;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius);
  background: var(--c-side);
  border: 1.5px solid var(--c-border);
  color: var(--c-ink-4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-heading {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--c-ink);
  letter-spacing: -0.02em;
}

.empty-sub {
  margin: 0;
  font-size: 13px;
  color: var(--c-ink-4);
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

/* Server grid */
.server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.server-card {
  background: var(--c-side);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius);
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.server-card-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--c-ink);
  letter-spacing: -0.01em;
}

.server-card-code {
  font-size: 11px;
  color: var(--c-ink-4);
  font-family: monospace;
  letter-spacing: 0.04em;
}

.server-enter-btn {
  margin-top: 8px;
}

.dash-footer-actions {
  display: flex;
  gap: 10px;
}

/* Buttons */
.btn-primary {
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  background: var(--c-accent, var(--accent));
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: opacity 0.12s;
}
.btn-primary:hover { opacity: 0.85; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  background: var(--c-side-2);
  color: var(--c-ink);
  border: 1px solid var(--c-border-2);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: background 0.12s;
}
.btn-secondary:hover { background: var(--c-side); }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-box {
  background: var(--c-side);
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius);
  padding: 24px;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--c-ink);
}

.modal-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  background: var(--c-side-2);
  color: var(--c-ink);
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
  outline: none;
}
.modal-input:focus {
  border-color: var(--c-accent, var(--accent));
}

.modal-error {
  margin: 0;
  font-size: 12px;
  color: #f87171;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
