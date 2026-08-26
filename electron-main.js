const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync, exec, spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ─── Window Controls ────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());
ipcMain.handle('window-is-maximized', () => mainWindow.isMaximized());

// ─── File System ─────────────────────────────────────────────────────────────
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'] });
  return result.canceled ? null : result.filePaths;
});

ipcMain.handle('dialog:saveFile', async (event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('fs:readDir', async (event, dirPath) => {
  function readDirRecursive(p, depth = 0) {
    if (depth > 8) return [];
    try {
      const entries = fs.readdirSync(p, { withFileTypes: true });
      return entries
        .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== '__pycache__' && e.name !== '.git')
        .map(entry => {
          const fullPath = path.join(p, entry.name);
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            children: entry.isDirectory() ? readDirRecursive(fullPath, depth + 1) : [],
            ext: entry.isDirectory() ? '' : path.extname(entry.name).toLowerCase().slice(1),
          };
        })
        .sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
    } catch { return []; }
  }
  return readDirRecursive(dirPath);
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 10 * 1024 * 1024) return { success: false, error: 'File too large (>10MB)' };
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content, mtime: stat.mtimeMs };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    const stat = fs.statSync(filePath);
    return { success: true, mtime: stat.mtimeMs };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs:createFile', async (event, filePath) => {
  try { fs.writeFileSync(filePath, '', 'utf-8'); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs:createDir', async (event, dirPath) => {
  try { fs.mkdirSync(dirPath, { recursive: true }); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs:delete', async (event, targetPath) => {
  try {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) fs.rmSync(targetPath, { recursive: true, force: true });
    else fs.unlinkSync(targetPath);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs:rename', async (event, oldPath, newPath) => {
  try { fs.renameSync(oldPath, newPath); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs:stat', async (event, filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return { success: true, mtime: stat.mtimeMs, size: stat.size };
  } catch (err) { return { success: false, error: err.message }; }
});

// ─── Global Search ─────────────────────────────────────────────────────────
ipcMain.handle('fs:searchInFiles', async (event, rootPath, query, options = {}) => {
  const results = [];
  const { caseSensitive = false, wholeWord = false, maxResults = 200 } = options;

  function searchFile(filePath) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 1024 * 1024) return; // skip >1MB files
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const flags = caseSensitive ? 'g' : 'gi';
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
      const regex = new RegExp(pattern, flags);

      lines.forEach((line, i) => {
        if (regex.test(line)) {
          results.push({
            file: filePath,
            line: i + 1,
            text: line.trim().slice(0, 200),
            col: (line.search(regex) + 1),
          });
        }
        if (results.length >= maxResults) return;
      });
    } catch { /* binary or unreadable */ }
  }

  function walkDir(dir, depth = 0) {
    if (depth > 6 || results.length >= maxResults) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) walkDir(fullPath, depth + 1);
        else searchFile(fullPath);
        if (results.length >= maxResults) return;
      }
    } catch {}
  }

  walkDir(rootPath);
  return results;
});

// ─── Git Info ───────────────────────────────────────────────────────────────
ipcMain.handle('git:getBranch', async (event, dirPath) => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: dirPath, timeout: 3000, encoding: 'utf-8',
    }).trim();
    return { success: true, branch };
  } catch { return { success: false }; }
});

ipcMain.handle('git:getStatus', async (event, dirPath) => {
  try {
    const output = execSync('git status --porcelain', {
      cwd: dirPath, timeout: 3000, encoding: 'utf-8',
    }).trim();
    const files = output ? output.split('\n').map(l => ({
      status: l.slice(0, 2).trim(),
      file: l.slice(3),
    })) : [];
    return { success: true, files };
  } catch { return { success: false, files: [] }; }
});

// ─── OS ─────────────────────────────────────────────────────────────────────
ipcMain.handle('os:homedir', () => os.homedir());
ipcMain.handle('os:platform', () => process.platform);
ipcMain.handle('os:shell', () => process.env.SHELL || process.env.COMSPEC || 'cmd.exe');

// ─── Code Runner ─────────────────────────────────────────────────────────────
let runningProcess = null;

// Map file extension → [command, ...args_before_file]
const RUNNERS = {
  js:    ['node'],
  mjs:   ['node'],
  ts:    ['npx', 'ts-node'],
  py:    ['python'],
  pyw:   ['python'],
  rb:    ['ruby'],
  go:    ['go', 'run'],
  rs:    ['cargo', 'script'],    // requires cargo-script
  php:   ['php'],
  lua:   ['lua'],
  perl:  ['perl'],
  pl:    ['perl'],
  r:     ['Rscript'],
  sh:    ['bash'],
  bash:  ['bash'],
  ps1:   ['powershell', '-File'],
  java:  ['java'],               // requires compiled class or java 11+ single-file
  kt:    ['kotlinc', '-script'],
  swift: ['swift'],
  dart:  ['dart'],
};

ipcMain.handle('runner:run', async (event, filePath) => {
  // Kill any running process first
  if (runningProcess) {
    try { runningProcess.kill('SIGTERM'); } catch {}
    runningProcess = null;
  }

  const ext = path.extname(filePath).toLowerCase().slice(1);
  const runner = RUNNERS[ext];

  if (!runner) {
    mainWindow.webContents.send('runner:output', {
      type: 'error',
      text: `No runner configured for ".${ext}" files.\n`,
    });
    mainWindow.webContents.send('runner:done', { code: 1 });
    return { success: false, error: `No runner for .${ext}` };
  }

  const [cmd, ...cmdArgs] = runner;
  const args = [...cmdArgs, filePath];
  const cwd = path.dirname(filePath);

  mainWindow.webContents.send('runner:output', {
    type: 'info',
    text: `\r\n\x1b[38;5;141m▶ Running:\x1b[0m ${cmd} ${args.join(' ')}\r\n\x1b[38;5;240m─────────────────────────────────────\x1b[0m\r\n`,
  });

  try {
    runningProcess = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env },
    });

    runningProcess.stdout.on('data', data => {
      mainWindow.webContents.send('runner:output', { type: 'stdout', text: data.toString() });
    });

    runningProcess.stderr.on('data', data => {
      mainWindow.webContents.send('runner:output', { type: 'stderr', text: data.toString() });
    });

    runningProcess.on('close', code => {
      const color = code === 0 ? '\x1b[38;5;114m' : '\x1b[38;5;210m';
      const icon  = code === 0 ? '✓' : '✕';
      mainWindow.webContents.send('runner:output', {
        type: 'info',
        text: `\r\n\x1b[38;5;240m─────────────────────────────────────\x1b[0m\r\n${color}${icon} Process exited with code ${code}\x1b[0m\r\n`,
      });
      mainWindow.webContents.send('runner:done', { code });
      runningProcess = null;
    });

    runningProcess.on('error', err => {
      mainWindow.webContents.send('runner:output', {
        type: 'error',
        text: `\r\n\x1b[38;5;210m✕ Failed to start: ${err.message}\x1b[0m\r\n`,
      });
      mainWindow.webContents.send('runner:done', { code: 1 });
      runningProcess = null;
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('runner:stop', async () => {
  if (runningProcess) {
    try { runningProcess.kill('SIGTERM'); } catch {}
    runningProcess = null;
    mainWindow.webContents.send('runner:output', {
      type: 'info',
      text: '\r\n\x1b[38;5;210m⏹ Process stopped.\x1b[0m\r\n',
    });
    mainWindow.webContents.send('runner:done', { code: -1 });
    return { success: true };
  }
  return { success: false };
});

