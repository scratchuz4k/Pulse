import { ref } from 'vue'
import {
  Room,
  RoomEvent,
  Track,
} from 'livekit-client'

// Module-level singleton — one LiveKit room per app session
let livekitRoom: Room | null = null

export function useLiveKit() {
  const isConnected = ref(false)
  const isMicEnabled = ref(false)
  const activeSpeakers = ref<string[]>([]) // participant identities currently speaking

  async function connect(liveKitToken: string, liveKitHost: string): Promise<void> {
    // Clean up any existing session first
    if (livekitRoom) {
      await livekitRoom.disconnect()
      livekitRoom = null
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    })

    // Wire room events before connecting
    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach()
        el.id = `livekit-audio-${participant.identity}`
        document.body.appendChild(el)
      }
    })

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove())
    })

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      activeSpeakers.value = speakers.map((s) => s.identity)
    })

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      document.getElementById(`livekit-audio-${participant.identity}`)?.remove()
    })

    room.on(RoomEvent.Disconnected, () => {
      isConnected.value = false
      isMicEnabled.value = false
      activeSpeakers.value = []
    })

    await room.connect(liveKitHost, liveKitToken)
    await room.localParticipant.setMicrophoneEnabled(true)

    livekitRoom = room
    isConnected.value = true
    isMicEnabled.value = true
  }

  async function disconnect(): Promise<void> {
    if (livekitRoom) {
      await livekitRoom.disconnect()
      livekitRoom = null
    }
    isConnected.value = false
    isMicEnabled.value = false
    activeSpeakers.value = []
  }

  async function toggleMic(): Promise<void> {
    if (!livekitRoom) return
    const next = !isMicEnabled.value
    await livekitRoom.localParticipant.setMicrophoneEnabled(next)
    isMicEnabled.value = next
  }

  return { connect, disconnect, toggleMic, isConnected, isMicEnabled, activeSpeakers }
}
