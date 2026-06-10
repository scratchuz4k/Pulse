/// <reference types="vite/client" />

interface PulseApi {
  storeGet: (key: string) => Promise<string | undefined>
  storeSet: (key: string, value: string) => Promise<void>
  storeDel: (key: string) => Promise<void>
  setPttKey: (accelerator: string) => Promise<boolean>
  getPttKey: () => Promise<string | null>
  getPttMode: () => Promise<boolean>
  setPttMode: (enabled: boolean) => Promise<void>
  onPttKeyDown: (cb: () => void) => void
  onPttKeyUp: (cb: () => void) => void
  removePttListeners: () => void
  setWhisperPttKey: (groupId: string, accelerator: string | null) => Promise<boolean>
  getWhisperPttKey: (groupId: string) => Promise<string | null>
  setWhisperTransmitMode: (groupId: string, mode: string) => Promise<boolean>
  getWhisperTransmitMode: (groupId: string) => Promise<string>
  setWhisperSuppressMain: (groupId: string, suppress: boolean) => Promise<boolean>
  getWhisperSuppressMain: (groupId: string) => Promise<boolean>
  onWhisperPttKeyDown: (cb: (groupId: string) => void) => void
  onWhisperPttKeyUp: (cb: (groupId: string) => void) => void
  removeWhisperPttListeners: () => void
}

declare global {
  interface Window {
    pulseApi: PulseApi
  }
}

export {}
