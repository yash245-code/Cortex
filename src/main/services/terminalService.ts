import { BrowserWindow } from 'electron'
import * as os from 'os'
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

  public async createTerminal(id: string, cwd?: string): Promise<boolean> {
    this.killTerminal(id)

    const isWindows = os.platform() === 'win32'
    const workingDirectory = cwd || os.homedir()

    // 1. Try spawning with node-pty first
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pty = require('node-pty')
      const shell = isWindows
        ? (process.env.COMSPEC || 'powershell.exe')
        : (process.env.SHELL || '/bin/bash')

      const ptyProcess = pty.spawn(shell, [], {
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
      let shellCmd: string
      let shellArgs: string[] = []

      if (isWindows) {
        shellCmd = 'powershell.exe'
        shellArgs = ['-NoLogo']
      } else {
        shellCmd = process.env.SHELL || '/bin/bash'
        shellArgs = ['-i']
      }

      const proc: ChildProcess = spawn(shellCmd, shellArgs, {
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
