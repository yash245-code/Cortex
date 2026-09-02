import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Sparkles,
  Send,
  Trash2,
  FileCode2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Settings,
  Bot,
  User,
  ArrowDownToLine,
  Code2
} from 'lucide-react'
import { marked } from 'marked'
import { useEditorStore } from '../../store/useEditorStore'
import { AIChatMessage } from '@shared/types'

interface MessagePart {
  type: 'text' | 'code'
  content: string
  language?: string
}

/**
 * Extracts ONLY viable code blocks from a markdown message, stripping conversational commentary.
 */
export function extractViableCode(markdown: string): string {
  const codeRegex = /```(?:[a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)```/g
  const blocks: string[] = []
  let match: RegExpExecArray | null

  while ((match = codeRegex.exec(markdown)) !== null) {
    if (match[1]?.trim()) {
      blocks.push(match[1].trim())
    }
  }

  if (blocks.length > 0) {
    return blocks.join('\n\n')
  }

  // Fallback: If no code fences were used by the LLM, strip obvious markdown conversational sentences
  const lines = markdown.split(/\r?\n/)
  const viable = lines.filter((line) => {
    const t = line.trim()
    if (!t) return false
    if (/^(here (is|are)|sure|certainly|hope this helps|let me know|note:|feel free)/i.test(t)) {
      return false
    }
    if (/^#+\s/.test(t)) return false // Skip markdown headers
    return true
  })

  return viable.join('\n').trim()
}

/**
 * Parses markdown into structured text segments and code cards.
 */
function parseMessageParts(content: string): MessagePart[] {
  const parts: MessagePart[] = []
  const codeRegex = /```([a-zA-Z0-9_-]+)?\r?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.substring(lastIndex, match.index).trim()
      if (text) {
        parts.push({ type: 'text', content: text })
      }
    }
    const lang = match[1]?.trim() || 'code'
    const code = match[2]?.trimEnd() || ''
    parts.push({ type: 'code', content: code, language: lang })
    lastIndex = codeRegex.lastIndex
  }

  if (lastIndex < content.length) {
    const text = content.substring(lastIndex).trim()
    if (text) {
      parts.push({ type: 'text', content: text })
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content })
  }

  return parts
}

export const AIChatPanel: React.FC = () => {
  const { tabs, activeTabId, updateTabContent, settings } = useEditorStore()

  const activeTab = tabs.find((t) => t.id === activeTabId)

  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [inputVal, setInputVal] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [includeContext, setIncludeContext] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [insertedKey, setInsertedKey] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSendMessage = async (textToSend?: string): Promise<void> => {
    const text = textToSend || inputVal.trim()
    if (!text || isLoading) return

    if (!settings.aiApiKey?.trim()) {
      setErrorMessage('No AI API key found. Open Settings to configure one.')
      return
    }

    setErrorMessage(null)
    setInputVal('')

    const newMessages: AIChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const contextFile =
        includeContext && activeTab
          ? {
              name: activeTab.name,
              language: activeTab.language,
              content: activeTab.content
            }
          : undefined

      const res = await window.cortexAPI.aiChat({
        messages: newMessages,
        contextFile,
        settings
      })

      if (res.error) {
        if (res.error.includes('429') || res.error.includes('quota')) {
          setErrorMessage('Free-tier rate limit reached (5 req/min). Please wait 30s and try again.')
        } else {
          setErrorMessage(res.error)
        }
      } else if (res.text) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.text }])
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message.')
    } finally {
      setIsLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCopy = (text: string, key: string): void => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const handleInsertViableCode = (rawContent: string, key: string): void => {
    if (!activeTab) return
    const viableCode = extractViableCode(rawContent)
    if (!viableCode) return

    const existing = activeTab.content || ''
    const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n\n' : ''
    updateTabContent(activeTab.id, existing + separator + viableCode)

    setInsertedKey(key)
    setTimeout(() => setInsertedKey(null), 1500)
  }

  const handleClear = (): void => {
    setMessages([])
    setErrorMessage(null)
  }

  const providerLabel = useMemo(() => {
    if (settings.aiModelProvider === 'openai') return 'GPT-4o mini'
    if (settings.aiModelProvider === 'anthropic') return 'Claude 3.5'
    return 'Gemini 3.6 Flash'
  }, [settings.aiModelProvider])

  return (
    <div className="w-full h-full flex flex-col bg-cortex-sidebar text-white select-none overflow-hidden text-xs min-w-0">
      {/* 1. Header Toolbar */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-cortex-border/60 bg-cortex-panel/50 shrink-0 w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="text-cortex-accent shrink-0" />
          <span className="font-bold text-white tracking-wide truncate">Cortex AI</span>
          <span className="px-1.5 py-0.5 rounded bg-cortex-surface text-[10px] font-mono text-cortex-accent border border-cortex-border shrink-0 truncate">
            {providerLabel}
          </span>
        </div>

        <button
          onClick={handleClear}
          title="Clear Conversation"
          className="p-1.5 rounded-lg text-cortex-muted hover:text-white hover:bg-cortex-surface transition-colors shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* 2. Context Indicator Pill */}
      {activeTab && (
        <div className="px-3 py-1.5 border-b border-cortex-border/50 bg-cortex-bg/60 flex items-center justify-between gap-2 shrink-0 w-full min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 truncate text-[11px] text-cortex-muted min-w-0">
            <FileCode2 size={12} className="text-cortex-accent shrink-0" />
            <span className="shrink-0">Context:</span>
            <span className="font-mono text-white font-medium truncate">
              {activeTab.name}
            </span>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-cortex-muted hover:text-white shrink-0">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="accent-cortex-accent rounded cursor-pointer"
            />
            <span>Include file</span>
          </label>
        </div>
      )}

      {/* 3. Messages Stream */}
      <div className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden p-3 space-y-3.5 select-text">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 gap-3 text-cortex-muted min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-cortex-panel flex items-center justify-center border border-cortex-border text-cortex-accent shadow-md shrink-0">
              <Bot size={24} />
            </div>
            <div className="min-w-0 w-full">
              <h4 className="font-bold text-white text-xs">How can I help you today?</h4>
              <p className="text-[11px] text-cortex-muted mt-1 leading-relaxed max-w-[260px] mx-auto">
                Ask questions, generate code, explain algorithms, or refactor open files.
              </p>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-col gap-1.5 w-full mt-2 min-w-0">
              {[
                'Explain what this file does',
                'Identify bugs and performance issues',
                'Write TypeScript interfaces for this code'
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion)}
                  className="py-1.5 px-2.5 rounded-lg bg-cortex-panel hover:bg-cortex-surface border border-cortex-border text-left text-[11px] text-slate-300 hover:text-white transition-colors truncate w-full min-w-0"
                >
                  ✨ {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user'
            const messageParts = !isUser ? parseMessageParts(msg.content) : []

            return (
              <div
                key={idx}
                className={`w-full min-w-0 flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-6 h-6 rounded-lg bg-cortex-accent/20 border border-cortex-accent/40 text-cortex-accent flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Sparkles size={12} />
                  </div>
                )}

                <div
                  className={`min-w-0 ${
                    isUser
                      ? 'max-w-[85%] ml-auto break-words rounded-xl p-2.5 px-3 text-xs leading-relaxed bg-cortex-accent text-black font-medium shadow-sm'
                      : 'flex-1 overflow-hidden rounded-xl p-3 text-xs leading-relaxed bg-cortex-panel/90 border border-cortex-border/80 text-slate-200'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  ) : (
                    <div className="w-full min-w-0 space-y-2">
                      {messageParts.map((part, pIdx) => {
                        const blockKey = `${idx}-${pIdx}`

                        if (part.type === 'code') {
                          return (
                            <div
                              key={pIdx}
                              className="my-2 rounded-lg border border-cortex-border bg-cortex-bg overflow-hidden shadow-xs w-full min-w-0"
                            >
                              {/* Code Card Header */}
                              <div className="h-7 px-2.5 flex items-center justify-between bg-cortex-panel border-b border-cortex-border/70 text-[10px] text-cortex-muted">
                                <div className="flex items-center gap-1.5 font-mono font-semibold uppercase text-cortex-accent tracking-wider">
                                  <Code2 size={11} />
                                  <span>{part.language || 'CODE'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleCopy(part.content, blockKey)}
                                    className="flex items-center gap-1 hover:text-white transition-colors"
                                    title="Copy code"
                                  >
                                    {copiedKey === blockKey ? (
                                      <Check size={11} className="text-emerald-400" />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                    <span>{copiedKey === blockKey ? 'Copied' : 'Copy'}</span>
                                  </button>

                                  {activeTab && (
                                    <button
                                      onClick={() => handleInsertViableCode(part.content, blockKey)}
                                      className="flex items-center gap-1 text-cortex-accent hover:brightness-110 font-semibold transition-colors"
                                      title="Insert code into editor"
                                    >
                                      {insertedKey === blockKey ? (
                                        <Check size={11} className="text-emerald-400" />
                                      ) : (
                                        <ArrowDownToLine size={11} />
                                      )}
                                      <span>{insertedKey === blockKey ? 'Inserted' : 'Insert'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Code Body */}
                              <pre className="p-2.5 overflow-x-auto max-w-full font-mono text-[11px] leading-relaxed text-slate-200 select-text">
                                <code>{part.content}</code>
                              </pre>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={pIdx}
                            className="markdown-body text-xs text-slate-200 min-w-0 break-words leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: marked.parse(part.content) as string
                            }}
                          />
                        )
                      })}

                      {/* Bottom Quick Actions */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-cortex-border/50 text-[10px] text-cortex-muted">
                        <button
                          onClick={() => handleCopy(msg.content, `msg-${idx}`)}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          {copiedKey === `msg-${idx}` ? (
                            <Check size={11} className="text-emerald-400" />
                          ) : (
                            <Copy size={11} />
                          )}
                          <span>{copiedKey === `msg-${idx}` ? 'Copied All' : 'Copy All'}</span>
                        </button>

                        {activeTab && (
                          <button
                            onClick={() => handleInsertViableCode(msg.content, `msg-insert-${idx}`)}
                            className="flex items-center gap-1 hover:text-cortex-accent transition-colors ml-auto font-medium"
                            title="Insert only viable code blocks into editor"
                          >
                            {insertedKey === `msg-insert-${idx}` ? (
                              <Check size={11} className="text-emerald-400" />
                            ) : (
                              <ArrowDownToLine size={11} />
                            )}
                            <span>
                              {insertedKey === `msg-insert-${idx}` ? 'Code Inserted' : 'Insert Code to Editor'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-6 h-6 rounded-lg bg-cortex-surface border border-cortex-border text-cortex-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User size={12} />
                  </div>
                )}
              </div>
            )
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-cortex-muted text-xs p-2">
            <RefreshCw size={14} className="animate-spin text-cortex-accent shrink-0" />
            <span>Cortex AI is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-2.5 mx-3 mb-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2 shrink-0 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
            <span className="truncate">{errorMessage}</span>
          </div>
          {!settings.aiApiKey && (
            <button
              onClick={() => window.cortexAPI?.openSettingsWindow?.()}
              className="flex items-center gap-1 text-[11px] underline hover:text-white shrink-0"
            >
              <Settings size={11} />
              <span>Configure</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Input Area */}
      <div className="p-2.5 border-t border-cortex-border/70 bg-cortex-panel/30 shrink-0 w-full min-w-0">
        <div className="relative rounded-xl bg-cortex-panel border border-cortex-border focus-within:border-cortex-accent/60 transition-colors shadow-inner flex items-center w-full min-w-0">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Cortex AI... (Enter to send, Shift+Enter for newline)"
            className="w-full min-w-0 bg-transparent p-2.5 pr-9 text-xs text-white placeholder-cortex-muted outline-none resize-none"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputVal.trim()}
            className={`absolute right-2 p-1.5 rounded-lg transition-all ${
              isLoading || !inputVal.trim()
                ? 'text-cortex-muted cursor-not-allowed'
                : 'bg-cortex-accent text-black hover:brightness-110 active:scale-95'
            }`}
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
