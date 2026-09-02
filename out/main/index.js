"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const fs = require("fs/promises");
const child_process = require("child_process");
const chokidar = require("chokidar");
const os = require("os");
const fsSync = require("fs");
const AdmZip = require("adm-zip");
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
const fsSync__namespace = /* @__PURE__ */ _interopNamespaceDefault(fsSync);
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
const IGNORED_DIRECTORIES$1 = /* @__PURE__ */ new Set([
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
    const name = path__namespace.basename(dirPath) || dirPath;
    const rootNode = {
      id: dirPath,
      name,
      path: dirPath,
      type: "directory",
      children: []
    };
    let stats;
    try {
      stats = await fs__namespace.stat(dirPath);
    } catch {
      return rootNode;
    }
    try {
      const entries = await fs__namespace.readdir(dirPath, { withFileTypes: true });
      const children = [];
      for (const entry of entries) {
        if (IGNORED_DIRECTORIES$1.has(entry.name)) {
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
      console.warn(`Failed to read directory at ${dirPath}:`, err);
    }
    return rootNode;
  }
  async readFile(filePath) {
    try {
      return await fs__namespace.readFile(filePath, "utf-8");
    } catch (err) {
      if (err.code === "ENOENT") {
        return "";
      }
      console.warn(`[FileService] Failed to read file ${filePath}:`, err.message);
      return "";
    }
  }
  async writeFile(filePath, content) {
    try {
      await fs__namespace.mkdir(path__namespace.dirname(filePath), { recursive: true });
      await fs__namespace.writeFile(filePath, content, "utf-8");
      return true;
    } catch (err) {
      console.error(`[FileService] Failed to write file ${filePath}:`, err);
      return false;
    }
  }
  async createFile(filePath) {
    try {
      await fs__namespace.mkdir(path__namespace.dirname(filePath), { recursive: true });
      await fs__namespace.writeFile(filePath, "", "utf-8");
      return true;
    } catch (err) {
      console.error(`[FileService] Failed to create file ${filePath}:`, err);
      return false;
    }
  }
  async createDirectory(dirPath) {
    try {
      await fs__namespace.mkdir(dirPath, { recursive: true });
      return true;
    } catch (err) {
      console.error(`[FileService] Failed to create directory ${dirPath}:`, err);
      return false;
    }
  }
  async renamePath(oldPath, newPath) {
    try {
      await fs__namespace.rename(oldPath, newPath);
      return true;
    } catch (err) {
      console.error(`[FileService] Failed to rename ${oldPath} to ${newPath}:`, err);
      return false;
    }
  }
  async deletePath(targetPath) {
    if (!targetPath) return false;
    try {
      try {
        await fs__namespace.access(targetPath);
      } catch {
        return true;
      }
      if (this.watcher) {
        try {
          await this.watcher.unwatch(targetPath);
        } catch {
        }
      }
      await fs__namespace.rm(targetPath, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100
      });
      return true;
    } catch (rmErr) {
      console.warn(`Standard fs.rm failed on "${targetPath}", executing OS force deletion:`, rmErr?.message);
      if (process.platform === "win32") {
        try {
          const stat = await fs__namespace.stat(targetPath).catch(() => null);
          if (stat?.isDirectory()) {
            await new Promise((resolve, reject) => {
              child_process.exec(`rmdir /s /q "${targetPath}"`, (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          } else {
            await new Promise((resolve, reject) => {
              child_process.exec(`del /f /q /a "${targetPath}"`, (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
          return true;
        } catch (fallbackErr) {
          console.error(`Fallback force deletion failed for "${targetPath}":`, fallbackErr);
          return false;
        }
      }
      return false;
    }
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
    this.watcher.on("add", (filePath) => sendChangeEvent("add", filePath)).on("change", (filePath) => sendChangeEvent("change", filePath)).on("unlink", (filePath) => sendChangeEvent("unlink", filePath)).on("addDir", (dirPath2) => sendChangeEvent("addDir", dirPath2)).on("unlinkDir", (dirPath2) => sendChangeEvent("unlinkDir", dirPath2)).on("error", (err) => console.warn("[Watcher] Watcher error:", err));
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
  pendingWrites = /* @__PURE__ */ new Map();
  mainWindow = null;
  setMainWindow(window) {
    this.mainWindow = window;
  }
  getAvailableShells() {
    const isWindows = os__namespace.platform() === "win32";
    const shells = [];
    if (isWindows) {
      const pwshCandidates = [
        path__namespace.join(process.env.ProgramFiles || "C:\\Program Files", "PowerShell", "7", "pwsh.exe"),
        path__namespace.join(process.env.LOCALAPPDATA || "", "Programs", "PowerShell", "7", "pwsh.exe")
      ];
      let foundPwsh = false;
      for (const p of pwshCandidates) {
        if (fsSync__namespace.existsSync(p)) {
          shells.push({
            id: "pwsh",
            name: "PowerShell 7",
            shell: "powershell",
            path: p,
            description: "PowerShell Core 7 (Modern, Cross-Platform)",
            iconType: "powershell"
          });
          foundPwsh = true;
          break;
        }
      }
      const winPsPath = process.env.SystemRoot ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe` : "powershell.exe";
      shells.push({
        id: "powershell",
        name: foundPwsh ? "Windows PowerShell" : "PowerShell",
        shell: "powershell",
        path: winPsPath,
        description: "Default Windows PowerShell",
        iconType: "powershell"
      });
      const cmdPath = process.env.COMSPEC || `${process.env.SystemRoot || "C:\\Windows"}\\System32\\cmd.exe`;
      shells.push({
        id: "cmd",
        name: "Command Prompt",
        shell: "cmd",
        path: cmdPath,
        description: "Windows CMD Shell",
        iconType: "cmd"
      });
      const gitBashCandidates = [
        "C:\\Program Files\\Git\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        path__namespace.join(process.env.LOCALAPPDATA || "", "Programs", "Git", "bin", "bash.exe")
      ];
      for (const candidate of gitBashCandidates) {
        if (fsSync__namespace.existsSync(candidate)) {
          shells.push({
            id: "git-bash",
            name: "Git Bash",
            shell: "bash",
            path: candidate,
            description: "Bash for Windows with Git tools",
            iconType: "bash"
          });
          break;
        }
      }
      const wslPath = `${process.env.SystemRoot || "C:\\Windows"}\\System32\\wsl.exe`;
      if (fsSync__namespace.existsSync(wslPath)) {
        shells.push({
          id: "wsl",
          name: "WSL / Ubuntu",
          shell: "wsl",
          path: wslPath,
          description: "Windows Subsystem for Linux",
          iconType: "wsl"
        });
      }
    } else {
      if (fsSync__namespace.existsSync("/bin/zsh")) {
        shells.push({
          id: "zsh",
          name: "Zsh",
          shell: "bash",
          path: "/bin/zsh",
          description: "Z Shell",
          iconType: "bash"
        });
      }
      if (fsSync__namespace.existsSync("/bin/bash")) {
        shells.push({
          id: "bash",
          name: "Bash",
          shell: "bash",
          path: "/bin/bash",
          description: "Bourne Again Shell",
          iconType: "bash"
        });
      }
    }
    return shells;
  }
  resolveShell(shellType) {
    const isWindows = os__namespace.platform() === "win32";
    const type = (shellType || "default").toLowerCase();
    if (!isWindows) {
      if (type === "bash") return { shell: "/bin/bash", args: ["-i"] };
      if (type === "zsh") return { shell: "/bin/zsh", args: ["-i"] };
      if (type === "sh") return { shell: "/bin/sh", args: ["-i"] };
      return { shell: process.env.SHELL || "/bin/bash", args: ["-i"] };
    }
    if (type === "cmd") {
      return { shell: process.env.COMSPEC || "cmd.exe", args: ["/K"] };
    }
    if (type === "bash" || type === "git-bash") {
      const gitBashCandidates = [
        "C:\\Program Files\\Git\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        path__namespace.join(process.env.LOCALAPPDATA || "", "Programs", "Git", "bin", "bash.exe"),
        "bash.exe"
      ];
      for (const candidate of gitBashCandidates) {
        if (candidate === "bash.exe" || fsSync__namespace.existsSync(candidate)) {
          return { shell: candidate, args: ["--login", "-i"] };
        }
      }
      return { shell: "bash.exe", args: ["--login", "-i"] };
    }
    if (type === "wsl") {
      return { shell: "wsl.exe", args: [] };
    }
    if (type === "pwsh") {
      const pwshCandidates = [
        path__namespace.join(process.env.ProgramFiles || "C:\\Program Files", "PowerShell", "7", "pwsh.exe"),
        path__namespace.join(process.env.LOCALAPPDATA || "", "Programs", "PowerShell", "7", "pwsh.exe")
      ];
      for (const p of pwshCandidates) {
        if (fsSync__namespace.existsSync(p)) {
          return { shell: p, args: ["-NoLogo"] };
        }
      }
    }
    return {
      shell: process.env.SystemRoot ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe` : "powershell.exe",
      args: ["-NoLogo"]
    };
  }
  async createTerminal(id, cwd, shellType) {
    this.killTerminal(id);
    const workingDirectory = cwd && fsSync__namespace.existsSync(cwd) ? cwd : os__namespace.homedir();
    const { shell: resolvedShell, args: shellArgs } = this.resolveShell(shellType);
    try {
      const pty = require("node-pty");
      const ptyProcess = pty.spawn(resolvedShell, shellArgs, {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: workingDirectory,
        env: process.env
      });
      const instance = {
        write: (data) => {
          try {
            ptyProcess.write(data);
          } catch {
          }
        },
        resize: (cols, rows) => {
          try {
            if (cols >= 2 && rows >= 2 && !isNaN(cols) && !isNaN(rows)) {
              ptyProcess.resize(Math.floor(cols), Math.floor(rows));
            }
          } catch {
          }
        },
        kill: () => {
          try {
            ptyProcess.kill();
          } catch {
          }
        }
      };
      this.terminals.set(id, instance);
      ptyProcess.onData((data) => {
        this.sendData(id, data);
      });
      ptyProcess.onExit(({ exitCode }) => {
        if (this.terminals.get(id) === instance) {
          this.terminals.delete(id);
          this.pendingWrites.delete(id);
          this.sendExit(id, exitCode);
        }
      });
      const queued = this.pendingWrites.get(id);
      if (queued && queued.length > 0) {
        for (const data of queued) {
          instance.write(data);
        }
        this.pendingWrites.delete(id);
      }
      return true;
    } catch (nodePtyErr) {
      console.warn("node-pty native module unavailable, falling back to child_process shell:", nodePtyErr);
    }
    try {
      const fallbackArgs = resolvedShell.toLowerCase().includes("powershell") ? ["-NoLogo", "-NoExit", "-Command", "-"] : shellArgs;
      const proc = child_process.spawn(resolvedShell, fallbackArgs, {
        cwd: workingDirectory,
        env: {
          ...process.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor"
        },
        stdio: ["pipe", "pipe", "pipe"]
      });
      const instance = {
        write: (data) => {
          try {
            if (proc.stdin && !proc.stdin.destroyed) {
              proc.stdin.write(data);
            }
          } catch {
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
      };
      this.terminals.set(id, instance);
      proc.stdout?.on("data", (data) => {
        this.sendData(id, data.toString("utf-8"));
      });
      proc.stderr?.on("data", (data) => {
        this.sendData(id, data.toString("utf-8"));
      });
      proc.on("exit", (code) => {
        if (this.terminals.get(id) === instance) {
          this.terminals.delete(id);
          this.pendingWrites.delete(id);
          this.sendExit(id, code ?? 0);
        }
      });
      const queued = this.pendingWrites.get(id);
      if (queued && queued.length > 0) {
        for (const data of queued) {
          instance.write(data);
        }
        this.pendingWrites.delete(id);
      }
      this.sendData(id, `\x1B[38;2;93;214;44m[Cortex Terminal Ready: ${workingDirectory}]\x1B[0m\r
`);
      return true;
    } catch (fallbackErr) {
      console.error(`Failed to create terminal [${id}]:`, fallbackErr);
      return false;
    }
  }
  sendData(id, data) {
    const payload = { id, data };
    const windows = electron.BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TERMINAL_DATA, payload);
      }
    }
  }
  sendExit(id, exitCode) {
    const payload = { id, exitCode };
    const windows = electron.BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, payload);
      }
    }
  }
  writeTerminal(id, data) {
    const term = this.terminals.get(id);
    if (term) {
      term.write(data);
    } else {
      const queued = this.pendingWrites.get(id) || [];
      queued.push(data);
      this.pendingWrites.set(id, queued);
    }
  }
  resizeTerminal(id, cols, rows) {
    if (!cols || !rows || cols < 2 || rows < 2 || isNaN(cols) || isNaN(rows)) {
      return;
    }
    const term = this.terminals.get(id);
    if (term) {
      term.resize(cols, rows);
    }
  }
  killTerminal(id) {
    const term = this.terminals.get(id);
    if (term) {
      this.terminals.delete(id);
      term.kill();
    }
    this.pendingWrites.delete(id);
  }
  killAll() {
    for (const [id] of this.terminals) {
      this.killTerminal(id);
    }
    this.pendingWrites.clear();
  }
}
const terminalService = new TerminalService();
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
const BINARY_EXTENSIONS = /* @__PURE__ */ new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "ico",
  "webp",
  "svgz",
  "mp4",
  "mp3",
  "wav",
  "ogg",
  "zip",
  "tar",
  "gz",
  "7z",
  "rar",
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "pdf",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "node"
]);
class SearchService {
  isBinaryFile(filePath) {
    const ext = path__namespace.extname(filePath).slice(1).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
  }
  matchesGlob(filePath, pattern) {
    if (!pattern.trim()) return true;
    const normalized = filePath.replace(/\\/g, "/");
    const patterns = pattern.split(",").map((p) => p.trim());
    for (const p of patterns) {
      if (!p) continue;
      const isNegated = p.startsWith("!");
      const rawPattern = isNegated ? p.slice(1).trim() : p;
      const regexPattern = rawPattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/(?<!\.)\*/g, "[^/]*");
      const regex = new RegExp(regexPattern, "i");
      const matched = regex.test(normalized);
      if (isNegated && matched) return false;
      if (!isNegated && !matched) return false;
    }
    return true;
  }
  createSearchRegex(query, options) {
    if (!query) return null;
    let pattern = query;
    if (!options?.isRegex) {
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    if (options?.matchWholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    const flags = options?.matchCase ? "g" : "gi";
    try {
      return new RegExp(pattern, flags);
    } catch {
      return null;
    }
  }
  async scanFiles(dirPath, filesList = []) {
    try {
      const entries = await fs__namespace.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (IGNORED_DIRECTORIES.has(entry.name)) continue;
        const fullPath = path__namespace.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await this.scanFiles(fullPath, filesList);
        } else if (entry.isFile()) {
          if (!this.isBinaryFile(fullPath)) {
            filesList.push(fullPath);
          }
        }
      }
    } catch {
    }
    return filesList;
  }
  async searchWorkspace(workspacePath, query, options) {
    if (!query || !workspacePath) return [];
    const regex = this.createSearchRegex(query, options);
    if (!regex) return [];
    const allFiles = await this.scanFiles(workspacePath);
    const results = [];
    const maxResults = options?.maxResults || 2e3;
    let totalMatchesFound = 0;
    for (const filePath of allFiles) {
      if (totalMatchesFound >= maxResults) break;
      const relPath = path__namespace.relative(workspacePath, filePath).replace(/\\/g, "/");
      if (options?.includePattern && !this.matchesGlob(relPath, options.includePattern)) {
        continue;
      }
      if (options?.excludePattern && this.matchesGlob(relPath, options.excludePattern)) {
        continue;
      }
      try {
        const content = await fs__namespace.readFile(filePath, "utf-8");
        if (content.includes("\0")) continue;
        const lines = content.split(/\r?\n/);
        const fileMatches = [];
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const lineContent = lines[lineIdx];
          regex.lastIndex = 0;
          let match;
          while ((match = regex.exec(lineContent)) !== null) {
            fileMatches.push({
              filePath,
              relativePath: relPath,
              fileName: path__namespace.basename(filePath),
              line: lineIdx + 1,
              column: match.index + 1,
              lineContent,
              matchLength: match[0].length
            });
            totalMatchesFound++;
            if (totalMatchesFound >= maxResults) break;
            if (match.index === regex.lastIndex) {
              regex.lastIndex++;
            }
          }
          if (totalMatchesFound >= maxResults) break;
        }
        if (fileMatches.length > 0) {
          results.push({
            filePath,
            relativePath: relPath,
            fileName: path__namespace.basename(filePath),
            matches: fileMatches
          });
        }
      } catch {
      }
    }
    return results;
  }
  async replaceInFile(filePath, query, replaceText, options) {
    const regex = this.createSearchRegex(query, options);
    if (!regex) return 0;
    try {
      const content = await fs__namespace.readFile(filePath, "utf-8");
      let count = 0;
      const newContent = content.replace(regex, () => {
        count++;
        return replaceText;
      });
      if (count > 0) {
        await fs__namespace.writeFile(filePath, newContent, "utf-8");
      }
      return count;
    } catch {
      return 0;
    }
  }
  async replaceAll(workspacePath, query, replaceText, options) {
    const searchGroups = await this.searchWorkspace(workspacePath, query, options);
    let totalReplacements = 0;
    let filesModified = 0;
    for (const group of searchGroups) {
      const count = await this.replaceInFile(group.filePath, query, replaceText, options);
      if (count > 0) {
        totalReplacements += count;
        filesModified++;
      }
    }
    return { totalReplacements, filesModified };
  }
}
function runGit(args, cwd) {
  return new Promise((resolve, reject) => {
    child_process.execFile(
      "git",
      args,
      {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error) {
          const err = new Error(stderr || stdout || error.message);
          reject(err);
        } else {
          resolve(stdout);
        }
      }
    );
  });
}
class GitService {
  async isGitRepo(workspacePath) {
    if (!workspacePath) return false;
    try {
      const out = await runGit(["rev-parse", "--is-inside-work-tree"], workspacePath);
      return out.trim() === "true";
    } catch {
      return false;
    }
  }
  async getBranch(workspacePath) {
    if (!workspacePath) return null;
    try {
      const branch = await runGit(["branch", "--show-current"], workspacePath);
      const trimmed = branch.trim();
      if (trimmed) return trimmed;
      const shortHead = await runGit(["rev-parse", "--short", "HEAD"], workspacePath);
      return shortHead.trim() ? `(${shortHead.trim()})` : null;
    } catch {
      return null;
    }
  }
  async getStatus(workspacePath) {
    const emptyResult = {
      isRepo: false,
      branch: null,
      staged: [],
      unstaged: [],
      untracked: []
    };
    if (!workspacePath) return emptyResult;
    const isRepo = await this.isGitRepo(workspacePath);
    if (!isRepo) return emptyResult;
    const branch = await this.getBranch(workspacePath);
    try {
      const output = await runGit(["status", "--porcelain=v1", "-uall"], workspacePath);
      const lines = output.split(/\r?\n/).filter((l) => l.length >= 3);
      const staged = [];
      const unstaged = [];
      const untracked = [];
      for (const line of lines) {
        const x = line[0];
        const y = line[1];
        let rawPath = line.substring(3).trim();
        if (rawPath.startsWith('"') && rawPath.endsWith('"')) {
          rawPath = rawPath.slice(1, -1);
        }
        if (rawPath.includes(" -> ")) {
          const parts = rawPath.split(" -> ");
          rawPath = parts[1];
        }
        const relPath = rawPath.replace(/\\/g, "/");
        const fullPath = path__namespace.join(workspacePath, relPath).replace(/\\/g, "/");
        const fileName = path__namespace.basename(fullPath);
        if (x === "?" && y === "?") {
          untracked.push({
            path: fullPath,
            relativePath: relPath,
            fileName,
            status: "U",
            staged: false
          });
          continue;
        }
        if (x !== " " && x !== "?") {
          staged.push({
            path: fullPath,
            relativePath: relPath,
            fileName,
            status: x,
            staged: true
          });
        }
        if (y !== " " && y !== "?") {
          unstaged.push({
            path: fullPath,
            relativePath: relPath,
            fileName,
            status: y,
            staged: false
          });
        }
      }
      return {
        isRepo: true,
        branch,
        staged,
        unstaged,
        untracked
      };
    } catch (err) {
      console.error("Failed to get git status:", err);
      return {
        isRepo: true,
        branch,
        staged: [],
        unstaged: [],
        untracked: []
      };
    }
  }
  async stageFile(workspacePath, relativePath) {
    try {
      await runGit(["add", "--", relativePath], workspacePath);
      return true;
    } catch (err) {
      console.error(`Failed to stage file ${relativePath}:`, err);
      return false;
    }
  }
  async unstageFile(workspacePath, relativePath) {
    try {
      try {
        await runGit(["restore", "--staged", "--", relativePath], workspacePath);
      } catch {
        await runGit(["reset", "HEAD", "--", relativePath], workspacePath);
      }
      return true;
    } catch (err) {
      console.error(`Failed to unstage file ${relativePath}:`, err);
      return false;
    }
  }
  async stageAll(workspacePath) {
    try {
      await runGit(["add", "-A"], workspacePath);
      return true;
    } catch (err) {
      console.error("Failed to stage all files:", err);
      return false;
    }
  }
  async unstageAll(workspacePath) {
    try {
      await runGit(["reset"], workspacePath);
      return true;
    } catch (err) {
      console.error("Failed to unstage all files:", err);
      return false;
    }
  }
  async discardFile(workspacePath, relativePath, isUntracked = false) {
    try {
      if (isUntracked) {
        const fullPath = path__namespace.join(workspacePath, relativePath);
        await fs__namespace.rm(fullPath, { recursive: true, force: true });
      } else {
        try {
          await runGit(["restore", "--", relativePath], workspacePath);
        } catch {
          await runGit(["checkout", "--", relativePath], workspacePath);
        }
      }
      return true;
    } catch (err) {
      console.error(`Failed to discard file ${relativePath}:`, err);
      return false;
    }
  }
  async getFileAtHead(workspacePath, relativePath) {
    if (!workspacePath || !relativePath) return null;
    try {
      const gitRelPath = relativePath.replace(/\\/g, "/");
      const content = await runGit(["show", `HEAD:${gitRelPath}`], workspacePath);
      return content;
    } catch {
      return "";
    }
  }
  async getDiff(workspacePath, relativePath, staged = false) {
    if (!workspacePath || !relativePath) return "";
    try {
      const gitRelPath = relativePath.replace(/\\/g, "/");
      if (staged) {
        return await runGit(["diff", "--staged", "--", gitRelPath], workspacePath);
      }
      try {
        return await runGit(["diff", "HEAD", "--", gitRelPath], workspacePath);
      } catch {
        return await runGit(["diff", "--", gitRelPath], workspacePath);
      }
    } catch {
      return "";
    }
  }
  async commit(workspacePath, message) {
    if (!message || !message.trim()) return false;
    try {
      await runGit(["commit", "-m", message.trim()], workspacePath);
      return true;
    } catch (err) {
      console.error("Failed to commit:", err);
      return false;
    }
  }
}
const gitService = new GitService();
function parseJsonc(content) {
  try {
    return JSON.parse(content);
  } catch {
    const stripped = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(stripped);
  }
}
class ExtensionService {
  extensionsDir;
  dbPath;
  installedExtensions = /* @__PURE__ */ new Map();
  isInitialized = false;
  constructor() {
    this.extensionsDir = path__namespace.join(electron.app.getPath("userData"), "extensions");
    this.dbPath = path__namespace.join(this.extensionsDir, "extensions.json");
  }
  async ensureInitialized() {
    if (this.isInitialized) return;
    try {
      await fs__namespace.mkdir(this.extensionsDir, { recursive: true });
      try {
        const raw = await fs__namespace.readFile(this.dbPath, "utf-8");
        const list = JSON.parse(raw);
        this.installedExtensions.clear();
        for (const ext of list) {
          this.installedExtensions.set(ext.id, ext);
        }
      } catch {
        this.installedExtensions.clear();
        await this.saveDb();
      }
    } catch (err) {
      console.error("[ExtensionService] Failed to initialize directory:", err);
    }
    this.isInitialized = true;
  }
  async saveDb() {
    const list = Array.from(this.installedExtensions.values());
    await fs__namespace.writeFile(this.dbPath, JSON.stringify(list, null, 2), "utf-8");
  }
  /**
   * Returns all currently installed extensions.
   */
  async getInstalledExtensions() {
    await this.ensureInitialized();
    return Array.from(this.installedExtensions.values());
  }
  /**
   * Search extensions from Open VSX Registry.
   */
  async searchMarketplace(query, category) {
    await this.ensureInitialized();
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.append("query", query.trim());
      }
      if (category && category.trim()) {
        params.append("category", category.trim());
      }
      params.append("size", "30");
      const url = `https://open-vsx.org/api/-/search?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Cortex-Editor/1.0.0"
        }
      });
      if (!response.ok) {
        throw new Error(`Open VSX returned HTTP ${response.status}`);
      }
      const data = await response.json();
      const extensions = data.extensions || [];
      return extensions.map((ext) => {
        const id = `${ext.namespace}.${ext.name}`;
        const isInstalled = this.installedExtensions.has(id);
        return {
          id,
          name: ext.name,
          namespace: ext.namespace,
          displayName: ext.displayName || ext.name,
          version: ext.version || "1.0.0",
          description: ext.description || "",
          icon: ext.files?.icon,
          downloadUrl: ext.files?.download || "",
          downloadCount: ext.downloadCount || 0,
          averageRating: ext.averageRating || 0,
          reviewCount: ext.reviewCount || 0,
          timestamp: ext.timestamp,
          isInstalled,
          categories: ext.categories || []
        };
      });
    } catch (err) {
      console.error("[ExtensionService] Search failed:", err);
      return [];
    }
  }
  /**
   * Installs an extension downloaded from the Open VSX registry.
   */
  async installFromMarketplace(extension) {
    await this.ensureInitialized();
    let downloadUrl = extension.downloadUrl;
    let response = null;
    if (downloadUrl) {
      try {
        const res = await fetch(downloadUrl, {
          headers: { "User-Agent": "Cortex-Editor/1.0.0" },
          redirect: "follow"
        });
        if (res.ok) {
          response = res;
        }
      } catch (err) {
        console.warn(`[ExtensionService] Initial download attempt failed for ${downloadUrl}:`, err);
      }
    }
    const namespace = extension.namespace || (extension.id.includes(".") ? extension.id.split(".")[0] : "");
    const name = extension.name || (extension.id.includes(".") ? extension.id.split(".")[1] : extension.id);
    if ((!response || !response.ok) && namespace && name) {
      try {
        const metaUrl = `https://open-vsx.org/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
        const metaRes = await fetch(metaUrl, {
          headers: { Accept: "application/json", "User-Agent": "Cortex-Editor/1.0.0" },
          redirect: "follow"
        });
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          if (metaData.files?.download) {
            downloadUrl = metaData.files.download;
            const retryRes = await fetch(downloadUrl, {
              headers: { "User-Agent": "Cortex-Editor/1.0.0" },
              redirect: "follow"
            });
            if (retryRes.ok) {
              response = retryRes;
            }
          }
        }
      } catch (metaErr) {
        console.warn("[ExtensionService] Metadata lookup fallback failed:", metaErr);
      }
    }
    if (!response || !response.ok) {
      const code = response ? response.status : 404;
      throw new Error(
        `Failed to download extension "${extension.displayName || extension.name}": HTTP ${code}. Package could not be located on Open VSX.`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return await this.extractAndRegisterVsix(buffer, extension.id, extension.icon);
  }
  /**
   * Installs an extension from a local .vsix file path or opens file dialog if omitted.
   */
  async installFromVsix(filePath) {
    await this.ensureInitialized();
    let targetPath = filePath;
    if (!targetPath) {
      const result = await electron.dialog.showOpenDialog({
        title: "Select VS Code Extension (.vsix)",
        filters: [{ name: "VSIX Package", extensions: ["vsix"] }],
        properties: ["openFile"]
      });
      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }
      targetPath = result.filePaths[0];
    }
    const buffer = await fs__namespace.readFile(targetPath);
    return await this.extractAndRegisterVsix(buffer);
  }
  /**
   * Internal helper to extract .vsix (ZIP), parse package.json, count snippets/themes,
   * and persist metadata.
   */
  async extractAndRegisterVsix(buffer, preferredId, marketplaceIcon) {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    const pkgEntry = zipEntries.find(
      (e) => e.entryName === "extension/package.json" || e.entryName === "package.json"
    );
    if (!pkgEntry) {
      throw new Error("Invalid VSIX: package.json not found in extension package.");
    }
    const pkgJson = parseJsonc(pkgEntry.getData().toString("utf-8"));
    const publisher = pkgJson.publisher || "local";
    const name = pkgJson.name;
    const id = preferredId || `${publisher}.${name}`;
    const installPath = path__namespace.join(this.extensionsDir, id);
    try {
      await fs__namespace.rm(installPath, { recursive: true, force: true });
    } catch {
    }
    await fs__namespace.mkdir(installPath, { recursive: true });
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      let relativePath = entry.entryName;
      if (relativePath.startsWith("extension/")) {
        relativePath = relativePath.substring("extension/".length);
      }
      const destPath = path__namespace.join(installPath, relativePath);
      const destDir = path__namespace.dirname(destPath);
      await fs__namespace.mkdir(destDir, { recursive: true });
      await fs__namespace.writeFile(destPath, entry.getData());
    }
    let iconUrl = marketplaceIcon;
    if (pkgJson.icon) {
      const localIconPath = path__namespace.join(installPath, pkgJson.icon);
      try {
        const iconData = await fs__namespace.readFile(localIconPath);
        const ext = path__namespace.extname(pkgJson.icon).toLowerCase().replace(".", "");
        const mime = ext === "svg" ? "image/svg+xml" : `image/${ext || "png"}`;
        iconUrl = `data:${mime};base64,${iconData.toString("base64")}`;
      } catch {
      }
    }
    let snippetsCount = 0;
    const snippetsContrib = pkgJson.contributes?.snippets || [];
    for (const s of snippetsContrib) {
      const snippetPath = path__namespace.join(installPath, s.path);
      try {
        const content = await fs__namespace.readFile(snippetPath, "utf-8");
        const parsed = parseJsonc(content);
        snippetsCount += Object.keys(parsed).length;
      } catch {
        snippetsCount += 1;
      }
    }
    const themesContrib = pkgJson.contributes?.themes || [];
    const themesCount = themesContrib.length;
    const installed = {
      id,
      name: pkgJson.name,
      displayName: pkgJson.displayName || pkgJson.name,
      publisher,
      version: pkgJson.version || "1.0.0",
      description: pkgJson.description || "",
      icon: iconUrl,
      enabled: true,
      installDate: Date.now(),
      snippetsCount,
      themesCount,
      contributes: {
        snippets: pkgJson.contributes?.snippets,
        themes: pkgJson.contributes?.themes
      }
    };
    this.installedExtensions.set(id, installed);
    await this.saveDb();
    return installed;
  }
  /**
   * Uninstalls an extension by removing its directory and database record.
   */
  async uninstallExtension(extensionId) {
    await this.ensureInitialized();
    const installPath = path__namespace.join(this.extensionsDir, extensionId);
    try {
      await fs__namespace.rm(installPath, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[ExtensionService] Failed to clean directory ${installPath}:`, err);
    }
    const removed = this.installedExtensions.delete(extensionId);
    if (removed) {
      await this.saveDb();
    }
    return true;
  }
  /**
   * Toggles extension enabled / disabled state.
   */
  async toggleExtension(extensionId, enabled) {
    await this.ensureInitialized();
    const ext = this.installedExtensions.get(extensionId);
    if (!ext) return false;
    ext.enabled = enabled;
    this.installedExtensions.set(extensionId, ext);
    await this.saveDb();
    return true;
  }
  /**
   * Aggregates all snippets provided by active/enabled installed extensions.
   */
  async getExtensionSnippets() {
    await this.ensureInitialized();
    const allSnippets = [];
    for (const ext of this.installedExtensions.values()) {
      if (!ext.enabled || !ext.contributes?.snippets) continue;
      const installPath = path__namespace.join(this.extensionsDir, ext.id);
      for (const snippetDef of ext.contributes.snippets) {
        const fullSnippetPath = path__namespace.join(installPath, snippetDef.path);
        try {
          const raw = await fs__namespace.readFile(fullSnippetPath, "utf-8");
          const snippetObj = parseJsonc(raw);
          for (const [name, val] of Object.entries(snippetObj)) {
            if (!val || !val.prefix && !val.body) continue;
            allSnippets.push({
              name,
              language: snippetDef.language || val.scope || "",
              prefix: val.prefix,
              body: val.body,
              description: val.description,
              scope: val.scope,
              sourceExtensionId: ext.id,
              sourceExtensionName: ext.displayName || ext.name
            });
          }
        } catch (err) {
          console.warn(`[ExtensionService] Failed to read snippets at ${fullSnippetPath}:`, err);
        }
      }
    }
    return allSnippets;
  }
  /**
   * Aggregates all themes provided by active/enabled installed extensions.
   */
  async getExtensionThemes() {
    await this.ensureInitialized();
    const allThemes = [];
    for (const ext of this.installedExtensions.values()) {
      if (!ext.enabled || !ext.contributes?.themes) continue;
      const installPath = path__namespace.join(this.extensionsDir, ext.id);
      for (const themeDef of ext.contributes.themes) {
        const fullThemePath = path__namespace.join(installPath, themeDef.path);
        try {
          const raw = await fs__namespace.readFile(fullThemePath, "utf-8");
          const themeData = parseJsonc(raw);
          allThemes.push({
            id: `${ext.id}.${themeDef.label.toLowerCase().replace(/\s+/g, "-")}`,
            label: themeDef.label,
            uiTheme: themeDef.uiTheme || "vs-dark",
            path: fullThemePath,
            sourceExtensionId: ext.id,
            themeData
          });
        } catch (err) {
          console.warn(`[ExtensionService] Failed to read theme at ${fullThemePath}:`, err);
        }
      }
    }
    return allThemes;
  }
  /**
   * Shows a dialog to pick a .vsix file.
   */
  async openVsixDialog() {
    const result = await electron.dialog.showOpenDialog({
      title: "Select VS Code Extension (.vsix)",
      filters: [{ name: "VSIX Package", extensions: ["vsix"] }],
      properties: ["openFile"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }
  /**
   * Reads README documentation for an extension (either from disk or Open VSX API).
   */
  async getReadme(extensionId, namespace, name) {
    await this.ensureInitialized();
    const installPath = path__namespace.join(this.extensionsDir, extensionId);
    const readmeCandidates = [
      "README.md",
      "readme.md",
      "Readme.md",
      "README.MD",
      "README"
    ];
    for (const file of readmeCandidates) {
      const fullPath = path__namespace.join(installPath, file);
      try {
        const text = await fs__namespace.readFile(fullPath, "utf-8");
        if (text && text.trim()) {
          return text;
        }
      } catch {
      }
    }
    const ns = namespace || (extensionId.includes(".") ? extensionId.split(".")[0] : "");
    const nm = name || (extensionId.includes(".") ? extensionId.split(".")[1] : extensionId);
    if (ns && nm) {
      try {
        const url = `https://open-vsx.org/api/${encodeURIComponent(ns)}/${encodeURIComponent(nm)}/latest/file/readme.md`;
        const res = await fetch(url, {
          headers: { "User-Agent": "Cortex-Editor/1.0.0" },
          redirect: "follow"
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim()) {
            return text;
          }
        }
      } catch (err) {
        console.warn(`[ExtensionService] Failed to fetch remote README for ${ns}/${nm}:`, err);
      }
    }
    return `# ${nm || extensionId}

*No README documentation provided for this extension.*`;
  }
  /**
   * Returns snippets belonging to a specific installed extension.
   */
  async getExtensionSnippetsForExt(extensionId) {
    await this.ensureInitialized();
    const ext = this.installedExtensions.get(extensionId);
    if (!ext || !ext.contributes?.snippets) {
      return [];
    }
    const snippets = [];
    const installPath = path__namespace.join(this.extensionsDir, ext.id);
    for (const snippetDef of ext.contributes.snippets) {
      const fullSnippetPath = path__namespace.join(installPath, snippetDef.path);
      try {
        const raw = await fs__namespace.readFile(fullSnippetPath, "utf-8");
        const snippetObj = parseJsonc(raw);
        for (const [sName, val] of Object.entries(snippetObj)) {
          if (!val || !val.prefix && !val.body) continue;
          snippets.push({
            name: sName,
            language: snippetDef.language || val.scope || "",
            prefix: val.prefix,
            body: val.body,
            description: val.description,
            scope: val.scope,
            sourceExtensionId: ext.id,
            sourceExtensionName: ext.displayName || ext.name
          });
        }
      } catch (err) {
        console.warn(`[ExtensionService] Failed to read snippets at ${fullSnippetPath}:`, err);
      }
    }
    return snippets;
  }
}
const extensionService = new ExtensionService();
class AIService {
  /**
   * Helper to determine provider and API key from request settings or environment
   */
  getProviderConfig(settings) {
    let provider = settings?.aiModelProvider || "google-gemini";
    const apiKey = (settings?.aiApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || "").trim().replace(/^["'`]|["'`]$/g, "").trim();
    if (apiKey.startsWith("sk-ant-") && provider !== "anthropic") {
      console.log("[AIService] Key starts with sk-ant-, auto-switching provider to Anthropic");
      provider = "anthropic";
    } else if ((apiKey.startsWith("sk-") || apiKey.startsWith("org-")) && !apiKey.startsWith("sk-ant-") && provider !== "openai") {
      console.log("[AIService] Key starts with sk-, auto-switching provider to OpenAI");
      provider = "openai";
    } else if ((apiKey.startsWith("AIzaSy") || apiKey.startsWith("AQ.")) && provider !== "google-gemini") {
      console.log("[AIService] Key starts with AIzaSy/AQ., auto-switching provider to Google Gemini");
      provider = "google-gemini";
    }
    const temperature = settings?.aiTemperature ?? 0.2;
    const maxTokens = settings?.aiMaxTokens ?? 2048;
    return { provider, apiKey, temperature, maxTokens };
  }
  /**
   * Helper to strip markdown code blocks if present
   */
  cleanCodeBlock(text) {
    let clean = text.trim();
    if (clean.startsWith("```")) {
      const firstNewline = clean.indexOf("\n");
      if (firstNewline !== -1) {
        clean = clean.substring(firstNewline + 1);
      }
      if (clean.endsWith("```")) {
        clean = clean.substring(0, clean.length - 3).trimEnd();
      }
    }
    return clean;
  }
  /**
   * Generates inline Ghost Text code completion (Copilot style)
   */
  async generateCompletion(req) {
    const { provider, apiKey, temperature } = this.getProviderConfig(req.settings);
    if (!apiKey) {
      return {
        text: "",
        error: "No AI API Key configured. Go to Settings (Ctrl+,) > AI to configure."
      };
    }
    const prefix = req.prefix || "";
    const suffix = req.suffix || "";
    const lang = req.language || "typescript";
    const prompt = `You are a high-speed AI code completion assistant inside Cortex Editor.
Complete the code immediately following the cursor.
Return ONLY the raw completion text that directly completes the line or statement.
Do NOT include markdown code blocks, backticks, explanations, or commentary.

Language: ${lang}
Code before cursor:
${prefix.slice(-1200)}

Code after cursor:
${suffix.slice(0, 300)}`;
    try {
      const rawText = await this.callProvider(
        provider,
        apiKey,
        [
          {
            role: "system",
            content: "You are a code completion engine. Return only the raw text to be inserted at the cursor."
          },
          { role: "user", content: prompt }
        ],
        { temperature: Math.min(temperature, 0.2), maxTokens: 512 }
      );
      const cleaned = this.cleanCodeBlock(rawText);
      return { text: cleaned };
    } catch (err) {
      console.error("[AIService] Completion failed:", err);
      return { text: "", error: err.message || "Completion request failed" };
    }
  }
  /**
   * Generates inline edit / refactoring (Ctrl+K style)
   */
  async generateEdit(req) {
    const { provider, apiKey, temperature, maxTokens } = this.getProviderConfig(
      req.settings
    );
    if (!apiKey) {
      return {
        text: "",
        error: "No AI API Key configured. Go to Settings (Ctrl+,) > AI to configure."
      };
    }
    const prompt = `You are an expert pair-programming software engineer inside Cortex Editor.
The user wants to edit or transform the following code snippet according to their instruction.

Language: ${req.language || "typescript"}
Instruction: ${req.prompt}

Target Code to transform:
${req.code}

${req.context ? `Surrounding Context:
${req.context.slice(0, 1e3)}
` : ""}

Output Requirement:
Return ONLY the updated replacement code.
Do NOT wrap the output in markdown code fences (\`\`\`) unless specifically instructed.
Do NOT include preamble, comments about what you did, or conversational text.`;
    try {
      const rawText = await this.callProvider(
        provider,
        apiKey,
        [
          {
            role: "system",
            content: "You are an expert code editor. Output only the modified code cleanly."
          },
          { role: "user", content: prompt }
        ],
        { temperature, maxTokens }
      );
      const cleaned = this.cleanCodeBlock(rawText);
      return { text: cleaned };
    } catch (err) {
      console.error("[AIService] Edit failed:", err);
      return { text: "", error: err.message || "Edit request failed" };
    }
  }
  /**
   * Conversational Assistant (Sidebar Chat with file context)
   */
  async chat(req) {
    const { provider, apiKey, temperature, maxTokens } = this.getProviderConfig(
      req.settings
    );
    if (!apiKey) {
      return {
        text: "",
        error: "No AI API Key configured. Go to Settings (Ctrl+,) > AI to configure."
      };
    }
    const systemPrompt = `You are Cortex AI, a highly capable software engineering copilot integrated directly inside Cortex Code Editor.
You write clean, modular, modern, bug-free code.
When generating code snippets, always format them with standard markdown code blocks and identify the language (e.g. \`\`\`tsx).
Keep responses helpful, technical, concise, and focused on solving the user's coding questions.`;
    const formattedMessages = [
      { role: "system", content: systemPrompt }
    ];
    if (req.contextFile) {
      formattedMessages.push({
        role: "user",
        content: `[Current Active File: ${req.contextFile.name} (${req.contextFile.language || "plain text"})]
\`\`\`${req.contextFile.language || ""}
${req.contextFile.content.slice(0, 8e3)}
\`\`\``
      });
      formattedMessages.push({
        role: "assistant",
        content: `I see the active file "${req.contextFile.name}". How can I help you with this code?`
      });
    }
    for (const msg of req.messages) {
      formattedMessages.push({ role: msg.role, content: msg.content });
    }
    try {
      const text = await this.callProvider(provider, apiKey, formattedMessages, {
        temperature,
        maxTokens
      });
      return { text };
    } catch (err) {
      console.error("[AIService] Chat failed:", err);
      return { text: "", error: err.message || "Chat request failed" };
    }
  }
  /**
   * Internal router to call LLM provider APIs
   */
  async callProvider(provider, apiKey, messages, options) {
    const cleanKey = apiKey.trim().replace(/^["'`]|["'`]$/g, "").trim();
    switch (provider) {
      case "google-gemini":
        return await this.callGemini(cleanKey, messages, options);
      case "openai":
        return await this.callOpenAI(cleanKey, messages, options);
      case "anthropic":
        return await this.callAnthropic(cleanKey, messages, options);
      default:
        return await this.callGemini(cleanKey, messages, options);
    }
  }
  /**
   * Google Gemini API call with dynamic model discovery and multi-version fallback
   */
  async callGemini(apiKey, messages, options) {
    const cleanKey = apiKey.trim().replace(/^["'`]|["'`]$/g, "").trim();
    const systemMsg = messages.find((m) => m.role === "system")?.content;
    const nonSystemMsgs = messages.filter((m) => m.role !== "system");
    const contents = nonSystemMsgs.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens
      }
    };
    if (systemMsg) {
      body.systemInstruction = {
        parts: [{ text: systemMsg }]
      };
    }
    const candidateModels = [
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-flash-latest",
      "gemini-pro-latest"
    ];
    let lastError = null;
    for (const apiVer of ["v1beta", "v1"]) {
      for (const modelName of candidateModels) {
        const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          });
          const rawText = await res.text();
          if (res.ok) {
            let json;
            try {
              json = JSON.parse(rawText);
            } catch {
              throw new Error("Gemini returned an invalid JSON response.");
            }
            const candidate = json.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const part = parts.find(
              (p) => typeof p.text === "string" && p.text.trim().length > 0
            ) || parts[0];
            const text = part?.text;
            if (typeof text === "string" && text.length > 0) {
              return text;
            }
            lastError = new Error("Gemini candidate was empty");
            continue;
          }
          if (res.status === 404 || res.status === 429) {
            lastError = new Error(`Gemini API Error (${res.status}): ${rawText}`);
            continue;
          }
          throw new Error(`Gemini API Error (${res.status}): ${rawText}`);
        } catch (err) {
          if (!err.message?.includes("404") && !err.message?.includes("429")) {
            throw err;
          }
          lastError = err;
        }
      }
    }
    throw lastError || new Error(
      "Gemini models returned 404. Ensure your key was created at https://aistudio.google.com/app/apikey"
    );
  }
  /**
   * OpenAI API call
   */
  async callOpenAI(apiKey, messages, options) {
    const cleanKey = apiKey.trim().replace(/^["'`]|["'`]$/g, "").trim();
    const url = "https://api.openai.com/v1/chat/completions";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cleanKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API Error (${res.status}): ${errText}`);
    }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new Error("OpenAI returned an empty response.");
    }
    return text;
  }
  /**
   * Anthropic Claude API call
   */
  async callAnthropic(apiKey, messages, options) {
    const cleanKey = apiKey.trim().replace(/^["'`]|["'`]$/g, "").trim();
    const url = "https://api.anthropic.com/v1/messages";
    const systemMsg = messages.find((m) => m.role === "system")?.content;
    const nonSystemMsgs = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content
    }));
    const body = {
      model: "claude-3-5-haiku-20241022",
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      messages: nonSystemMsgs
    };
    if (systemMsg) {
      body.system = systemMsg;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cleanKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API Error (${res.status}): ${errText}`);
    }
    const json = await res.json();
    const text = json.content?.[0]?.text;
    if (typeof text !== "string") {
      throw new Error("Anthropic returned an empty response.");
    }
    return text;
  }
  /**
   * Tests API key connectivity and returns human-readable diagnostic status
   */
  async testConnection(rawProvider, rawKey) {
    const key = (rawKey || "").trim().replace(/^["'`]|["'`]$/g, "").trim();
    if (!key) {
      return {
        success: false,
        message: "Please enter an API key to test."
      };
    }
    let provider = rawProvider || "google-gemini";
    let detectedProvider = provider;
    if (key.startsWith("sk-ant-")) {
      detectedProvider = "anthropic";
    } else if (key.startsWith("sk-") || key.startsWith("org-")) {
      detectedProvider = "openai";
    } else if (key.startsWith("AIzaSy") || key.startsWith("AQ.")) {
      detectedProvider = "google-gemini";
    }
    if (detectedProvider !== provider) {
      provider = detectedProvider;
    }
    if (provider === "google-gemini") {
      try {
        let discoveredModels = [];
        let rawError = null;
        try {
          const reply = await this.callGemini(
            key,
            [{ role: "user", content: 'Say "OK"' }],
            { temperature: 0.1, maxTokens: 512 }
          );
          return {
            success: true,
            detectedProvider,
            modelUsed: "gemini-3.1-flash-lite",
            message: `Connected successfully to Google Gemini! Response: "${reply.trim()}"`
          };
        } catch (callErr) {
          rawError = callErr.message || String(callErr);
        }
        let detail = rawError || "";
        try {
          const parsed = JSON.parse(rawError || "{}");
          detail = parsed.error?.message || detail;
        } catch {
        }
        if (detail.includes("API_KEY_INVALID") || detail.includes("not valid")) {
          return {
            success: false,
            detectedProvider,
            message: "Invalid API Key. Google reports this key does not exist. Please generate a valid free key at https://aistudio.google.com/app/apikey"
          };
        }
        return {
          success: false,
          detectedProvider,
          message: `Gemini rejected key: ${detail || "No generative models found. Make sure this key was created in Google AI Studio (https://aistudio.google.com/app/apikey), not standard Google Cloud Console without the Generative Language API."}`
        };
      } catch (err) {
        return {
          success: false,
          detectedProvider,
          message: `Connection error: ${err.message || "Failed to reach Google Gemini"}`
        };
      }
    }
    try {
      const testMessages = [{ role: "user", content: 'Reply with "OK"' }];
      const reply = await this.callProvider(provider, key, testMessages, {
        temperature: 0.1,
        maxTokens: 10
      });
      return {
        success: true,
        detectedProvider,
        message: `Successfully connected to ${provider.toUpperCase()}! Response: "${reply.trim()}"`
      };
    } catch (err) {
      return {
        success: false,
        detectedProvider,
        message: err.message || "Connection failed"
      };
    }
  }
}
const aiService = new AIService();
const searchService = new SearchService();
let storedSettings = {};
function registerIpcHandlers(mainWindow2, openSettingsWindow2, openExtensionsWindow2) {
  fileService.setMainWindow(mainWindow2);
  terminalService.setMainWindow(mainWindow2);
  electron.ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender) || mainWindow2;
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender) || mainWindow2;
    if (win && !win.isDestroyed()) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender) || mainWindow2;
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
    const win = electron.BrowserWindow.fromWebContents(event.sender) || mainWindow2;
    return win && !win.isDestroyed() ? win.isMaximized() : false;
  });
  electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_OPEN, () => {
    if (openSettingsWindow2) {
      openSettingsWindow2();
    }
  });
  electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return storedSettings;
  });
  electron.ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, (_, partialSettings) => {
    storedSettings = { ...storedSettings, ...partialSettings };
    electron.BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, partialSettings);
      }
    });
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
  electron.ipcMain.handle(
    IPC_CHANNELS.TERMINAL_CREATE,
    async (_, id, cwd, shellType) => {
      return await terminalService.createTerminal(id, cwd, shellType);
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.TERMINAL_WRITE, (_, id, data) => {
    terminalService.writeTerminal(id, data);
  });
  electron.ipcMain.handle(IPC_CHANNELS.TERMINAL_RESIZE, (_, id, cols, rows) => {
    terminalService.resizeTerminal(id, cols, rows);
  });
  electron.ipcMain.handle(IPC_CHANNELS.TERMINAL_KILL, (_, id) => {
    terminalService.killTerminal(id);
  });
  electron.ipcMain.handle(IPC_CHANNELS.TERMINAL_GET_AVAILABLE_SHELLS, () => {
    return terminalService.getAvailableShells();
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.SEARCH_WORKSPACE,
    async (_, workspacePath, query, options) => {
      return await searchService.searchWorkspace(workspacePath, query, options);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.SEARCH_REPLACE_FILE,
    async (_, filePath, query, replaceText, options) => {
      return await searchService.replaceInFile(filePath, query, replaceText, options);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.SEARCH_REPLACE_ALL,
    async (_, workspacePath, query, replaceText, options) => {
      return await searchService.replaceAll(workspacePath, query, replaceText, options);
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (_, workspacePath) => {
    return await gitService.getStatus(workspacePath);
  });
  electron.ipcMain.handle(IPC_CHANNELS.GIT_BRANCH, async (_, workspacePath) => {
    return await gitService.getBranch(workspacePath);
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.GIT_GET_FILE_AT_HEAD,
    async (_, workspacePath, relativePath) => {
      return await gitService.getFileAtHead(workspacePath, relativePath);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.GIT_GET_DIFF,
    async (_, workspacePath, relativePath, staged) => {
      return await gitService.getDiff(workspacePath, relativePath, staged);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.GIT_STAGE,
    async (_, workspacePath, relativePath) => {
      return await gitService.stageFile(workspacePath, relativePath);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.GIT_UNSTAGE,
    async (_, workspacePath, relativePath) => {
      return await gitService.unstageFile(workspacePath, relativePath);
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.GIT_STAGE_ALL, async (_, workspacePath) => {
    return await gitService.stageAll(workspacePath);
  });
  electron.ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE_ALL, async (_, workspacePath) => {
    return await gitService.unstageAll(workspacePath);
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.GIT_DISCARD,
    async (_, workspacePath, relativePath, isUntracked) => {
      return await gitService.discardFile(workspacePath, relativePath, isUntracked);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.GIT_COMMIT,
    async (_, workspacePath, message) => {
      return await gitService.commit(workspacePath, message);
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_GET_INSTALLED, async () => {
    return await extensionService.getInstalledExtensions();
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_SEARCH_MARKETPLACE,
    async (_, query, category) => {
      return await extensionService.searchMarketplace(query, category);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_INSTALL_FROM_MARKETPLACE,
    async (_, extension) => {
      return await extensionService.installFromMarketplace(extension);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_INSTALL_FROM_VSIX,
    async (_, filePath) => {
      return await extensionService.installFromVsix(filePath);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_UNINSTALL,
    async (_, extensionId) => {
      return await extensionService.uninstallExtension(extensionId);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_TOGGLE_ENABLE,
    async (_, extensionId, enabled) => {
      return await extensionService.toggleExtension(extensionId, enabled);
    }
  );
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_GET_SNIPPETS, async () => {
    return await extensionService.getExtensionSnippets();
  });
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_GET_THEMES, async () => {
    return await extensionService.getExtensionThemes();
  });
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_OPEN_VSIX_DIALOG, async () => {
    return await extensionService.openVsixDialog();
  });
  electron.ipcMain.handle(IPC_CHANNELS.EXTENSIONS_OPEN_WINDOW, () => {
    if (openExtensionsWindow2) {
      openExtensionsWindow2();
    }
  });
  electron.ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_GET_README,
    async (_, extensionId, namespace, name) => {
      return await extensionService.getReadme(extensionId, namespace, name);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.EXTENSIONS_GET_EXT_SNIPPETS,
    async (_, extensionId) => {
      return await extensionService.getExtensionSnippetsForExt(extensionId);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_COMPLETION,
    async (_, req) => {
      return await aiService.generateCompletion(req);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_EDIT,
    async (_, req) => {
      return await aiService.generateEdit(req);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.AI_CHAT,
    async (_, req) => {
      return await aiService.chat(req);
    }
  );
  electron.ipcMain.handle(
    IPC_CHANNELS.AI_TEST_CONNECTION,
    async (_, provider, apiKey) => {
      return await aiService.testConnection(provider, apiKey);
    }
  );
}
let mainWindow = null;
let settingsWindow = null;
let extensionsWindow = null;
function getAppIconPath() {
  const isDev = !electron.app.isPackaged;
  const filename = process.platform === "win32" ? "icon.ico" : "icon.png";
  if (isDev) {
    return path.join(__dirname, "../../resources", filename);
  }
  return path.join(process.resourcesPath, filename);
}
function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }
  const iconPath = getAppIconPath();
  settingsWindow = new electron.BrowserWindow({
    title: "Settings - Cortex",
    width: 780,
    height: 560,
    minWidth: 640,
    minHeight: 460,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0f1117",
    icon: iconPath,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : void 0,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWindow.on("ready-to-show", () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.show();
    }
  });
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
  settingsWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    settingsWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#/settings`);
  } else {
    settingsWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
      hash: "/settings"
    });
  }
  return settingsWindow;
}
function openExtensionsWindow() {
  if (extensionsWindow && !extensionsWindow.isDestroyed()) {
    if (extensionsWindow.isMinimized()) {
      extensionsWindow.restore();
    }
    extensionsWindow.show();
    extensionsWindow.focus();
    return extensionsWindow;
  }
  const iconPath = getAppIconPath();
  extensionsWindow = new electron.BrowserWindow({
    title: "Extensions - Cortex",
    width: 980,
    height: 680,
    minWidth: 800,
    minHeight: 520,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0f1117",
    icon: iconPath,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : void 0,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  extensionsWindow.on("ready-to-show", () => {
    if (extensionsWindow && !extensionsWindow.isDestroyed()) {
      extensionsWindow.show();
    }
  });
  extensionsWindow.on("closed", () => {
    extensionsWindow = null;
  });
  extensionsWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    extensionsWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#/extensions`);
  } else {
    extensionsWindow.loadFile(path.join(__dirname, "../renderer/index.html"), {
      hash: "/extensions"
    });
  }
  return extensionsWindow;
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    title: "Cortex",
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 550,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0f1117",
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  registerIpcHandlers(mainWindow, openSettingsWindow, openExtensionsWindow);
  mainWindow.on("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
  mainWindow.on("close", () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
    }
    if (extensionsWindow && !extensionsWindow.isDestroyed()) {
      extensionsWindow.close();
    }
  });
  mainWindow.on("closed", () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
    }
    if (extensionsWindow && !extensionsWindow.isDestroyed()) {
      extensionsWindow.close();
    }
    mainWindow = null;
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
exports.openExtensionsWindow = openExtensionsWindow;
exports.openSettingsWindow = openSettingsWindow;
