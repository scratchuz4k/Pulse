import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pulseApi', {
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),
  storeSet: (key: string, value: string) => ipcRenderer.invoke('store:set', key, value),
  storeDel: (key: string) => ipcRenderer.invoke('store:del', key),
  onPttKeyDown: (cb: () => void) => ipcRenderer.on('ptt:key-down', cb),
  onPttKeyUp: (cb: () => void) => ipcRenderer.on('ptt:key-up', cb),
  setPttKey: (accelerator: string) => ipcRenderer.invoke('ptt:set-key', accelerator),
  getPttKey: () => ipcRenderer.invoke('ptt:get-key') as Promise<string | null>,
  removePttListeners: () => {
    ipcRenderer.removeAllListeners('ptt:key-down')
    ipcRenderer.removeAllListeners('ptt:key-up')
  },
})
