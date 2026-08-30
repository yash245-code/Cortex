import React, { useRef, useState } from 'react'
import { DiffEditor, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import {
  Columns,
  AlignJustify,
  ChevronUp,
  ChevronDown,
  Plus,
  Minus,
  RotateCcw,
  GitCompare,
  Code2,
  X
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useGitStore } from '../../store/useGitStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { registerMonacoThemes } from '../../theme/themeRegistry'
import { getFontTheme } from '../../theme/fontRegistry'

loader.config({ monaco })

interface DiffViewerProps {
  pane?: 1 | 2
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ pane = 1 }) => {
  const {
    tabs,
    activeTabId,
    pane2Tabs,
    pane2ActiveTabId,
    settings,
    updateTabContent,
    diffViewMode,
    toggleDiffViewMode,
    toggleDiffMode,
    closeTab
  } = useEditorStore()

  const { stagedFiles, stageFile, unstageFile, discardChanges, refreshGitStatus } =
    useGitStore()
  const { rootPath } = useWorkspaceStore()

  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const currentTabs = pane === 1 ? tabs : pane2Tabs
  const currentActiveId = pane === 1 ? activeTabId : pane2ActiveTabId
  const activeTab = currentTabs.find((t) => t.id === currentActiveId)

  if (!activeTab) return null

  const isSideBySide = diffViewMode === 'side-by-side'

  // Relative path for Git operations
  const relativePath =
    rootPath && activeTab.path.startsWith(rootPath)
      ? activeTab.path.slice(rootPath.length).replace(/^[/\\]+/, '')
      : activeTab.path

  const isStaged = stagedFiles.some((f) => f.path === activeTab.path || f.relativePath === relativePath)

  const handleDiffMount = (
    editorInstance: editor.IStandaloneDiffEditor,
    monacoInstance: typeof monaco
  ): void => {
    diffEditorRef.current = editorInstance
    registerMonacoThemes(monacoInstance, settings.accentColor)

    // Listen to changes in modified editor model
    const modifiedModel = editorInstance.getModifiedEditor().getModel()
    if (modifiedModel) {
      modifiedModel.onDidChangeContent(() => {
        const val = modifiedModel.getValue()
        updateTabContent(activeTab.id, val)
      })
    }
  }

  const handleNextDiff = (): void => {
    diffEditorRef.current?.goToDiff('next')
  }

  const handlePrevDiff = (): void => {
    diffEditorRef.current?.goToDiff('previous')
  }

  const handleStageToggle = async (): Promise<void> => {
    if (!relativePath) return
    setIsProcessing(true)
    try {
      if (isStaged) {
        await unstageFile(relativePath)
      } else {
        await stageFile(relativePath)
      }
      await refreshGitStatus()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDiscard = async (): Promise<void> => {
    if (!relativePath) return
    const confirmed = window.confirm(
      `Are you sure you want to discard all unstaged changes in ${activeTab.name}? This cannot be undone.`
    )
    if (!confirmed) return

    setIsProcessing(true)
    try {
      await discardChanges(relativePath, false)
      if (window.cortexAPI) {
        const freshContent = await window.cortexAPI.readFile(activeTab.path)
        updateTabContent(activeTab.id, freshContent)
      }
      await refreshGitStatus()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-cortex-bg">
      {/* Diff Toolbar */}
      <div className="h-9 px-3 bg-cortex-surface/80 border-b border-cortex-border flex items-center justify-between select-none shrink-0 z-10">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs text-cortex-accent font-semibold">
            <GitCompare size={14} className="text-cortex-accent" />
            <span className="truncate max-w-[200px] md:max-w-[300px]">
              {activeTab.name}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-cortex-bg border border-cortex-border text-[11px] text-cortex-muted">
            <span className="text-rose-400 font-mono">HEAD</span>
            <span>↔</span>
            <span className="text-emerald-400 font-mono">Working Tree</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-cortex-muted">
          {/* Previous / Next change */}
          <div className="flex items-center bg-cortex-panel rounded border border-cortex-border mr-1">
            <button
              onClick={handlePrevDiff}
              title="Previous Difference (F7)"
              className="p-1 hover:text-white hover:bg-cortex-surface transition-colors"
            >
              <ChevronUp size={13} />
            </button>
            <div className="w-[1px] h-3 bg-cortex-border" />
            <button
              onClick={handleNextDiff}
              title="Next Difference (Shift+F7)"
              className="p-1 hover:text-white hover:bg-cortex-surface transition-colors"
            >
              <ChevronDown size={13} />
            </button>
          </div>

          {/* Toggle Side-by-Side vs Inline */}
          <button
            onClick={toggleDiffViewMode}
            title={isSideBySide ? 'Switch to Inline Diff' : 'Switch to Side-by-Side Diff'}
            className="flex items-center gap-1 px-2 py-1 rounded hover:text-white hover:bg-cortex-panel border border-transparent hover:border-cortex-border text-xs transition-colors"
          >
            {isSideBySide ? <AlignJustify size={13} /> : <Columns size={13} />}
            <span className="text-[11px] hidden md:inline">
              {isSideBySide ? 'Inline' : 'Side-by-Side'}
            </span>
          </button>

          <div className="w-[1px] h-4 bg-cortex-border mx-1" />

          {/* Stage / Unstage Button */}
          <button
            onClick={handleStageToggle}
            disabled={isProcessing}
            title={isStaged ? 'Unstage File' : 'Stage File'}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
              isStaged
                ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            {isStaged ? <Minus size={12} /> : <Plus size={12} />}
            <span className="text-[11px] font-medium hidden sm:inline">
              {isStaged ? 'Unstage' : 'Stage'}
            </span>
          </button>

          {/* Discard changes */}
          {!isStaged && (
            <button
              onClick={handleDiscard}
              disabled={isProcessing}
              title="Discard Changes"
              className="p-1 text-cortex-muted hover:text-rose-400 hover:bg-cortex-panel rounded transition-colors"
            >
              <RotateCcw size={13} />
            </button>
          )}

          {/* Switch back to regular editor */}
          <button
            onClick={() => toggleDiffMode(activeTab.id, pane)}
            title="Switch to Regular Code Editor"
            className="flex items-center gap-1 px-2 py-1 rounded text-cortex-muted hover:text-white hover:bg-cortex-panel text-xs transition-colors ml-1"
          >
            <Code2 size={13} />
            <span className="text-[11px] hidden lg:inline">Edit File</span>
          </button>

          {/* Close Diff Tab */}
          <button
            onClick={() => closeTab(activeTab.id, pane)}
            title="Close Diff"
            className="p-1 text-cortex-muted hover:text-white hover:bg-cortex-panel rounded transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Monaco Diff Editor Instance */}
      <div
        className={`flex-1 w-full h-full relative overflow-hidden bg-cortex-bg ${
          getFontTheme(settings.fontTheme).className
        }`}
      >
        <DiffEditor
          key={`${activeTab.id}-${diffViewMode}-${settings.theme}-${settings.fontTheme}`}
          theme={settings.theme || 'cortex-cyber'}
          language={activeTab.language}
          original={activeTab.originalContent ?? ''}
          modified={activeTab.content}
          onMount={handleDiffMount}
          options={{
            fontSize: settings.fontSize,
            fontFamily:
              settings.fontTheme === 'custom'
                ? settings.fontFamily
                : getFontTheme(settings.fontTheme).fontFamily,
            fontWeight: '400',
            letterSpacing: getFontTheme(settings.fontTheme).letterSpacing,
            lineHeight:
              settings.lineHeight ||
              Math.round(settings.fontSize * getFontTheme(settings.fontTheme).lineHeightMultiplier),
            wordWrap: settings.wordWrap,
            renderSideBySide: isSideBySide,
            readOnly: false,
            originalEditable: false,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            renderIndicators: true,
            renderMarginRevertIcon: true,
            useInlineViewWhenSpaceIsLimited: true
          }}
        />
      </div>
    </div>
  )
}
