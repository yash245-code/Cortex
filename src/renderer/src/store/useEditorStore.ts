import { create } from 'zustand'
import { Tab, EditorSettings } from '@shared/types'
import { getLanguageForFile } from '@shared/constants'

interface EditorState {
  tabs: Tab[]
  activeTabId: string | null
  cursorPosition: { line: number; col: number }
  settings: EditorSettings
  isTerminalOpen: boolean
  terminalHeight: number
  isSidebarOpen: boolean
  sidebarWidth: number

  // Actions
  openTab: (filePath: string, initialContent?: string) => Promise<void>
  closeTab: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  closeAllTabs: () => void
  setActiveTab: (tabId: string) => void
  updateTabContent: (tabId: string, content: string) => void
  saveTab: (tabId: string) => Promise<boolean>
  saveActiveTab: () => Promise<boolean>
  saveAllTabs: () => Promise<void>
  reorderTabs: (startIndex: number, endIndex: number) => void
  setCursorPosition: (line: number, col: number) => void
  toggleTerminal: () => void
  setTerminalOpen: (open: boolean) => void
  setTerminalHeight: (height: number) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  updateSettings: (partial: Partial<EditorSettings>) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  cursorPosition: { line: 1, col: 1 },
  settings: {
    fontSize: 14,
    fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
    tabSize: 2,
    wordWrap: 'on',
    minimap: true,
    theme: 'vs-dark'
  },
  isTerminalOpen: true,
  terminalHeight: 240,
  isSidebarOpen: true,
  sidebarWidth: 260,

  openTab: async (filePath: string, initialContent?: string) => {
    const { tabs } = get()
    const existingTab = tabs.find((t) => t.path === filePath)

    if (existingTab) {
      set({ activeTabId: existingTab.id })
      return
    }

    try {
      const content =
        initialContent !== undefined ? initialContent : await window.cortexAPI.readFile(filePath)
      const fileName = filePath.split(/[/\\]/).pop() || 'Untitled'
      const language = getLanguageForFile(fileName)

      const newTab: Tab = {
        id: filePath,
        path: filePath,
        name: fileName,
        content,
        savedContent: content,
        isDirty: false,
        language
      }

      set({
        tabs: [...tabs, newTab],
        activeTabId: newTab.id
      })
    } catch (err) {
      console.error(`Failed to open tab for ${filePath}:`, err)
    }
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get()
    const targetIndex = tabs.findIndex((t) => t.id === tabId)
    if (targetIndex === -1) return

    const newTabs = tabs.filter((t) => t.id !== tabId)
    let nextActiveId = activeTabId

    if (activeTabId === tabId) {
      if (newTabs.length === 0) {
        nextActiveId = null
      } else if (targetIndex < newTabs.length) {
        nextActiveId = newTabs[targetIndex].id
      } else {
        nextActiveId = newTabs[newTabs.length - 1].id
      }
    }

    set({
      tabs: newTabs,
      activeTabId: nextActiveId
    })
  },

  closeOtherTabs: (tabId: string) => {
    const { tabs } = get()
    const targetTab = tabs.find((t) => t.id === tabId)
    if (targetTab) {
      set({
        tabs: [targetTab],
        activeTabId: targetTab.id
      })
    }
  },

  closeAllTabs: () => {
    set({
      tabs: [],
      activeTabId: null
    })
  },

  setActiveTab: (tabId: string) => set({ activeTabId: tabId }),

  updateTabContent: (tabId: string, content: string) => {
    const { tabs } = get()
    set({
      tabs: tabs.map((tab) => {
        if (tab.id === tabId) {
          return {
            ...tab,
            content,
            isDirty: content !== tab.savedContent
          }
        }
        return tab
      })
    })
  },

  saveTab: async (tabId: string) => {
    const { tabs } = get()
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return false

    try {
      await window.cortexAPI.writeFile(tab.path, tab.content)
      set({
        tabs: tabs.map((t) =>
          t.id === tabId ? { ...t, savedContent: t.content, isDirty: false } : t
        )
      })
      return true
    } catch (err) {
      console.error(`Failed to save tab ${tab.path}:`, err)
      return false
    }
  },

  saveActiveTab: async () => {
    const { activeTabId, saveTab } = get()
    if (!activeTabId) return false
    return await saveTab(activeTabId)
  },

  saveAllTabs: async () => {
    const { tabs, saveTab } = get()
    for (const tab of tabs) {
      if (tab.isDirty) {
        await saveTab(tab.id)
      }
    }
  },

  reorderTabs: (startIndex: number, endIndex: number) => {
    const { tabs } = get()
    const result = Array.from(tabs)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    set({ tabs: result })
  },

  setCursorPosition: (line: number, col: number) => {
    set({ cursorPosition: { line, col } })
  },

  toggleTerminal: () => set((state) => ({ isTerminalOpen: !state.isTerminalOpen })),
  setTerminalOpen: (open: boolean) => set({ isTerminalOpen: open }),
  setTerminalHeight: (height: number) =>
    set({ terminalHeight: Math.max(120, Math.min(height, window.innerHeight - 150)) }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarWidth: (width: number) =>
    set({ sidebarWidth: Math.max(180, Math.min(width, 500)) }),

  updateSettings: (partial) => {
    set((state) => ({
      settings: { ...state.settings, ...partial }
    }))
  }
}))
