import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  ArrowRight,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Settings
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

interface InlineAIPromptBarProps {
  isOpen: boolean
  selectedCode: string
  language: string
  context?: string
  onClose: () => void
  onAccept: (newCode: string) => void
}

export const InlineAIPromptBar: React.FC<InlineAIPromptBarProps> = ({
  isOpen,
  selectedCode,
  language,
  context,
  onClose,
  onAccept
}) => {
  const { settings } = useEditorStore()
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setPrompt('')
      setGeneratedCode(null)
      setErrorMessage(null)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Global keydown listeners for Ctrl+Enter (Accept) and Esc (Reject/Close)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (generatedCode !== null) {
          onAccept(generatedCode)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, generatedCode, onAccept, onClose])

  if (!isOpen) return null

  const handleGenerate = async (): Promise<void> => {
    if (!prompt.trim() || isLoading) return

    if (!settings.aiApiKey) {
      setErrorMessage('No AI API key configured. Open Settings > AI to add one.')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const res = await window.cortexAPI.aiGenerateEdit({
        code: selectedCode,
        prompt: prompt.trim(),
        language,
        context,
        settings
      })

      if (res.error) {
        setErrorMessage(res.error)
      } else if (res.text) {
        setGeneratedCode(res.text)
      } else {
        setErrorMessage('AI returned an empty response.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate edit.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl animate-fade-in select-none">
      <div className="rounded-2xl bg-cortex-panel/95 backdrop-blur-xl border border-cortex-accent/40 shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Header Prompt Row */}
        <div className="p-3 flex items-center gap-3 bg-cortex-surface/60">
          <div className="w-7 h-7 rounded-lg bg-cortex-accent/20 border border-cortex-accent/40 flex items-center justify-center text-cortex-accent shrink-0 shadow-sm">
            <Sparkles size={14} />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDownInput}
              disabled={isLoading}
              placeholder="Ask AI to edit, refactor, add types, or fix bugs... (Enter to submit)"
              className="w-full bg-transparent text-xs text-white placeholder-cortex-muted outline-none pr-8 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                isLoading || !prompt.trim()
                  ? 'bg-cortex-surface text-cortex-muted cursor-not-allowed'
                  : 'bg-cortex-accent text-black hover:brightness-110 active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Generate</span>
                  <ArrowRight size={12} />
                </>
              )}
            </button>

            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 rounded-lg text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="px-4 py-2.5 bg-rose-500/10 border-t border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {!settings.aiApiKey && (
              <button
                onClick={() => window.cortexAPI?.openSettingsWindow?.()}
                className="flex items-center gap-1 text-[11px] underline hover:text-white"
              >
                <Settings size={12} />
                <span>Open Settings</span>
              </button>
            )}
          </div>
        )}

        {/* Generated Code Preview / Diff Actions */}
        {generatedCode !== null && (
          <div className="p-3.5 bg-cortex-bg/90 border-t border-cortex-border/80 flex flex-col gap-3">
            <div className="flex items-center justify-between text-[11px] text-cortex-muted">
              <span className="font-semibold text-cortex-accent flex items-center gap-1">
                <Check size={12} />
                Proposed Code Replacement:
              </span>
              <span className="font-mono text-[10px] uppercase">{language}</span>
            </div>

            <pre className="p-3 rounded-xl bg-cortex-panel text-slate-200 font-mono text-[11px] border border-cortex-border/70 max-h-56 overflow-y-auto leading-relaxed select-text">
              <code>{generatedCode}</code>
            </pre>

            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[10px] text-cortex-muted font-mono">
                Press <kbd className="px-1 py-0.5 rounded bg-cortex-surface border text-white">Ctrl+Enter</kbd> to accept
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGeneratedCode(null)}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold text-cortex-muted hover:text-white hover:bg-cortex-surface border border-cortex-border transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={() => onAccept(generatedCode)}
                  className="py-1.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <Check size={13} />
                  <span>Accept Edit</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
