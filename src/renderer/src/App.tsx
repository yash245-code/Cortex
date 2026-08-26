import React, { useEffect } from 'react'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { TabBar } from './components/Editor/TabBar'
import { CodeEditor } from './components/Editor/CodeEditor'
import { EmptyState } from './components/Editor/EmptyState'
import { TerminalPanel } from './components/Terminal/TerminalPanel'
import { StatusBar } from './components/StatusBar'
import { useEditorStore } from './store/useEditorStore'
import { useWorkspaceStore } from './store/useWorkspaceStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export const App: React.FC = () => {
  const { tabs } = useEditorStore()
  const { initWatcher } = useWorkspaceStore()

  // Initialize global shortcuts
  useKeyboardShortcuts()

  // Initialize file watcher subscription
  useEffect(() => {
    if (typeof window !== 'undefined' && window.cortexAPI) {
      const unsubscribe = initWatcher()
      return () => {
        unsubscribe()
      }
    }
    return undefined
  }, [initWatcher])

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
          {tabs.length > 0 ? (
            <>
              <TabBar />
              <div className="flex-1 overflow-hidden relative">
                <CodeEditor />
              </div>
            </>
          ) : (
            <EmptyState />
          )}

          {/* Dockable Bottom Terminal */}
          <TerminalPanel />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />
    </div>
  )
}

export default App
