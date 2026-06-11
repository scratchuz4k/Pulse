import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pulseApi', {
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),
  storeSet: (key: string, value: string) => ipcRenderer.invoke('store:set', key, value),
  storeDel: (key: string) => ipcRenderer.invoke('store:del', key),
  setPttKeyByCode: (code: string, label: string) =>
    ipcRenderer.invoke('ptt:set-key-by-code', code, label) as Promise<boolean>,
startPttCapture: () => ipcRenderer.invoke('ptt:start-capture'),
  getPttKey: () => ipcRenderer.invoke('ptt:get-key') as Promise<string | null>,
  onPttCaptured: (cb: (label: string) => void) =>
    ipcRenderer.on('ptt:captured', (_e, lbl: string) => cb(lbl)),
  getPttMode: () => ipcRenderer.invoke('ptt:get-mode') as Promise<boolean>,
  setPttMode: (enabled: boolean) => ipcRenderer.invoke('ptt:set-mode', enabled),
  onPttKeyDown: (cb: () => void) => ipcRenderer.on('ptt:keydown', cb),
  onPttKeyUp: (cb: () => void) => ipcRenderer.on('ptt:keyup', cb),
  removePttListeners: () => {
    ipcRenderer.removeAllListeners('ptt:keydown')
    ipcRenderer.removeAllListeners('ptt:keyup')
  },
  setWhisperOpenMic: (groupId: string, enabled: boolean) =>
    ipcRenderer.invoke('whisper:set-open-mic', groupId, enabled),
  getWhisperOpenMic: (groupId: string) =>
    ipcRenderer.invoke('whisper:get-open-mic', groupId) as Promise<boolean>,
  setWhisperPttKeyByCode: (groupId: string, code: string, label: string) =>
    ipcRenderer.invoke('whisper:set-ptt-key', groupId, code, label) as Promise<boolean>,
  getWhisperPttKey: (groupId: string) =>
    ipcRenderer.invoke('whisper:get-ptt-key', groupId) as Promise<{ keycode: number; label: string } | null>,
  clearWhisperPttKey: (groupId: string) =>
    ipcRenderer.invoke('whisper:clear-ptt-key', groupId),
  setWhisperPttMode: (groupId: string, mode: 'inclusive' | 'exclusive') =>
    ipcRenderer.invoke('whisper:set-ptt-mode', groupId, mode),
  getWhisperPttMode: (groupId: string) =>
    ipcRenderer.invoke('whisper:get-ptt-mode', groupId) as Promise<'inclusive' | 'exclusive'>,
  onWhisperPttKeyDown: (cb: (payload: { groupId: string; mode: 'inclusive' | 'exclusive' }) => void) =>
    ipcRenderer.on('whisper:ptt-keydown', (_e, payload) => cb(payload)),
  onWhisperPttKeyUp: (cb: (payload: { groupId: string }) => void) =>
    ipcRenderer.on('whisper:ptt-keyup', (_e, payload) => cb(payload)),
  removeWhisperPttListeners: () => {
    ipcRenderer.removeAllListeners('whisper:ptt-keydown')
    ipcRenderer.removeAllListeners('whisper:ptt-keyup')
  },
})
