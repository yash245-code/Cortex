export type NodeType = 'file' | 'directory'

export interface FileNode {
  id: string
  name: string
  path: string
  type: NodeType
  extension?: string
  children?: FileNode[]
  size?: number
  updatedAt?: number
}

export interface Tab {
  id: string
  path: string
  name: string
  content: string
  savedContent: string
  isDirty: boolean
  language: string
}

export interface TerminalDataPayload {
  id: string
  data: string
}

export interface TerminalResizePayload {
  id: string
  cols: number
  rows: number
}

export interface FileChangeEvent {
  type: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
  path: string
}

export interface EditorSettings {
  fontSize: number
  fontFamily: string
  tabSize: number
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded'
  minimap: boolean
  theme: string
}

export interface CortexAPI {
  // Window controls
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>

  // Dialogs
  openFileDialog: () => Promise<string | null>
  openDirectoryDialog: () => Promise<string | null>

  // File system
  readDirectory: (dirPath: string) => Promise<FileNode>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<boolean>
  createFile: (filePath: string) => Promise<boolean>
  createDirectory: (dirPath: string) => Promise<boolean>
  renamePath: (oldPath: string, newPath: string) => Promise<boolean>
  deletePath: (targetPath: string) => Promise<boolean>

  // Watcher
  watchDirectory: (dirPath: string) => Promise<void>
  unwatchDirectory: () => Promise<void>
  onFileChange: (callback: (event: FileChangeEvent) => void) => () => void

  // Terminal
  createTerminal: (id: string, cwd?: string) => Promise<boolean>
  writeTerminal: (id: string, data: string) => Promise<void>
  resizeTerminal: (id: string, cols: number, rows: number) => Promise<void>
  killTerminal: (id: string) => Promise<void>
  onTerminalData: (callback: (payload: TerminalDataPayload) => void) => () => void
  onTerminalExit: (callback: (payload: { id: string; exitCode: number }) => void) => () => void
}
