"use strict";
const electron = require("electron");
const IPC_CHANNELS = {
  // Window
  WINDOW_MINIMIZE: "cortex:window:minimize",
  WINDOW_MAXIMIZE: "cortex:window:maximize",
  WINDOW_CLOSE: "cortex:window:close",
  WINDOW_IS_MAXIMIZED: "cortex:window:isMaximized",
  // Dialogs
  DIALOG_OPEN_FILE: "cortex:dialog:openFile",
  DIALOG_OPEN_DIRECTORY: "cortex:dialog:openDirectory",
  // File system
  FS_READ_DIRECTORY: "cortex:fs:readDirectory",
  FS_READ_FILE: "cortex:fs:readFile",
  FS_WRITE_FILE: "cortex:fs:writeFile",
  FS_CREATE_FILE: "cortex:fs:createFile",
  FS_CREATE_DIRECTORY: "cortex:fs:createDirectory",
  FS_RENAME_PATH: "cortex:fs:renamePath",
  FS_DELETE_PATH: "cortex:fs:deletePath",
  // Watcher
  WATCHER_START: "cortex:watcher:start",
  WATCHER_STOP: "cortex:watcher:stop",
  WATCHER_CHANGE: "cortex:watcher:change",
  // Terminal
  TERMINAL_CREATE: "cortex:terminal:create",
  TERMINAL_WRITE: "cortex:terminal:write",
  TERMINAL_RESIZE: "cortex:terminal:resize",
  TERMINAL_KILL: "cortex:terminal:kill",
  TERMINAL_DATA: "cortex:terminal:data",
  TERMINAL_EXIT: "cortex:terminal:exit",
  TERMINAL_GET_AVAILABLE_SHELLS: "cortex:terminal:getAvailableShells",
  // Search & Replace
  SEARCH_WORKSPACE: "cortex:search:workspace",
  SEARCH_REPLACE_FILE: "cortex:search:replaceFile",
  SEARCH_REPLACE_ALL: "cortex:search:replaceAll",
  // Settings
  SETTINGS_OPEN: "cortex:settings:open",
  SETTINGS_GET: "cortex:settings:get",
  SETTINGS_UPDATE: "cortex:settings:update",
  SETTINGS_CHANGED: "cortex:settings:changed",
  // Git
  GIT_STATUS: "cortex:git:status",
  GIT_BRANCH: "cortex:git:branch",
  GIT_GET_FILE_AT_HEAD: "cortex:git:getFileAtHead",
  GIT_GET_DIFF: "cortex:git:getDiff",
  GIT_STAGE: "cortex:git:stage",
  GIT_UNSTAGE: "cortex:git:unstage",
  GIT_STAGE_ALL: "cortex:git:stageAll",
  GIT_UNSTAGE_ALL: "cortex:git:unstageAll",
  GIT_DISCARD: "cortex:git:discard",
  GIT_COMMIT: "cortex:git:commit",
  // Extensions
  EXTENSIONS_GET_INSTALLED: "cortex:extensions:getInstalled",
  EXTENSIONS_SEARCH_MARKETPLACE: "cortex:extensions:searchMarketplace",
  EXTENSIONS_INSTALL_FROM_MARKETPLACE: "cortex:extensions:installFromMarketplace",
  EXTENSIONS_INSTALL_FROM_VSIX: "cortex:extensions:installFromVsix",
  EXTENSIONS_UNINSTALL: "cortex:extensions:uninstall",
  EXTENSIONS_TOGGLE_ENABLE: "cortex:extensions:toggleEnable",
  EXTENSIONS_GET_SNIPPETS: "cortex:extensions:getSnippets",
  EXTENSIONS_GET_THEMES: "cortex:extensions:getThemes",
  EXTENSIONS_OPEN_VSIX_DIALOG: "cortex:extensions:openVsixDialog",
  EXTENSIONS_OPEN_WINDOW: "cortex:extensions:openWindow",
  EXTENSIONS_GET_README: "cortex:extensions:getReadme",
  EXTENSIONS_GET_EXT_SNIPPETS: "cortex:extensions:getExtSnippets",
  // AI Intelligence
  AI_GENERATE_COMPLETION: "cortex:ai:generateCompletion",
  AI_GENERATE_EDIT: "cortex:ai:generateEdit",
  AI_CHAT: "cortex:ai:chat",
  AI_TEST_CONNECTION: "cortex:ai:testConnection"
};
const api = {
  // Window controls
  minimizeWindow: () => electron.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => electron.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => electron.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  isMaximized: () => electron.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
  zoomIn: async () => {
    const current = electron.webFrame.getZoomFactor();
    const next = Math.min(2.5, Math.round((current + 0.1) * 10) / 10);
    electron.webFrame.setZoomFactor(next);
    return next;
  },
  zoomOut: async () => {
    const current = electron.webFrame.getZoomFactor();
    const next = Math.max(0.5, Math.round((current - 0.1) * 10) / 10);
    electron.webFrame.setZoomFactor(next);
    return next;
  },
  resetZoom: async () => {
    electron.webFrame.setZoomFactor(1);
    return 1;
  },
  getZoomFactor: async () => {
    return electron.webFrame.getZoomFactor();
  },
  // Dialogs
  openFileDialog: () => electron.ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_FILE),
  openDirectoryDialog: () => electron.ipcRenderer.invoke(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY),
  // File operations
  readDirectory: (dirPath) => electron.ipcRenderer.invoke(IPC_CHANNELS.FS_READ_DIRECTORY, dirPath),
  readFile: (filePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.FS_READ_FILE, filePath),
  writeFile: (filePath, content) => electron.ipcRenderer.invoke(IPC_CHANNELS.FS_WRITE_FILE, filePath, content),
  createFile: (filePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_FILE, filePath),
  createDirectory: (dirPath) => electron.ipcRenderer.invoke(IPC_CHANNELS.FS_CREATE_DIRECTORY, dirPath),
  renamePath: (oldPath, newPath) => electron.ipcRenderer.invoke(IPC_CHANNELS.FS_RENAME_PATH, oldPath, newPath),
  deletePath: (targetPath) => electron.ipcRenderer.invoke(IPC_CHANNELS.FS_DELETE_PATH, targetPath),
  // File Watcher
  watchDirectory: (dirPath) => electron.ipcRenderer.invoke(IPC_CHANNELS.WATCHER_START, dirPath),
  unwatchDirectory: () => electron.ipcRenderer.invoke(IPC_CHANNELS.WATCHER_STOP),
  onFileChange: (callback) => {
    const subscription = (_event, changeEvent) => {
      callback(changeEvent);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.WATCHER_CHANGE, subscription);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.WATCHER_CHANGE, subscription);
    };
  },
  // Terminal
  createTerminal: (id, cwd, shellType) => electron.ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, id, cwd, shellType),
  writeTerminal: (id, data) => electron.ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_WRITE, id, data),
  resizeTerminal: (id, cols, rows) => electron.ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_RESIZE, id, cols, rows),
  killTerminal: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_KILL, id),
  onTerminalData: (callback) => {
    const subscription = (_event, payload) => {
      callback(payload);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.TERMINAL_DATA, subscription);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_DATA, subscription);
    };
  },
  onTerminalExit: (callback) => {
    const subscription = (_event, payload) => {
      callback(payload);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.TERMINAL_EXIT, subscription);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.TERMINAL_EXIT, subscription);
    };
  },
  terminalGetAvailableShells: () => electron.ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_GET_AVAILABLE_SHELLS),
  // Search & Replace
  searchWorkspace: (workspacePath, query, options) => electron.ipcRenderer.invoke(IPC_CHANNELS.SEARCH_WORKSPACE, workspacePath, query, options),
  replaceInFile: (filePath, query, replaceText, options) => electron.ipcRenderer.invoke(
    IPC_CHANNELS.SEARCH_REPLACE_FILE,
    filePath,
    query,
    replaceText,
    options
  ),
  replaceAll: (workspacePath, query, replaceText, options) => electron.ipcRenderer.invoke(
    IPC_CHANNELS.SEARCH_REPLACE_ALL,
    workspacePath,
    query,
    replaceText,
    options
  ),
  // Settings
  openSettingsWindow: () => electron.ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_OPEN),
  getSettings: () => electron.ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  updateSettings: (settings) => electron.ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, settings),
  onSettingsChanged: (callback) => {
    const subscription = (_event, updatedSettings) => {
      callback(updatedSettings);
    };
    electron.ipcRenderer.on(IPC_CHANNELS.SETTINGS_CHANGED, subscription);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_CHANGED, subscription);
    };
  },
  // Git Source Control
  gitGetStatus: (workspacePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_STATUS, workspacePath),
  gitGetBranch: (workspacePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_BRANCH, workspacePath),
  gitGetFileAtHead: (workspacePath, relativePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_FILE_AT_HEAD, workspacePath, relativePath),
  gitGetDiff: (workspacePath, relativePath, staged) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_GET_DIFF, workspacePath, relativePath, staged),
  gitStage: (workspacePath, relativePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE, workspacePath, relativePath),
  gitUnstage: (workspacePath, relativePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE, workspacePath, relativePath),
  gitStageAll: (workspacePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_STAGE_ALL, workspacePath),
  gitUnstageAll: (workspacePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_UNSTAGE_ALL, workspacePath),
  gitDiscard: (workspacePath, relativePath, isUntracked) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_DISCARD, workspacePath, relativePath, isUntracked),
  gitCommit: (workspacePath, message) => electron.ipcRenderer.invoke(IPC_CHANNELS.GIT_COMMIT, workspacePath, message),
  // Extensions
  extensionsGetInstalled: () => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_GET_INSTALLED),
  extensionsSearchMarketplace: (query, category) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_SEARCH_MARKETPLACE, query, category),
  extensionsInstallFromMarketplace: (extension) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_INSTALL_FROM_MARKETPLACE, extension),
  extensionsInstallFromVsix: (filePath) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_INSTALL_FROM_VSIX, filePath),
  extensionsUninstall: (extensionId) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_UNINSTALL, extensionId),
  extensionsToggleEnable: (extensionId, enabled) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_TOGGLE_ENABLE, extensionId, enabled),
  extensionsGetSnippets: () => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_GET_SNIPPETS),
  extensionsGetThemes: () => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_GET_THEMES),
  extensionsOpenVsixDialog: () => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_OPEN_VSIX_DIALOG),
  openExtensionsWindow: () => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_OPEN_WINDOW),
  extensionsGetReadme: (extensionId, namespace, name) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_GET_README, extensionId, namespace, name),
  extensionsGetSnippetsForExt: (extensionId) => electron.ipcRenderer.invoke(IPC_CHANNELS.EXTENSIONS_GET_EXT_SNIPPETS, extensionId),
  // AI Intelligence
  aiGenerateCompletion: (req) => electron.ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_COMPLETION, req),
  aiGenerateEdit: (req) => electron.ipcRenderer.invoke(IPC_CHANNELS.AI_GENERATE_EDIT, req),
  aiChat: (req) => electron.ipcRenderer.invoke(IPC_CHANNELS.AI_CHAT, req),
  aiTestConnection: (provider, apiKey) => electron.ipcRenderer.invoke(IPC_CHANNELS.AI_TEST_CONNECTION, provider, apiKey)
};
try {
  electron.contextBridge.exposeInMainWorld("cortexAPI", api);
} catch (error) {
  console.error("Failed to expose cortexAPI via contextBridge", error);
}
