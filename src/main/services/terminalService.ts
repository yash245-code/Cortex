import { BrowserWindow } from 'electron'
import * as os from 'os'
import * as fsSync from 'fs'
import * as path from 'path'
import { spawn, ChildProcess } from 'child_process'
import { IPC_CHANNELS } from '../../shared/constants'
import { TerminalDataPayload } from '../../shared/types'

interface ITerminalInstance {
  write: (data: string) => void
  resize: (cols: number, rows: number) => void
  kill: () => void
}

export class TerminalService {
  private terminals = new Map<string, ITerminalInstance>()
  private mainWindow: BrowserWindow | null = null

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  private resolveShell(shellType?: string): { shell: string; args: string[] } {
    const isWindows = os.platform() === 'win32'
    const type = (shellType || 'default').toLowerCase()

    if (!isWindows) {
      if (type === 'bash') return { shell: '/bin/bash', args: ['-i'] }
      if (type === 'zsh') return { shell: '/bin/zsh', args: ['-i'] }
      if (type === 'sh') return { shell: '/bin/sh', args: ['-i'] }
      return { shell: process.env.SHELL || '/bin/bash', args: ['-i'] }
    }

    if (type === 'cmd') {
      return { shell: process.env.COMSPEC || 'cmd.exe', args: [] }
    }

    if (type === 'bash' || type === 'git-bash') {
      const gitBashCandidates = [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'bash.exe'),
        'bash.exe'
      ]
      for (const candidate of gitBashCandidates) {
        if (candidate === 'bash.exe' || fsSync.existsSync(candidate)) {
          return { shell: candidate, args: ['--login', '-i'] }
        }
      }
      return { shell: 'bash.exe', args: ['--login', '-i'] }
    }

    if (type === 'wsl') {
      return { shell: 'wsl.exe', args: [] }
    }

    // Default to PowerShell
    return {
      shell: process.env.SystemRoot
        ? `${process.env.SystemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`
        : 'powershell.exe',
      args: ['-NoLogo']
    }
  }

  public async createTerminal(id: string, cwd?: string, shellType?: string): Promise<boolean> {
    this.killTerminal(id)

    const workingDirectory = cwd || os.homedir()
    const { shell: resolvedShell, args: shellArgs } = this.resolveShell(shellType)

    // 1. Try spawning with node-pty first
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pty = require('node-pty')

      const ptyProcess = pty.spawn(resolvedShell, shellArgs, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: workingDirectory,
        env: process.env as Record<string, string>
      })

      ptyProcess.onData((data: string) => {
        this.sendData(id, data)
      })

      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        this.terminals.delete(id)
        this.sendExit(id, exitCode)
      })

      this.terminals.set(id, {
        write: (data: string) => ptyProcess.write(data),
        resize: (cols: number, rows: number) => {
          try {
            ptyProcess.resize(cols, rows)
          } catch {
            // ignore resize failure
          }
        },
        kill: () => {
          try {
            ptyProcess.kill()
          } catch {
            // ignore
          }
        }
      })

      return true
    } catch (nodePtyErr) {
      console.warn('node-pty native module unavailable, falling back to child_process shell:', nodePtyErr)
    }

    // 2. Fallback to child_process interactive shell
    try {
      const proc: ChildProcess = spawn(resolvedShell, shellArgs, {
        cwd: workingDirectory,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor'
        },
        stdio: ['pipe', 'pipe', 'pipe']
      })

      proc.stdout?.on('data', (data: Buffer) => {
        this.sendData(id, data.toString('utf-8'))
      })

      proc.stderr?.on('data', (data: Buffer) => {
        this.sendData(id, data.toString('utf-8'))
      })

      proc.on('exit', (code: number | null) => {
        this.terminals.delete(id)
        this.sendExit(id, code ?? 0)
      })

      this.terminals.set(id, {
        write: (data: string) => {
          if (proc.stdin && !proc.stdin.destroyed) {
            proc.stdin.write(data)
          }
        },
        resize: () => {
          // No-op for standard pipes
        },
        kill: () => {
          try {
            proc.kill()
          } catch {
            // ignore
          }
        }
      })

      // Send initial welcome/cwd notice
      this.sendData(id, `\x1b[38;2;99;102;241m[Cortex Terminal - Ready at ${workingDirectory}]\x1b[0m\r\n`)

      return true
    } catch (fallbackErr) {
      console.error(`Failed to create terminal [${id}]:`, fallbackErr)
      return false
    }
  }

  private sendData(id: string, data: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_DATA, {
        id,
        data
      } as TerminalDataPayload)
    }
  }

  private sendExit(id: string, exitCode: number): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, {
        id,
        exitCode
      })
    }
  }

  public writeTerminal(id: string, data: string): void {
    const term = this.terminals.get(id)
    if (term) {
      term.write(data)
    }
  }

  public resizeTerminal(id: string, cols: number, rows: number): void {
    const term = this.terminals.get(id)
    if (term) {
      term.resize(cols, rows)
    }
  }

  public killTerminal(id: string): void {
    const term = this.terminals.get(id)
    if (term) {
      term.kill()
      this.terminals.delete(id)
    }
  }

  public killAll(): void {
    for (const [id] of this.terminals) {
      this.killTerminal(id)
    }
  }
}

export const terminalService = new TerminalService()
