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

// Maps Electron accelerator strings to uiohook keycodes (non-exhaustive — covers common PTT keys)
const ACCELERATOR_TO_UIOHOOK: Record<string, number> = {
  Space: UiohookKey.Space,
  Return: UiohookKey.Enter,
  Backspace: UiohookKey.Backspace,
  Tab: UiohookKey.Tab,
  Escape: UiohookKey.Escape,
  Up: UiohookKey.ArrowUp,
  Down: UiohookKey.ArrowDown,
  Left: UiohookKey.ArrowLeft,
  Right: UiohookKey.ArrowRight,
  F1: UiohookKey.F1, F2: UiohookKey.F2, F3: UiohookKey.F3, F4: UiohookKey.F4,
  F5: UiohookKey.F5, F6: UiohookKey.F6, F7: UiohookKey.F7, F8: UiohookKey.F8,
  F9: UiohookKey.F9, F10: UiohookKey.F10, F11: UiohookKey.F11, F12: UiohookKey.F12,
}
// Single letter/digit keys
for (let i = 0; i < 26; i++) {
  const letter = String.fromCharCode(65 + i) // A-Z
  ACCELERATOR_TO_UIOHOOK[letter] = (UiohookKey as Record<string, number>)[letter] ?? 0
}

function getPttKeycode(): number | null {
  const accelerator = store.get('ptt.key') as string | undefined
  if (!accelerator) return null
  const code = ACCELERATOR_TO_UIOHOOK[accelerator]
  return code || null
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

  ipcMain.handle('ptt:get-key', () => store.get('ptt.key') ?? null)

  ipcMain.handle('ptt:get-mode', () => (store.get('ptt.mode') as boolean | undefined) ?? false)

  ipcMain.handle('ptt:set-mode', (_event, enabled: boolean) => {
    store.set('ptt.mode', !!enabled)
  })

  ipcMain.handle('ptt:set-key', (_event, accelerator: string | null) => {
    if (!accelerator || typeof accelerator !== 'string' || !accelerator.trim()) return false
    store.set('ptt.key', accelerator)
    return true
  })

  createWindow()

  // Global PTT hook — WH_KEYBOARD_LL on Windows: passively listens, always calls
  // CallNextHookEx so the key is NOT consumed and still works in other applications.
  uIOhook.on('keydown', (e) => {
    const code = getPttKeycode()
    if (code && e.keycode === code) {
      mainWindow?.webContents.send('ptt:keydown')
    }
  })
  uIOhook.on('keyup', (e) => {
    const code = getPttKeycode()
    if (code && e.keycode === code) {
      mainWindow?.webContents.send('ptt:keyup')
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
