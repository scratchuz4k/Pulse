import { app, shell, BrowserWindow, ipcMain, session } from 'electron'

// Allow audio autoplay and mic access without user gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import { machineId } from 'node-machine-id'
let store: InstanceType<typeof Store>
let mainWindow: BrowserWindow | null = null

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

  // Blur auto-release fallback: if a keyup is missed, release PTT on window blur
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
