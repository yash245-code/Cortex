import { dialog, BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import chokidar, { FSWatcher } from 'chokidar'
import { FileNode, FileChangeEvent } from '../../shared/types'
import { IPC_CHANNELS } from '../../shared/constants'

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'out',
  '.next',
  '.turbo',
  '.vscode',
  '.idea',
  'coverage',
  '.DS_Store'
])

export class FileService {
  private watcher: FSWatcher | null = null
  private mainWindow: BrowserWindow | null = null
  private debounceTimers = new Map<string, NodeJS.Timeout>()

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  public async openFileDialog(): Promise<string | null> {
    if (!this.mainWindow) return null
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      title: 'Open File in Cortex'
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  }

  public async openDirectoryDialog(): Promise<string | null> {
    if (!this.mainWindow) return null
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Open Folder in Cortex'
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  }

  public async readDirectory(dirPath: string): Promise<FileNode> {
    const stats = await fs.stat(dirPath)
    const name = path.basename(dirPath) || dirPath

    const rootNode: FileNode = {
      id: dirPath,
      name,
      path: dirPath,
      type: 'directory',
      children: []
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const children: FileNode[] = []

      for (const entry of entries) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          continue
        }

        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          try {
            // Lazy or recursive scan. Recursively build child nodes
            const childDirNode = await this.readDirectory(fullPath)
            children.push(childDirNode)
          } catch {
            // Permission error or unreadable directory, skip
          }
        } else if (entry.isFile() || entry.isSymbolicLink()) {
          const extParts = entry.name.split('.')
          const extension = extParts.length > 1 ? extParts.pop() : ''
          let size = 0
          try {
            const fileStat = await fs.stat(fullPath)
            size = fileStat.size
          } catch {
            // Ignore stat failure
          }

          children.push({
            id: fullPath,
            name: entry.name,
            path: fullPath,
            type: 'file',
            extension,
            size,
            updatedAt: stats.mtimeMs
          })
        }
      }

      // Sort: directories first, then alphabetical
      children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      })

      rootNode.children = children
    } catch (err) {
      console.error(`Failed to read directory at ${dirPath}:`, err)
    }

    return rootNode
  }

  public async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8')
  }

  public async writeFile(filePath: string, content: string): Promise<boolean> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  }

  public async createFile(filePath: string): Promise<boolean> {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, '', 'utf-8')
    return true
  }

  public async createDirectory(dirPath: string): Promise<boolean> {
    await fs.mkdir(dirPath, { recursive: true })
    return true
  }

  public async renamePath(oldPath: string, newPath: string): Promise<boolean> {
    await fs.rename(oldPath, newPath)
    return true
  }

  public async deletePath(targetPath: string): Promise<boolean> {
    await fs.rm(targetPath, { recursive: true, force: true })
    return true
  }

  public startWatcher(dirPath: string): void {
    this.stopWatcher()

    this.watcher = chokidar.watch(dirPath, {
      ignored: [
        /(^|[/\\])\../, // ignore dotfiles
        '**/node_modules/**',
        '**/dist/**',
        '**/out/**',
        '**/.git/**'
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 6,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    })

    const sendChangeEvent = (type: FileChangeEvent['type'], changedPath: string): void => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) return

      // Debounce events on the same path
      const key = `${type}:${changedPath}`
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key)!)
      }

      const timer = setTimeout(() => {
        this.debounceTimers.delete(key)
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send(IPC_CHANNELS.WATCHER_CHANGE, {
            type,
            path: changedPath
          } as FileChangeEvent)
        }
      }, 50)

      this.debounceTimers.set(key, timer)
    }

    this.watcher
      .on('add', (filePath) => sendChangeEvent('add', filePath))
      .on('change', (filePath) => sendChangeEvent('change', filePath))
      .on('unlink', (filePath) => sendChangeEvent('unlink', filePath))
      .on('addDir', (dirPath) => sendChangeEvent('addDir', dirPath))
      .on('unlinkDir', (dirPath) => sendChangeEvent('unlinkDir', dirPath))
  }

  public stopWatcher(): void {
    if (this.watcher) {
      this.watcher.close().catch(console.error)
      this.watcher = null
    }
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }
}

export const fileService = new FileService()
