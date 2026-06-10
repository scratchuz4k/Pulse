import * as signalR from '@microsoft/signalr'
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRoomStore } from '../stores/room'
import { useLiveKit } from './useLiveKit'

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

let hubConnection: signalR.HubConnection | null = null
const connectionState = ref<ConnectionState>('disconnected')

export function usePresence() {
  const authStore = useAuthStore()
  const roomStore = useRoomStore()

  async function connect(serverUrl: string): Promise<void> {
    if (hubConnection) {
      await disconnect()
    }

    connectionState.value = 'connecting'

    hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${serverUrl}/hubs/presence`, {
        accessTokenFactory: () => authStore.accessToken ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build()

    hubConnection.on(
      'RoomJoined',
      (roomName: string, participants: { connectionId: string; displayName: string; userId: string }[]) => {
        roomStore.setRoom(roomName, participants)
      }
    )

    hubConnection.on(
      'ParticipantJoined',
      (connectionId: string, displayName: string, userId: string) => {
        roomStore.addParticipant(connectionId, displayName, userId)
      }
    )

    hubConnection.on('ParticipantLeft', (connectionId: string) => {
      roomStore.removeParticipant(connectionId)
    })

    hubConnection.on('ParticipantMuted', (connectionId: string) => {
      roomStore.setParticipantMuted(connectionId, true)
    })

    hubConnection.on('ParticipantUnmuted', (connectionId: string) => {
      roomStore.setParticipantMuted(connectionId, false)
    })

    hubConnection.on('ParticipantDeafened', (connectionId: string) => {
      roomStore.setParticipantDeafened(connectionId, true)
    })

    hubConnection.on('ParticipantUndeafened', (connectionId: string) => {
      roomStore.setParticipantDeafened(connectionId, false)
    })

    hubConnection.on('RoomListUpdated', (list: { id: number; name: string; createdByUserId?: string; participants: { displayName: string; userId: string }[] }[]) => {
      roomStore.setRoomList(list)
    })

    hubConnection.on('PrioritySpeakerChanged', (userId: string | null) => {
      const { setPrioritySpeaker } = useLiveKit()
      setPrioritySpeaker(userId)
      roomStore.setPrioritySpeaker(userId)
    })

    hubConnection.onreconnecting(() => {
      connectionState.value = 'connecting'
    })

    hubConnection.onreconnected(() => {
      connectionState.value = 'connected'
    })

    hubConnection.onclose(() => {
      connectionState.value = 'disconnected'
    })

    try {
      await hubConnection.start()
      connectionState.value = 'connected'
      fetch(`${serverUrl}/rooms`, {
        headers: { Authorization: `Bearer ${authStore.accessToken}` }
      })
        .then(r => r.json())
        .then((list: { id: number; name: string; participants: { displayName: string; userId: string }[] }[]) => roomStore.setRoomList(list))
        .catch(e => console.error('[usePresence] failed to load rooms:', e))
    } catch (err) {
      console.error('SignalR connection error:', err)
      connectionState.value = 'error'
      throw err
    }
  }

  async function joinRoom(roomName: string): Promise<void> {
    if (!hubConnection) throw new Error('Not connected')
    await hubConnection.invoke('JoinRoom', roomName)
  }

  async function leaveRoom(roomName: string): Promise<void> {
    if (!hubConnection) return
    await hubConnection.invoke('LeaveRoom', roomName)
  }

  async function disconnect(): Promise<void> {
    if (hubConnection) {
      await hubConnection.stop()
      hubConnection = null
    }
    connectionState.value = 'disconnected'
  }

  async function broadcastMuteChanged(isMuted: boolean): Promise<void> {
    if (!hubConnection) return
    await hubConnection.invoke('MuteChanged', isMuted)
  }

  async function broadcastDeafenChanged(isDeafened: boolean): Promise<void> {
    if (!hubConnection) return
    await hubConnection.invoke('DeafenChanged', isDeafened)
  }

  async function createRoom(serverUrl: string, name: string): Promise<void> {
    const response = await fetch(`${serverUrl}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`
      },
      body: JSON.stringify({ name })
    })
    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('A room with that name already exists.')
      }
      throw new Error('Failed to create room.')
    }
  }

  async function assignPrioritySpeaker(roomName: string, userId: string): Promise<void> {
    if (!hubConnection) return
    await hubConnection.invoke('AssignPrioritySpeaker', roomName, userId)
  }

  async function removePrioritySpeaker(roomName: string): Promise<void> {
    if (!hubConnection) return
    await hubConnection.invoke('RemovePrioritySpeaker', roomName)
  }

  return { connect, joinRoom, leaveRoom, disconnect, connectionState, broadcastMuteChanged, broadcastDeafenChanged, createRoom, assignPrioritySpeaker, removePrioritySpeaker }
}
