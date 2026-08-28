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
  accentColor?: string
  autoSave: boolean
  autoSaveDelay: number
  lineHeight?: number
  cursorBlinking?: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid'
  cursorStyle?: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin'
  bracketPairColorization?: boolean
  formatOnSave?: boolean
  terminalFontSize?: number
  terminalFontFamily?: string
  terminalCursorStyle?: 'block' | 'underline' | 'bar'
  terminalDefaultShell?: ShellType
  aiModelProvider?: string
  aiApiKey?: string
  aiTemperature?: number
  aiMaxTokens?: number
}

export type ShellType = 'powershell' | 'cmd' | 'bash' | 'wsl' | 'default'

export interface TerminalSession {
  id: string
  name: string
  shell: ShellType
}

export interface SearchOptions {
  isRegex?: boolean
  matchCase?: boolean
  matchWholeWord?: boolean
  includePattern?: string
  excludePattern?: string
  maxResults?: number
}

export interface SearchMatch {
  filePath: string
  relativePath: string
  fileName: string
  line: number
  column: number
  lineContent: string
  matchLength: number
}

export interface SearchResultGroup {
  filePath: string
  relativePath: string
  fileName: string
  matches: SearchMatch[]
}

export interface ReplaceResult {
  totalReplacements: number
  filesModified: number
}

export type GitFileStatusType = 'M' | 'U' | 'A' | 'D' | 'R' | 'C' | '??'

export interface GitFileStatus {
  path: string
  relativePath: string
  fileName: string
  status: GitFileStatusType
  staged: boolean
}

export interface GitStatusResult {
  isRepo: boolean
  branch: string | null
  staged: GitFileStatus[]
  unstaged: GitFileStatus[]
  untracked: GitFileStatus[]
}

export interface CortexAPI {
  // Window controls
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>
  zoomIn: () => Promise<number>
  zoomOut: () => Promise<number>
  resetZoom: () => Promise<number>
  getZoomFactor: () => Promise<number>

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
  createTerminal: (id: string, cwd?: string, shellType?: string) => Promise<boolean>
  writeTerminal: (id: string, data: string) => Promise<void>
  resizeTerminal: (id: string, cols: number, rows: number) => Promise<void>
  killTerminal: (id: string) => Promise<void>
  onTerminalData: (callback: (payload: TerminalDataPayload) => void) => () => void
  onTerminalExit: (callback: (payload: { id: string; exitCode: number }) => void) => () => void

  // Search & Replace
  searchWorkspace: (
    workspacePath: string,
    query: string,
    options?: SearchOptions
  ) => Promise<SearchResultGroup[]>
  replaceInFile: (
    filePath: string,
    query: string,
    replaceText: string,
    options?: SearchOptions
  ) => Promise<number>
  replaceAll: (
    workspacePath: string,
    query: string,
    replaceText: string,
    options?: SearchOptions
  ) => Promise<ReplaceResult>

  // Settings
  openSettingsWindow: () => Promise<void>
  getSettings: () => Promise<Partial<EditorSettings>>
  updateSettings: (settings: Partial<EditorSettings>) => Promise<void>
  onSettingsChanged: (callback: (settings: Partial<EditorSettings>) => void) => () => void

  // Git Source Control
  gitGetStatus: (workspacePath: string) => Promise<GitStatusResult>
  gitGetBranch: (workspacePath: string) => Promise<string | null>
  gitStage: (workspacePath: string, relativePath: string) => Promise<boolean>
  gitUnstage: (workspacePath: string, relativePath: string) => Promise<boolean>
  gitStageAll: (workspacePath: string) => Promise<boolean>
  gitUnstageAll: (workspacePath: string) => Promise<boolean>
  gitDiscard: (workspacePath: string, relativePath: string, isUntracked?: boolean) => Promise<boolean>
  gitCommit: (workspacePath: string, message: string) => Promise<boolean>
}
