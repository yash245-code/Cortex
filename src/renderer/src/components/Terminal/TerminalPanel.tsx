import React, { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import {
  Terminal as TerminalIcon,
  Trash2,
  RotateCcw,
  X,
  ChevronDown
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'

export const TerminalPanel: React.FC = () => {
  const {
    isTerminalOpen,
    terminalHeight,
    setTerminalHeight,
    toggleTerminal
  } = useEditorStore()

  const { rootPath } = useWorkspaceStore()

  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const isResizingRef = useRef(false)
  const terminalId = 'cortex-main-terminal'

  // Initialize or re-create terminal
  const initTerminal = useCallback(async () => {
    if (!terminalRef.current) return

    // Clean up previous xterm instance if exists
    if (xtermRef.current) {
      xtermRef.current.dispose()
      xtermRef.current = null
    }

    const term = new XTerm({
      theme: {
        background: '#11131c',
        foreground: '#e2e8f0',
        cursor: '#6366f1',
        cursorAccent: '#11131c',
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
        black: '#1e2235',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f1f5f9',
        brightBlack: '#475569',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#eab308',
        brightBlue: '#3b82f6',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#ffffff'
      },
      fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      convertEol: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Create terminal process in main process
    await window.cortexAPI.createTerminal(terminalId, rootPath || undefined)

    // Fit and inform main process of size
    if (term.cols && term.rows) {
      window.cortexAPI.resizeTerminal(terminalId, term.cols, term.rows)
    }

    // Stream user keystrokes to main process
    term.onData((data) => {
      window.cortexAPI.writeTerminal(terminalId, data)
    })
  }, [rootPath])

  useEffect(() => {
    if (!isTerminalOpen) return

    initTerminal()

    // Listen for data from main process
    const unsubscribe = window.cortexAPI.onTerminalData((payload) => {
      if (payload.id === terminalId && xtermRef.current) {
        xtermRef.current.write(payload.data)
      }
    })

    const handleWindowResize = (): void => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit()
        window.cortexAPI.resizeTerminal(
          terminalId,
          xtermRef.current.cols,
          xtermRef.current.rows
        )
      }
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      unsubscribe()
      window.removeEventListener('resize', handleWindowResize)
      if (xtermRef.current) {
        xtermRef.current.dispose()
        xtermRef.current = null
      }
    }
  }, [isTerminalOpen, initTerminal])

  // Handle panel vertical resizing
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

        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit()
          window.cortexAPI.resizeTerminal(
            terminalId,
            xtermRef.current.cols,
            xtermRef.current.rows
          )
        }
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
    if (xtermRef.current) {
      xtermRef.current.clear()
    }
  }

  const handleRestart = async (): Promise<void> => {
    if (xtermRef.current) {
      xtermRef.current.clear()
    }
    await initTerminal()
  }

  if (!isTerminalOpen) return null

  return (
    <div
      style={{ height: `${terminalHeight}px` }}
      className="w-full flex flex-col bg-[#11131c] border-t border-cortex-border relative shrink-0"
    >
      {/* Top resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1.5 w-full absolute top-0 left-0 right-0 cursor-row-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-20"
      />

      {/* Terminal Header */}
      <div className="h-7 px-3 flex items-center justify-between border-b border-cortex-border select-none shrink-0 bg-[#141722]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-cortex-text">
            <TerminalIcon size={13} className="text-indigo-400" />
            <span>TERMINAL</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            sh
          </span>
        </div>

        <div className="flex items-center gap-1 text-cortex-muted">
          <button
            onClick={handleClear}
            title="Clear Terminal"
            className="p-1 hover:text-white hover:bg-cortex-surface rounded transition-colors"
          >
            <Trash2 size={12} />
          </button>
          <button
            onClick={handleRestart}
            title="Restart Terminal Session"
            className="p-1 hover:text-white hover:bg-cortex-surface rounded transition-colors"
          >
            <RotateCcw size={12} />
          </button>
          <button
            onClick={toggleTerminal}
            title="Hide Terminal"
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

      {/* Xterm Container */}
      <div className="flex-1 w-full h-full overflow-hidden" ref={terminalRef} />
    </div>
  )
}
