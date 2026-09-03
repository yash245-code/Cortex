import { execFile } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'
import {
  GitStatusResult,
  GitFileStatus,
  GitFileStatusType,
  GitLineChurn,
  GitFileChurnResult
} from '../../shared/types'

function runGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'git',
      args,
      {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error) {
          const err = new Error(stderr || stdout || error.message)
          reject(err)
        } else {
          resolve(stdout)
        }
      }
    )
  })
}

export class GitService {
  public async isGitRepo(workspacePath: string): Promise<boolean> {
    if (!workspacePath) return false
    try {
      const out = await runGit(['rev-parse', '--is-inside-work-tree'], workspacePath)
      return out.trim() === 'true'
    } catch {
      return false
    }
  }

  public async getBranch(workspacePath: string): Promise<string | null> {
    if (!workspacePath) return null
    try {
      const branch = await runGit(['branch', '--show-current'], workspacePath)
      const trimmed = branch.trim()
      if (trimmed) return trimmed

      // Fallback for detached HEAD
      const shortHead = await runGit(['rev-parse', '--short', 'HEAD'], workspacePath)
      return shortHead.trim() ? `(${shortHead.trim()})` : null
    } catch {
      return null
    }
  }

  public async getStatus(workspacePath: string): Promise<GitStatusResult> {
    const emptyResult: GitStatusResult = {
      isRepo: false,
      branch: null,
      staged: [],
      unstaged: [],
      untracked: []
    }

    if (!workspacePath) return emptyResult

    const isRepo = await this.isGitRepo(workspacePath)
    if (!isRepo) return emptyResult

    const branch = await this.getBranch(workspacePath)

    try {
      // --porcelain=v1 -uall outputs every individual untracked file
      const output = await runGit(['status', '--porcelain=v1', '-uall'], workspacePath)
      const lines = output.split(/\r?\n/).filter((l) => l.length >= 3)

      const staged: GitFileStatus[] = []
      const unstaged: GitFileStatus[] = []
      const untracked: GitFileStatus[] = []

      for (const line of lines) {
        const x = line[0] // Staged status
        const y = line[1] // Unstaged status
        let rawPath = line.substring(3).trim()

        // Handle quoted paths (e.g. "path with spaces/file.ts")
        if (rawPath.startsWith('"') && rawPath.endsWith('"')) {
          rawPath = rawPath.slice(1, -1)
        }

        // Handle rename arrow: "old -> new"
        if (rawPath.includes(' -> ')) {
          const parts = rawPath.split(' -> ')
          rawPath = parts[1]
        }

        // Normalize path separators
        const relPath = rawPath.replace(/\\/g, '/')
        const fullPath = path.join(workspacePath, relPath).replace(/\\/g, '/')
        const fileName = path.basename(fullPath)

        // 1. Untracked file
        if (x === '?' && y === '?') {
          untracked.push({
            path: fullPath,
            relativePath: relPath,
            fileName,
            status: 'U',
            staged: false
          })
          continue
        }

        // 2. Staged changes (X)
        if (x !== ' ' && x !== '?') {
          staged.push({
            path: fullPath,
            relativePath: relPath,
            fileName,
            status: x as GitFileStatusType,
            staged: true
          })
        }

        // 3. Unstaged changes (Y)
        if (y !== ' ' && y !== '?') {
          unstaged.push({
            path: fullPath,
            relativePath: relPath,
            fileName,
            status: y as GitFileStatusType,
            staged: false
          })
        }
      }

      return {
        isRepo: true,
        branch,
        staged,
        unstaged,
        untracked
      }
    } catch (err) {
      console.error('Failed to get git status:', err)
      return {
        isRepo: true,
        branch,
        staged: [],
        unstaged: [],
        untracked: []
      }
    }
  }

  public async stageFile(workspacePath: string, relativePath: string): Promise<boolean> {
    try {
      await runGit(['add', '--', relativePath], workspacePath)
      return true
    } catch (err) {
      console.error(`Failed to stage file ${relativePath}:`, err)
      return false
    }
  }

  public async unstageFile(workspacePath: string, relativePath: string): Promise<boolean> {
    try {
      // Try git restore --staged first, fallback to git reset HEAD
      try {
        await runGit(['restore', '--staged', '--', relativePath], workspacePath)
      } catch {
        await runGit(['reset', 'HEAD', '--', relativePath], workspacePath)
      }
      return true
    } catch (err) {
      console.error(`Failed to unstage file ${relativePath}:`, err)
      return false
    }
  }

  public async stageAll(workspacePath: string): Promise<boolean> {
    try {
      await runGit(['add', '-A'], workspacePath)
      return true
    } catch (err) {
      console.error('Failed to stage all files:', err)
      return false
    }
  }

