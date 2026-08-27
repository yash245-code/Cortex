import React, { useRef, useEffect } from 'react'
import Editor, { OnMount, BeforeMount, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { useEditorStore } from '../../store/useEditorStore'
import { MarkdownPreview } from './MarkdownPreview'

import { registerLanguageSnippets } from '../../services/snippetService'

// Ensure Monaco Editor is loaded from the local npm package, not external CDN
loader.config({ monaco })

interface CodeEditorProps {
  pane?: 1 | 2
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ pane = 1 }) => {
  const {
    tabs,
    activeTabId,
    pane2Tabs,
    pane2ActiveTabId,
    targetEditorLocation,
    setTargetEditorLocation,
    settings,
    updateTabContent,
    setCursorPosition,
    saveActiveTab,
    openPalette,
    isMarkdownPreviewOpen,
    toggleMarkdownPreview
  } = useEditorStore()

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const currentTabs = pane === 1 ? tabs : pane2Tabs
  const currentActiveId = pane === 1 ? activeTabId : pane2ActiveTabId
  const activeTab = currentTabs.find((t) => t.id === currentActiveId)

  const isMarkdownFile =
    activeTab?.name.endsWith('.md') || activeTab?.name.endsWith('.markdown')

  const handleEditorWillMount: BeforeMount = (monacoInstance) => {
    // Register language snippet providers (HTML, JS, TS, Python, CSS, etc.)
    registerLanguageSnippets()

    // Define custom sleek dark theme matching Cortex styling
    monacoInstance.editor.defineTheme('cortex-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '666666', fontStyle: 'italic' },
        { token: 'keyword', foreground: '5dd62c', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'f8f8f8' },
        { token: 'string', foreground: 'a3e635' },
        { token: 'number', foreground: '86efac' },
        { token: 'type', foreground: '4ade80' },
        { token: 'function', foreground: 'bef264' },
        { token: 'operator', foreground: '5dd62c' }
      ],
      colors: {
        'editor.background': '#0F0F0F',
        'editor.foreground': '#F8F8F8',
        'editor.lineHighlightBackground': '#181818',
        'editor.selectionBackground': '#33741866',
        'editorCursor.foreground': '#5DD62C',
        'editorWhitespace.foreground': '#242424',
        'editorIndentGuide.background': '#202020',
        'editorIndentGuide.activeBackground': '#337418',
        'editorLineNumber.foreground': '#555555',
        'editorLineNumber.activeForeground': '#5DD62C',
        'editorGutter.background': '#0F0F0F'
      }
    })
  }

  const handleEditorDidMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance

    // Track cursor position
    editorInstance.onDidChangeCursorPosition((e) => {
      setCursorPosition(e.position.lineNumber, e.position.column)
    })

    // Bind Ctrl+S / Cmd+S inside Monaco
    editorInstance.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      saveActiveTab()
    })

    // Bind Ctrl+P / Cmd+P (Quick Open Files) inside Monaco
    editorInstance.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyP, () => {
      openPalette('files')
    })

    // Bind Ctrl+Shift+P / Cmd+Shift+P (Command Palette) inside Monaco
    editorInstance.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyP,
      () => {
        openPalette('commands')
      }
    )

    // Auto-focus and place cursor at the end of text content
    const model = editorInstance.getModel()
    if (model) {
      const lineCount = model.getLineCount()
      const maxCol = model.getLineMaxColumn(lineCount)
      editorInstance.setPosition({ lineNumber: lineCount, column: maxCol })
      editorInstance.revealPosition(
        { lineNumber: lineCount, column: maxCol },
        monaco.editor.ScrollType.Smooth
      )
    }
    editorInstance.focus()
  }

  // Focus and position cursor at the end of text when switching tabs
  useEffect(() => {
    if (editorRef.current && activeTab && !targetEditorLocation) {
      const model = editorRef.current.getModel()
      if (model) {
        const lineCount = model.getLineCount()
        const maxCol = model.getLineMaxColumn(lineCount)
        editorRef.current.setPosition({ lineNumber: lineCount, column: maxCol })
      }
      editorRef.current.focus()
    }
  }, [activeTab?.id, targetEditorLocation])

  // Handle navigation to target line/col (from Search results or Jump to Line)
  useEffect(() => {
    if (
      targetEditorLocation &&
      activeTab &&
      targetEditorLocation.path === activeTab.path &&
      editorRef.current
    ) {
      editorRef.current.revealPositionInCenter({
        lineNumber: targetEditorLocation.line,
        column: targetEditorLocation.col
      })
      editorRef.current.setPosition({
        lineNumber: targetEditorLocation.line,
        column: targetEditorLocation.col
      })
      editorRef.current.focus()
      setTargetEditorLocation(null)
    }
  }, [targetEditorLocation, activeTab, setTargetEditorLocation])

  // Listen for find/replace events from MenuBar
  useEffect(() => {
    const handleFind = (): void => {
      editorRef.current?.getAction('actions.find')?.run()
    }
    const handleReplace = (): void => {
      editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run()
    }
    window.addEventListener('cortex:editor:find', handleFind)
    window.addEventListener('cortex:editor:replace', handleReplace)
    return () => {
      window.removeEventListener('cortex:editor:find', handleFind)
      window.removeEventListener('cortex:editor:replace', handleReplace)
    }
  }, [])

  const handleContentChange = (value: string | undefined): void => {
    if (activeTab && value !== undefined) {
      updateTabContent(activeTab.id, value)
    }
  }

  if (!activeTab) {
    return (
      <div className="flex-1 w-full h-full flex items-center justify-center bg-cortex-bg text-cortex-muted text-xs select-none">
        <span>No file open in this pane</span>
      </div>
    )
  }

  // If Markdown Preview is active for markdown files, render preview component
  if (isMarkdownPreviewOpen && isMarkdownFile) {
    return (
      <MarkdownPreview
        content={activeTab.content}
        fileName={activeTab.name}
        onClose={toggleMarkdownPreview}
      />
    )
  }

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-cortex-bg">
      <Editor
        key={activeTab.id}
        theme="cortex-dark"
        language={activeTab.language}
        value={activeTab.content}
        onChange={handleContentChange}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={{
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap,
          minimap: { enabled: settings.minimap },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'all',
          automaticLayout: true,
          bracketPairColorization: { enabled: true },
          quickSuggestions: { other: 'on', comments: 'on', strings: 'on' },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          snippetSuggestions: 'top',
          wordBasedSuggestions: 'allDocuments',
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoClosingOvertype: 'always',
          autoSurround: 'languageDefined',
          formatOnType: true,
          formatOnPaste: true,
          guides: {
            bracketPairs: true,
            indentation: true
          }
        }}
      />
    </div>
  )
}
