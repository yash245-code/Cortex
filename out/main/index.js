"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs/promises");
const chokidar = require("chokidar");
const os = require("os");
const child_process = require("child_process");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
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
const IGNORED_DIRECTORIES = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  ".next",
  ".turbo",
  ".vscode",
  ".idea",
  "coverage",
  ".DS_Store"
]);
class FileService {
  watcher = null;
  mainWindow = null;
  debounceTimers = /* @__PURE__ */ new Map();
  setMainWindow(window) {
    this.mainWindow = window;
  }
  async openFileDialog() {
    if (!this.mainWindow) return null;
    const result = await electron.dialog.showOpenDialog(this.mainWindow, {
      properties: ["openFile"],
      title: "Open File in Cortex"
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }
  async openDirectoryDialog() {
    if (!this.mainWindow) return null;
    const result = await electron.dialog.showOpenDialog(this.mainWindow, {
      properties: ["openDirectory", "createDirectory"],
      title: "Open Folder in Cortex"
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }
  async readDirectory(dirPath) {
    const stats = await fs__namespace.stat(dirPath);
    const name = path__namespace.basename(dirPath) || dirPath;
    const rootNode = {
      id: dirPath,
      name,
      path: dirPath,
      type: "directory",
      children: []
    };
    try {
      const entries = await fs__namespace.readdir(dirPath, { withFileTypes: true });
      const children = [];
      for (const entry of entries) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        const fullPath = path__namespace.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          try {
            const childDirNode = await this.readDirectory(fullPath);
            children.push(childDirNode);
          } catch {
          }
        } else if (entry.isFile() || entry.isSymbolicLink()) {
          const extParts = entry.name.split(".");
          const extension = extParts.length > 1 ? extParts.pop() : "";
          let size = 0;
          try {
            const fileStat = await fs__namespace.stat(fullPath);
            size = fileStat.size;
          } catch {
          }
          children.push({
            id: fullPath,
            name: entry.name,
            path: fullPath,
            type: "file",
            extension,
            size,
            updatedAt: stats.mtimeMs
          });
        }
      }
      children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name, void 0, { numeric: true, sensitivity: "base" });
      });
      rootNode.children = children;
    } catch (err) {
      console.error(`Failed to read directory at ${dirPath}:`, err);
    }
    return rootNode;
  }
  async readFile(filePath) {
    return await fs__namespace.readFile(filePath, "utf-8");
  }
  async writeFile(filePath, content) {
    await fs__namespace.mkdir(path__namespace.dirname(filePath), { recursive: true });
    await fs__namespace.writeFile(filePath, content, "utf-8");
    return true;
  }
  async createFile(filePath) {
    await fs__namespace.mkdir(path__namespace.dirname(filePath), { recursive: true });
    await fs__namespace.writeFile(filePath, "", "utf-8");
    return true;
  }
  async createDirectory(dirPath) {
    await fs__namespace.mkdir(dirPath, { recursive: true });
    return true;
  }
  async renamePath(oldPath, newPath) {
    await fs__namespace.rename(oldPath, newPath);
    return true;
  }
  async deletePath(targetPath) {
    await fs__namespace.rm(targetPath, { recursive: true, force: true });
    return true;
  }
  startWatcher(dirPath) {
    this.stopWatcher();
    this.watcher = chokidar.watch(dirPath, {
      ignored: [
        /(^|[/\\])\../,
        // ignore dotfiles
        "**/node_modules/**",
        "**/dist/**",
        "**/out/**",
        "**/.git/**"
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 6,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });
    const sendChangeEvent = (type, changedPath) => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
      const key = `${type}:${changedPath}`;
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }
      const timer = setTimeout(() => {
        this.debounceTimers.delete(key);
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_CHANNELS.WATCHER_CHANGE, {
            type,
            path: changedPath
          });
        }
      }, 50);
      this.debounceTimers.set(key, timer);
    };
    this.watcher.on("add", (filePath) => sendChangeEvent("add", filePath)).on("change", (filePath) => sendChangeEvent("change", filePath)).on("unlink", (filePath) => sendChangeEvent("unlink", filePath)).on("addDir", (dirPath2) => sendChangeEvent("addDir", dirPath2)).on("unlinkDir", (dirPath2) => sendChangeEvent("unlinkDir", dirPath2));
  }
  stopWatcher() {
    if (this.watcher) {
      this.watcher.close().catch(console.error);
      this.watcher = null;
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}
const fileService = new FileService();
class TerminalService {
  terminals = /* @__PURE__ */ new Map();
  mainWindow = null;
  setMainWindow(window) {
    this.mainWindow = window;
  }
  async createTerminal(id, cwd) {
    this.killTerminal(id);
    const isWindows = os__namespace.platform() === "win32";
    const workingDirectory = cwd || os__namespace.homedir();
    try {
      const pty = require("node-pty");
      const shell = isWindows ? process.env.COMSPEC || "powershell.exe" : process.env.SHELL || "/bin/bash";
      const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: workingDirectory,
        env: process.env
      });
      ptyProcess.onData((data) => {
        this.sendData(id, data);
      });
      ptyProcess.onExit(({ exitCode }) => {
        this.terminals.delete(id);
        this.sendExit(id, exitCode);
      });
      this.terminals.set(id, {
        write: (data) => ptyProcess.write(data),
        resize: (cols, rows) => {
          try {
            ptyProcess.resize(cols, rows);
          } catch {
          }
        },
        kill: () => {
          try {
            ptyProcess.kill();
          } catch {
          }
        }
      });
      return true;
    } catch (nodePtyErr) {
      console.warn("node-pty native module unavailable, falling back to child_process shell:", nodePtyErr);
    }
    try {
      let shellCmd;
      let shellArgs = [];
      if (isWindows) {
        shellCmd = "powershell.exe";
        shellArgs = ["-NoLogo"];
      } else {
        shellCmd = process.env.SHELL || "/bin/bash";
        shellArgs = ["-i"];
      }
      const proc = child_process.spawn(shellCmd, shellArgs, {
        cwd: workingDirectory,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor"
        },
        stdio: ["pipe", "pipe", "pipe"]
      });
      proc.stdout?.on("data", (data) => {
        this.sendData(id, data.toString("utf-8"));
      });
      proc.stderr?.on("data", (data) => {
        this.sendData(id, data.toString("utf-8"));
      });
      proc.on("exit", (code) => {
        this.terminals.delete(id);
        this.sendExit(id, code ?? 0);
      });
      this.terminals.set(id, {
        write: (data) => {
          if (proc.stdin && !proc.stdin.destroyed) {
            proc.stdin.write(data);
          }
        },
        resize: () => {
        },
        kill: () => {
          try {
            proc.kill();
          } catch {
          }
        }
      });
      this.sendData(id, `\x1B[38;2;99;102;241m[Cortex Terminal - Ready at ${workingDirectory}]\x1B[0m\r
`);
      return true;
    } catch (fallbackErr) {
      console.error(`Failed to create terminal [${id}]:`, fallbackErr);
      return false;
    }
  }
  sendData(id, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_DATA, {
        id,
        data
      });
    }
  }
  sendExit(id, exitCode) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, {
        id,
        exitCode
      });
    }
  }
  writeTerminal(id, data) {
    const term = this.terminals.get(id);
    if (term) {
      term.write(data);
    }
  }
  resizeTerminal(id, cols, rows) {
    const term = this.terminals.get(id);
    if (term) {
      term.resize(cols, rows);
    }
  }
  killTerminal(id) {
    const term = this.terminals.get(id);
    if (term) {
      term.kill();
      this.terminals.delete(id);
    }
  }
  killAll() {
    for (const [id] of this.terminals) {
      this.killTerminal(id);
    }
  }
}
const terminalService = new TerminalService();
function registerIpcHandlers(mainWindow2) {
  fileService.setMainWindow(mainWindow2);
  terminalService.setMainWindow(mainWindow2);
  electron.ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    mainWindow2.minimize();
  });
  electron.ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow2.isMaximized()) {
      mainWindow2.unmaximize();
    } else {
      mainWindow2.maximize();
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
    mainWindow2.close();
  });
  electron.ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
    return mainWindow2.isMaximized();
  });
  electron.ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_FILE, async () => {
    return await fileService.openFileDialog();
  });
  electron.ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DIRECTORY, async () => {
    return await fileService.openDirectoryDialog();
  });
  electron.ipcMain.handle(IPC_CHANNELS.FS_READ_DIRECTORY, async (_, dirPath) => {
    return await fileService.readDirectory(dirPath);
  });
  electron.ipcMain.handle(IPC_CHANNELS.FS_READ_FILE, async (_, filePath) => {
    return await fileService.readFile(filePath);
  });
  electron.ipcMain.handle(IPC_CHANNELS.FS_WRITE_FILE, async (_, filePath, content) => {
    return await fileService.writeFile(filePath, content);
  });
  electron.ipcMain.handle(IPC_CHANNELS.FS_CREATE_FILE, async (_, filePath) => {
    return await fileService.createFile(filePath);
  });
  electron.ipcMain.handle(IPC_CHANNELS.FS_CREATE_DIRECTORY, async (_, dirPath) => {
    return await fileService.createDirectory(dirPath);
  });
  electron.ipcMain.handle(IPC_CHANNELS.FS_RENAME_PATH, async (_, oldPath, newPath) => {
    return await fileService.renamePath(oldPath, newPath);
  });
  electron.ipcMain.handle(IPC_CHANNELS.FS_DELETE_PATH, async (_, targetPath) => {
    return await fileService.deletePath(targetPath);
  });
  electron.ipcMain.handle(IPC_CHANNELS.WATCHER_START, async (_, dirPath) => {
    fileService.startWatcher(dirPath);
  });
  electron.ipcMain.handle(IPC_CHANNELS.WATCHER_STOP, async () => {
    fileService.stopWatcher();
  });
  electron.ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, async (_, id, cwd) => {
    return await terminalService.createTerminal(id, cwd);
  });
  electron.ipcMain.handle(IPC_CHANNELS.TERMINAL_WRITE, (_, id, data) => {
    terminalService.writeTerminal(id, data);
  });
  electron.ipcMain.handle(IPC_CHANNELS.TERMINAL_RESIZE, (_, id, cols, rows) => {
    terminalService.resizeTerminal(id, cols, rows);
  });
  electron.ipcMain.handle(IPC_CHANNELS.TERMINAL_KILL, (_, id) => {
    terminalService.killTerminal(id);
  });
}
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 550,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0f1117",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  registerIpcHandlers(mainWindow);
  mainWindow.on("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  fileService.stopWatcher();
  terminalService.killAll();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  fileService.stopWatcher();
  terminalService.killAll();
});
