import { app, shell, BrowserWindow, ipcMain, session, globalShortcut } from 'electron'

// Allow audio autoplay and mic access without user gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { machineId } from 'node-machine-id'

let store: InstanceType<typeof Store>
let mainWindow: BrowserWindow | null = null
let pttAccelerator: string | null = null
let pttHeld = false

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

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
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
    if (pttAccelerator) {
      globalShortcut.unregister(pttAccelerator)
      pttAccelerator = null
    }
    if (!accelerator || typeof accelerator !== 'string' || !accelerator.trim() || !mainWindow) return false
    const registered = globalShortcut.register(accelerator, () => {
      if (!mainWindow) return
      pttHeld = true
      mainWindow.webContents.send('ptt:key-down')
    })
    if (registered) {
      pttAccelerator = accelerator
      store.set('ptt.key', accelerator)
    }
    return registered
  })

  createWindow()

  // Blur auto-release: if user loses focus while holding PTT, release it
  mainWindow!.on('blur', () => {
    if (pttHeld && mainWindow) {
      pttHeld = false
      mainWindow.webContents.send('ptt:key-up')
    }
  })

  // Restore saved PTT key on startup
  const savedKey = store.get('ptt.key') as string | undefined
  if (savedKey && mainWindow) {
    globalShortcut.register(savedKey, () => {
      if (!mainWindow) return
      pttHeld = true
      mainWindow.webContents.send('ptt:key-down')
    })
    pttAccelerator = savedKey
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
