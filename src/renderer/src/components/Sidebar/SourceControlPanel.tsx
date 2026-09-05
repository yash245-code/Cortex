import React, { useState, useEffect } from 'react'
import {
  GitBranch,
  RefreshCw,
  Plus,
  Minus,
  RotateCcw,
  File,
  ChevronDown,
  ChevronRight,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  GitCompare
} from 'lucide-react'
import { useGitStore } from '../../store/useGitStore'
import { useWorkspaceStore } from '../../store/useWorkspaceStore'
import { useEditorStore } from '../../store/useEditorStore'
import { GitFileStatus, GitFileStatusType } from '@shared/types'

function getStatusBadge(status: GitFileStatusType): { text: string; color: string; bg: string } {
  switch (status) {
    case 'M':
      return { text: 'M', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/30' }
    case 'U':
    case '??':
      return { text: 'U', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' }
    case 'A':
      return { text: 'A', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' }
    case 'D':
      return { text: 'D', color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/30' }
    case 'R':
      return { text: 'R', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' }
    default:
      return { text: status, color: 'text-bodhi-muted', bg: 'bg-bodhi-surface border-BODHI-border' }
  }
}

export const SourceControlPanel: React.FC = () => {
  const {
    branch,
    isGitRepo,
    stagedFiles,
    unstagedFiles,
    untrackedFiles,
    isLoading,
    isCommitting,
    commitMessage,
    refreshGitStatus,
    stageFile,
    unstageFile,
    stageAll,
    unstageAll,
    discardChanges,
    commitChanges,
    setCommitMessage
  } = useGitStore()

  const { rootPath, openFolder } = useWorkspaceStore()
  const { openTab, openDiffTab } = useEditorStore()

  const [isStagedOpen, setIsStagedOpen] = useState(true)
  const [isChangesOpen, setIsChangesOpen] = useState(true)
  const [isUntrackedOpen, setIsUntrackedOpen] = useState(true)

  // Initial load
  useEffect(() => {
    if (rootPath) {
      refreshGitStatus()
    }
  }, [rootPath, refreshGitStatus])

  const totalChanges = stagedFiles.length + unstagedFiles.length + untrackedFiles.length

  const handleCommit = async (): Promise<void> => {
    if (!commitMessage.trim()) return
    await commitChanges()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleCommit()
    }
  }

  if (!rootPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center select-none text-bodhi-muted">
        <GitBranch size={32} className="text-bodhi-muted mb-2 opacity-50" />
        <h4 className="text-xs font-semibold text-BODHI-text mb-1">No Folder Opened</h4>
        <p className="text-[11px] mb-3">Open a workspace to view Git source control.</p>
        <button
          onClick={() => openFolder()}
          className="px-3 py-1 rounded bg-bodhi-accent text-black font-semibold text-xs transition-transform active:scale-95"
        >
          Open Folder
        </button>
      </div>
    )
  }

  if (!isGitRepo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center select-none text-bodhi-muted">
        <div className="w-10 h-10 rounded-full bg-bodhi-surface flex items-center justify-center text-bodhi-muted mb-2 border border-BODHI-border">
          <AlertCircle size={20} />
        </div>
        <h4 className="text-xs font-semibold text-BODHI-text mb-1">No Git Repository Found</h4>
        <p className="text-[11px] mb-3 max-w-[200px]">
          The folder is not tracked by Git. Initialize a repository to enable version control.
        </p>
        <button
          onClick={() => refreshGitStatus()}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-bodhi-surface hover:bg-BODHI-active border border-BODHI-border text-xs text-BODHI-text transition-all shadow-sm"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          <span>Check Again</span>
        </button>
      </div>
    )
  }

  const renderFileRow = (
    item: GitFileStatus,
    type: 'staged' | 'unstaged' | 'untracked'
  ): React.ReactNode => {
    const badge = getStatusBadge(item.status)

    return (
      <div
        key={`${type}-${item.relativePath}`}
        onClick={() => {
          if (type === 'untracked') {
            openTab(item.path)
          } else {
            openDiffTab(item.path)
          }
        }}
        className="group flex items-center h-7 px-3 text-xs text-BODHI-text hover:bg-bodhi-surface/60 rounded cursor-pointer transition-colors"
      >
        <File size={13} className="text-bodhi-muted mr-1.5 shrink-0 group-hover:text-BODHI-text" />
        <span className="truncate font-medium flex-1 mr-2">{item.fileName}</span>
        <span className="text-[10px] text-bodhi-muted truncate max-w-[90px] mr-2">
          {item.relativePath.includes('/')
            ? item.relativePath.substring(0, item.relativePath.lastIndexOf('/'))
            : ''}
        </span>

        {/* Hover Action Buttons */}
        <div className="hidden group-hover:flex items-center gap-0.5 mr-1.5">
          {/* Open Diff View Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              openDiffTab(item.path)
            }}
            title="Open Changes (Diff View)"
            className="p-1 text-bodhi-muted hover:text-amber-400 hover:bg-BODHI-active rounded transition-colors"
          >
            <GitCompare size={12} />
          </button>

          {type === 'staged' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                unstageFile(item.relativePath)
              }}
              title="Unstage Changes"
              className="p-1 text-bodhi-muted hover:text-white hover:bg-BODHI-active rounded transition-colors"
            >
              <Minus size={12} />
            </button>
          )}

          {type === 'unstaged' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  discardChanges(item.relativePath, false)
                }}
                title="Discard Changes"
                className="p-1 text-bodhi-muted hover:text-rose-400 hover:bg-BODHI-active rounded transition-colors"
              >
                <RotateCcw size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  stageFile(item.relativePath)
                }}
                title="Stage Changes"
                className="p-1 text-bodhi-muted hover:text-white hover:bg-BODHI-active rounded transition-colors"
              >
                <Plus size={12} />
              </button>
            </>
          )}

          {type === 'untracked' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  discardChanges(item.relativePath, true)
                }}
                title="Delete Untracked File"
                className="p-1 text-bodhi-muted hover:text-rose-400 hover:bg-BODHI-active rounded transition-colors"
              >
                <RotateCcw size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  stageFile(item.relativePath)
                }}
                title="Track / Stage File"
                className="p-1 text-bodhi-muted hover:text-white hover:bg-BODHI-active rounded transition-colors"
              >
                <Plus size={12} />
              </button>
            </>
          )}
        </div>

        {/* Status Badge */}
        <span
          className={`w-4 h-4 rounded flex items-center justify-center font-mono text-[10px] font-bold border ${badge.color} ${badge.bg}`}
        >
          {badge.text}
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-BODHI-sidebar text-BODHI-text select-none">
      {/* Header */}
      <div className="h-8 px-3 flex items-center justify-between border-b border-BODHI-border shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-[11px] font-bold uppercase tracking-wider text-bodhi-muted">
            Source Control
          </span>
          {branch && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-bodhi-surface text-bodhi-accent font-mono text-[10px] border border-BODHI-border">
              <GitBranch size={10} />
              <span className="truncate max-w-[80px]">{branch}</span>
            </span>
          )}
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-0.5 text-bodhi-muted">
          {totalChanges > 0 && stagedFiles.length > 0 && (
            <button
              onClick={() => unstageAll()}
              title="Unstage All Changes"
              className="p-1 hover:text-white hover:bg-bodhi-surface rounded transition-colors"
            >
              <Minus size={13} />
            </button>
          )}
          {totalChanges > 0 && (unstagedFiles.length > 0 || untrackedFiles.length > 0) && (
            <button
              onClick={() => stageAll()}
              title="Stage All Changes"
              className="p-1 hover:text-white hover:bg-bodhi-surface rounded transition-colors"
            >
              <Plus size={13} />
            </button>
          )}
          <button
            onClick={() => refreshGitStatus()}
            title="Refresh Git Status"
            className={`p-1 hover:text-white hover:bg-bodhi-surface rounded transition-colors ${
              isLoading ? 'animate-spin text-bodhi-accent' : ''
            }`}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Commit Box */}
      <div className="p-3 border-b border-BODHI-border space-y-2 shrink-0">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message (Ctrl+Enter to commit)"
          rows={2}
          className="w-full bg-bodhi-panel text-xs text-BODHI-text p-2 rounded border border-BODHI-border focus:border-bodhi-accent focus:outline-none resize-none placeholder:text-bodhi-muted"
        />

        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || isCommitting || totalChanges === 0}
          className={`w-full py-1.5 rounded flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
            commitMessage.trim() && totalChanges > 0 && !isCommitting
              ? 'bg-bodhi-accent text-black hover:opacity-90 active:scale-[0.99] shadow-sm'
              : 'bg-bodhi-surface text-bodhi-muted opacity-50 cursor-not-allowed border border-BODHI-border'
          }`}
        >
          {isCommitting ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              <span>Committing...</span>
            </>
          ) : (
            <>
              <GitCommit size={13} />
              <span>Commit Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Changes Accordions Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-1">
        {totalChanges === 0 ? (
          <div className="p-6 flex flex-col items-center justify-center text-center text-bodhi-muted">
            <CheckCircle2 size={28} className="text-bodhi-accent mb-2 opacity-80" />
            <span className="text-xs font-medium text-BODHI-text">Working tree clean</span>
            <span className="text-[11px] text-bodhi-muted mt-0.5">No changes to commit</span>
          </div>
        ) : (
          <>
            {/* 1. Staged Changes */}
            {stagedFiles.length > 0 && (
              <div>
                <div
                  onClick={() => setIsStagedOpen(!isStagedOpen)}
                  className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-bodhi-muted hover:text-BODHI-text cursor-pointer group"
                >
                  <div className="flex items-center gap-1">
                    {isStagedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span className="tracking-wide">STAGED CHANGES</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded-full bg-bodhi-surface text-[10px] font-mono text-bodhi-accent">
                      {stagedFiles.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        unstageAll()
                      }}
                      title="Unstage All"
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded"
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                </div>

                {isStagedOpen && (
                  <div className="py-0.5">
                    {stagedFiles.map((f) => renderFileRow(f, 'staged'))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Unstaged Changes */}
            {unstagedFiles.length > 0 && (
              <div>
                <div
                  onClick={() => setIsChangesOpen(!isChangesOpen)}
                  className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-bodhi-muted hover:text-BODHI-text cursor-pointer group"
                >
                  <div className="flex items-center gap-1">
                    {isChangesOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span className="tracking-wide">CHANGES</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded-full bg-bodhi-surface text-[10px] font-mono text-amber-400">
                      {unstagedFiles.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        unstagedFiles.forEach((f) => stageFile(f.relativePath))
                      }}
                      title="Stage All Changes"
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {isChangesOpen && (
                  <div className="py-0.5">
                    {unstagedFiles.map((f) => renderFileRow(f, 'unstaged'))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Untracked Files */}
            {untrackedFiles.length > 0 && (
              <div>
                <div
                  onClick={() => setIsUntrackedOpen(!isUntrackedOpen)}
                  className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-bodhi-muted hover:text-BODHI-text cursor-pointer group"
                >
                  <div className="flex items-center gap-1">
                    {isUntrackedOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span className="tracking-wide">UNTRACKED FILES</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded-full bg-bodhi-surface text-[10px] font-mono text-emerald-400">
                      {untrackedFiles.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        untrackedFiles.forEach((f) => stageFile(f.relativePath))
                      }}
                      title="Stage All Untracked"
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {isUntrackedOpen && (
                  <div className="py-0.5">
                    {untrackedFiles.map((f) => renderFileRow(f, 'untracked'))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
