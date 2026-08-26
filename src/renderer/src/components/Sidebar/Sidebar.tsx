import React, { useRef, useCallback } from 'react'
import {
  Files,
  Settings,
  Terminal,
  FolderOpen
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { FileTree } from './FileTree'

export const Sidebar: React.FC = () => {
  const {
    isSidebarOpen,
    sidebarWidth,
    setSidebarWidth,
    toggleTerminal,
    isTerminalOpen
  } = useEditorStore()

  const { openFolder } = useWorkspaceStore()
  const isResizingRef = useRef(false)

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

  if (!isSidebarOpen) return null

  return (
    <div className="flex h-full select-none shrink-0 relative bg-cortex-sidebar border-r border-cortex-border">
      {/* Activity Bar (Slim left icon bar) */}
      <div className="w-12 h-full bg-[#11131c] border-r border-cortex-border flex flex-col items-center py-3 justify-between shrink-0">
        <div className="flex flex-col items-center gap-4">
          <button
            title="Explorer"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 shadow-sm"
          >
            <Files size={18} />
          </button>
          <button
            onClick={() => openFolder()}
            title="Open Folder"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors"
          >
            <FolderOpen size={18} />
          </button>
          <button
            onClick={toggleTerminal}
            title="Integrated Terminal (Ctrl+`)"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isTerminalOpen
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-cortex-muted hover:text-white hover:bg-cortex-surface'
            }`}
          >
            <Terminal size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            title="Settings"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Explorer Content */}
      <div style={{ width: `${sidebarWidth}px` }} className="h-full flex flex-col overflow-hidden">
        <FileTree />
      </div>

      {/* Horizontal Resizer Line */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 absolute right-0 top-0 bottom-0 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-20"
      />
    </div>
  )
}
