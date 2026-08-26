import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import { fileService } from './services/fileService'
import { terminalService } from './services/terminalService'

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  fileService.setMainWindow(mainWindow)
  terminalService.setMainWindow(mainWindow)

  // Window Controls
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    mainWindow.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
    mainWindow.close()
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
    return mainWindow.isMaximized()
  })

  // Native Dialogs
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async () => {
    return await fileService.openFileDialog()
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async () => {
    return await fileService.openDirectoryDialog()
  })

  // File Operations
  ipcMain.handle(IPC_CHANNELS.FS_READ_DIRECTORY, async (_, dirPath: string) => {
    return await fileService.readDirectory(dirPath)
  })

  ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, async (_, filePath: string) => {
    return await fileService.readFile(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.FS_WRITE_FILE, async (_, filePath: string, content: string) => {
    return await fileService.writeFile(filePath, content)
  })

  ipcMain.handle(IPC_CHANNELS.FS_CREATE_FILE, async (_, filePath: string) => {
    return await fileService.createFile(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.FS_CREATE_DIRECTORY, async (_, dirPath: string) => {
    return await fileService.createDirectory(dirPath)
  })

  ipcMain.handle(IPC_CHANNELS.FS_RENAME_PATH, async (_, oldPath: string, newPath: string) => {
    return await fileService.renamePath(oldPath, newPath)
  })

  ipcMain.handle(IPC_CHANNELS.FS_DELETE_PATH, async (_, targetPath: string) => {
    return await fileService.deletePath(targetPath)
  })

  // File Watcher
  ipcMain.handle(IPC_CHANNELS.WATCHER_START, async (_, dirPath: string) => {
    fileService.startWatcher(dirPath)
  })

  ipcMain.handle(IPC_CHANNELS.WATCHER_STOP, async () => {
    fileService.stopWatcher()
  })

  // Terminal PTY
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, async (_, id: string, cwd?: string) => {
    return await terminalService.createTerminal(id, cwd)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_WRITE, (_, id: string, data: string) => {
    terminalService.writeTerminal(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_RESIZE, (_, id: string, cols: number, rows: number) => {
    terminalService.resizeTerminal(id, cols, rows)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_KILL, (_, id: string) => {
    terminalService.killTerminal(id)
  })
}
