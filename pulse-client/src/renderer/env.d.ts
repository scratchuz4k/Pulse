/// <reference types="vite/client" />

interface PulseApi {
  storeGet: (key: string) => Promise<string | undefined>
  storeSet: (key: string, value: string) => Promise<void>
  storeDel: (key: string) => Promise<void>
}

declare global {
  interface Window {
    pulseApi: PulseApi
  }
}

export {}
