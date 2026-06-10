<template>
  <MainTemplate>
    <div class="dash-root">
      <div class="dash-topbar">
        <span class="dash-title">Dashboard</span>
        <span class="dash-badge">Coming soon</span>
      </div>
      <div class="dash-body">
        <div class="dash-hero">
          <div class="hero-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div class="hero-text">
            <h2 class="hero-heading">Activity overview</h2>
            <p class="hero-sub">Stats, recent activity, and quick-join shortcuts will live here.</p>
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-card" v-for="s in stats" :key="s.label">
            <span class="stat-value">—</span>
            <span class="stat-label">{{ s.label }}</span>
          </div>
        </div>

        <div class="placeholder-grid">
          <div class="ph-card ph-tall">
            <div class="ph-head">Active rooms</div>
            <div class="ph-lines">
              <div class="ph-line" style="width: 80%" />
              <div class="ph-line" style="width: 60%" />
              <div class="ph-line" style="width: 72%" />
            </div>
          </div>
          <div class="ph-card">
            <div class="ph-head">Recent activity</div>
            <div class="ph-lines">
              <div class="ph-line" style="width: 90%" />
              <div class="ph-line" style="width: 55%" />
            </div>
          </div>
          <div class="ph-card">
            <div class="ph-head">Online now</div>
            <div class="ph-lines">
              <div class="ph-line" style="width: 65%" />
              <div class="ph-line" style="width: 78%" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainTemplate>
</template>

<script setup lang="ts">
import MainTemplate from "@renderer/layouts/MainTemplate.vue";

const stats = [
  { label: "Rooms active" },
  { label: "Users online" },
  { label: "Messages today" },
  { label: "Peak concurrent" },
];
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

.dash-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--c-ink-4);
  border: 1.5px solid var(--c-border-2);
  border-radius: 20px;
  padding: 2px 9px;
}

.dash-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--c-border-2) transparent;
}

/* Hero */
.dash-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border: 1.5px dashed var(--c-border-2);
  border-radius: var(--radius);
  background: var(--c-side);
}

.hero-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-sm);
  background: var(--c-side-2);
  border: 1px solid var(--c-border);
  color: var(--c-ink-4);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.hero-heading {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: var(--c-ink);
}

.hero-sub {
  margin: 0;
  font-size: 13px;
  color: var(--c-ink-4);
  line-height: 1.5;
}

/* Stats row */
.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius);
  padding: 16px 18px;
  background: var(--c-side);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-value {
  font-size: 26px;
  font-weight: 800;
  color: var(--c-ink-3);
  letter-spacing: -0.03em;
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-ink-4);
}

/* Placeholder cards */
.placeholder-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 12px;
}

.ph-card {
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius);
  padding: 18px 20px;
  background: var(--c-side);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ph-tall {
  grid-row: span 2;
}

.ph-head {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--c-ink-4);
}

.ph-lines {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ph-line {
  height: 10px;
  border-radius: 6px;
  background: var(--c-side-2);
}
</style>
