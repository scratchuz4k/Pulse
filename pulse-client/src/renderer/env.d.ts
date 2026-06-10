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
}

declare global {
  interface Window {
    pulseApi: PulseApi
  }
}

export {}
