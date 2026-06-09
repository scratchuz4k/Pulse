<template>
  <div class="login-view">
    <h1>Pulse</h1>
    <form @submit.prevent>
      <div>
        <label for="displayName">Display Name</label>
        <input id="displayName" v-model="displayName" type="text" placeholder="Display name" required />
      </div>
      <div>
        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" placeholder="Password" required />
      </div>
      <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
      <div class="buttons">
        <button type="button" :disabled="loading" @click="handleRegister">Register</button>
        <button type="button" :disabled="loading" @click="handleLogin">Login</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { register, login } = useAuth()

const displayName = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function handleRegister(): Promise<void> {
  errorMessage.value = ''
  loading.value = true
  try {
    await register(displayName.value, password.value)
    router.push('/room')
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Registration failed'
  } finally {
    loading.value = false
  }
}

async function handleLogin(): Promise<void> {
  errorMessage.value = ''
  loading.value = true
  try {
    await login(displayName.value, password.value)
    router.push('/room')
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
