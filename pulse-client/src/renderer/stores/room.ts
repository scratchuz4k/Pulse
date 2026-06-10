import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export interface Participant {
  connectionId: string
  displayName: string
  userId: string
  isMuted: boolean
  isDeafened: boolean
}

export interface RoomParticipantSummary {
  displayName: string
  userId: string
}

export interface RoomInfo {
  id: number
  name: string
  createdByUserId?: string
  participants: RoomParticipantSummary[]
}

export const useRoomStore = defineStore('room', () => {
  const authStore = useAuthStore()
  const currentRoomName = ref<string | null>(null)
  const participants = ref<Participant[]>([])
  const rooms = ref<RoomInfo[]>([])
  const prioritySpeakerId = ref<string | null>(null)

  const isAdmin = computed(() => {
    if (!currentRoomName.value) return false
    const room = rooms.value.find(r => r.name === currentRoomName.value)
    return !!room?.createdByUserId && room.createdByUserId === authStore.userId
  })

  function setRoom(roomName: string, parts: Omit<Participant, 'isMuted'>[]): void {
    currentRoomName.value = roomName
    participants.value = parts.map(p => ({ ...p, isMuted: false, isDeafened: false }))
  }

  function addParticipant(connectionId: string, displayName: string, userId: string, isMuted: boolean = false, isDeafened: boolean = false): void {
    if (!participants.value.find((p) => p.connectionId === connectionId)) {
      participants.value.push({ connectionId, displayName, userId, isMuted, isDeafened })
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

  function setParticipantDeafened(connectionId: string, isDeafened: boolean): void {
    const p = participants.value.find(p => p.connectionId === connectionId)
    if (p) p.isDeafened = isDeafened
  }

  function setRoomList(list: RoomInfo[]): void {
    rooms.value = list.map(r => ({ ...r, participants: r.participants ?? [] }))
  }

  function setPrioritySpeaker(userId: string | null): void {
    prioritySpeakerId.value = userId
  }

  return {
    currentRoomName,
    participants,
    rooms,
    prioritySpeakerId,
    isAdmin,
    setRoom,
    addParticipant,
    removeParticipant,
    clearRoom,
    setParticipantMuted,
    setParticipantDeafened,
    setRoomList,
    setPrioritySpeaker
  }
})
