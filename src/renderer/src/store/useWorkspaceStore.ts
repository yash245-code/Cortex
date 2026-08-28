import { create } from 'zustand'
import { FileNode } from '@shared/types'
import { useGitStore } from './useGitStore'

interface WorkspaceState {
  rootPath: string | null
  rootNode: FileNode | null
  selectedPath: string | null
  expandedPaths: Set<string>
  isLoading: boolean
  creatingItem: { parentPath: string; type: 'file' | 'directory' } | null
  renamingPath: string | null

  // Actions
  openFolder: (dirPath?: string) => Promise<string | null>
  openFileDirectly: (filePath?: string) => Promise<string | null>
  refreshTree: () => Promise<void>
  setSelectedPath: (path: string | null) => void
  toggleExpand: (path: string) => void
  setExpanded: (path: string, expanded: boolean) => void
  setCreatingItem: (item: { parentPath: string; type: 'file' | 'directory' } | null) => void
  setRenamingPath: (path: string | null) => void
  createFile: (parentPath: string, fileName: string) => Promise<string | null>
  createFolder: (parentPath: string, folderName: string) => Promise<boolean>
  renameItem: (oldPath: string, newName: string) => Promise<string | null>
  deleteItem: (targetPath: string) => Promise<boolean>
  initWatcher: () => () => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  rootPath: null,
  rootNode: null,
  selectedPath: null,
  expandedPaths: new Set<string>(),
  isLoading: false,
  creatingItem: null,
  renamingPath: null,

  openFolder: async (dirPath?: string) => {
    try {
      const targetDir = dirPath || (await window.cortexAPI.openDirectoryDialog())
      if (!targetDir) return null

      set({ isLoading: true, rootPath: targetDir })

      const rootNode = await window.cortexAPI.readDirectory(targetDir)
      await window.cortexAPI.watchDirectory(targetDir)

      const expanded = new Set(get().expandedPaths)
      expanded.add(targetDir)

      set({
        rootNode,
        expandedPaths: expanded,
        isLoading: false
      })

      // Sync Git status for newly opened folder
      useGitStore.getState().refreshGitStatus()

      return targetDir
    } catch (err) {
      console.error('Failed to open folder:', err)
      set({ isLoading: false })
      return null
    }
  },

  openFileDirectly: async (filePath?: string) => {
    try {
      const targetFile = filePath || (await window.cortexAPI.openFileDialog())
      if (!targetFile) return null
      return targetFile
    } catch (err) {
      console.error('Failed to open file:', err)
      return null
    }
  },

  refreshTree: async () => {
    const { rootPath } = get()
    if (!rootPath) return
    try {
      const rootNode = await window.cortexAPI.readDirectory(rootPath)
      set({ rootNode })
      useGitStore.getState().refreshGitStatus()
    } catch (err) {
      console.error('Failed to refresh tree:', err)
    }
  },

  setSelectedPath: (path: string | null) => set({ selectedPath: path }),

  toggleExpand: (path: string) => {
    const expanded = new Set(get().expandedPaths)
    if (expanded.has(path)) {
      expanded.delete(path)
    } else {
      expanded.add(path)
    }
    set({ expandedPaths: expanded })
  },

  setExpanded: (path: string, expand: boolean) => {
    const expanded = new Set(get().expandedPaths)
    if (expand) {
      expanded.add(path)
    } else {
      expanded.delete(path)
    }
    set({ expandedPaths: expanded })
  },

  setCreatingItem: (item) => set({ creatingItem: item }),
  setRenamingPath: (path) => set({ renamingPath: path }),

  createFile: async (parentPath: string, fileName: string) => {
    try {
      // Normalize path separator
      const separator = parentPath.includes('\\') ? '\\' : '/'
      const newFilePath = `${parentPath}${separator}${fileName}`
      await window.cortexAPI.createFile(newFilePath)
      await get().refreshTree()
      get().setExpanded(parentPath, true)
      set({ creatingItem: null, selectedPath: newFilePath })
      useGitStore.getState().refreshGitStatus()
      return newFilePath
    } catch (err) {
      console.error('Failed to create file:', err)
      return null
    }
  },

  createFolder: async (parentPath: string, folderName: string) => {
    try {
      const separator = parentPath.includes('\\') ? '\\' : '/'
      const newDirPath = `${parentPath}${separator}${folderName}`
      await window.cortexAPI.createDirectory(newDirPath)
      await get().refreshTree()
      get().setExpanded(parentPath, true)
      set({ creatingItem: null })
      useGitStore.getState().refreshGitStatus()
      return true
    } catch (err) {
      console.error('Failed to create folder:', err)
      return false
    }
  },

  renameItem: async (oldPath: string, newName: string) => {
    try {
      const isWindows = oldPath.includes('\\')
      const separator = isWindows ? '\\' : '/'
      const parts = oldPath.split(separator)
      parts.pop()
      const newPath = [...parts, newName].join(separator)

      await window.cortexAPI.renamePath(oldPath, newPath)
      await get().refreshTree()
      set({ renamingPath: null, selectedPath: newPath })
      useGitStore.getState().refreshGitStatus()
      return newPath
    } catch (err) {
      console.error('Failed to rename item:', err)
      return null
    }
  },

  deleteItem: async (targetPath: string) => {
    try {
      await window.cortexAPI.deletePath(targetPath)
      await get().refreshTree()
      if (get().selectedPath === targetPath) {
        set({ selectedPath: null })
      }
      useGitStore.getState().refreshGitStatus()
      return true
    } catch (err) {
      console.error('Failed to delete item:', err)
      return false
    }
  },

  initWatcher: () => {
    return window.cortexAPI.onFileChange((_event) => {
      // Refresh file tree & git on watcher change
      get().refreshTree()
    })
  }
}))
