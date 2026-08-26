import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IPC_CHANNELS } from '../shared/constants'
import {
  CortexAPI,
  FileChangeEvent,
  FileNode,
  TerminalDataPayload
} from '../shared/types'

const api: CortexAPI = {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),

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
  createTerminal: (id: string, cwd?: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, id, cwd),
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
  }
}

try {
  contextBridge.exposeInMainWorld('cortexAPI', api)
} catch (error) {
  console.error('Failed to expose cortexAPI via contextBridge', error)
}
