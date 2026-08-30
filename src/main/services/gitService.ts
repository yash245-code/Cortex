import { execFile } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'
import { GitStatusResult, GitFileStatus, GitFileStatusType } from '../../shared/types'

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
}

export const gitService = new GitService()
