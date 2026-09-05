export const IPC_CHANNELS = {
  // Window
  WINDOW_MINIMIZE: 'BODHI:window:minimize',
  WINDOW_MAXIMIZE: 'BODHI:window:maximize',
  WINDOW_CLOSE: 'BODHI:window:close',
  WINDOW_IS_MAXIMIZED: 'BODHI:window:isMaximized',

  // Dialogs
  DIALOG_OPEN_FILE: 'BODHI:dialog:openFile',
  DIALOG_OPEN_DIRECTORY: 'BODHI:dialog:openDirectory',

  // File system
  FS_READ_DIRECTORY: 'BODHI:fs:readDirectory',
  FS_READ_FILE: 'BODHI:fs:readFile',
  FS_WRITE_FILE: 'BODHI:fs:writeFile',
  FS_CREATE_FILE: 'BODHI:fs:createFile',
  FS_CREATE_DIRECTORY: 'BODHI:fs:createDirectory',
  FS_RENAME_PATH: 'BODHI:fs:renamePath',
  FS_DELETE_PATH: 'BODHI:fs:deletePath',

  // Watcher
  WATCHER_START: 'BODHI:watcher:start',
  WATCHER_STOP: 'BODHI:watcher:stop',
  WATCHER_CHANGE: 'BODHI:watcher:change',

  // Terminal
  TERMINAL_CREATE: 'BODHI:terminal:create',
  TERMINAL_WRITE: 'BODHI:terminal:write',
  TERMINAL_RESIZE: 'BODHI:terminal:resize',
  TERMINAL_KILL: 'BODHI:terminal:kill',
  TERMINAL_DATA: 'BODHI:terminal:data',
  TERMINAL_EXIT: 'BODHI:terminal:exit',
  TERMINAL_GET_AVAILABLE_SHELLS: 'BODHI:terminal:getAvailableShells',

  // Search & Replace
  SEARCH_WORKSPACE: 'BODHI:search:workspace',
  SEARCH_REPLACE_FILE: 'BODHI:search:replaceFile',
  SEARCH_REPLACE_ALL: 'BODHI:search:replaceAll',

  // Settings
  SETTINGS_OPEN: 'BODHI:settings:open',
  SETTINGS_GET: 'BODHI:settings:get',
  SETTINGS_UPDATE: 'BODHI:settings:update',
  SETTINGS_CHANGED: 'BODHI:settings:changed',

  // Git
  GIT_STATUS: 'BODHI:git:status',
  GIT_BRANCH: 'BODHI:git:branch',
  GIT_GET_FILE_AT_HEAD: 'BODHI:git:getFileAtHead',
  GIT_GET_DIFF: 'BODHI:git:getDiff',
  GIT_STAGE: 'BODHI:git:stage',
  GIT_UNSTAGE: 'BODHI:git:unstage',
  GIT_STAGE_ALL: 'BODHI:git:stageAll',
  GIT_UNSTAGE_ALL: 'BODHI:git:unstageAll',
  GIT_DISCARD: 'BODHI:git:discard',
  GIT_COMMIT: 'BODHI:git:commit',
  GIT_GET_FILE_CHURN: 'BODHI:git:getFileChurn',

  // Extensions
  EXTENSIONS_GET_INSTALLED: 'BODHI:extensions:getInstalled',
  EXTENSIONS_SEARCH_MARKETPLACE: 'BODHI:extensions:searchMarketplace',
  EXTENSIONS_INSTALL_FROM_MARKETPLACE: 'BODHI:extensions:installFromMarketplace',
  EXTENSIONS_INSTALL_FROM_VSIX: 'BODHI:extensions:installFromVsix',
  EXTENSIONS_UNINSTALL: 'BODHI:extensions:uninstall',
  EXTENSIONS_TOGGLE_ENABLE: 'BODHI:extensions:toggleEnable',
  EXTENSIONS_GET_SNIPPETS: 'BODHI:extensions:getSnippets',
  EXTENSIONS_GET_THEMES: 'BODHI:extensions:getThemes',
  EXTENSIONS_OPEN_VSIX_DIALOG: 'BODHI:extensions:openVsixDialog',
  EXTENSIONS_OPEN_WINDOW: 'BODHI:extensions:openWindow',
  EXTENSIONS_GET_README: 'BODHI:extensions:getReadme',
  EXTENSIONS_GET_EXT_SNIPPETS: 'BODHI:extensions:getExtSnippets',

  // AI Intelligence
  AI_GENERATE_COMPLETION: 'BODHI:ai:generateCompletion',
  AI_GENERATE_EDIT: 'BODHI:ai:generateEdit',
  AI_CHAT: 'BODHI:ai:chat',
  AI_TEST_CONNECTION: 'BODHI:ai:testConnection'
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
