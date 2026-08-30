import { contextBridge, ipcRenderer, IpcRendererEvent, webFrame } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import {
  CortexAPI,
  FileChangeEvent,
  FileNode,
  TerminalDataPayload,
  ShellProfile
} from '../shared/types'

const api: CortexAPI = {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  zoomIn: async (): Promise<number> => {
    const current = webFrame.getZoomFactor()
    const next = Math.min(2.5, Math.round((current + 0.1) * 10) / 10)
    webFrame.setZoomFactor(next)
    return next
  },
  zoomOut: async (): Promise<number> => {
    const current = webFrame.getZoomFactor()
    const next = Math.max(0.5, Math.round((current - 0.1) * 10) / 10)
    webFrame.setZoomFactor(next)
    return next
  },
  resetZoom: async (): Promise<number> => {
    webFrame.setZoomFactor(1.0)
    return 1.0
  },
  getZoomFactor: async (): Promise<number> => {
    return webFrame.getZoomFactor()
  },

  // Dialogs
  openFileDialog: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE),
  openDirectoryDialog: () => ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY),

  // File operations
  readDirectory: (dirPath: string): Promise<FileNode> =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_READ_DIRECTORY, dirPath),
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, filePath),
  writeFile: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, filePath, content),
  createFile: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_FILE, filePath),
  createDirectory: (dirPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_DIRECTORY, dirPath),
  renamePath: (oldPath: string, newPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_RENAME_PATH, oldPath, newPath),
  deletePath: (targetPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE_PATH, targetPath),

  // File Watcher
  watchDirectory: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WATCHER_START, dirPath),
  unwatchDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.WATCHER_STOP),
  onFileChange: (callback: (event: FileChangeEvent) => void) => {
    const subscription = (_event: IpcRendererEvent, changeEvent: FileChangeEvent): void => {
      callback(changeEvent)
    }
    ipcRenderer.on(IPC_CHANNELS.WATCHER_CHANGE, subscription)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WATCHER_CHANGE, subscription)
    }
  },

  // Terminal
  createTerminal: (id: string, cwd?: string, shellType?: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, id, cwd, shellType),
  writeTerminal: (id: string, data: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_WRITE, id, data),
  resizeTerminal: (id: string, cols: number, rows: number): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_RESIZE, id, cols, rows),
  killTerminal: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_KILL, id),
  onTerminalData: (callback: (payload: TerminalDataPayload) => void) => {
    const subscription = (_event: IpcRendererEvent, payload: TerminalDataPayload): void => {
      callback(payload)
    }
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, subscription)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, subscription)
    }
  },
  onTerminalExit: (callback: (payload: { id: string; exitCode: number }) => void) => {
    const subscription = (
      _event: IpcRendererEvent,
      payload: { id: string; exitCode: number }
    ): void => {
      callback(payload)
    }
    ipcRenderer.on(IPC_CHANNELS.TERMINAL_EXIT, subscription)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_EXIT, subscription)
    }
  },
  terminalGetAvailableShells: (): Promise<ShellProfile[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_GET_AVAILABLE_SHELLS),

  // Search & Replace
  searchWorkspace: (workspacePath, query, options) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_WORKSPACE, workspacePath, query, options),
  replaceInFile: (filePath, query, replaceText, options) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.SEARCH_REPLACE_FILE,
      filePath,
      query,
      replaceText,
      options
    ),
  replaceAll: (workspacePath, query, replaceText, options) =>
    ipcRenderer.invoke(
      IPC_CHANNELS.SEARCH_REPLACE_ALL,
      workspacePath,
      query,
      replaceText,
      options
    ),

  // Settings
  openSettingsWindow: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_OPEN),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),
  onSettingsChanged: (callback) => {
    const subscription = (_event: IpcRendererEvent, updatedSettings: any): void => {
      callback(updatedSettings)
    }
    ipcRenderer.on(IPC_CHANNELS.SETTINGS_CHANGED, subscription)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_CHANGED, subscription)
    }
  },

  // Git Source Control
  gitGetStatus: (workspacePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, workspacePath),
  gitGetBranch: (workspacePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCH, workspacePath),
  gitGetFileAtHead: (workspacePath: string, relativePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_FILE_AT_HEAD, workspacePath, relativePath),
  gitGetDiff: (workspacePath: string, relativePath: string, staged?: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_DIFF, workspacePath, relativePath, staged),
  gitStage: (workspacePath: string, relativePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE, workspacePath, relativePath),
  gitUnstage: (workspacePath: string, relativePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE, workspacePath, relativePath),
  gitStageAll: (workspacePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_ALL, workspacePath),
  gitUnstageAll: (workspacePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_ALL, workspacePath),
  gitDiscard: (workspacePath: string, relativePath: string, isUntracked?: boolean) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD, workspacePath, relativePath, isUntracked),
  gitCommit: (workspacePath: string, message: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, workspacePath, message)
}

try {
  contextBridge.exposeInMainWorld('cortexAPI', api)
} catch (error) {
  console.error('Failed to expose cortexAPI via contextBridge', error)
}
