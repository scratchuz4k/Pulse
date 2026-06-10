import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface WhisperGroupEntry {
  groupId: string
  name: string
  visibility: 'hidden' | 'existence' | 'full'
  isMember: boolean
  memberUserIds?: string[]
  memberCount?: number
}

export const useWhisperStore = defineStore('whisper', () => {
  const groups = ref<WhisperGroupEntry[]>([])
  const speakers = ref<Map<string, string[]>>(new Map())
  const _isAdmin = ref(false)

  const myGroups = computed(() => groups.value.filter(g => g.isMember))

  const isAdmin = computed(() => _isAdmin.value)

  function setGroups(incoming: WhisperGroupEntry[]): void {
    groups.value = incoming
  }

  function removeGroup(groupId: string): void {
    groups.value = groups.value.filter(g => g.groupId !== groupId)
  }

  function setSpeakers(groupId: string, speakerIds: string[]): void {
    const updated = new Map(speakers.value)
    updated.set(groupId, speakerIds)
    speakers.value = updated
  }

  function clearSpeakers(groupId: string): void {
    const updated = new Map(speakers.value)
    updated.delete(groupId)
    speakers.value = updated
  }

  function setIsAdmin(value: boolean): void {
    _isAdmin.value = value
  }

  return {
    groups, speakers, myGroups, isAdmin,
    setGroups, removeGroup, setSpeakers, clearSpeakers, setIsAdmin
  }
})
