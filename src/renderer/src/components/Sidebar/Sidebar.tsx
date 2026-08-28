import React, { useRef, useCallback } from 'react'
import {
  Files,
  Search,
  Settings,
  Terminal,
  FolderOpen,
  GitBranch
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useGitStore } from '../../store/useGitStore'
import { FileTree } from './FileTree'
import { SearchPanel } from './SearchPanel'
import { SourceControlPanel } from './SourceControlPanel'

export const Sidebar: React.FC = () => {
  const {
    isSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    activeSidebarView,
    toggleSidebarView,
    toggleTerminal,
    isTerminalOpen,
    openSettingsWindow
  } = useEditorStore()

  const { openFolder } = useWorkspaceStore()
  const { stagedFiles, unstagedFiles, untrackedFiles, isGitRepo } = useGitStore()
  const isResizingRef = useRef(false)

  const totalGitChanges = stagedFiles.length + unstagedFiles.length + untrackedFiles.length

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isResizingRef.current = true

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        if (!isResizingRef.current) return
        // Subtract activity bar width (48px)
        const newWidth = moveEvent.clientX - 48
        setSidebarWidth(newWidth)
      }

      const handleMouseUp = (): void => {
        isResizingRef.current = false
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [setSidebarWidth]
  )

  const isExplorerActive = isSidebarOpen && activeSidebarView === 'explorer'
  const isSearchActive = isSidebarOpen && activeSidebarView === 'search'
  const isGitActive = isSidebarOpen && activeSidebarView === 'git'

  return (
    <div className="flex h-full select-none shrink-0 relative bg-cortex-sidebar border-r border-cortex-border">
      {/* Persistent Activity Bar (Slim left 48px rail) */}
      <div className="w-12 h-full bg-cortex-panel border-r border-cortex-border flex flex-col items-center py-3 justify-between shrink-0 z-30">
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Explorer Button */}
          <div className="relative w-full flex justify-center">
            {isExplorerActive && (
              <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-cortex-accent rounded-r shadow-[0_0_8px_var(--cortex-accent)]" />
            )}
            <button
              onClick={() => toggleSidebarView('explorer')}
              title="Explorer (Ctrl+Shift+E)"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isExplorerActive
                  ? 'text-cortex-accent bg-cortex-accent/15 border border-cortex-accent/35 shadow-sm'
                  : 'text-cortex-muted hover:text-white hover:bg-cortex-surface'
              }`}
            >
              <Files size={18} />
            </button>
          </div>

          {/* Search Button */}
          <div className="relative w-full flex justify-center">
            {isSearchActive && (
              <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-cortex-accent rounded-r shadow-[0_0_8px_var(--cortex-accent)]" />
            )}
            <button
              onClick={() => toggleSidebarView('search')}
              title="Search (Ctrl+Shift+F)"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isSearchActive
                  ? 'text-cortex-accent bg-cortex-accent/15 border border-cortex-accent/35 shadow-sm'
                  : 'text-cortex-muted hover:text-white hover:bg-cortex-surface'
              }`}
            >
              <Search size={18} />
            </button>
          </div>

          {/* Source Control Button */}
          <div className="relative w-full flex justify-center">
            {isGitActive && (
              <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-cortex-accent rounded-r shadow-[0_0_8px_var(--cortex-accent)]" />
            )}
            <button
              onClick={() => toggleSidebarView('git')}
              title="Source Control (Ctrl+Shift+G)"
              className={`w-8 h-8 rounded-lg flex items-center justify-center relative transition-colors ${
                isGitActive
                  ? 'text-cortex-accent bg-cortex-accent/15 border border-cortex-accent/35 shadow-sm'
                  : 'text-cortex-muted hover:text-white hover:bg-cortex-surface'
              }`}
            >
              <GitBranch size={18} />
              {isGitRepo && totalGitChanges > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-cortex-accent text-black font-mono text-[9px] font-extrabold flex items-center justify-center shadow">
                  {totalGitChanges > 99 ? '99+' : totalGitChanges}
                </span>
              )}
            </button>
          </div>

          {/* Open Folder Button */}
          <div className="relative w-full flex justify-center">
            <button
              onClick={() => openFolder()}
              title="Open Folder (Ctrl+Shift+O)"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors"
            >
              <FolderOpen size={18} />
            </button>
          </div>

          {/* Terminal Toggle Button */}
          <div className="relative w-full flex justify-center">
            <button
              onClick={toggleTerminal}
              title="Integrated Terminal (Ctrl+`)"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isTerminalOpen
                  ? 'text-cortex-accent bg-cortex-accent/10 border border-cortex-accent/25'
                  : 'text-cortex-muted hover:text-white hover:bg-cortex-surface'
              }`}
            >
              <Terminal size={18} />
            </button>
          </div>
        </div>

        {/* Bottom Activity Bar (Settings Window Opener) */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="relative w-full flex justify-center">
            <button
              onClick={openSettingsWindow}
              title="Open Settings Window (Ctrl+,)"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-cortex-muted hover:text-white hover:bg-cortex-surface active:text-cortex-accent"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Sidebar Content Panel */}
      {isSidebarOpen && (
        <>
          <div
            style={{ width: `${sidebarWidth}px` }}
            className="h-full flex flex-col overflow-hidden bg-cortex-sidebar animate-fade-in"
          >
            {activeSidebarView === 'explorer' && <FileTree />}
            {activeSidebarView === 'search' && <SearchPanel />}
            {activeSidebarView === 'git' && <SourceControlPanel />}
          </div>

          {/* Horizontal Resizer Line */}
          <div
            onMouseDown={handleMouseDown}
            className="w-1 absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-cortex-accent/50 active:bg-cortex-accent transition-colors z-20"
          />
        </>
      )}
    </div>
  )
}


