import React, { useState } from 'react'
import { X, Circle, FileCode, FileText, FileJson } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'
import { Tab } from '@shared/types'

function getTabIcon(filename: string): React.ReactNode {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'cpp', 'c', 'cs'].includes(ext)) {
    return <FileCode size={13} className="text-indigo-400" />
  }
  if (['json', 'yaml', 'yml', 'toml'].includes(ext)) {
    return <FileJson size={13} className="text-yellow-400" />
  }
  return <FileText size={13} className="text-cortex-muted" />
}

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab, closeOtherTabs, closeAllTabs } =
    useEditorStore()

  const [contextMenu, setContextMenu] = useState<{
    tabId: string
    x: number
    y: number
  } | null>(null)

  if (tabs.length === 0) return null

  const handleTabClick = (tabId: string): void => {
    setActiveTab(tabId)
  }

  const handleTabAuxClick = (e: React.MouseEvent, tabId: string): void => {
    // Middle click closes tab
    if (e.button === 1) {
      e.preventDefault()
      closeTab(tabId)
    }
  }

  const handleContextMenu = (e: React.MouseEvent, tabId: string): void => {
    e.preventDefault()
    setContextMenu({ tabId, x: e.clientX, y: e.clientY })
  }

  const closeMenu = (): void => setContextMenu(null)

  return (
    <>
      <div className="h-9 bg-[#11131b] border-b border-cortex-border flex items-center px-1 overflow-x-auto select-none shrink-0 no-scrollbar">
        <div className="flex items-center gap-1 h-full">
          {tabs.map((tab: Tab) => {
            const isActive = tab.id === activeTabId
            return (
              <div
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                onAuxClick={(e) => handleTabAuxClick(e, tab.id)}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                title={tab.path}
                className={`group relative flex items-center gap-2 h-8 px-3 rounded-t-md text-xs cursor-pointer transition-all border-t-2 ${
                  isActive
                    ? 'bg-cortex-bg text-white border-indigo-500 font-medium tab-active-glow'
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
                        closeTab(tab.id)
                      }}
                      className="group-hover:hidden flex items-center justify-center text-indigo-400"
                    >
                      <Circle size={8} fill="currentColor" />
                    </button>
                  ) : null}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
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
      </div>

      {/* Context Menu */}
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
            className="absolute bg-cortex-surface border border-cortex-border rounded-md shadow-xl py-1 w-40 text-xs text-cortex-text z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                closeTab(contextMenu.tabId)
                closeMenu()
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Close Tab
            </button>
            <button
              onClick={() => {
                closeOtherTabs(contextMenu.tabId)
                closeMenu()
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Close Others
            </button>
            <div className="h-[1px] bg-cortex-border my-1" />
            <button
              onClick={() => {
                closeAllTabs()
                closeMenu()
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-red-600 hover:text-white transition-colors"
            >
              Close All
            </button>
          </div>
        </div>
      )}
    </>
  )
}
