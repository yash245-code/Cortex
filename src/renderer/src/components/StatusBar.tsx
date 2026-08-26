import React from 'react'
import {
  GitBranch,
  Terminal,
  FileCode,
  CheckCircle2,
  Columns
} from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

export const StatusBar: React.FC = () => {
  const {
    tabs,
    activeTabId,
    cursorPosition,
    settings,
    isTerminalOpen,
    toggleTerminal,
    toggleSidebar
  } = useEditorStore()

  const { rootPath } = useWorkspaceStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  return (
    <div className="h-6 w-full bg-[#11131c] border-t border-cortex-border flex items-center justify-between px-3 text-[11px] select-none text-cortex-muted shrink-0 z-40">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          title="Toggle Sidebar"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <Columns size={12} />
        </button>

        <div className="flex items-center gap-1 text-indigo-400 font-medium">
          <GitBranch size={12} />
          <span>main</span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400">
          <CheckCircle2 size={12} />
          <span>Ready</span>
        </div>

        {rootPath && (
          <span className="hidden md:inline text-cortex-muted">
            {tabs.length} open {tabs.length === 1 ? 'file' : 'files'}
          </span>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {activeTab && (
          <>
            <div className="hover:text-white cursor-pointer transition-colors">
              Ln {cursorPosition.line}, Col {cursorPosition.col}
            </div>

            <div className="hover:text-white cursor-pointer transition-colors">
              Spaces: {settings.tabSize}
            </div>

            <div className="hover:text-white cursor-pointer transition-colors">
              UTF-8
            </div>

            <div className="flex items-center gap-1 text-indigo-300 font-medium hover:text-white cursor-pointer transition-colors uppercase">
              <FileCode size={12} />
              <span>{activeTab.language}</span>
            </div>
          </>
        )}

        <button
          onClick={toggleTerminal}
          className={`flex items-center gap-1 transition-colors ${
            isTerminalOpen ? 'text-indigo-400 font-medium' : 'hover:text-white'
          }`}
          title="Toggle Terminal"
        >
          <Terminal size={12} />
          <span>Terminal</span>
        </button>
      </div>
    </div>
  )
}
