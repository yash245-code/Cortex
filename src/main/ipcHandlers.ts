import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import { fileService } from './services/fileService'
import { terminalService } from './services/terminalService'
import { SearchService } from './services/searchService'
import { gitService } from './services/gitService'
import { SearchOptions } from '../shared/types'

const searchService = new SearchService()

let storedSettings: Record<string, unknown> = {}

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  openSettingsWindow?: () => BrowserWindow
): void {
  fileService.setMainWindow(mainWindow)
  terminalService.setMainWindow(mainWindow)

  // Window Controls (Target the specific sender window)
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (win && !win.isDestroyed()) {
      win.minimize()
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize()
      } else {
        win.maximize()
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    if (win && !win.isDestroyed()) {
      win.close()
    }
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow
    return win && !win.isDestroyed() ? win.isMaximized() : false
  })

  // Settings Handlers
  ipcMain.handle(IPC_CHANNELS.SETTINGS_OPEN, () => {
    if (openSettingsWindow) {
      openSettingsWindow()
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return storedSettings
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_, partialSettings: Record<string, unknown>) => {
    storedSettings = { ...storedSettings, ...partialSettings }
    // Broadcast to all windows
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, partialSettings)
      }
    })
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
  ipcMain.handle(
    IPC_CHANNELS.TERMINAL_CREATE,
    async (_, id: string, cwd?: string, shellType?: string) => {
      return await terminalService.createTerminal(id, cwd, shellType)
    }
  )

  ipcMain.handle(IPC_CHANNELS.TERMINAL_WRITE, (_, id: string, data: string) => {
    terminalService.writeTerminal(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_RESIZE, (_, id: string, cols: number, rows: number) => {
    terminalService.resizeTerminal(id, cols, rows)
  })

  ipcMain.handle(IPC_CHANNELS.TERMINAL_KILL, (_, id: string) => {
    terminalService.killTerminal(id)
  })

  // Workspace Search & Replace
  ipcMain.handle(
    IPC_CHANNELS.SEARCH_WORKSPACE,
    async (_, workspacePath: string, query: string, options?: SearchOptions) => {
      return await searchService.searchWorkspace(workspacePath, query, options)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SEARCH_REPLACE_FILE,
    async (
      _,
      filePath: string,
      query: string,
      replaceText: string,
      options?: SearchOptions
    ) => {
      return await searchService.replaceInFile(filePath, query, replaceText, options)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SEARCH_REPLACE_ALL,
    async (
      _,
      workspacePath: string,
      query: string,
      replaceText: string,
      options?: SearchOptions
    ) => {
      return await searchService.replaceAll(workspacePath, query, replaceText, options)
    }
  )

  // Git Handlers
  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (_, workspacePath: string) => {
    return await gitService.getStatus(workspacePath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_BRANCH, async (_, workspacePath: string) => {
    return await gitService.getBranch(workspacePath)
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_STAGE,
    async (_, workspacePath: string, relativePath: string) => {
      return await gitService.stageFile(workspacePath, relativePath)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_UNSTAGE,
    async (_, workspacePath: string, relativePath: string) => {
      return await gitService.unstageFile(workspacePath, relativePath)
    }
  )

  ipcMain.handle(IPC_CHANNELS.GIT_STAGE_ALL, async (_, workspacePath: string) => {
    return await gitService.stageAll(workspacePath)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE_ALL, async (_, workspacePath: string) => {
    return await gitService.unstageAll(workspacePath)
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_DISCARD,
    async (_, workspacePath: string, relativePath: string, isUntracked?: boolean) => {
      return await gitService.discardFile(workspacePath, relativePath, isUntracked)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_COMMIT,
    async (_, workspacePath: string, message: string) => {
      return await gitService.commit(workspacePath, message)
    }
  )
}

