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
  TERMINAL_EXIT: "cortex:terminal:exit"
};
const api = {
  // Window controls
  minimizeWindow: () => electron.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => electron.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => electron.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  isMaximized: () => electron.ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
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
  createTerminal: (id, cwd) => electron.ipcRenderer.invoke(IPC_CHANNELS.TERMINAL_CREATE, id, cwd),
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
  }
};
try {
  electron.contextBridge.exposeInMainWorld("cortexAPI", api);
} catch (error) {
  console.error("Failed to expose cortexAPI via contextBridge", error);
}
