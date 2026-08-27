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
  // Search & Replace
  SEARCH_WORKSPACE: "cortex:search:workspace",
  SEARCH_REPLACE_FILE: "cortex:search:replaceFile",
  SEARCH_REPLACE_ALL: "cortex:search:replaceAll",
  // Settings
  SETTINGS_OPEN: "cortex:settings:open",
  SETTINGS_GET: "cortex:settings:get",
  SETTINGS_UPDATE: "cortex:settings:update",
  SETTINGS_CHANGED: "cortex:settings:changed"
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
  }
};
try {
  electron.contextBridge.exposeInMainWorld("cortexAPI", api);
} catch (error) {
  console.error("Failed to expose cortexAPI via contextBridge", error);
}
