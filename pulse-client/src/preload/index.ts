import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pulseApi', {
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),
  storeSet: (key: string, value: string) => ipcRenderer.invoke('store:set', key, value),
  storeDel: (key: string) => ipcRenderer.invoke('store:del', key),
  setPttKey: (accelerator: string) => ipcRenderer.invoke('ptt:set-key', accelerator),
  getPttKey: () => ipcRenderer.invoke('ptt:get-key') as Promise<string | null>,
  getPttMode: () => ipcRenderer.invoke('ptt:get-mode') as Promise<boolean>,
  setPttMode: (enabled: boolean) => ipcRenderer.invoke('ptt:set-mode', enabled),
  onPttKeyDown: (cb: () => void) => ipcRenderer.on('ptt:keydown', cb),
  onPttKeyUp: (cb: () => void) => ipcRenderer.on('ptt:keyup', cb),
  removePttListeners: () => {
    ipcRenderer.removeAllListeners('ptt:keydown')
    ipcRenderer.removeAllListeners('ptt:keyup')
  },
  setWhisperPttKey: (groupId: string, accelerator: string | null) =>
    ipcRenderer.invoke('whisper-ptt:set-key', groupId, accelerator) as Promise<boolean>,
  getWhisperPttKey: (groupId: string) =>
    ipcRenderer.invoke('whisper-ptt:get-key', groupId) as Promise<string | null>,
  setWhisperTransmitMode: (groupId: string, mode: string) =>
    ipcRenderer.invoke('whisper:set-transmit-mode', groupId, mode) as Promise<boolean>,
  getWhisperTransmitMode: (groupId: string) =>
    ipcRenderer.invoke('whisper:get-transmit-mode', groupId) as Promise<string>,
  setWhisperSuppressMain: (groupId: string, suppress: boolean) =>
    ipcRenderer.invoke('whisper:set-suppress-main', groupId, suppress) as Promise<boolean>,
  getWhisperSuppressMain: (groupId: string) =>
    ipcRenderer.invoke('whisper:get-suppress-main', groupId) as Promise<boolean>,
  onWhisperPttKeyDown: (cb: (groupId: string) => void) =>
    ipcRenderer.on('whisper-ptt:keydown', (_e, gid: string) => cb(gid)),
  onWhisperPttKeyUp: (cb: (groupId: string) => void) =>
    ipcRenderer.on('whisper-ptt:keyup', (_e, gid: string) => cb(gid)),
  removeWhisperPttListeners: () => {
    ipcRenderer.removeAllListeners('whisper-ptt:keydown')
    ipcRenderer.removeAllListeners('whisper-ptt:keyup')
  },
})
