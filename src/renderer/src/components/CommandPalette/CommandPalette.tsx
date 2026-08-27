import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Search,
  Terminal,
  FileCode,
  FileJson,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  CornerDownLeft,
  ArrowUpDown,
  X
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import {
  flattenFileTree,
  fuzzyMatch,
  EditorCommand,
  FlatFileItem
} from '../../utils/commandRegistry'

function getFileIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode size={15} className="text-cortex-accent shrink-0" />
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return <FileCode size={15} className="text-amber-400 shrink-0" />
    case 'json':
      return <FileJson size={15} className="text-yellow-400 shrink-0" />
    case 'html':
    case 'htm':
    case 'css':
    case 'scss':
      return <FileCode size={15} className="text-cyan-400 shrink-0" />
    case 'md':
    case 'markdown':
    case 'txt':
      return <FileText size={15} className="text-emerald-400 shrink-0" />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
      return <FileImage size={15} className="text-purple-400 shrink-0" />
    case 'csv':
    case 'sql':
      return <FileSpreadsheet size={15} className="text-emerald-500 shrink-0" />
    default:
      return <File size={15} className="text-cortex-muted shrink-0" />
  }
}

function HighlightedText({
  text,
  matchedIndices
}: {
  text: string
  matchedIndices: number[]
}): React.ReactElement {
  if (!matchedIndices || matchedIndices.length === 0) {
    return <span>{text}</span>
  }

  const indicesSet = new Set(matchedIndices)
  const elements: React.ReactNode[] = []

  for (let i = 0; i < text.length; i++) {
    if (indicesSet.has(i)) {
      elements.push(
        <span key={i} className="text-cortex-accent font-bold underline decoration-cortex-accent/40">
          {text[i]}
        </span>
      )
    } else {
      elements.push(<span key={i}>{text[i]}</span>)
    }
  }

  return <>{elements}</>
}

