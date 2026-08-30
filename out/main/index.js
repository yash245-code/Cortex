"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const fs = require("fs/promises");
const child_process = require("child_process");
const chokidar = require("chokidar");
const os = require("os");
const fsSync = require("fs");
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
  GIT_COMMIT: "cortex:git:commit"
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
const searchService = new SearchService();
let storedSettings = {};
function registerIpcHandlers(mainWindow2, openSettingsWindow2) {
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
}
let mainWindow = null;
let settingsWindow = null;
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
  registerIpcHandlers(mainWindow, openSettingsWindow);
  mainWindow.on("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
  mainWindow.on("close", () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
    }
  });
  mainWindow.on("closed", () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.close();
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
exports.openSettingsWindow = openSettingsWindow;
