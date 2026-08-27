import React, { useState, useRef, useCallback } from 'react'
import {
  Terminal as TerminalIcon,
  Trash2,
  RotateCcw,
  X,
  ChevronDown,
  Plus,
  SquareCode
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { TerminalInstance } from './TerminalInstance'
import { ShellType } from '@shared/types'

export const TerminalPanel: React.FC = () => {
  const {
    isTerminalOpen,
    terminalHeight,
    setTerminalHeight,
    toggleTerminal,
    terminalSessions,
    activeTerminalId,
    setActiveTerminalId,
    addTerminalSession,
    removeTerminalSession
  } = useEditorStore()

  const { rootPath } = useWorkspaceStore()
  const isResizingRef = useRef(false)
  const [isShellMenuOpen, setIsShellMenuOpen] = useState(false)
  const shellMenuRef = useRef<HTMLDivElement>(null)

  // Vertical resizing handle
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isResizingRef.current = true

      const startY = e.clientY
      const startHeight = terminalHeight

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        if (!isResizingRef.current) return
        const delta = startY - moveEvent.clientY
        const newHeight = startHeight + delta
        setTerminalHeight(newHeight)
      }

      const handleMouseUp = (): void => {
        isResizingRef.current = false
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [terminalHeight, setTerminalHeight]
  )

  const handleClear = (): void => {
    if (window.cortexAPI?.writeTerminal && activeTerminalId) {
      window.cortexAPI.writeTerminal(activeTerminalId, 'cls\r')
    }
  }

  const handleRestart = (): void => {
    if (window.cortexAPI?.writeTerminal && activeTerminalId) {
      window.cortexAPI.writeTerminal(activeTerminalId, '\x03clear\r')
    }
  }

  const handleCreateShell = (shell: ShellType): void => {
    setIsShellMenuOpen(false)
    addTerminalSession(shell)
  }

  if (!isTerminalOpen) return null

  const shellOptions: Array<{ label: string; shell: ShellType; desc: string }> = [
    { label: 'PowerShell', shell: 'powershell', desc: 'Windows PowerShell 5/7' },
    { label: 'Command Prompt', shell: 'cmd', desc: 'Default Windows Command Line' },
    { label: 'Git Bash', shell: 'bash', desc: 'Bash for Windows' },
    { label: 'WSL (Linux)', shell: 'wsl', desc: 'Windows Subsystem for Linux' }
  ]

  return (
    <div
      style={{ height: `${terminalHeight}px` }}
      className="w-full flex flex-col bg-cortex-bg border-t border-cortex-border relative shrink-0"
    >
      {/* Top resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-[2px] w-full absolute top-0 left-0 right-0 cursor-row-resize hover:bg-cortex-accent/70 active:bg-cortex-accent transition-colors z-20"
      />

      {/* Terminal Header & Multi-Session Tab Bar */}
      <div className="h-8 px-2 flex items-center justify-between border-b border-cortex-border select-none shrink-0 bg-cortex-panel gap-2">
        {/* Left: Terminal Sessions Tab Bar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-0.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold text-cortex-text border-r border-cortex-border/70 pr-2.5 shrink-0">
            <TerminalIcon size={13} className="text-cortex-accent" />
            <span className="hidden sm:inline">TERMINAL</span>
          </div>

          {/* Session Tabs */}
          {terminalSessions.map((session) => {
            const isActive = session.id === activeTerminalId
            return (
              <div
                key={session.id}
                onClick={() => setActiveTerminalId(session.id)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer transition-all border shrink-0 ${
                  isActive
                    ? 'bg-cortex-surface text-white border-cortex-accent/40 font-medium shadow-sm'
                    : 'bg-transparent text-cortex-muted hover:text-cortex-text hover:bg-cortex-surface/50 border-transparent'
                }`}
              >
                <SquareCode size={11} className={isActive ? 'text-cortex-accent' : 'text-cortex-muted'} />
                <span className="truncate max-w-[110px]">{session.name}</span>

                {/* Close Session Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTerminalSession(session.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition-opacity"
                  title="Close Terminal Session"
                >
                  <X size={11} />
                </button>
              </div>
            )
          })}

          {/* Add Terminal & Shell Dropdown */}
          <div className="flex items-center gap-0.5 shrink-0 relative" ref={shellMenuRef}>
            <button
              onClick={() => addTerminalSession('powershell')}
              title="New Terminal"
              className="p-1 text-cortex-muted hover:text-white hover:bg-cortex-surface rounded transition-colors"
            >
              <Plus size={13} />
            </button>

            <button
              onClick={() => setIsShellMenuOpen((prev) => !prev)}
              title="Select Default Shell"
              className="p-1 text-cortex-muted hover:text-white hover:bg-cortex-surface rounded transition-colors"
            >
              <ChevronDown size={11} />
            </button>

            {/* Shell Switcher Dropdown */}
            {isShellMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-cortex-panel border border-cortex-border rounded-lg shadow-2xl py-1 z-50 animate-fade-in backdrop-blur-md">
                <div className="px-3 py-1 text-[10px] font-semibold text-cortex-muted uppercase tracking-wider border-b border-cortex-border/50">
                  Spawn Shell Session
                </div>
                {shellOptions.map((opt) => (
                  <button
                    key={opt.shell}
                    onClick={() => handleCreateShell(opt.shell)}
                    className="w-full flex flex-col text-left px-3 py-1.5 text-xs text-cortex-text hover:bg-cortex-surface hover:text-white transition-colors"
                  >
                    <span className="font-medium text-white flex items-center justify-between">
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-cortex-muted">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 text-cortex-muted shrink-0">
          <button
            onClick={handleClear}
            title="Clear Terminal Output"
            className="p-1 hover:text-white hover:bg-cortex-surface rounded transition-colors"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={handleRestart}
            title="Restart Session"
            className="p-1 hover:text-white hover:bg-cortex-surface rounded transition-colors"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={toggleTerminal}
            title="Hide Terminal (Ctrl+`)"
            className="p-1 hover:text-white hover:bg-cortex-surface rounded transition-colors"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={toggleTerminal}
            title="Close Panel"
            className="p-1 hover:text-red-400 hover:bg-cortex-surface rounded transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Persistent Multi-Session Containers */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        {terminalSessions.map((session) => (
          <TerminalInstance
            key={session.id}
            session={session}
            isActive={session.id === activeTerminalId}
            rootPath={rootPath}
          />
        ))}
      </div>
    </div>
  )
}
