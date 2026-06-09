import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Participant {
  connectionId: string
  displayName: string
}

export const useRoomStore = defineStore('room', () => {
  const currentRoomName = ref<string | null>(null)
  const participants = ref<Participant[]>([])

  function setRoom(roomName: string, parts: Participant[]): void {
    currentRoomName.value = roomName
    participants.value = parts
  }

  function addParticipant(connectionId: string, displayName: string): void {
    if (!participants.value.find((p) => p.connectionId === connectionId)) {
      participants.value.push({ connectionId, displayName })
    }
  }

  function removeParticipant(connectionId: string): void {
    participants.value = participants.value.filter(
      (p) => p.connectionId !== connectionId
    )
  }

  function clearRoom(): void {
    currentRoomName.value = null
    participants.value = []
  }

  return {
    currentRoomName,
    participants,
    setRoom,
    addParticipant,
    removeParticipant,
    clearRoom
  }
})
