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
import { useGitStore } from '../store/useGitStore'

export const StatusBar: React.FC = () => {
  const {
    tabs,
    activeTabId,
    cursorPosition,
    settings,
    isTerminalOpen,
    toggleTerminal,
    toggleSidebar,
    toggleSidebarView
  } = useEditorStore()

  const { rootPath } = useWorkspaceStore()
  const { branch, isGitRepo, stagedFiles, unstagedFiles, untrackedFiles } = useGitStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  const totalChanges = stagedFiles.length + unstagedFiles.length + untrackedFiles.length

  const handleBranchClick = (): void => {
    toggleSidebarView('git')
  }

  return (
    <div className="h-6 w-full bg-cortex-panel border-t border-cortex-border flex items-center justify-between px-3 text-[11px] select-none text-cortex-muted shrink-0 z-40">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          title="Toggle Sidebar"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <Columns size={12} />
        </button>

        {isGitRepo && branch ? (
          <button
            onClick={handleBranchClick}
            title={`Git Branch: ${branch} (${totalChanges} uncommitted changes) - Click to open Source Control`}
            className="flex items-center gap-1.5 text-cortex-accent font-medium hover:brightness-125 transition-all cursor-pointer"
          >
            <GitBranch size={12} />
            <span>{branch}</span>
            {totalChanges > 0 && (
              <span className="px-1 py-0.2 rounded bg-cortex-surface text-cortex-accent font-mono text-[9px] border border-cortex-border">
                {totalChanges}*
              </span>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1 text-cortex-muted">
            <GitBranch size={12} />
            <span>no repo</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-[#5DD62C]">
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

            <div className="flex items-center gap-1 text-cortex-accent font-medium hover:text-white cursor-pointer transition-colors uppercase">
              <FileCode size={12} />
              <span>{activeTab.language}</span>
            </div>
          </>
        )}

        <button
          onClick={toggleTerminal}
          className={`flex items-center gap-1 transition-colors ${
            isTerminalOpen ? 'text-cortex-accent font-medium' : 'hover:text-white'
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
