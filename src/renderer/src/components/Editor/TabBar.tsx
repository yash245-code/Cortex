import React, { useState } from 'react'
import {
  X,
  Circle,
  FileCode,
  FileText,
  FileJson,
  Columns,
  Eye,
  BookOpen,
  ArrowRightLeft
} from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { Tab } from '@shared/types'

function getTabIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'cpp', 'c', 'cs'].includes(ext)) {
    return <FileCode size={13} className="text-cortex-accent" />
  }
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) {
    return <FileJson size={13} className="text-yellow-400" />
  }
  if (['md', 'markdown'].includes(ext)) {
    return <BookOpen size={13} className="text-[#5DD62C]" />
  }
  return <FileText size={13} className="text-cortex-muted" />
}

interface TabBarProps {
  pane?: 1 | 2
}

export const TabBar: React.FC<TabBarProps> = ({ pane = 1 }) => {
  const {
    tabs,
    activeTabId,
    pane2Tabs,
    pane2ActiveTabId,
    setActiveTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    moveTabToPane,
    toggleSplitEditor,
    isSplitEditorOpen,
    isMarkdownPreviewOpen,
    toggleMarkdownPreview
  } = useEditorStore()

  const currentTabs = pane === 1 ? tabs : pane2Tabs
  const currentActiveId = pane === 1 ? activeTabId : pane2ActiveTabId
  const activeTab = currentTabs.find((t) => t.id === currentActiveId)
  const isMarkdownFile =
    activeTab?.name.endsWith('.md') || activeTab?.name.endsWith('.markdown')

  const [contextMenu, setContextMenu] = useState<{
    tabId: string
    x: number
    y: number
  } | null>(null)

  if (currentTabs.length === 0) return null

  const handleTabClick = (tabId: string): void => {
    setActiveTab(tabId, pane)
  }

  const handleTabAuxClick = (e: React.MouseEvent, tabId: string): void => {
    if (e.button === 1) {
      e.preventDefault()
      closeTab(tabId, pane)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, tabId: string): void => {
    e.preventDefault()
    setContextMenu({ tabId, x: e.clientX, y: e.clientY })
  }

  const closeMenu = (): void => setContextMenu(null)

  return (
    <>
      <div className="h-9 bg-cortex-panel border-b border-cortex-border flex items-center justify-between px-1 select-none shrink-0 overflow-hidden">
        {/* Tab List */}
        <div className="flex items-center gap-1 h-full overflow-x-auto no-scrollbar flex-1">
          {currentTabs.map((tab: Tab) => {
            const isActive = tab.id === currentActiveId
            return (
              <div
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                onAuxClick={(e) => handleTabAuxClick(e, tab.id)}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                title={tab.path}
                className={`group relative flex items-center gap-2 h-8 px-3 rounded-t-md text-xs cursor-pointer transition-all border-t-2 shrink-0 ${
                  isActive
                    ? 'bg-cortex-bg text-white border-cortex-accent font-medium tab-active-glow'
                    : 'bg-transparent text-cortex-muted border-transparent hover:bg-cortex-surface/40 hover:text-gray-200'
                }`}
              >
                {getTabIcon(tab.name)}
                <span className="truncate max-w-[130px]">{tab.name}</span>

                {/* Dirty state circle or Close button */}
                <div className="flex items-center justify-center w-4 h-4 ml-1">
                  {tab.isDirty ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTab(tab.id, pane)
                      }}
                      className="group-hover:hidden flex items-center justify-center text-cortex-accent"
                    >
                      <Circle size={8} fill="currentColor" />
                    </button>
                  ) : null}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id, pane)
                    }}
                    className={`rounded hover:bg-cortex-surface/80 hover:text-white p-0.5 text-cortex-muted ${
                      tab.isDirty ? 'hidden group-hover:flex' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right TabBar Quick Actions */}
        <div className="flex items-center gap-1 pl-2 text-cortex-muted shrink-0">
          {/* Markdown Preview Button (shown if active file is .md) */}
          {isMarkdownFile && (
            <button
              onClick={toggleMarkdownPreview}
              title={`Toggle Markdown Preview (Ctrl+Shift+V) - ${isMarkdownPreviewOpen ? 'On' : 'Off'}`}
              className={`p-1.5 rounded transition-colors flex items-center gap-1 text-[11px] ${
                isMarkdownPreviewOpen
                  ? 'text-cortex-accent bg-cortex-accent/20 border border-cortex-accent/40 font-medium'
                  : 'hover:text-white hover:bg-cortex-surface'
              }`}
            >
              <Eye size={13} />
              <span className="hidden md:inline">Preview</span>
            </button>
          )}

          {/* Split Editor Toggle Button */}
          <button
            onClick={toggleSplitEditor}
            title={`Split Editor Right (Ctrl+\\) - ${isSplitEditorOpen ? 'Active' : 'Disabled'}`}
            className={`p-1.5 rounded transition-colors ${
              isSplitEditorOpen
                ? 'text-cortex-accent bg-cortex-accent/15'
                : 'hover:text-white hover:bg-cortex-surface'
            }`}
          >
            <Columns size={13} />
          </button>
        </div>
      </div>

      {/* Tab Context Menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 bg-transparent"
          onClick={closeMenu}
          onContextMenu={(e) => {
            e.preventDefault()
            closeMenu()
          }}
        >
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="absolute bg-cortex-surface border border-cortex-border rounded-md shadow-xl py-1 w-48 text-xs text-cortex-text z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                closeTab(contextMenu.tabId, pane)
                closeMenu()
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#337418] hover:text-white transition-colors"
            >
              Close Tab
            </button>
            <button
              onClick={() => {
                closeOtherTabs(contextMenu.tabId, pane)
                closeMenu()
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#337418] hover:text-white transition-colors"
            >
              Close Others
            </button>
            <div className="h-[1px] bg-cortex-border my-1" />
            <button
              onClick={() => {
                moveTabToPane(contextMenu.tabId, pane === 1 ? 2 : 1)
                closeMenu()
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-[#337418] hover:text-white transition-colors flex items-center justify-between"
            >
              <span>Move to {pane === 1 ? 'Right Pane' : 'Left Pane'}</span>
              <ArrowRightLeft size={11} className="text-cortex-muted" />
            </button>
            <div className="h-[1px] bg-cortex-border my-1" />
            <button
              onClick={() => {
                closeAllTabs(pane)
                closeMenu()
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-red-600 hover:text-white transition-colors"
            >
              Close All in Pane
            </button>
          </div>
        </div>
      )}
    </>
  )
}
