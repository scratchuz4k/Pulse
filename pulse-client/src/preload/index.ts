import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('pulseApi', {
  storeGet: (key: string) => ipcRenderer.invoke('store:get', key),
  storeSet: (key: string, value: string) => ipcRenderer.invoke('store:set', key, value),
  storeDel: (key: string) => ipcRenderer.invoke('store:del', key),
})
