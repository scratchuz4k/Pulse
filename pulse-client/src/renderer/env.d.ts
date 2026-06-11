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
}

declare global {
  interface Window {
    pulseApi: PulseApi
  }
}

export {}
