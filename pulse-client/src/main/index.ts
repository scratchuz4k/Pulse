import { app, shell, BrowserWindow, ipcMain, session } from 'electron'

// Allow audio autoplay and mic access without user gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
import { join } from 'path'
import { uIOhook, UiohookKey } from 'uiohook-napi'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { machineId } from 'node-machine-id'
let store: InstanceType<typeof Store>
let mainWindow: BrowserWindow | null = null

function getPttKeycode(): number | null {
  return (store.get('ptt.keycode') as number | undefined) ?? null
}

// In-memory whisper PTT map: groupId -> { keycode, mode }
const whisperPttMap = new Map<string, { keycode: number; mode: 'inclusive' | 'exclusive' }>()
// Keycodes where main PTT was suppressed on keydown (exclusive whisper)
const suppressedMainPttKeys = new Set<number>()


// Human-readable label for uiohook keycodes
const UIOHOOK_TO_LABEL: Record<number, string> = {}
for (const [name, code] of Object.entries(UiohookKey as Record<string, number>)) {
  if (!UIOHOOK_TO_LABEL[code]) UIOHOOK_TO_LABEL[code] = name
}

// Map DOM KeyboardEvent.code → uiohook keycode for DOM-based key capture
function domCodeToUiohook(code: string): number | null {
  const uk = UiohookKey as Record<string, number>
  if (/^Key[A-Z]$/.test(code)) return uk[code.slice(3)] ?? null      // KeyJ → J
  if (/^Digit[0-9]$/.test(code)) return uk[`Num${code.slice(5)}`] ?? null // Digit5 → Num5
  return uk[code] ?? null  // Space, Enter, F1, ArrowUp, etc.
}

async function createStore(): Promise<void> {
  const key = await machineId()
  store = new Store({ encryptionKey: key })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.pulse.client')

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(true) // grant all permissions in dev
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await createStore()

  ipcMain.handle('store:get', (_event, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('store:set', (_event, key: string, value: string) => {
    store.set(key, value)
  })

  ipcMain.handle('store:del', (_event, key: string) => {
    store.delete(key)
  })

  ipcMain.handle('ptt:get-key', () => (store.get('ptt.keyLabel') as string | undefined) ?? null)

  ipcMain.handle('ptt:get-mode', () => (store.get('ptt.mode') as boolean | undefined) ?? false)

  ipcMain.handle('ptt:set-mode', (_event, enabled: boolean) => {
    store.set('ptt.mode', !!enabled)
  })

  // DOM-based capture: renderer sends e.code + label, we resolve uiohook keycode here
  ipcMain.handle('ptt:set-key-by-code', (_event, code: string, label: string) => {
    const keycode = domCodeToUiohook(code)
    if (keycode === null) return false
    store.set('ptt.keycode', keycode)
    store.set('ptt.keyLabel', label)
    return true
  })

  ipcMain.handle('ptt:start-capture', () => {
    const handler = (e: { keycode: number }): void => {
      uIOhook.off('keydown', handler)
      const label = UIOHOOK_TO_LABEL[e.keycode] ?? `Key${e.keycode}`
      store.set('ptt.keycode', e.keycode)
      store.set('ptt.keyLabel', label)
      mainWindow?.webContents.send('ptt:captured', label)
    }
    uIOhook.on('keydown', handler)
  })

  ipcMain.handle('whisper:set-open-mic', (_event, groupId: string, enabled: boolean) => {
    store.set(`whisper.${groupId}.openMic`, !!enabled)
  })

  ipcMain.handle('whisper:get-open-mic', (_event, groupId: string) => {
    return (store.get(`whisper.${groupId}.openMic`) as boolean | undefined) ?? false
  })

  ipcMain.handle('whisper:set-ptt-key', (_event, groupId: string, code: string, label: string) => {
    const keycode = domCodeToUiohook(code)
    if (keycode === null) return false
    store.set(`whisper.${groupId}.pttKeycode`, keycode)
    store.set(`whisper.${groupId}.pttLabel`, label)
    const existing = whisperPttMap.get(groupId)
    whisperPttMap.set(groupId, { keycode, mode: existing?.mode ?? 'inclusive' })
    return true
  })

  ipcMain.handle('whisper:get-ptt-key', (_event, groupId: string) => {
    const keycode = store.get(`whisper.${groupId}.pttKeycode`) as number | undefined
    const label = store.get(`whisper.${groupId}.pttLabel`) as string | undefined
    if (!keycode) return null
    return { keycode, label: label ?? `Key${keycode}` }
  })

  ipcMain.handle('whisper:clear-ptt-key', (_event, groupId: string) => {
    store.delete(`whisper.${groupId}.pttKeycode` as never)
    store.delete(`whisper.${groupId}.pttLabel` as never)
    whisperPttMap.delete(groupId)
  })

  ipcMain.handle('whisper:set-ptt-mode', (_event, groupId: string, mode: 'inclusive' | 'exclusive') => {
    store.set(`whisper.${groupId}.pttMode`, mode)
    const existing = whisperPttMap.get(groupId)
    if (existing) whisperPttMap.set(groupId, { ...existing, mode })
  })

  ipcMain.handle('whisper:get-ptt-mode', (_event, groupId: string) => {
    return (store.get(`whisper.${groupId}.pttMode`) as string | undefined) ?? 'inclusive'
  })

  createWindow()

  // Global PTT hook — WH_KEYBOARD_LL on Windows: passively listens, always calls
  // CallNextHookEx so the key is NOT consumed and still works in other applications.
  uIOhook.on('keydown', (e) => {
    let suppressMainPtt = false
    for (const [groupId, { keycode, mode }] of whisperPttMap) {
      if (e.keycode === keycode) {
        mainWindow?.webContents.send('whisper:ptt-keydown', { groupId, mode })
        if (mode === 'exclusive') suppressMainPtt = true
      }
    }
    const code = getPttKeycode()
    if (code && e.keycode === code) {
      if (suppressMainPtt) {
        suppressedMainPttKeys.add(e.keycode)
      } else {
        mainWindow?.webContents.send('ptt:keydown')
      }
    }
  })

  uIOhook.on('keyup', (e) => {
    for (const [groupId, { keycode }] of whisperPttMap) {
      if (e.keycode === keycode) {
        mainWindow?.webContents.send('whisper:ptt-keyup', { groupId })
      }
    }
    if (suppressedMainPttKeys.has(e.keycode)) {
      suppressedMainPttKeys.delete(e.keycode)
    } else {
      const code = getPttKeycode()
      if (code && e.keycode === code) {
        mainWindow?.webContents.send('ptt:keyup')
      }
    }
  })
  uIOhook.start()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  uIOhook.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
