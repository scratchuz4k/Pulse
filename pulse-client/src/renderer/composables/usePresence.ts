import * as signalR from '@microsoft/signalr'
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRoomStore } from '../stores/room'

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
      (roomName: string, participants: { connectionId: string; displayName: string }[]) => {
        roomStore.setRoom(roomName, participants)
      }
    )

    hubConnection.on(
      'ParticipantJoined',
      (connectionId: string, displayName: string) => {
        roomStore.addParticipant(connectionId, displayName)
      }
    )

    hubConnection.on('ParticipantLeft', (connectionId: string) => {
      roomStore.removeParticipant(connectionId)
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

  return { connect, joinRoom, leaveRoom, disconnect, connectionState }
}
