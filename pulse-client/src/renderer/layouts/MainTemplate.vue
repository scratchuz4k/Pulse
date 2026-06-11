<template>
  <div class="app-root" @click="switcherOpen = false">
    <div class="app-nav">
      <button class="rail-logo" title="Dashboard" @click.stop="router.push({ name: 'dashboard' })">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </button>
      <div class="app-server-container" @click.stop>
        <button
          class="app-server"
          :title="serverStore.activeServer?.name ?? 'Select server'"
          @click="switcherOpen = !switcherOpen"
        >
          {{ serverStore.activeServer?.name ?? '— select —' }}
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-left:6px">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div v-if="switcherOpen" class="server-dropdown">
          <button
            v-for="s in serverStore.servers"
            :key="s.id"
            class="server-dropdown-item"
            :class="{ active: s.id === serverStore.activeServerId }"
            @click="switchToServer(s.id)"
          >{{ s.name }}</button>
          <div class="server-dropdown-divider" />
          <button class="server-dropdown-item" @click="router.push('/dashboard'); switcherOpen = false">Dashboard</button>
        </div>
      </div>
    </div>
    <div class="app-shell">
      <slot></slot>
    </div>
    <ConnectBar />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ConnectBar from '../components/ConnectBar.vue'
import { useServerStore } from '@renderer/stores/server'

const router = useRouter()
const serverStore = useServerStore()
const switcherOpen = ref(false)

function switchToServer(id: number): void {
  serverStore.setActiveServer(id)
  switcherOpen.value = false
  router.push('/server')
}
</script>
<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-nav {
  display: flex;
  align-items: center;
  justify-content: start;
  width: 100%;
  flex: 0 0 52px;
  overflow: visible;
  background: var(--c-rail);
  padding: 0 16px;
  border-bottom: 1px solid var(--c-border);
  position: relative;
  z-index: 10;
}
.app-server-container {
  margin-left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.app-server {
  padding: 0 12px;
  height: 40px;
  border-radius: 14px;
  background: var(--c-bg);
  border: 1px solid var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.app-server:hover {
  background: var(--c-side-2);
  border-color: var(--accent);
}

.server-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 180px;
  background: var(--c-side);
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 200;
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.server-dropdown-item {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--c-ink);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  font-family: inherit;
  transition: background 0.1s;
}
.server-dropdown-item:hover {
  background: var(--c-side-2);
}
.server-dropdown-item.active {
  color: var(--accent);
  font-weight: 700;
}

.server-dropdown-divider {
  height: 1px;
  background: var(--c-border);
  margin: 4px 0;
}

/* ── Shell ── */
.app-shell {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
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
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: none;
  cursor: pointer;
  transition: opacity 0.12s;
  padding: 0;
}
.rail-logo:hover {
  opacity: 0.85;
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
  transition:
    color 0.12s,
    background 0.12s;
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
