import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  CaseSensitive,
  WholeWord,
  Regex
} from 'lucide-react'

interface TerminalSearchWidgetProps {
  onFindNext: (query: string, options: { matchCase: boolean; wholeWord: boolean; isRegex: boolean }) => void
  onFindPrev: (query: string, options: { matchCase: boolean; wholeWord: boolean; isRegex: boolean }) => void
  onClose: () => void
  activeMatch?: number
  totalMatches?: number
}

export const TerminalSearchWidget: React.FC<TerminalSearchWidgetProps> = ({
  onFindNext,
  onFindPrev,
  onClose,
  activeMatch = 0,
  totalMatches = 0
}) => {
  const [query, setQuery] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [isRegex, setIsRegex] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Auto trigger search on query or option changes
  useEffect(() => {
    if (query.trim()) {
      onFindNext(query, { matchCase, wholeWord, isRegex })
    }
  }, [query, matchCase, wholeWord, isRegex, onFindNext])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (e.shiftKey) {
        onFindPrev(query, { matchCase, wholeWord, isRegex })
      } else {
        onFindNext(query, { matchCase, wholeWord, isRegex })
      }
    }
  }

  return (
    <div className="absolute top-2 right-4 z-40 flex items-center gap-1.5 px-2 py-1.5 bg-cortex-panel/95 border border-cortex-border rounded-lg shadow-2xl backdrop-blur-md animate-fade-in text-xs">
      <div className="flex items-center gap-1 bg-cortex-bg px-2 py-1 rounded border border-cortex-border focus-within:border-cortex-accent/70 transition-colors">
        <Search size={12} className="text-cortex-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Find in terminal..."
          className="bg-transparent text-xs text-cortex-text placeholder-cortex-muted outline-none w-36 sm:w-48 font-mono"
        />

        {query && (
          <span className="text-[10px] text-cortex-muted px-1 border-l border-cortex-border/50 shrink-0 font-mono">
            {totalMatches > 0 ? `${activeMatch} of ${totalMatches}` : 'No matches'}
          </span>
        )}
      </div>

      {/* Option Toggles */}
      <div className="flex items-center gap-0.5 border-l border-cortex-border pl-1">
        <button
          type="button"
          onClick={() => setMatchCase((prev) => !prev)}
          title="Match Case (Alt+C)"
          className={`p-1 rounded transition-colors ${
            matchCase
              ? 'bg-cortex-accent/20 text-cortex-accent border border-cortex-accent/40'
              : 'text-cortex-muted hover:text-white hover:bg-cortex-surface'
          }`}
        >
          <CaseSensitive size={13} />
        </button>

        <button
          type="button"
          onClick={() => setWholeWord((prev) => !prev)}
          title="Match Whole Word (Alt+W)"
          className={`p-1 rounded transition-colors ${
            wholeWord
              ? 'bg-cortex-accent/20 text-cortex-accent border border-cortex-accent/40'
              : 'text-cortex-muted hover:text-white hover:bg-cortex-surface'
          }`}
        >
          <WholeWord size={13} />
        </button>

        <button
          type="button"
          onClick={() => setIsRegex((prev) => !prev)}
          title="Use Regular Expression (Alt+R)"
          className={`p-1 rounded transition-colors ${
            isRegex
              ? 'bg-cortex-accent/20 text-cortex-accent border border-cortex-accent/40'
              : 'text-cortex-muted hover:text-white hover:bg-cortex-surface'
          }`}
        >
          <Regex size={13} />
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-0.5 border-l border-cortex-border pl-1">
        <button
          type="button"
          onClick={() => onFindPrev(query, { matchCase, wholeWord, isRegex })}
          title="Previous Match (Shift+Enter)"
          disabled={!query}
          className="p-1 text-cortex-muted hover:text-white hover:bg-cortex-surface disabled:opacity-30 rounded transition-colors"
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          onClick={() => onFindNext(query, { matchCase, wholeWord, isRegex })}
          title="Next Match (Enter)"
          disabled={!query}
          className="p-1 text-cortex-muted hover:text-white hover:bg-cortex-surface disabled:opacity-30 rounded transition-colors"
        >
          <ChevronDown size={13} />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close Search (Escape)"
          className="p-1 text-cortex-muted hover:text-red-400 hover:bg-cortex-surface rounded transition-colors ml-0.5"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
