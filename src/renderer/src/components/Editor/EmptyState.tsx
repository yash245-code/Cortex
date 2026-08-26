import React from 'react'
import {
  FileCode2,
  FolderOpen,
  FilePlus,
  Terminal,
  Keyboard
} from 'lucide-react'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useEditorStore } from '../../store/useEditorStore'

export const EmptyState: React.FC = () => {
  const { openFolder, openFileDirectly, rootPath, setCreatingItem } = useWorkspaceStore()
  const { openTab, toggleTerminal } = useEditorStore()

  const handleOpenFile = async (): Promise<void> => {
    const filePath = await openFileDirectly()
    if (filePath) {
      await openTab(filePath)
    }
  }

  const handleNewFile = (): void => {
    if (rootPath) {
      setCreatingItem({ parentPath: rootPath, type: 'file' })
    } else {
      openFolder()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-cortex-bg select-none p-6">
      <div className="flex flex-col items-center max-w-md w-full text-center">
        {/* Glow & Logo */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-2xl accent-glow">
            <FileCode2 size={32} />
          </div>
        </div>

        <h1 className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent mb-2 tracking-tight">
          CORTEX EDITOR
        </h1>
        <p className="text-xs text-cortex-muted mb-8 leading-relaxed">
          High-performance desktop code editor with Monaco Engine & node-pty Terminal
        </p>

        {/* Quick Actions */}
        <div className="w-full grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => openFolder()}
            className="flex items-center gap-3 p-3 rounded-lg bg-cortex-panel border border-cortex-border hover:border-indigo-500/50 hover:bg-cortex-surface text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <FolderOpen size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Open Folder</div>
              <div className="text-[10px] text-cortex-muted">Ctrl + Shift + O</div>
            </div>
          </button>

          <button
            onClick={handleOpenFile}
            className="flex items-center gap-3 p-3 rounded-lg bg-cortex-panel border border-cortex-border hover:border-indigo-500/50 hover:bg-cortex-surface text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <FilePlus size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Open File</div>
              <div className="text-[10px] text-cortex-muted">Ctrl + O</div>
            </div>
          </button>

          <button
            onClick={handleNewFile}
            className="flex items-center gap-3 p-3 rounded-lg bg-cortex-panel border border-cortex-border hover:border-indigo-500/50 hover:bg-cortex-surface text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <FilePlus size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">New File</div>
              <div className="text-[10px] text-cortex-muted">In workspace</div>
            </div>
          </button>

          <button
            onClick={toggleTerminal}
            className="flex items-center gap-3 p-3 rounded-lg bg-cortex-panel border border-cortex-border hover:border-indigo-500/50 hover:bg-cortex-surface text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Terminal size={16} />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Terminal</div>
              <div className="text-[10px] text-cortex-muted">Ctrl + `</div>
            </div>
          </button>
        </div>

        {/* Shortcuts Cheat Sheet */}
        <div className="w-full bg-cortex-panel/60 border border-cortex-border/70 rounded-lg p-3 text-left">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 mb-2">
            <Keyboard size={13} />
            <span>Keybindings</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
            <div className="flex items-center justify-between pr-3 text-cortex-muted">
              <span>Save file</span>
              <kbd className="px-1.5 py-0.5 rounded bg-cortex-surface text-white text-[10px] font-mono border border-cortex-border">
                Ctrl+S
              </kbd>
            </div>
            <div className="flex items-center justify-between text-cortex-muted">
              <span>Close tab</span>
              <kbd className="px-1.5 py-0.5 rounded bg-cortex-surface text-white text-[10px] font-mono border border-cortex-border">
                Ctrl+W
              </kbd>
            </div>
            <div className="flex items-center justify-between pr-3 text-cortex-muted">
              <span>Toggle sidebar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-cortex-surface text-white text-[10px] font-mono border border-cortex-border">
                Ctrl+B
              </kbd>
            </div>
            <div className="flex items-center justify-between text-cortex-muted">
              <span>Toggle terminal</span>
              <kbd className="px-1.5 py-0.5 rounded bg-cortex-surface text-white text-[10px] font-mono border border-cortex-border">
                Ctrl+`
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
