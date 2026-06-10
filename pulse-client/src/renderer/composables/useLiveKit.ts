import { ref } from 'vue'
import { Room, RoomEvent, Track } from 'livekit-client'

export interface AudioDevice {
  deviceId: string
  label: string
}

let livekitRoom: Room | null = null
const isConnected = ref(false)
const isMicEnabled = ref(false)
const activeSpeakers = ref<string[]>([])
const inputDevices = ref<AudioDevice[]>([])
const outputDevices = ref<AudioDevice[]>([])
const activeInputId = ref<string>('')
const activeOutputId = ref<string>('')
const prioritySpeakerId = ref<string | null>(null)

async function refreshDevices(unlockLabels: boolean = true): Promise<void> {
  // getUserMedia must be called from this context to unlock device labels
  let stream: MediaStream | null = null
  if (unlockLabels) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('[devices] getUserMedia ok, tracks:', stream.getTracks().map(t => t.label))
    } catch (e) {
      console.error('[devices] getUserMedia failed:', e)
    }
  }
  const devices = await navigator.mediaDevices.enumerateDevices()
  stream?.getTracks().forEach(t => t.stop())
  const friendlyLabel = (d: MediaDeviceInfo, fallback: string) => {
    if (d.label) return d.label
    if (d.deviceId === 'default') return `Default ${fallback}`
    if (d.deviceId === 'communications') return `Communications ${fallback}`
    return `${fallback} (${d.deviceId.slice(0, 8)})`
  }
  inputDevices.value = devices
    .filter(d => d.kind === 'audioinput')
    .map(d => ({ deviceId: d.deviceId, label: friendlyLabel(d, 'Microphone') }))
  outputDevices.value = devices
    .filter(d => d.kind === 'audiooutput')
    .map(d => ({ deviceId: d.deviceId, label: friendlyLabel(d, 'Speaker') }))
  console.log('[LiveKit] input devices:', inputDevices.value.map(d => d.label))
  console.log('[LiveKit] output devices:', outputDevices.value.map(d => d.label))
}

export function useLiveKit() {

  function applyDucking(activeSpeakerIdentities: string[]): void {
    if (!prioritySpeakerId.value) return
    const psIsSpeaking = activeSpeakerIdentities.includes(prioritySpeakerId.value)
    document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"]').forEach(el => {
      const identity = el.id.replace('livekit-audio-', '')
      el.volume = psIsSpeaking && identity !== prioritySpeakerId.value ? 0 : 1.0
    })
  }

  function setPrioritySpeaker(userId: string | null): void {
    prioritySpeakerId.value = userId
    if (!userId) {
      document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"]').forEach(el => {
        el.volume = 1.0
      })
    } else {
      applyDucking(activeSpeakers.value)
    }
  }

  async function connect(liveKitToken: string, liveKitHost: string, desiredMicEnabled: boolean = true): Promise<void> {
    // Clean up any existing session first
    if (livekitRoom) {
      await livekitRoom.disconnect()
      livekitRoom = null
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    })

    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      console.log('[LiveKit] track subscribed', track.kind, participant.identity)
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach()
        el.id = `livekit-audio-${participant.identity}`
        if (activeOutputId.value && typeof (el as HTMLAudioElement).setSinkId === 'function') {
          (el as HTMLAudioElement).setSinkId(activeOutputId.value).catch(() => {})
        }
        document.body.appendChild(el)
      }
    })

    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      track.detach().forEach((el) => el.remove())
      document.getElementById(`livekit-audio-${participant.identity}`)?.remove()
    })

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      activeSpeakers.value = speakers.map((s) => s.identity)
      applyDucking(activeSpeakers.value)
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
    await room.startAudio()
    console.log('[LiveKit] connected, audio unlocked, local identity:', room.localParticipant.identity)
    livekitRoom = room
    isConnected.value = true

    try {
      await room.localParticipant.setMicrophoneEnabled(desiredMicEnabled)
      console.log('[LiveKit] microphone', desiredMicEnabled ? 'enabled' : 'disabled')
      isMicEnabled.value = desiredMicEnabled
    } catch (err) {
      console.error('[LiveKit] failed to set microphone state:', err)
    }

    // Refresh after mic is live — labels already unlocked by LiveKit mic, skip getUserMedia
    await refreshDevices(false)
    const currentMic = await room.getActiveDevice('audioinput')
    const currentOut = await room.getActiveDevice('audiooutput')
    activeInputId.value = currentMic ?? inputDevices.value[0]?.deviceId ?? ''
    activeOutputId.value = currentOut ?? outputDevices.value[0]?.deviceId ?? ''
  }

  async function switchInput(deviceId: string): Promise<void> {
    activeInputId.value = deviceId
    if (livekitRoom) await livekitRoom.switchActiveDevice('audioinput', deviceId)
  }

  async function switchOutput(deviceId: string): Promise<void> {
    activeOutputId.value = deviceId
    // Apply to all existing remote audio elements
    document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"]').forEach(el => {
      if (typeof el.setSinkId === 'function') {
        el.setSinkId(deviceId).catch((e: unknown) => console.error('[LiveKit] setSinkId failed:', e))
      }
    })
    if (livekitRoom) await livekitRoom.switchActiveDevice('audiooutput', deviceId)
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

  return {
    connect, disconnect, toggleMic, switchInput, switchOutput,
    isConnected, isMicEnabled, activeSpeakers,
    inputDevices, outputDevices, activeInputId, activeOutputId,
    prioritySpeakerId, setPrioritySpeaker,
  }
}