  public async unstageAll(workspacePath: string): Promise<boolean> {
    try {
      await runGit(['reset'], workspacePath)
      return true
    } catch (err) {
      console.error('Failed to unstage all files:', err)
      return false
    }
  }

  public async discardFile(
    workspacePath: string,
    relativePath: string,
    isUntracked = false
  ): Promise<boolean> {
    try {
      if (isUntracked) {
        const fullPath = path.join(workspacePath, relativePath)
        await fs.rm(fullPath, { recursive: true, force: true })
      } else {
        try {
          await runGit(['restore', '--', relativePath], workspacePath)
        } catch {
          await runGit(['checkout', '--', relativePath], workspacePath)
        }
      }
      return true
    } catch (err) {
      console.error(`Failed to discard file ${relativePath}:`, err)
      return false
    }
  }

  public async getFileAtHead(
    workspacePath: string,
    relativePath: string
  ): Promise<string | null> {
    if (!workspacePath || !relativePath) return null
    try {
      const gitRelPath = relativePath.replace(/\\/g, '/')
      const content = await runGit(['show', `HEAD:${gitRelPath}`], workspacePath)
      return content
    } catch {
      // File might be untracked or newly added in index
      return ''
    }
  }

  public async getDiff(
    workspacePath: string,
    relativePath: string,
    staged = false
  ): Promise<string> {
    if (!workspacePath || !relativePath) return ''
    try {
      const gitRelPath = relativePath.replace(/\\/g, '/')
      if (staged) {
        return await runGit(['diff', '--staged', '--', gitRelPath], workspacePath)
      }
      try {
        return await runGit(['diff', 'HEAD', '--', gitRelPath], workspacePath)
      } catch {
        return await runGit(['diff', '--', gitRelPath], workspacePath)
      }
    } catch {
      return ''
    }
  }

  public async commit(workspacePath: string, message: string): Promise<boolean> {
    if (!message || !message.trim()) return false
    try {
      await runGit(['commit', '-m', message.trim()], workspacePath)
      return true
    } catch (err) {
      console.error('Failed to commit:', err)
      return false
    }
  }

