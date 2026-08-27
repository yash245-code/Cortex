import React, { useEffect } from 'react'
import { X, FileCode2, Cpu, Terminal, Sparkles, Check } from 'lucide-react'
import { useEditorStore } from '../../store/useEditorStore'

export const AboutModal: React.FC = () => {
  const { isAboutModalOpen, setAboutModalOpen } = useEditorStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && isAboutModalOpen) {
        setAboutModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAboutModalOpen, setAboutModalOpen])

  if (!isAboutModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={() => setAboutModalOpen(false)}
    >
      <div
        className="relative w-full max-w-md bg-cortex-panel border border-cortex-border rounded-xl shadow-2xl overflow-hidden p-6 text-cortex-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5DD62C] via-[#9ee87f] to-[#337418]" />

        {/* Close Button */}
        <button
          onClick={() => setAboutModalOpen(false)}
          className="absolute top-4 right-4 text-cortex-muted hover:text-white p-1 rounded-md hover:bg-cortex-surface transition-colors"
        >
          <X size={16} />
        </button>

        {/* Brand Icon & Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-cortex-accent/15 border border-cortex-accent/30 flex items-center justify-center text-cortex-accent shadow-lg shadow-cortex-accent/10">
            <FileCode2 size={26} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-wide text-white">CORTEX</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-cortex-accent/20 text-cortex-accent border border-cortex-accent/40">
                v1.0.0-alpha
              </span>
            </div>
            <p className="text-xs text-cortex-muted">Next-Gen Lightweight Desktop Code Editor</p>
          </div>
        </div>

        {/* Tech Stack / Architecture Badges */}
        <div className="grid grid-cols-2 gap-2 my-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-cortex-surface/70 border border-cortex-border text-xs">
            <Cpu size={14} className="text-cortex-accent shrink-0" />
            <div className="truncate">
              <div className="font-semibold text-white">Monaco Core</div>
              <div className="text-[10px] text-cortex-muted">VS Code Editor Engine</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-cortex-surface/70 border border-cortex-border text-xs">
            <Terminal size={14} className="text-cortex-accent shrink-0" />
            <div className="truncate">
              <div className="font-semibold text-white">node-pty</div>
              <div className="text-[10px] text-cortex-muted">Native Shell Engine</div>
            </div>
          </div>
        </div>

        {/* Key Features List */}
        <div className="space-y-1.5 text-xs text-cortex-muted mb-5">
          <div className="flex items-center gap-2">
            <Check size={13} className="text-cortex-accent shrink-0" />
            <span>Multi-buffer tabbed editing with dirty status</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={13} className="text-cortex-accent shrink-0" />
            <span>Interactive Quick Open & Command Palette (<code className="text-cortex-accent font-mono text-[11px]">Ctrl+P</code>)</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={13} className="text-cortex-accent shrink-0" />
            <span>High-frequency PTY integrated terminal drawer</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={13} className="text-cortex-accent shrink-0" />
            <span>Chokidar live workspace file watcher</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-cortex-border flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-cortex-muted">
            <Sparkles size={12} className="text-cortex-accent" />
            <span>Crafted for high performance</span>
          </div>
          <button
            onClick={() => setAboutModalOpen(false)}
            className="px-4 py-1.5 bg-cortex-accent text-black font-semibold text-xs rounded-lg hover:bg-cortex-accentHover active:scale-95 transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