export const CommandPalette: React.FC = () => {
  const {
    isPaletteOpen,
    paletteMode,
    closePalette,
    openTab,
    toggleTerminal,
    toggleSidebar,
    saveActiveTab,
    saveAllTabs,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    activeTabId,
    increaseFontSize,
    decreaseFontSize,
    toggleMinimap,
    toggleWordWrap,
    openSettingsWindow
  } = useEditorStore()

  const {
    rootNode,
    rootPath,
    openFolder,
    openFileDirectly,
    refreshTree,
    setCreatingItem
  } = useWorkspaceStore()

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-focus input when opened & initialize query based on mode
  useEffect(() => {
    if (isPaletteOpen) {
      setQuery(paletteMode === 'commands' ? '>' : '')
      setSelectedIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isPaletteOpen, paletteMode])

  // Generate flat list of workspace files
  const fileItems = useMemo(() => {
    return flattenFileTree(rootNode, rootPath)
  }, [rootNode, rootPath])

  // Build command registry
  const allCommands = useMemo<EditorCommand[]>(() => {
    return [
      {
        id: 'view.toggleTerminal',
        title: 'View: Toggle Integrated Terminal',
        category: 'View',
        shortcut: 'Ctrl+`',
        action: () => toggleTerminal()
      },
      {
        id: 'view.toggleSidebar',
        title: 'View: Toggle File Explorer Sidebar',
        category: 'View',
        shortcut: 'Ctrl+B',
        action: () => toggleSidebar()
      },
      {
        id: 'file.openFolder',
        title: 'File: Open Workspace Folder...',
        category: 'File',
        shortcut: 'Ctrl+Shift+O',
        action: () => openFolder()
      },
      {
        id: 'file.openFile',
        title: 'File: Open File...',
        category: 'File',
        shortcut: 'Ctrl+O',
        action: async () => {
          const filePath = await openFileDirectly()
          if (filePath) await openTab(filePath)
        }
      },
      {
        id: 'file.saveActive',
        title: 'File: Save Active File',
        category: 'File',
        shortcut: 'Ctrl+S',
        action: () => saveActiveTab()
      },
      {
        id: 'file.saveAll',
        title: 'File: Save All Open Files',
        category: 'File',
        shortcut: 'Ctrl+Shift+S',
        action: () => saveAllTabs()
      },
      {
        id: 'file.closeActive',
        title: 'File: Close Active Tab',
        category: 'File',
        shortcut: 'Ctrl+W',
        action: () => {
          if (activeTabId) closeTab(activeTabId)
        }
      },
      {
        id: 'file.closeOther',
        title: 'File: Close Other Tabs',
        category: 'File',
        action: () => {
          if (activeTabId) closeOtherTabs(activeTabId)
        }
      },
      {
        id: 'file.closeAll',
        title: 'File: Close All Tabs',
        category: 'File',
        action: () => closeAllTabs()
      },
      {
        id: 'file.newFile',
        title: 'File: New File in Workspace',
        category: 'File',
        action: () => {
          if (rootPath) setCreatingItem({ parentPath: rootPath, type: 'file' })
          else openFolder()
        }
      },
      {
        id: 'file.refreshTree',
        title: 'File: Refresh Explorer Directory Tree',
        category: 'File',
        action: () => refreshTree()
      },
      {
        id: 'editor.increaseFontSize',
        title: 'Editor: Increase Font Size',
        category: 'Editor',
        action: () => increaseFontSize()
      },
      {
        id: 'editor.decreaseFontSize',
        title: 'Editor: Decrease Font Size',
        category: 'Editor',
        action: () => decreaseFontSize()
      },
      {
        id: 'editor.toggleMinimap',
        title: 'Editor: Toggle Minimap',
        category: 'Editor',
        action: () => toggleMinimap()
      },
      {
        id: 'editor.toggleWordWrap',
        title: 'Editor: Toggle Word Wrap',
        category: 'Editor',
        action: () => toggleWordWrap()
      },
      {
        id: 'preferences.openSettings',
        title: 'Preferences: Open Settings Window',
        category: 'Preferences',
        shortcut: 'Ctrl+,',
        action: () => openSettingsWindow()
      },
      {
        id: 'window.minimize',
        title: 'Window: Minimize',
        category: 'Window',
        action: () => window.cortexAPI?.minimizeWindow()
      },
      {
        id: 'window.maximize',
        title: 'Window: Maximize / Restore',
        category: 'Window',
        action: () => window.cortexAPI?.maximizeWindow()
      },
      {
        id: 'window.close',
        title: 'Window: Close Application',
        category: 'Window',
        action: () => window.cortexAPI?.closeWindow()
      }
    ]
  }, [
    openSettingsWindow,
    toggleTerminal,
    toggleSidebar,
    openFolder,
    openFileDirectly,
    openTab,
    saveActiveTab,
    saveAllTabs,
    activeTabId,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    rootPath,
    setCreatingItem,
    refreshTree,
    increaseFontSize,
    decreaseFontSize,
    toggleMinimap,
    toggleWordWrap
  ])

  // Determine current active search mode
  const isCommandMode = query.startsWith('>')
  const searchFilter = isCommandMode ? query.slice(1).trim() : query.trim()

  // Filter and score results
  const filteredFiles = useMemo(() => {
    if (isCommandMode) return []
    if (!searchFilter) {
      return fileItems.slice(0, 50).map((file) => ({
        item: file,
        matchedIndices: []
      }))
    }

    const scored: { item: FlatFileItem; score: number; matchedIndices: number[] }[] = []
    for (const file of fileItems) {
      const match = fuzzyMatch(file.relativePath, searchFilter)
      if (match) {
        scored.push({
          item: file,
          score: match.score,
          matchedIndices: match.matchedIndices
        })
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
  }, [isCommandMode, searchFilter, fileItems])

  const filteredCommands = useMemo(() => {
    if (!isCommandMode) return []
    if (!searchFilter) {
      return allCommands.map((cmd) => ({
        item: cmd,
        matchedIndices: []
      }))
    }

    const scored: { item: EditorCommand; score: number; matchedIndices: number[] }[] = []
    for (const cmd of allCommands) {
      const match = fuzzyMatch(cmd.title, searchFilter)
      if (match) {
        scored.push({
          item: cmd,
          score: match.score,
          matchedIndices: match.matchedIndices
        })
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
  }, [isCommandMode, searchFilter, allCommands])

  const totalItemsCount = isCommandMode ? filteredCommands.length : filteredFiles.length

  // Ensure selectedIndex stays valid when list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]') as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const executeSelected = useCallback(async (): Promise<void> => {
    if (totalItemsCount === 0) return

    if (isCommandMode) {
      const cmd = filteredCommands[selectedIndex]?.item
      if (cmd) {
        closePalette()
        await cmd.action()
      }
    } else {
      const file = filteredFiles[selectedIndex]?.item
      if (file) {
        closePalette()
        await openTab(file.path)
      }
    }
  }, [
    totalItemsCount,
    isCommandMode,
    filteredCommands,
    filteredFiles,
    selectedIndex,
    closePalette,
    openTab
  ])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (totalItemsCount > 0) {
        setSelectedIndex((prev) => (prev + 1) % totalItemsCount)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (totalItemsCount > 0) {
        setSelectedIndex((prev) => (prev - 1 + totalItemsCount) % totalItemsCount)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      executeSelected()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closePalette()
    }
  }

  if (!isPaletteOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm select-none"
      onClick={closePalette}
    >
      <div
        className="w-full max-w-xl bg-cortex-panel border border-cortex-border rounded-xl shadow-2xl overflow-hidden flex flex-col accent-glow animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input Bar */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-cortex-surface/70 border-b border-cortex-border">
          {isCommandMode ? (
            <Terminal size={17} className="text-cortex-accent shrink-0 animate-pulse" />
          ) : (
            <Search size={17} className="text-cortex-accent shrink-0" />
          )}

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isCommandMode
                ? 'Type a command to run...'
                : 'Type the name of a file to open (type > for commands)...'
            }
            className="flex-1 bg-transparent text-sm text-cortex-text placeholder:text-cortex-muted outline-none font-sans"
          />

          <button
            onClick={closePalette}
            className="p-1 text-cortex-muted hover:text-white rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-1.5 flex flex-col gap-0.5 no-scrollbar"
        >
          {totalItemsCount === 0 ? (
            <div className="py-8 text-center text-xs text-cortex-muted italic">
              {isCommandMode ? 'No matching commands found' : 'No matching files found in workspace'}
            </div>
          ) : isCommandMode ? (
            filteredCommands.map((itemObj, idx) => {
              const isActive = idx === selectedIndex
              return (
                <div
                  key={itemObj.item.id}
                  data-active={isActive}
                  onClick={() => {
                    setSelectedIndex(idx)
                    executeSelected()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all border-l-2 ${
                    isActive
                      ? 'bg-cortex-surface text-white border-cortex-accent font-medium shadow-sm'
                      : 'text-cortex-text border-transparent hover:bg-cortex-surface/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cortex-border text-cortex-muted">
                      {itemObj.item.category}
                    </span>
                    <span className="truncate">
                      <HighlightedText
                        text={itemObj.item.title}
                        matchedIndices={itemObj.matchedIndices}
                      />
                    </span>
                  </div>

                  {itemObj.item.shortcut && (
                    <kbd className="px-1.5 py-0.5 rounded bg-cortex-panel text-[10px] font-mono text-cortex-accent border border-cortex-border shrink-0 ml-2">
                      {itemObj.item.shortcut}
                    </kbd>
                  )}
                </div>
              )
            })
          ) : (
            filteredFiles.map((fileObj, idx) => {
              const isActive = idx === selectedIndex
              return (
                <div
                  key={fileObj.item.path}
                  data-active={isActive}
                  onClick={() => {
                    setSelectedIndex(idx)
                    executeSelected()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all border-l-2 ${
                    isActive
                      ? 'bg-cortex-surface text-white border-cortex-accent font-medium shadow-sm'
                      : 'text-cortex-text border-transparent hover:bg-cortex-surface/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {getFileIcon(fileObj.item.name)}
                    <span className="truncate font-medium">
                      <HighlightedText
                        text={fileObj.item.name}
                        matchedIndices={fileObj.matchedIndices.filter(
                          (i) => i >= fileObj.item.relativePath.length - fileObj.item.name.length
                        ).map((i) => i - (fileObj.item.relativePath.length - fileObj.item.name.length))}
                      />
                    </span>
                  </div>

                  <span className="text-[11px] text-cortex-muted truncate max-w-[200px] ml-2 font-mono">
                    {fileObj.item.relativePath}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-3.5 py-2 bg-cortex-bg border-t border-cortex-border flex items-center justify-between text-[11px] text-cortex-muted select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUpDown size={11} className="text-cortex-accent" />
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={11} className="text-cortex-accent" />
              Open
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isCommandMode && (
              <span className="text-cortex-muted">
                Type <kbd className="px-1 py-0.2 rounded bg-cortex-surface text-cortex-accent border border-cortex-border font-mono">&gt;</kbd> for commands
              </span>
            )}
            <span className="text-[10px]">
              {totalItemsCount} {isCommandMode ? 'commands' : 'files'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
