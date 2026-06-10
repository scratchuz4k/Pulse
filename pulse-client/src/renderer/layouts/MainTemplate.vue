<template>
  <div class="app-root">
    <div class="app-nav">
      <button class="rail-logo" title="Dashboard" @click="router.push({ name: 'dashboard' })">
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
      <div class="app-server-container">
        <div class="app-server" @click="router.push('/server')">Ravengate</div>
      </div>
    </div>
    <div class="app-shell">
      <slot></slot>
    </div>
    <ConnectBar />
  </div>
</template>
<script setup lang="ts">
import { useRouter } from "vue-router";
import ConnectBar from "../components/ConnectBar.vue";
const router = useRouter();
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
  overflow: hidden;
  background: var(--c-rail);
  padding: 0 16px;
  border-bottom: 1px solid var(--c-border);
}
.app-server-container {
  margin-left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
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
