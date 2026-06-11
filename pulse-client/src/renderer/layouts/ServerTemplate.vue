<template>
  <MainTemplate>
    <!-- ── Nav rail (3 tabs) ── -->
    <nav class="nav-rail">
      <button
        class="rail-item"
        :class="{ active: route.name === 'hub' }"
        title="Hub"
        @click="router.push({ name: 'hub' })"
      >
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
        <span class="rail-label">Hub</span>
      </button>

      <button
        class="rail-item"
        :class="{ active: route.name === 'text' }"
        title="Text"
        @click="router.push({ name: 'text' })"
      >
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
        </svg>
        <span class="rail-label">Text</span>
      </button>

      <button
        class="rail-item"
        :class="{ active: route.name === 'voice' }"
        title="Voice"
        @click="router.push({ name: 'voice' })"
      >
        <svg
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3" />
        </svg>
        <span class="rail-label">Voice</span>
      </button>

      <div class="rail-spacer" />

      <button
        class="rail-item rail-sm"
        title="Settings"
        @click="router.push({ name: 'settings' })"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"
          />
        </svg>
      </button>
    </nav>
    <RouterView />
  </MainTemplate>
</template>
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainTemplate from "@renderer/layouts/MainTemplate.vue";
import { usePresence } from '@renderer/composables/usePresence'
import { useServerStore } from '@renderer/stores/server'
import { SERVER_URL } from '@renderer/utils/config'

const route = useRoute()
const router = useRouter()
const { connect, fetchRooms } = usePresence()
const serverStore = useServerStore()

onMounted(() => {
  if (!serverStore.activeServerId) {
    router.push('/dashboard')
    return
  }
  connect(SERVER_URL)
    .then(() => fetchRooms(SERVER_URL))
    .catch(e => console.error('[ServerTemplate] presence init:', e))
})
</script>

<style scoped>
.nav-rail {
  width: 72px;
  flex: 0 0 72px;
  background: var(--c-rail);
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  gap: 2px;
}

.rail-item {
  width: 56px;
  padding: 8px 0 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border-radius: 10px;
  color: var(--c-ink-4);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  transition: color 0.12s, background 0.12s;
  flex: 0 0 auto;
}
.rail-item:hover {
  color: var(--c-ink-2);
  background: var(--c-side-2);
}
.rail-item.active {
  color: var(--accent);
}
.rail-item.active svg {
  stroke: var(--accent);
}

.rail-label {
  line-height: 1;
  letter-spacing: 0.01em;
}

.rail-sm {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
  flex-direction: row;
  gap: 0;
  font-size: 0;
}

.rail-spacer {
  flex: 1 1 auto;
}
</style>
