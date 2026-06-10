<template>
  <div class="login-shell">
    <div class="login-card">
      <div class="login-logo">
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      </div>
      <h1 class="login-title">Pulse</h1>
      <p class="login-sub">Always know where the energy is.</p>

      <form class="login-form" @submit.prevent>
        <label class="field-label">
          Display Name
          <input
            v-model="displayName"
            class="field-input"
            type="text"
            placeholder="Your name"
            autocomplete="username"
            required
          />
        </label>
        <label class="field-label">
          Password
          <input
            v-model="password"
            class="field-input"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
            required
          />
        </label>

        <div v-if="errorMessage" class="login-error">{{ errorMessage }}</div>

        <div class="login-actions">
          <button
            class="btn-secondary"
            type="button"
            :disabled="loading"
            @click="handleRegister"
          >
            Register
          </button>
          <button
            class="btn-primary"
            type="button"
            :disabled="loading"
            @click="handleLogin"
          >
            Log in
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";

const router = useRouter();
const { register, login } = useAuth();

const displayName = ref("");
const password = ref("");
const errorMessage = ref("");
const loading = ref(false);

async function handleRegister(): Promise<void> {
  errorMessage.value = "";
  loading.value = true;
  try {
    await register(displayName.value, password.value);
    router.push("/dashboard");
  } catch (err: unknown) {
    errorMessage.value =
      err instanceof Error ? err.message : "Registration failed";
  } finally {
    loading.value = false;
  }
}

async function handleLogin(): Promise<void> {
  errorMessage.value = "";
  loading.value = true;
  try {
    await login(displayName.value, password.value);
    router.push("/dashboard");
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-shell {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-side);
}

.login-card {
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 40px 36px 36px;
  width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.login-logo {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.login-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--c-ink);
  letter-spacing: -0.02em;
}

.login-sub {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--c-ink-4);
  text-align: center;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-input {
  height: 38px;
  border: 1px solid var(--c-border-2);
  border-radius: var(--radius-sm);
  background: var(--c-bg);
  padding: 0 12px;
  font-size: 14px;
  font-family: inherit;
  color: var(--c-ink);
  outline: none;
  transition: border-color 0.12s;
}
.field-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
.field-input::placeholder {
  color: var(--c-ink-5);
}

.login-error {
  font-size: 13px;
  color: var(--live);
  padding: 8px 12px;
  background: rgba(229, 72, 77, 0.08);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(229, 72, 77, 0.2);
}

.login-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  height: 38px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.12s;
}
.btn-primary {
  background: var(--accent);
  color: #fff;
}
.btn-secondary {
  background: var(--c-side-2);
  color: var(--c-ink-2);
  border: 1px solid var(--c-border-2);
}
.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.45;
  cursor: default;
}
.btn-primary:not(:disabled):hover {
  opacity: 0.88;
}
.btn-secondary:not(:disabled):hover {
  background: var(--c-side);
}
</style>
