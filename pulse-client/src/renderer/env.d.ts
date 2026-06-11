/// <reference types="vite/client" />

interface PulseApi {
  storeGet: (key: string) => Promise<string | undefined>
  storeSet: (key: string, value: string) => Promise<void>
  storeDel: (key: string) => Promise<void>
  setPttKeyByCode: (code: string, label: string) => Promise<boolean>
startPttCapture: () => Promise<void>
  getPttKey: () => Promise<string | null>
  getPttMode: () => Promise<boolean>
  setPttMode: (enabled: boolean) => Promise<void>
  onPttKeyDown: (cb: () => void) => void
  onPttKeyUp: (cb: () => void) => void
  onPttCaptured: (cb: (label: string) => void) => void
  removePttListeners: () => void
  setWhisperOpenMic: (groupId: string, enabled: boolean) => Promise<void>
  getWhisperOpenMic: (groupId: string) => Promise<boolean>
  setWhisperPttKeyByCode: (groupId: string, code: string, label: string) => Promise<boolean>
  getWhisperPttKey: (groupId: string) => Promise<{ keycode: number; label: string } | null>
  clearWhisperPttKey: (groupId: string) => Promise<void>
  setWhisperPttMode: (groupId: string, mode: 'inclusive' | 'exclusive') => Promise<void>
  getWhisperPttMode: (groupId: string) => Promise<'inclusive' | 'exclusive'>
  onWhisperPttKeyDown: (cb: (payload: { groupId: string; mode: 'inclusive' | 'exclusive' }) => void) => void
  onWhisperPttKeyUp: (cb: (payload: { groupId: string }) => void) => void
  removeWhisperPttListeners: () => void
}

declare global {
  interface Window {
    pulseApi: PulseApi
  }
}

export {}
