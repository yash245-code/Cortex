import { create } from 'zustand'
import { GitFileStatus, GitFileStatusType } from '@shared/types'
import { useWorkspaceStore } from './useWorkspaceStore'

interface GitState {
  branch: string | null
  isGitRepo: boolean
  stagedFiles: GitFileStatus[]
  unstagedFiles: GitFileStatus[]
  untrackedFiles: GitFileStatus[]
  fileStatusMap: Record<string, GitFileStatusType>
  isLoading: boolean
  isCommitting: boolean
  commitMessage: string

  // Actions
  refreshGitStatus: () => Promise<void>
  stageFile: (relativePath: string) => Promise<void>
  unstageFile: (relativePath: string) => Promise<void>
  stageAll: () => Promise<void>
  unstageAll: () => Promise<void>
  discardChanges: (relativePath: string, isUntracked?: boolean) => Promise<void>
  commitChanges: () => Promise<boolean>
  setCommitMessage: (message: string) => void
  getFileStatus: (filePath: string) => GitFileStatusType | undefined
}

export const useGitStore = create<GitState>((set, get) => ({
  branch: null,
  isGitRepo: false,
  stagedFiles: [],
  unstagedFiles: [],
  untrackedFiles: [],
  fileStatusMap: {},
  isLoading: false,
  isCommitting: false,
  commitMessage: '',

  refreshGitStatus: async () => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.cortexAPI?.gitGetStatus) {
      set({
        branch: null,
        isGitRepo: false,
        stagedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
        fileStatusMap: {}
      })
      return
    }

    set({ isLoading: true })

    try {
      const res = await window.cortexAPI.gitGetStatus(rootPath)

      // Build fileStatusMap with multiple lookup keys for absolute & relative paths
      const statusMap: Record<string, GitFileStatusType> = {}

      const registerStatus = (f: GitFileStatus): void => {
        const normPath = f.path.replace(/\\/g, '/')
        const normRel = f.relativePath.replace(/\\/g, '/')
        const winPath = f.path.replace(/\//g, '\\')
        const winRel = f.relativePath.replace(/\//g, '\\')

        statusMap[normPath] = f.status
        statusMap[normRel] = f.status
        statusMap[winPath] = f.status
        statusMap[winRel] = f.status
      }

      res.staged.forEach(registerStatus)
      res.unstaged.forEach(registerStatus)
      res.untracked.forEach(registerStatus)

      set({
        isGitRepo: res.isRepo,
        branch: res.branch,
        stagedFiles: res.staged,
        unstagedFiles: res.unstaged,
        untrackedFiles: res.untracked,
        fileStatusMap: statusMap,
        isLoading: false
      })
    } catch (err) {
      console.error('Failed to refresh git status in store:', err)
      set({ isLoading: false })
    }
  },

  stageFile: async (relativePath: string) => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.cortexAPI?.gitStage) return
    try {
      await window.cortexAPI.gitStage(rootPath, relativePath)
      await get().refreshGitStatus()
    } catch (err) {
      console.error('Failed to stage file:', err)
    }
  },

  unstageFile: async (relativePath: string) => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.cortexAPI?.gitUnstage) return
    try {
      await window.cortexAPI.gitUnstage(rootPath, relativePath)
      await get().refreshGitStatus()
    } catch (err) {
      console.error('Failed to unstage file:', err)
    }
  },

  stageAll: async () => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.cortexAPI?.gitStageAll) return
    try {
      await window.cortexAPI.gitStageAll(rootPath)
      await get().refreshGitStatus()
    } catch (err) {
      console.error('Failed to stage all files:', err)
    }
  },

  unstageAll: async () => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.cortexAPI?.gitUnstageAll) return
    try {
      await window.cortexAPI.gitUnstageAll(rootPath)
      await get().refreshGitStatus()
    } catch (err) {
      console.error('Failed to unstage all files:', err)
    }
  },

  discardChanges: async (relativePath: string, isUntracked = false) => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.cortexAPI?.gitDiscard) return
    try {
      await window.cortexAPI.gitDiscard(rootPath, relativePath, isUntracked)
      await get().refreshGitStatus()
      await useWorkspaceStore.getState().refreshTree()
    } catch (err) {
      console.error('Failed to discard changes:', err)
    }
  },

  commitChanges: async () => {
    const { commitMessage, stagedFiles } = get()
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !commitMessage.trim() || !window.cortexAPI?.gitCommit) return false

    // Auto-stage all changes if no files are specifically staged
    if (stagedFiles.length === 0) {
      await get().stageAll()
    }

    set({ isCommitting: true })

    try {
      const success = await window.cortexAPI.gitCommit(rootPath, commitMessage.trim())
      if (success) {
        set({ commitMessage: '' })
        await get().refreshGitStatus()
        await useWorkspaceStore.getState().refreshTree()
      }
      set({ isCommitting: false })
      return success
    } catch (err) {
      console.error('Failed to commit changes:', err)
      set({ isCommitting: false })
      return false
    }
  },

  setCommitMessage: (commitMessage: string) => set({ commitMessage }),

  getFileStatus: (filePath: string) => {
    const { fileStatusMap } = get()
    if (!filePath) return undefined

    const norm = filePath.replace(/\\/g, '/')
    if (fileStatusMap[norm]) return fileStatusMap[norm]
    if (fileStatusMap[filePath]) return fileStatusMap[filePath]

    const rootPath = useWorkspaceStore.getState().rootPath
    if (rootPath) {
      const rel = filePath.replace(rootPath, '').replace(/^[/\\]/, '').replace(/\\/g, '/')
      if (fileStatusMap[rel]) return fileStatusMap[rel]
    }

    return undefined
  }
}))
