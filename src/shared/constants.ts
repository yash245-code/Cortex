export const IPC_CHANNELS = {
  // Window
  WINDOW_MINIMIZE: 'cortex:window:minimize',
  WINDOW_MAXIMIZE: 'cortex:window:maximize',
  WINDOW_CLOSE: 'cortex:window:close',
  WINDOW_IS_MAXIMIZED: 'cortex:window:isMaximized',

  // Dialogs
  DIALOG_OPEN_FILE: 'cortex:dialog:openFile',
  DIALOG_OPEN_DIRECTORY: 'cortex:dialog:openDirectory',

  // File system
  FS_READ_DIRECTORY: 'cortex:fs:readDirectory',
  FS_READ_FILE: 'cortex:fs:readFile',
  FS_WRITE_FILE: 'cortex:fs:writeFile',
  FS_CREATE_FILE: 'cortex:fs:createFile',
  FS_CREATE_DIRECTORY: 'cortex:fs:createDirectory',
  FS_RENAME_PATH: 'cortex:fs:renamePath',
  FS_DELETE_PATH: 'cortex:fs:deletePath',

  // Watcher
  WATCHER_START: 'cortex:watcher:start',
  WATCHER_STOP: 'cortex:watcher:stop',
  WATCHER_CHANGE: 'cortex:watcher:change',

  // Terminal
  TERMINAL_CREATE: 'cortex:terminal:create',
  TERMINAL_WRITE: 'cortex:terminal:write',
  TERMINAL_RESIZE: 'cortex:terminal:resize',
  TERMINAL_KILL: 'cortex:terminal:kill',
  TERMINAL_DATA: 'cortex:terminal:data',
  TERMINAL_EXIT: 'cortex:terminal:exit',
  TERMINAL_GET_AVAILABLE_SHELLS: 'cortex:terminal:getAvailableShells',

  // Search & Replace
  SEARCH_WORKSPACE: 'cortex:search:workspace',
  SEARCH_REPLACE_FILE: 'cortex:search:replaceFile',
  SEARCH_REPLACE_ALL: 'cortex:search:replaceAll',

  // Settings
  SETTINGS_OPEN: 'cortex:settings:open',
  SETTINGS_GET: 'cortex:settings:get',
  SETTINGS_UPDATE: 'cortex:settings:update',
  SETTINGS_CHANGED: 'cortex:settings:changed',

  // Git
  GIT_STATUS: 'cortex:git:status',
  GIT_BRANCH: 'cortex:git:branch',
  GIT_GET_FILE_AT_HEAD: 'cortex:git:getFileAtHead',
  GIT_GET_DIFF: 'cortex:git:getDiff',
  GIT_STAGE: 'cortex:git:stage',
  GIT_UNSTAGE: 'cortex:git:unstage',
  GIT_STAGE_ALL: 'cortex:git:stageAll',
  GIT_UNSTAGE_ALL: 'cortex:git:unstageAll',
  GIT_DISCARD: 'cortex:git:discard',
  GIT_COMMIT: 'cortex:git:commit',

  // Extensions
  EXTENSIONS_GET_INSTALLED: 'cortex:extensions:getInstalled',
  EXTENSIONS_SEARCH_MARKETPLACE: 'cortex:extensions:searchMarketplace',
  EXTENSIONS_INSTALL_FROM_MARKETPLACE: 'cortex:extensions:installFromMarketplace',
  EXTENSIONS_INSTALL_FROM_VSIX: 'cortex:extensions:installFromVsix',
  EXTENSIONS_UNINSTALL: 'cortex:extensions:uninstall',
  EXTENSIONS_TOGGLE_ENABLE: 'cortex:extensions:toggleEnable',
  EXTENSIONS_GET_SNIPPETS: 'cortex:extensions:getSnippets',
  EXTENSIONS_GET_THEMES: 'cortex:extensions:getThemes',
  EXTENSIONS_OPEN_VSIX_DIALOG: 'cortex:extensions:openVsixDialog',
  EXTENSIONS_OPEN_WINDOW: 'cortex:extensions:openWindow',
  EXTENSIONS_GET_README: 'cortex:extensions:getReadme',
  EXTENSIONS_GET_EXT_SNIPPETS: 'cortex:extensions:getExtSnippets',

  // AI Intelligence
  AI_GENERATE_COMPLETION: 'cortex:ai:generateCompletion',
  AI_GENERATE_EDIT: 'cortex:ai:generateEdit',
  AI_CHAT: 'cortex:ai:chat',
  AI_TEST_CONNECTION: 'cortex:ai:testConnection'
} as const

export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  rb: 'ruby',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ps1: 'powershell',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  svg: 'xml',
  toml: 'ini',
  ini: 'ini',
  env: 'ini',
  dockerfile: 'dockerfile'
}

export function getLanguageForFile(filename: string): string {
  const parts = filename.split('.')
  if (parts.length > 1) {
    const ext = parts.pop()?.toLowerCase() || ''
    if (EXTENSION_TO_LANGUAGE[ext]) {
      return EXTENSION_TO_LANGUAGE[ext]
    }
  }
  const lower = filename.toLowerCase()
  if (lower === 'dockerfile') return 'dockerfile'
  if (lower.startsWith('.env')) return 'ini'
  return 'plaintext'
}
