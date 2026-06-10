import { app, shell, BrowserWindow, ipcMain, session } from 'electron'

// Allow audio autoplay and mic access without user gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { machineId } from 'node-machine-id'
import { uIOhook, UiohookKey } from 'uiohook-napi'

let store: InstanceType<typeof Store>
let mainWindow: BrowserWindow | null = null
let currentPttKeycode: number | null = null
let pttHeld = false

/**
 * Maps an Electron-style accelerator string (as stored by the renderer's
 * codeToAccelerator helper) to a uiohook keycode.
 * Covers: A-Z, 0-9, F1-F12, Space, Return, Backspace, Tab, Escape, arrow keys.
 */
function acceleratorToUiohookKey(accelerator: string): number | null {
  if (!accelerator) return null

  // Single uppercase letter A-Z
  if (/^[A-Z]$/.test(accelerator)) {
    const key = `Key${accelerator}` as keyof typeof UiohookKey
    return (UiohookKey[key] as number | undefined) ?? null
  }

  // Digit 0-9
  if (/^[0-9]$/.test(accelerator)) {
    const key = `Numpad${accelerator}` as keyof typeof UiohookKey
    // Try NumRow first via digit mapping
    const numKey = `Digit${accelerator}` as keyof typeof UiohookKey
    return (UiohookKey[numKey] as number | undefined) ?? (UiohookKey[key] as number | undefined) ?? null
  }

  // F1-F12
  const fnMatch = accelerator.match(/^F(\d+)$/)
  if (fnMatch) {
    const key = `F${fnMatch[1]}` as keyof typeof UiohookKey
    return (UiohookKey[key] as number | undefined) ?? null
  }

  // Named keys
  const NAMED: Record<string, keyof typeof UiohookKey> = {
    Space: 'Space',
    Return: 'Enter',
    Backspace: 'Backspace',
    Tab: 'Tab',
    Escape: 'Escape',
    Up: 'ArrowUp',
    Down: 'ArrowDown',
    Left: 'ArrowLeft',
    Right: 'ArrowRight',
  }
  if (NAMED[accelerator]) {
    return (UiohookKey[NAMED[accelerator]] as number | undefined) ?? null
  }

  return null
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

  ipcMain.handle('ptt:set-key', (_event, accelerator: string | null) => {
    if (!accelerator || typeof accelerator !== 'string' || !accelerator.trim()) return false
    const keycode = acceleratorToUiohookKey(accelerator)
    if (keycode === null) return false
    currentPttKeycode = keycode
    store.set('ptt.key', accelerator)
    return true
  })

  createWindow()

  // Blur auto-release fallback: if a keyup is missed, release PTT on window blur
  mainWindow!.on('blur', () => {
    if (pttHeld && mainWindow) {
      pttHeld = false
      mainWindow.webContents.send('ptt:key-up')
    }
  })

  // Restore saved PTT key on startup
  const savedKey = store.get('ptt.key') as string | undefined
  if (savedKey) {
    const keycode = acceleratorToUiohookKey(savedKey)
    if (keycode !== null) {
      currentPttKeycode = keycode
    }
  }

  // Wire uiohook global keydown/keyup — non-exclusive, other apps still receive the key
  uIOhook.on('keydown', (e) => {
    if (currentPttKeycode === null || e.keycode !== currentPttKeycode) return
    if (pttHeld) return  // debounce repeated keydown events while key is held
    pttHeld = true
    if (mainWindow) mainWindow.webContents.send('ptt:key-down')
  })

  uIOhook.on('keyup', (e) => {
    if (currentPttKeycode === null || e.keycode !== currentPttKeycode) return
    if (!pttHeld) return
    pttHeld = false
    if (mainWindow) mainWindow.webContents.send('ptt:key-up')
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
