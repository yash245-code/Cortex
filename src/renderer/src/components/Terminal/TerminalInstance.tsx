import React, { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { TerminalSession } from '@shared/types'

interface TerminalInstanceProps {
  session: TerminalSession
  isActive: boolean
  rootPath: string | null
}

export const TerminalInstance: React.FC<TerminalInstanceProps> = ({
  session,
  isActive,
  rootPath
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new XTerm({
      theme: {
        background: '#0F0F0F',
        foreground: '#F8F8F8',
        cursor: '#5DD62C',
        cursorAccent: '#0F0F0F',
        selectionBackground: 'rgba(93, 214, 44, 0.3)',
        black: '#202020',
        red: '#f87171',
        green: '#5DD62C',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#F8F8F8',
        brightBlack: '#555555',
        brightRed: '#ef4444',
        brightGreen: '#6ee03f',
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

    term.open(containerRef.current)
    try {
      fitAddon.fit()
    } catch {
      // ignore
    }

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Spawn terminal process in main process with session's shell type
    window.cortexAPI.createTerminal(session.id, rootPath || undefined, session.shell)

    if (term.cols && term.rows) {
      window.cortexAPI.resizeTerminal(session.id, term.cols, term.rows)
    }

    // Stream user input
    const dataDisposable = term.onData((data) => {
      window.cortexAPI.writeTerminal(session.id, data)
    })

    // Listen for backend data
    const unsubscribe = window.cortexAPI.onTerminalData((payload) => {
      if (payload.id === session.id && xtermRef.current) {
        xtermRef.current.write(payload.data)
      }
    })

    return () => {
      dataDisposable.dispose()
      unsubscribe()
      term.dispose()
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [session.id, session.shell, rootPath])

  // Fit and focus whenever this instance becomes active or window resizes
  useEffect(() => {
    if (isActive && fitAddonRef.current && xtermRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit()
          if (xtermRef.current && xtermRef.current.cols && xtermRef.current.rows) {
            window.cortexAPI.resizeTerminal(
              session.id,
              xtermRef.current.cols,
              xtermRef.current.rows
            )
          }
          xtermRef.current?.focus()
        } catch {
          // ignore
        }
      }, 50)
    }
  }, [isActive, session.id])

  useEffect(() => {
    const handleResize = (): void => {
      if (isActive && fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit()
          window.cortexAPI.resizeTerminal(
            session.id,
            xtermRef.current.cols,
            xtermRef.current.rows
          )
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isActive, session.id])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden ${isActive ? 'block' : 'hidden'}`}
    />
  )
}