  public async getFileChurn(
    workspacePath: string,
    relativePath: string
  ): Promise<GitFileChurnResult | null> {
    if (!workspacePath || !relativePath) return null

    try {
      const isRepo = await this.isGitRepo(workspacePath)
      if (!isRepo) return null

      const gitRelPath = relativePath.replace(/\\/g, '/')
      let stdout: string
      try {
        stdout = await runGit(['blame', '--line-porcelain', '--', gitRelPath], workspacePath)
      } catch {
        return null
      }

      if (!stdout || stdout.trim().length === 0) return null

      interface CommitInfo {
        author: string
        authorMail: string
        authorTime: number
        summary: string
      }

      const commitCache = new Map<string, CommitInfo>()
      const rawLines: Array<{
        lineNumber: number
        commitHash: string
        shortHash: string
        author: string
        authorEmail: string
        authorTime: number
        summary: string
      }> = []

      const lines = stdout.split(/\r?\n/)
      let currentHash = ''
      let currentFinalLine = 0
      let currentAuthor = 'Unknown'
      let currentMail = ''
      let currentAuthorTime = 0
      let currentSummary = ''

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        // Header start: 40 hex characters followed by original & final line numbers
        const headerMatch = line.match(/^([0-9a-fA-F]{40})\s+\d+\s+(\d+)/)
        if (headerMatch) {
          currentHash = headerMatch[1]
          currentFinalLine = parseInt(headerMatch[2], 10)

          if (commitCache.has(currentHash)) {
            const cached = commitCache.get(currentHash)!
            currentAuthor = cached.author
            currentMail = cached.authorMail
            currentAuthorTime = cached.authorTime
            currentSummary = cached.summary
          } else {
            currentAuthor = 'Unknown'
            currentMail = ''
            currentAuthorTime = 0
            currentSummary = ''
          }
          continue
        }

        if (line.startsWith('author ')) {
          currentAuthor = line.substring(7).trim()
        } else if (line.startsWith('author-mail ')) {
          currentMail = line.substring(12).trim().replace(/^<|>$/g, '')
        } else if (line.startsWith('author-time ')) {
          currentAuthorTime = parseInt(line.substring(12).trim(), 10) || 0
        } else if (line.startsWith('summary ')) {
          currentSummary = line.substring(8).trim()
        } else if (line.startsWith('\t')) {
          // Line content delimiter marks the completion of the line metadata
          if (currentHash && currentFinalLine > 0) {
            commitCache.set(currentHash, {
              author: currentAuthor,
              authorMail: currentMail,
              authorTime: currentAuthorTime,
              summary: currentSummary
            })

            rawLines.push({
              lineNumber: currentFinalLine,
              commitHash: currentHash,
              shortHash: currentHash.slice(0, 7),
              author: currentAuthor,
              authorEmail: currentMail,
              authorTime: currentAuthorTime,
              summary: currentSummary
            })
          }
        }
      }

      if (rawLines.length === 0) return null

      const now = Math.floor(Date.now() / 1000)
      const validTimes = rawLines
        .map((l) => l.authorTime)
        .filter((t) => t > 0 && !isNaN(t))

      const lastModified = validTimes.length > 0 ? Math.max(...validTimes) : now
      const oldestModified = validTimes.length > 0 ? Math.min(...validTimes) : now
      const uniqueAuthors = Array.from(
        new Set(
          rawLines
            .map((l) => l.author)
            .filter((a) => a && a !== 'Not Committed Yet' && a !== 'Unknown')
        )
      )
      const uniqueCommits = new Set(
        rawLines
          .map((l) => l.commitHash)
          .filter((h) => !h.startsWith('0000000'))
      )

      const ONE_DAY = 86400
      const ONE_WEEK = 7 * ONE_DAY
      const ONE_MONTH = 30 * ONE_DAY
      const THREE_MONTHS = 90 * ONE_DAY

      const processedLines: GitLineChurn[] = rawLines.map((l) => {
        const isUncommitted = l.commitHash.startsWith('0000000') || l.author === 'Not Committed Yet'
        let heatLevel: 1 | 2 | 3 | 4 | 5 = 1
        let heatScore = 0.2
        let relativeTime = ''

        if (isUncommitted) {
          heatLevel = 5
          heatScore = 1.0
          relativeTime = 'Uncommitted (Working Tree)'
        } else if (l.authorTime > 0) {
          const ageSeconds = Math.max(0, now - l.authorTime)

          // 1. Calculate base tier by absolute age
          if (ageSeconds <= 2 * ONE_DAY) {
            heatLevel = 5
            heatScore = 1.0
          } else if (ageSeconds <= ONE_WEEK) {
            heatLevel = 4
            heatScore = 0.8
          } else if (ageSeconds <= ONE_MONTH) {
            heatLevel = 3
            heatScore = 0.6
          } else if (ageSeconds <= THREE_MONTHS) {
            heatLevel = 2
            heatScore = 0.4
          } else {
            heatLevel = 1
            heatScore = 0.2
          }

          // 2. Relative boost if line was part of recent commit activity in this file
          if (lastModified > oldestModified) {
            const fileRecency = (l.authorTime - oldestModified) / (lastModified - oldestModified)
            if (fileRecency >= 0.85 && heatLevel < 4) {
              heatLevel = Math.min(5, heatLevel + 1) as 1 | 2 | 3 | 4 | 5
            }
          }

          // Format relative time
          if (ageSeconds < 60) {
            relativeTime = 'Just now'
          } else if (ageSeconds < 3600) {
            const mins = Math.floor(ageSeconds / 60)
            relativeTime = `${mins}m ago`
          } else if (ageSeconds < ONE_DAY) {
            const hrs = Math.floor(ageSeconds / 3600)
            relativeTime = `${hrs}h ago`
          } else if (ageSeconds < ONE_WEEK) {
            const days = Math.floor(ageSeconds / ONE_DAY)
            relativeTime = `${days}d ago`
          } else if (ageSeconds < ONE_MONTH) {
            const weeks = Math.floor(ageSeconds / ONE_WEEK)
            relativeTime = `${weeks}w ago`
          } else if (ageSeconds < 365 * ONE_DAY) {
            const months = Math.floor(ageSeconds / ONE_MONTH)
            relativeTime = `${months}mo ago`
          } else {
            const years = Math.floor(ageSeconds / (365 * ONE_DAY))
            relativeTime = `${years}y ago`
          }
        } else {
          relativeTime = 'Unknown'
        }

        const dateStr = l.authorTime > 0 ? new Date(l.authorTime * 1000).toLocaleDateString() : ''

        return {
          lineNumber: l.lineNumber,
          commitHash: l.commitHash,
          shortHash: l.shortHash,
          author: l.author,
          authorEmail: l.authorEmail,
          authorTime: l.authorTime,
          dateStr,
          relativeTime,
          summary: l.summary,
          heatLevel,
          heatScore
        }
      })

      return {
        filePath: gitRelPath,
        totalCommits: uniqueCommits.size,
        uniqueAuthors,
        lines: processedLines,
        lastModified,
        oldestModified
      }
    } catch (err) {
      console.error(`Failed to get file churn for ${relativePath}:`, err)
      return null
    }
  }
}

export const gitService = new GitService()
