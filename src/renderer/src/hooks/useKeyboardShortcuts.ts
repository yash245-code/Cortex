import { useEffect } from 'react'
import { useEditorStore } from '../store/useEditorStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

export function useKeyboardShortcuts(): void {
  const {
    saveActiveTab,
    saveAllTabs,
    closeTab,
    activeTabId,
    toggleTerminal,
    toggleSidebar,
    openTab
  } = useEditorStore()

  const { openFolder, openFileDirectly } = useWorkspaceStore()

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent): Promise<void> => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (!modifier) return

      // Save: Ctrl+S / Cmd+S
      if (e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault()
        await saveActiveTab()
      }
      // Save All: Ctrl+Shift+S
      else if (e.key.toLowerCase() === 's' && e.shiftKey) {
        e.preventDefault()
        await saveAllTabs()
      }
      // Close tab: Ctrl+W / Cmd+W
      else if (e.key.toLowerCase() === 'w') {
        e.preventDefault()
        if (activeTabId) {
          closeTab(activeTabId)
        }
      }
      // Toggle Terminal: Ctrl+` / Cmd+`
      else if (e.key === '`' || e.key === '~') {
        e.preventDefault()
        toggleTerminal()
      }
      // Toggle Sidebar: Ctrl+B / Cmd+B
      else if (e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
      // Open Folder: Ctrl+Shift+O
      else if (e.key.toLowerCase() === 'o' && e.shiftKey) {
        e.preventDefault()
        await openFolder()
      }
      // Open File: Ctrl+O
      else if (e.key.toLowerCase() === 'o' && !e.shiftKey) {
        e.preventDefault()
        const selectedFile = await openFileDirectly()
        if (selectedFile) {
          await openTab(selectedFile)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    saveActiveTab,
    saveAllTabs,
    closeTab,
    activeTabId,
    toggleTerminal,
    toggleSidebar,
    openFolder,
    openFileDirectly,
    openTab
  ])
}
