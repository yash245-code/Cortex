import React, { useRef } from 'react'
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useEditorStore } from '../../store/useEditorStore'

export const CodeEditor: React.FC = () => {
  const {
    tabs,
    activeTabId,
    settings,
    updateTabContent,
    setCursorPosition,
    saveActiveTab
  } = useEditorStore()

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const activeTab = tabs.find((t) => t.id === activeTabId)

  const handleEditorWillMount: BeforeMount = (monaco) => {
    // Define custom sleek dark theme matching Cortex styling
    monaco.editor.defineTheme('cortex-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'f8f8f2' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'function', foreground: '50fa7b' }
      ],
      colors: {
        'editor.background': '#0f1117',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#181b27',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#6366f1',
        'editorWhitespace.foreground': '#272c42',
        'editorIndentGuide.background': '#1e2235',
        'editorIndentGuide.activeBackground': '#3e4668',
        'editorLineNumber.foreground': '#4e5675',
        'editorLineNumber.activeForeground': '#a5b4fc',
        'editorGutter.background': '#0f1117'
      }
    })
  }

  const handleEditorDidMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance

    // Track cursor position
    editorInstance.onDidChangeCursorPosition((e) => {
      setCursorPosition(e.position.lineNumber, e.position.column)
    })

    // Bind Ctrl+S / Cmd+S inside Monaco
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveTab()
    })
  }

  const handleContentChange = (value: string | undefined): void => {
    if (activeTabId && value !== undefined) {
      updateTabContent(activeTabId, value)
    }
  }

  if (!activeTab) return null

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
          lineNumbersMinChars: 3,
          padding: { top: 12, bottom: 12 },
          automaticLayout: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true
          }
        }}
        loading={
          <div className="flex items-center justify-center h-full text-xs text-cortex-muted">
            Loading Editor...
          </div>
        }
      />
    </div>
  )
}
