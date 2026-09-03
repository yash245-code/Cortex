import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import { fileService } from './services/fileService'
import { terminalService } from './services/terminalService'
import { SearchService } from './services/searchService'
import { gitService } from './services/gitService'
import { extensionService } from './services/extensionService'
import { aiService } from './services/aiService'
import { SearchOptions, MarketplaceExtension, AICompletionRequest, AIEditRequest, AIChatRequest } from '../shared/types'

const searchService = new SearchService()

let storedSettings: Record<string, unknown> = {}

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  openSettingsWindow?: () => BrowserWindow,
  openExtensionsWindow?: () => BrowserWindow
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

  ipcMain.handle(IPC_CHANNELS.TERMINAL_GET_AVAILABLE_SHELLS, () => {
    return terminalService.getAvailableShells()
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
    IPC_CHANNELS.GIT_GET_FILE_AT_HEAD,
    async (_, workspacePath: string, relativePath: string) => {
      return await gitService.getFileAtHead(workspacePath, relativePath)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_DIFF,
    async (_, workspacePath: string, relativePath: string, staged?: boolean) => {
      return await gitService.getDiff(workspacePath, relativePath, staged)
    }
  )

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

  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_FILE_CHURN,
    async (_, workspacePath: string, relativePath: string) => {
      return await gitService.getFileChurn(workspacePath, relativePath)
    }
  )

  // Extensions Handlers
  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_GET_INSTALLED, async () => {
    return await extensionService.getInstalledExtensions()
  })

  ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_SEARCH_MARKETPLACE,
    async (_, query: string, category?: string) => {
      return await extensionService.searchMarketplace(query, category)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_INSTALL_FROM_MARKETPLACE,
    async (_, extension: MarketplaceExtension) => {
      return await extensionService.installFromMarketplace(extension)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_INSTALL_FROM_VSIX,
    async (_, filePath?: string) => {
      return await extensionService.installFromVsix(filePath)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_UNINSTALL,
    async (_, extensionId: string) => {
      return await extensionService.uninstallExtension(extensionId)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_TOGGLE_ENABLE,
    async (_, extensionId: string, enabled: boolean) => {
      return await extensionService.toggleExtension(extensionId, enabled)
    }
  )

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_GET_SNIPPETS, async () => {
    return await extensionService.getExtensionSnippets()
  })

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_GET_THEMES, async () => {
    return await extensionService.getExtensionThemes()
  })

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_OPEN_VSIX_DIALOG, async () => {
    return await extensionService.openVsixDialog()
  })

  ipcMain.handle(IPC_CHANNELS.EXTENSIONS_OPEN_WINDOW, () => {
    if (openExtensionsWindow) {
      openExtensionsWindow()
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_GET_README,
    async (_, extensionId: string, namespace?: string, name?: string) => {
      return await extensionService.getReadme(extensionId, namespace, name)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_GET_EXT_SNIPPETS,
    async (_, extensionId: string) => {
      return await extensionService.getExtensionSnippetsForExt(extensionId)
    }
  )

  // AI Intelligence Handlers
  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_COMPLETION,
    async (_, req: AICompletionRequest) => {
      return await aiService.generateCompletion(req)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_EDIT,
    async (_, req: AIEditRequest) => {
      return await aiService.generateEdit(req)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_CHAT,
    async (_, req: AIChatRequest) => {
      return await aiService.chat(req)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.AI_TEST_CONNECTION,
    async (_, provider?: string, apiKey?: string) => {
      return await aiService.testConnection(provider, apiKey)
    }
  )
}

