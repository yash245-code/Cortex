import React, { useState, useEffect } from 'react'
import {
  Minus,
  Square,
  X,
  Copy,
  FolderOpen,
  FileCode2,
  Terminal,
  Columns
} from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const { tabs, activeTabId, toggleTerminal, toggleSidebar } = useEditorStore()
  const { rootPath, openFolder } = useWorkspaceStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)

  useEffect(() => {
    const checkMaximized = async (): Promise<void> => {
      if (window.cortexAPI?.isMaximized) {
        const max = await window.cortexAPI.isMaximized()
        setIsMaximized(max)
      }
    }
    checkMaximized()
  }, [])

  const handleMinimize = async (): Promise<void> => {
    await window.cortexAPI.minimizeWindow()
  }

  const handleMaximize = async (): Promise<void> => {
    await window.cortexAPI.maximizeWindow()
    const max = await window.cortexAPI.isMaximized()
    setIsMaximized(max)
  }

  const handleClose = async (): Promise<void> => {
    await window.cortexAPI.closeWindow()
  }

  // Format breadcrumb
  let breadcrumb = 'Cortex'
  if (rootPath) {
    const rootName = rootPath.split(/[/\\]/).pop() || rootPath
    breadcrumb = rootName
    if (activeTab) {
      const relPath = activeTab.path.replace(rootPath, '')
      breadcrumb = `${rootName} ${relPath.replace(/^[/\\]/, ' › ')}`
    }
  } else if (activeTab) {
    breadcrumb = activeTab.name
  }

  return (
    <div className="h-9 w-full bg-cortex-sidebar border-b border-cortex-border flex items-center justify-between px-3 select-none draggable-region z-50">
      {/* Left section: Logo and Quick Actions */}
      <div className="flex items-center gap-2 non-draggable">
        <div className="flex items-center gap-1.5 font-bold tracking-wide text-xs text-indigo-400">
          <div className="w-5 h-5 rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
            <FileCode2 size={13} className="stroke-[2.5]" />
          </div>
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 bg-clip-text text-transparent font-semibold">
            CORTEX
          </span>
        </div>

        <div className="h-3 w-[1px] bg-cortex-border mx-1" />

        <button
          onClick={toggleSidebar}
          title="Toggle Sidebar (Ctrl+B)"
          className="p-1 text-cortex-muted hover:text-cortex-text hover:bg-cortex-surface rounded transition-colors"
        >
          <Columns size={13} />
        </button>

        <button
          onClick={() => openFolder()}
          title="Open Folder (Ctrl+Shift+O)"
          className="p-1 text-cortex-muted hover:text-cortex-text hover:bg-cortex-surface rounded transition-colors"
        >
          <FolderOpen size={13} />
        </button>

        <button
          onClick={toggleTerminal}
          title="Toggle Terminal (Ctrl+`)"
          className="p-1 text-cortex-muted hover:text-cortex-text hover:bg-cortex-surface rounded transition-colors"
        >
          <Terminal size={13} />
        </button>
      </div>

      {/* Center section: Breadcrumb / File name */}
      <div className="flex-1 text-center px-4 overflow-hidden pointer-events-none">
        <span className="text-xs text-cortex-muted truncate inline-block max-w-[500px]">
          {breadcrumb}
        </span>
      </div>

      {/* Right section: Window Controls */}
      <div className="flex items-center non-draggable">
        <button
          onClick={handleMinimize}
          className="h-9 w-11 flex items-center justify-center text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors"
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={handleMaximize}
          className="h-9 w-11 flex items-center justify-center text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy size={11} className="rotate-180" /> : <Square size={11} />}
        </button>
        <button
          onClick={handleClose}
          className="h-9 w-11 flex items-center justify-center text-cortex-muted hover:text-white hover:bg-red-600 transition-colors"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
