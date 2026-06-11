import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ServerInfo {
  id: number
  name: string
  ownerId: string
  inviteCode: string
}

export const useServerStore = defineStore('server', () => {
  const servers = ref<ServerInfo[]>([])
  const activeServerId = ref<number | null>(null)

  const activeServer = computed(() => servers.value.find(s => s.id === activeServerId.value) ?? null)

  function setServers(list: ServerInfo[]): void {
    servers.value = list
  }

  function setActiveServer(id: number): void {
    activeServerId.value = id
  }

  function clearServers(): void {
    servers.value = []
    activeServerId.value = null
  }

  return { servers, activeServerId, activeServer, setServers, setActiveServer, clearServers }
})
