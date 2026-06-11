import { ref } from 'vue'
import { Room, RoomEvent, ParticipantEvent, Track } from 'livekit-client'
import { useWhisperStore } from '../stores/whisper'

export interface AudioDevice {
  deviceId: string
  label: string
}

let mainRoom: Room | null = null
const whisperRooms = new Map<string, Room>()
const whisperOpenMic = new Map<string, boolean>()
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
      el.volume = psIsSpeaking && identity !== prioritySpeakerId.value ? 0.15 : 1.0
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
    if (mainRoom) {
      await mainRoom.disconnect()
      mainRoom = null
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
    mainRoom = room
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
    if (mainRoom) await mainRoom.switchActiveDevice('audioinput', deviceId)
  }

  async function switchOutput(deviceId: string): Promise<void> {
    activeOutputId.value = deviceId
    // Apply to all existing remote audio elements — both main and whisper
    document.querySelectorAll<HTMLAudioElement>('audio[id^="livekit-audio-"], audio[id^="whisper-audio-"]').forEach(el => {
      if (typeof el.setSinkId === 'function') {
        el.setSinkId(deviceId).catch((e: unknown) => console.error('[LiveKit] setSinkId failed:', e))
      }
    })
    if (mainRoom) await mainRoom.switchActiveDevice('audiooutput', deviceId)
  }

  async function disconnect(): Promise<void> {
    if (mainRoom) {
      await mainRoom.disconnect()
      mainRoom = null
    }
    isConnected.value = false
    isMicEnabled.value = false
    activeSpeakers.value = []
  }

  async function toggleMic(): Promise<void> {
    if (!mainRoom) return
    const next = !isMicEnabled.value
    await mainRoom.localParticipant.setMicrophoneEnabled(next)
    isMicEnabled.value = next
  }

  async function connectWhisper(groupId: string, token: string, host: string): Promise<void> {
    if (whisperRooms.has(groupId)) return // already connected — idempotent
    const room = new Room({ adaptiveStream: true, dynacast: true })

    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach()
        el.id = `whisper-audio-${groupId}-${participant.identity}` // CRITICAL: distinct prefix
        if (activeOutputId.value && typeof (el as HTMLAudioElement).setSinkId === 'function') {
          (el as HTMLAudioElement).setSinkId(activeOutputId.value).catch(() => {})
        }
        document.body.appendChild(el)
      }
    })

    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      track.detach().forEach(el => el.remove())
      document.getElementById(`whisper-audio-${groupId}-${participant.identity}`)?.remove()
    })

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      document.getElementById(`whisper-audio-${groupId}-${participant.identity}`)?.remove()
    })

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const identities = speakers.map(s => s.identity)
      const localId = room.localParticipant.identity
      if (room.localParticipant.isSpeaking && !identities.includes(localId)) {
        identities.push(localId)
      }
      useWhisperStore().setSpeakers(groupId, identities)
    })

    room.localParticipant.on(ParticipantEvent.IsSpeakingChanged, (speaking: boolean) => {
      const localId = room.localParticipant.identity
      const store = useWhisperStore()
      const current = store.speakers.get(groupId) ?? []
      store.setSpeakers(groupId, speaking
        ? current.includes(localId) ? current : [...current, localId]
        : current.filter(id => id !== localId)
      )
    })

    let speakingPoller: ReturnType<typeof setInterval> | null = null

    room.on(RoomEvent.Disconnected, () => {
      if (speakingPoller) clearInterval(speakingPoller)
      whisperRooms.delete(groupId)
      whisperOpenMic.delete(groupId)
      useWhisperStore().clearSpeakers(groupId)
      document.querySelectorAll<HTMLAudioElement>(`audio[id^="whisper-audio-${groupId}-"]`).forEach(el => el.remove())
    })

    await room.connect(host, token)
    await room.startAudio()
    // mic starts disabled — caller sets it based on open mic setting

    // Poll local speaking state as fallback when IsSpeakingChanged doesn't fire
    speakingPoller = setInterval(() => {
      const localId = room.localParticipant.identity
      const speaking = room.localParticipant.isSpeaking
      const store = useWhisperStore()
      const current = store.speakers.get(groupId) ?? []
      const inList = current.some(id => id.toLowerCase() === localId.toLowerCase())
      if (speaking !== inList) {
        store.setSpeakers(groupId, speaking
          ? [...current, localId]
          : current.filter(id => id.toLowerCase() !== localId.toLowerCase())
        )
      }
    }, 500)

    whisperRooms.set(groupId, room)
    console.log(`[LiveKit] whisper room connected: ${groupId}`)
  }

  async function disconnectWhisper(groupId: string): Promise<void> {
    const room = whisperRooms.get(groupId)
    if (!room) return
    await room.disconnect()
    whisperRooms.delete(groupId)
    useWhisperStore().clearSpeakers(groupId)
    document.querySelectorAll<HTMLAudioElement>(`audio[id^="whisper-audio-${groupId}-"]`).forEach(el => el.remove())
  }

  function getWhisperRoom(groupId: string): Room | undefined {
    return whisperRooms.get(groupId)
  }

  async function setMainMicEnabled(enabled: boolean): Promise<void> {
    if (!mainRoom) return
    await mainRoom.localParticipant.setMicrophoneEnabled(enabled)
    isMicEnabled.value = enabled
  }

  function setWhisperOpenMicCache(groupId: string, enabled: boolean): void {
    whisperOpenMic.set(groupId, enabled)
  }

  // Mute/unmute whisper mics — respects per-group open mic setting on unmute
  async function applyMuteToWhisperRooms(muted: boolean): Promise<void> {
    for (const [groupId, room] of whisperRooms) {
      if (muted) {
        await room.localParticipant.setMicrophoneEnabled(false)
      } else {
        if (whisperOpenMic.get(groupId)) await room.localParticipant.setMicrophoneEnabled(true)
      }
    }
  }

  // Silence/restore all whisper audio output
  function applyDeafenToWhisperRooms(deafened: boolean): void {
    document.querySelectorAll<HTMLAudioElement>('audio[id^="whisper-audio-"]').forEach(el => {
      el.volume = deafened ? 0 : 1
    })
  }

  return {
    connect, disconnect, toggleMic, switchInput, switchOutput,
    isConnected, isMicEnabled, activeSpeakers,
    inputDevices, outputDevices, activeInputId, activeOutputId,
    prioritySpeakerId, setPrioritySpeaker,
    connectWhisper, disconnectWhisper, getWhisperRoom, setMainMicEnabled,
    applyMuteToWhisperRooms, applyDeafenToWhisperRooms, setWhisperOpenMicCache,
  }
}
