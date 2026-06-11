import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUsersStore = defineStore('users', () => {
  const users = ref<Map<string, string>>(new Map()) // userId -> displayName

  function setUsers(list: { userId: string; displayName: string }[]): void {
    const m = new Map<string, string>()
    for (const u of list) m.set(u.userId, u.displayName)
    users.value = m
  }

  function displayName(userId: string): string {
    return users.value.get(userId) ?? userId
  }

  return { users, setUsers, displayName }
})
