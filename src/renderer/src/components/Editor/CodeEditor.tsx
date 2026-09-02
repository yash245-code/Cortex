import React, { useRef, useEffect, useCallback } from 'react'
import Editor, { OnMount, BeforeMount, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { useEditorStore } from '../../store/useEditorStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useGitStore } from '../../store/useGitStore'
import { MarkdownPreview } from './MarkdownPreview'
import { DiffViewer } from './DiffViewer'
import { computeLineDiff } from '../../utils/gitDiffUtils'
import { registerLanguageSnippets } from '../../services/snippetService'
import { registerMonacoThemes, applyThemeAndAccent } from '../../theme/themeRegistry'
import { getFontTheme } from '../../theme/fontRegistry'
import { InlineAIPromptBar } from './InlineAIPromptBar'
import { aiCompletionService } from '../../services/aiCompletionService'

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

  const { rootPath } = useWorkspaceStore()
  const { isGitRepo, stagedFiles, unstagedFiles, untrackedFiles } = useGitStore()

  const [isInlineAIOpen, setIsInlineAIOpen] = React.useState(false)
  const [inlineAISelection, setInlineAISelection] = React.useState('')

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const gutterDecorationsRef = useRef<string[]>([])
  const headContentRef = useRef<string | null>(null)
  const diffDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const currentTabs = pane === 1 ? tabs : pane2Tabs
  const currentActiveId = pane === 1 ? activeTabId : pane2ActiveTabId
  const activeTab = currentTabs.find((t) => t.id === currentActiveId)

  const isMarkdownFile =
    activeTab?.name.endsWith('.md') || activeTab?.name.endsWith('.markdown')

  // Calculate and apply Monaco line gutter decorations (Git change markers)
  const applyGutterDecorations = useCallback(
    (currentContent: string, headContent: string | null) => {
      if (!editorRef.current || headContent === null) {
        if (editorRef.current && gutterDecorationsRef.current.length > 0) {
          gutterDecorationsRef.current = editorRef.current.deltaDecorations(
            gutterDecorationsRef.current,
            []
          )
        }
        return
      }

      const lineChanges = computeLineDiff(headContent, currentContent)
      const newDecorations: editor.IModelDeltaDecoration[] = lineChanges.map((change) => {
        let className = 'cortex-git-gutter-modified'
        let hoverMessage = 'Git: Modified line'

        if (change.type === 'added') {
          className = 'cortex-git-gutter-added'
          hoverMessage = 'Git: Added line'
        } else if (change.type === 'deleted') {
          className = 'cortex-git-gutter-deleted'
          hoverMessage = 'Git: Deleted line above'
        }

        return {
          range: new monaco.Range(
            change.startLineNumber,
            1,
            change.endLineNumber,
            1
          ),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: className,
            hoverMessage: { value: hoverMessage }
          }
        }
      })

      gutterDecorationsRef.current = editorRef.current.deltaDecorations(
        gutterDecorationsRef.current,
        newDecorations
      )
    },
    []
  )

  // Fetch Git HEAD content for active file
  const fetchHeadAndDecorate = useCallback(async () => {
    if (!activeTab || activeTab.isDiff || !rootPath || !isGitRepo || !window.cortexAPI) {
      headContentRef.current = null
      applyGutterDecorations('', null)
      return
    }

    try {
      const relativePath = activeTab.path.startsWith(rootPath)
        ? activeTab.path.slice(rootPath.length).replace(/^[/\\]+/, '')
        : activeTab.path

      const head = await window.cortexAPI.gitGetFileAtHead(rootPath, relativePath)
      headContentRef.current = head
      applyGutterDecorations(activeTab.content, head)
    } catch {
      headContentRef.current = null
      applyGutterDecorations('', null)
    }
  }, [activeTab?.path, activeTab?.content, activeTab?.isDiff, rootPath, isGitRepo, applyGutterDecorations])

  // Refetch git HEAD snapshot whenever active tab or git status changes
  useEffect(() => {
    fetchHeadAndDecorate()
  }, [activeTab?.id, stagedFiles.length, unstagedFiles.length, untrackedFiles.length, fetchHeadAndDecorate])

  // Dynamically update Monaco text colors when theme or accent color changes
  useEffect(() => {
    applyThemeAndAccent(settings.theme || 'cortex-cyber', settings.accentColor)
  }, [settings.theme, settings.accentColor])

  const handleEditorWillMount: BeforeMount = (monacoInstance) => {
    // Register language snippet providers (HTML, JS, TS, Python, CSS, etc.)
    registerLanguageSnippets()

    // Register all curated themes with active accent color text harmonization
    registerMonacoThemes(monacoInstance, settings.accentColor)
    aiCompletionService.register(monacoInstance)
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

    // Bind Ctrl+K / Cmd+K (Inline AI Prompt) inside Monaco
    editorInstance.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyK, () => {
      const model = editorInstance.getModel()
      const selection = editorInstance.getSelection()
      let text = ''
      if (model && selection && !selection.isEmpty()) {
        text = model.getValueInRange(selection)
      } else if (model && selection) {
        text = model.getLineContent(selection.startLineNumber)
      }
      setInlineAISelection(text)
      setIsInlineAIOpen(true)
    })

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

    // Run initial gutter decoration calculation
    if (activeTab && headContentRef.current !== null) {
      applyGutterDecorations(activeTab.content, headContentRef.current)
    }
  }

  // Focus and position cursor at the end of text when switching tabs
  useEffect(() => {
    if (editorRef.current && activeTab && !targetEditorLocation && !activeTab.isDiff) {
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

      // Debounce gutter decoration updates while typing
      if (diffDebounceTimerRef.current) {
        clearTimeout(diffDebounceTimerRef.current)
      }
      diffDebounceTimerRef.current = setTimeout(() => {
        if (headContentRef.current !== null) {
          applyGutterDecorations(value, headContentRef.current)
        }
      }, 250)
    }
  }

  const handleAcceptInlineAI = (newCode: string): void => {
    const editor = editorRef.current
    const selection = editor?.getSelection()
    if (editor && selection) {
      editor.executeEdits('inline-ai', [
        {
          range: selection.isEmpty()
            ? new monaco.Range(
                selection.startLineNumber,
                1,
                selection.startLineNumber,
                editor.getModel()?.getLineMaxColumn(selection.startLineNumber) || 1
              )
            : selection,
          text: newCode,
          forceMoveMarkers: true
        }
      ])
      editor.focus()
    }
    setIsInlineAIOpen(false)
  }

  if (!activeTab) {
    return (
      <div className="flex-1 w-full h-full flex items-center justify-center bg-cortex-bg text-cortex-muted text-xs select-none">
        <span>No file open in this pane</span>
      </div>
    )
  }

  // If Tab is in Diff view mode, render DiffViewer
  if (activeTab.isDiff) {
    return <DiffViewer pane={pane} />
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

  const fontThemeDef = getFontTheme(settings.fontTheme)
  const activeFontFamily =
    settings.fontTheme === 'custom' ? settings.fontFamily : fontThemeDef.fontFamily
  const activeFontLigatures =
    settings.fontLigatures !== false ? fontThemeDef.fontLigatures : false
  const activeLineHeight =
    settings.lineHeight || Math.round(settings.fontSize * fontThemeDef.lineHeightMultiplier)

  return (
    <div className={`flex-1 w-full h-full relative overflow-hidden bg-cortex-bg ${fontThemeDef.className}`}>
      <Editor
        key={`${activeTab.id}-${settings.theme}-${settings.fontTheme}`}
        theme={settings.theme || 'cortex-cyber'}
        language={activeTab.language}
        value={activeTab.content}
        onChange={handleContentChange}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={{
          fontSize: settings.fontSize,
          fontFamily: activeFontFamily,
          fontWeight: '400',
          fontLigatures: activeFontLigatures,
          letterSpacing: fontThemeDef.letterSpacing,
          lineHeight: activeLineHeight,
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
          inlineSuggest: { enabled: true },
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

      {/* Floating Ctrl+K Inline AI Prompt Bar */}
      <InlineAIPromptBar
        isOpen={isInlineAIOpen}
        selectedCode={inlineAISelection}
        language={activeTab.language}
        context={activeTab.content}
        onClose={() => {
          setIsInlineAIOpen(false)
          editorRef.current?.focus()
        }}
        onAccept={handleAcceptInlineAI}
      />
    </div>
  )
}
