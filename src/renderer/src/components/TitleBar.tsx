import React, { useState, useEffect } from 'react'
import { Minus, Square, X, Copy, Search, Settings } from 'lucide-react'
import { useEditorStore } from '../store/useEditorStore'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { MenuBar } from './TitleBar/MenuBar'
import { CortexLogo } from './common/CortexLogo'

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const { tabs, activeTabId, openPalette, openSettingsWindow } = useEditorStore()
  const { rootPath } = useWorkspaceStore()

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
    <div className="h-11 w-full bg-cortex-sidebar border-b border-cortex-border flex items-center justify-between px-3 select-none draggable-region z-50 relative">
      {/* Left section: Logo and Quick Open Search Bar */}
      <div className="flex items-center gap-3 non-draggable z-10">
        <button
          onClick={() => openPalette('accents')}
          title="Cortex - Click to customize Accent Color & Theme"
          className="flex items-center pr-1 pl-0.5 cursor-pointer hover:scale-110 active:scale-95 transition-all group focus:outline-none"
        >
          <CortexLogo size={52} />
        </button>

        <div className="h-4 w-[1px] bg-cortex-border" />

        {/* Search option in Top-Left */}
        <button
          onClick={() => openPalette('files')}
          title="Quick Open (Ctrl+P)"
          className="flex items-center gap-2 w-48 sm:w-60 md:w-72 px-2.5 py-1 bg-cortex-bg/80 hover:bg-cortex-surface border border-cortex-border/70 hover:border-cortex-accent/40 rounded-md text-xs text-cortex-muted hover:text-cortex-text transition-all shadow-inner group"
        >
          <Search size={12} className="text-cortex-muted group-hover:text-cortex-accent transition-colors shrink-0" />
          <span className="truncate flex-1 text-left">{breadcrumb}</span>
          <kbd className="hidden sm:inline px-1.5 py-0.2 text-[10px] font-mono rounded bg-cortex-panel text-cortex-muted border border-cortex-border/50">
            Ctrl+P
          </kbd>
        </button>
      </div>

      {/* Center section: File, Edit, View, Run, Terminal, Help Menus */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center non-draggable z-10">
        <MenuBar />
      </div>

      {/* Right section: Window Controls */}
      <div className="flex items-center non-draggable z-10">
        <button
          onClick={openSettingsWindow}
          className="h-11 w-11 flex items-center justify-center text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors"
          title="Settings (Ctrl+,)"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={handleMinimize}
          className="h-11 w-11 flex items-center justify-center text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors"
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={handleMaximize}
          className="h-11 w-11 flex items-center justify-center text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy size={11} className="rotate-180" /> : <Square size={11} />}
        </button>
        <button
          onClick={handleClose}
          className="h-11 w-11 flex items-center justify-center text-cortex-muted hover:text-white hover:bg-red-600 transition-colors"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
