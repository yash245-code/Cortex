const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose:    () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Dialogs
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  openFile:   () => ipcRenderer.invoke('dialog:openFile'),
  saveFile:   (defaultPath) => ipcRenderer.invoke('dialog:saveFile', defaultPath),

  // File system
  readDir:     (dirPath)           => ipcRenderer.invoke('fs:readDir', dirPath),
  readFile:    (filePath)          => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile:   (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  createFile:  (filePath)          => ipcRenderer.invoke('fs:createFile', filePath),
  createDir:   (dirPath)           => ipcRenderer.invoke('fs:createDir', dirPath),
  deleteEntry: (targetPath)        => ipcRenderer.invoke('fs:delete', targetPath),
  renameEntry: (oldPath, newPath)  => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  statFile:    (filePath)          => ipcRenderer.invoke('fs:stat', filePath),

  // Global search
  searchInFiles: (rootPath, query, options) =>
    ipcRenderer.invoke('fs:searchInFiles', rootPath, query, options),

  // Git
  gitGetBranch: (dirPath) => ipcRenderer.invoke('git:getBranch', dirPath),
  gitGetStatus: (dirPath) => ipcRenderer.invoke('git:getStatus', dirPath),

  // Code Runner
  runFile:  (filePath) => ipcRenderer.invoke('runner:run', filePath),
  stopFile: ()         => ipcRenderer.invoke('runner:stop'),
  onRunnerOutput: (cb) => ipcRenderer.on('runner:output', (_, data) => cb(data)),
  onRunnerDone:   (cb) => ipcRenderer.on('runner:done',   (_, data) => cb(data)),

  // OS
  homedir:  () => ipcRenderer.invoke('os:homedir'),
  platform: () => ipcRenderer.invoke('os:platform'),
  shell:    () => ipcRenderer.invoke('os:shell'),
});

