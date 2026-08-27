import React, { useEffect, useRef, useCallback } from 'react'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { TabBar } from './components/Editor/TabBar'
import { CodeEditor } from './components/Editor/CodeEditor'
import { EmptyState } from './components/Editor/EmptyState'
import { TerminalPanel } from './components/Terminal/TerminalPanel'
import { StatusBar } from './components/StatusBar'
import { CommandPalette } from './components/CommandPalette/CommandPalette'
import { AboutModal } from './components/AboutModal/AboutModal'
import { useEditorStore } from './store/useEditorStore'
import { useWorkspaceStore } from './store/useWorkspaceStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export const App: React.FC = () => {
  const {
    tabs,
    isSplitEditorOpen,
    splitRatio,
    setSplitRatio,
    settings,
    initSettingsSync
  } = useEditorStore()
  const { initWatcher } = useWorkspaceStore()

  const isResizingSplitRef = useRef(false)
  const splitContainerRef = useRef<HTMLDivElement>(null)

  // Initialize global shortcuts
  useKeyboardShortcuts()

  // Initialize file watcher and settings subscriptions
  useEffect(() => {
    if (typeof window !== 'undefined' && window.cortexAPI) {
      const unsubWatcher = initWatcher()
      const unsubSettings = initSettingsSync()
      return () => {
        unsubWatcher()
        unsubSettings()
      }
    }
    return undefined
  }, [initWatcher, initSettingsSync])

  // Auto Save interval (every 5 seconds when enabled and dirty files exist)
  useEffect(() => {
    if (!settings.autoSave) return

    const interval = setInterval(() => {
      const { tabs: currentTabs, pane2Tabs, saveAllTabs } = useEditorStore.getState()
      const hasDirty =
        currentTabs.some((t) => t.isDirty) || pane2Tabs.some((t) => t.isDirty)
      if (hasDirty) {
        saveAllTabs()
      }
    }, settings.autoSaveDelay || 5000)

    return () => clearInterval(interval)
  }, [settings.autoSave, settings.autoSaveDelay])

  // Horizontal resizer for dual pane split
  const handleSplitMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isResizingSplitRef.current = true

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        if (!isResizingSplitRef.current || !splitContainerRef.current) return
        const rect = splitContainerRef.current.getBoundingClientRect()
        const newRatio = (moveEvent.clientX - rect.left) / rect.width
        setSplitRatio(newRatio)
      }

      const handleMouseUp = (): void => {
        isResizingSplitRef.current = false
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [setSplitRatio]
  )

  const handleSplitDoubleClick = (): void => {
    setSplitRatio(0.5)
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-cortex-bg text-cortex-text overflow-hidden font-sans">
      {/* Frameless Draggable TitleBar */}
      <TitleBar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Dockable Sidebar */}
        <Sidebar />

        {/* Editor & Terminal Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-cortex-bg relative">
          {/* Main Editor Section */}
          <div ref={splitContainerRef} className="flex-1 flex overflow-hidden relative">
            {isSplitEditorOpen ? (
              <>
                {/* Pane 1 (Left) */}
                <div
                  style={{ width: `${splitRatio * 100}%` }}
                  className="h-full flex flex-col overflow-hidden border-r border-cortex-border relative"
                >
                  <TabBar pane={1} />
                  <div className="flex-1 overflow-hidden relative">
                    <CodeEditor pane={1} />
                  </div>
                </div>

                {/* Middle Split Resizer Handle */}
                <div
                  onMouseDown={handleSplitMouseDown}
                  onDoubleClick={handleSplitDoubleClick}
                  title="Drag to resize split (Double-click to center)"
                  className="w-1.5 h-full cursor-col-resize hover:bg-cortex-accent active:bg-cortex-accent transition-colors z-20 shrink-0 bg-cortex-panel -mx-[3px]"
                />

                {/* Pane 2 (Right) */}
                <div
                  style={{ width: `${(1 - splitRatio) * 100}%` }}
                  className="h-full flex flex-col overflow-hidden relative"
                >
                  <TabBar pane={2} />
                  <div className="flex-1 overflow-hidden relative">
                    <CodeEditor pane={2} />
                  </div>
                </div>
              </>
            ) : tabs.length > 0 ? (
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <TabBar pane={1} />
                <div className="flex-1 overflow-hidden relative">
                  <CodeEditor pane={1} />
                </div>
              </div>
            ) : (
              <EmptyState />
            )}
          </div>

          {/* Dockable Bottom Terminal */}
          <TerminalPanel />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Global Quick Open & Command Palette Modal */}
      <CommandPalette />

      {/* About Cortex Modal Dialog */}
      <AboutModal />
    </div>
  )
}

export default App
