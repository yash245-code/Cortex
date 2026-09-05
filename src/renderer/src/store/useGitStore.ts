import { create } from 'zustand'
import { GitFileStatus, GitFileStatusType, GitFileChurnResult } from '@shared/types'
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
  fileChurnMap: Record<string, GitFileChurnResult>

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
  getFileChurn: (relativePath: string) => Promise<GitFileChurnResult | null>
  clearChurnCache: () => void
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
  fileChurnMap: {},

  refreshGitStatus: async () => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.bodhiAPI?.gitGetStatus) {
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
      const res = await window.bodhiAPI.gitGetStatus(rootPath)

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
    if (!rootPath || !window.bodhiAPI?.gitStage) return
    try {
      await window.bodhiAPI.gitStage(rootPath, relativePath)
      await get().refreshGitStatus()
    } catch (err) {
      console.error('Failed to stage file:', err)
    }
  },

  unstageFile: async (relativePath: string) => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.bodhiAPI?.gitUnstage) return
    try {
      await window.bodhiAPI.gitUnstage(rootPath, relativePath)
      await get().refreshGitStatus()
    } catch (err) {
      console.error('Failed to unstage file:', err)
    }
  },

  stageAll: async () => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.bodhiAPI?.gitStageAll) return
    try {
      await window.bodhiAPI.gitStageAll(rootPath)
      await get().refreshGitStatus()
    } catch (err) {
      console.error('Failed to stage all files:', err)
    }
  },

  unstageAll: async () => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.bodhiAPI?.gitUnstageAll) return
    try {
      await window.bodhiAPI.gitUnstageAll(rootPath)
      await get().refreshGitStatus()
    } catch (err) {
      console.error('Failed to unstage all files:', err)
    }
  },

  discardChanges: async (relativePath: string, isUntracked = false) => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !window.bodhiAPI?.gitDiscard) return
    try {
      await window.bodhiAPI.gitDiscard(rootPath, relativePath, isUntracked)
      await get().refreshGitStatus()
      await useWorkspaceStore.getState().refreshTree()
    } catch (err) {
      console.error('Failed to discard changes:', err)
    }
  },

  commitChanges: async () => {
    const { commitMessage, stagedFiles } = get()
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !commitMessage.trim() || !window.bodhiAPI?.gitCommit) return false

    // Auto-stage all changes if no files are specifically staged
    if (stagedFiles.length === 0) {
      await get().stageAll()
    }

    set({ isCommitting: true })

    try {
      const success = await window.bodhiAPI.gitCommit(rootPath, commitMessage.trim())
      if (success) {
        set({ commitMessage: '', fileChurnMap: {} })
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
  },

  getFileChurn: async (relativePath: string) => {
    const rootPath = useWorkspaceStore.getState().rootPath
    if (!rootPath || !relativePath || !window.bodhiAPI?.gitGetFileChurn) return null

    const normRel = relativePath.replace(/\\/g, '/')
    const { fileChurnMap } = get()
    if (fileChurnMap[normRel]) {
      return fileChurnMap[normRel]
    }

    try {
      const res = await window.bodhiAPI.gitGetFileChurn(rootPath, normRel)
      if (res) {
        set((state) => ({
          fileChurnMap: {
            ...state.fileChurnMap,
            [normRel]: res
          }
        }))
      }
      return res
    } catch (err) {
      console.error('Failed to get file churn in store:', err)
      return null
    }
  },

  clearChurnCache: () => set({ fileChurnMap: {} })
}))

