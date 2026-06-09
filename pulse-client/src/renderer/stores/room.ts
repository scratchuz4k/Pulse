import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Participant {
  connectionId: string
  displayName: string
  userId: string
  isMuted: boolean
}

export interface RoomInfo {
  id: number
  name: string
}

export const useRoomStore = defineStore('room', () => {
  const currentRoomName = ref<string | null>(null)
  const participants = ref<Participant[]>([])
  const rooms = ref<RoomInfo[]>([])

  function setRoom(roomName: string, parts: Omit<Participant, 'isMuted'>[]): void {
    currentRoomName.value = roomName
    participants.value = parts.map(p => ({ ...p, isMuted: false }))
  }

  function addParticipant(connectionId: string, displayName: string, userId: string, isMuted: boolean = false): void {
    if (!participants.value.find((p) => p.connectionId === connectionId)) {
      participants.value.push({ connectionId, displayName, userId, isMuted })
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

  function setParticipantMuted(connectionId: string, isMuted: boolean): void {
    const p = participants.value.find(p => p.connectionId === connectionId)
    if (p) p.isMuted = isMuted
  }

  function setRoomList(list: RoomInfo[]): void {
    rooms.value = list
  }

  return {
    currentRoomName,
    participants,
    rooms,
    setRoom,
    addParticipant,
    removeParticipant,
    clearRoom,
    setParticipantMuted,
    setRoomList
  }
})
