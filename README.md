# Bodhi Code Editor

**Bodhi** is a lightweight, high-performance, and extensible desktop code editor built on Electron, React 18, TypeScript, Monaco Editor, and xterm.js terminal emulation.

---

## ⚡ Key Highlights

- **Frameless Modern UI**: Sleek draggable dark-themed title bar with window controls (minimize, maximize, close) and active breadcrumb navigation.
- **Full Workspace & File Explorer**:
  - Open individual files or entire workspace folders.
  - Recursive directory tree view with file-type badges.
  - Inline file & folder creation, renaming, and deletion.
  - Real-time file system change detection via `chokidar` in the main process with live UI synchronization over IPC.
- **Multi-Tab Monaco Editor Engine**:
  - Powered by `@monaco-editor/react` with custom `bodhi-dark` syntax highlighting and theme.
  - Multi-tab management with unsaved/dirty buffer indicators (`●`), middle-click tab closure, and context menu.
  - Syntax highlighting for 25+ programming languages.
  - Automatic layout adjustment, cursor line/column tracking, and status bar synchronization.
- **Dockable Integrated Terminal**:
  - Embedded `xterm.js` with `FitAddon` for responsive terminal layout.
  - Connects to native `node-pty` / interactive PowerShell/Bash shell running in the Electron main process.
  - Bidirectional streaming over secure typed IPC channels.
  - Quick clear and restart shell session controls.
- **Strict Process Isolation & Security**:
  - `nodeIntegration: false` and `contextIsolation: true`.
  - Secure type-safe IPC bridge exposed on `window.bodhiAPI`.
  - Zero raw disk or shell access exposed to the renderer.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save active file |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Save all open files |
| <kbd>Ctrl</kbd> + <kbd>W</kbd> | Close active tab |
| <kbd>Ctrl</kbd> + <kbd>`</kbd> | Toggle integrated terminal dock |
| <kbd>Ctrl</kbd> + <kbd>B</kbd> | Toggle file explorer sidebar |
| <kbd>Ctrl</kbd> + <kbd>O</kbd> | Open single file dialog |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd> | Open workspace folder dialog |

---

## 🚀 Getting Started

### Development
```bash
# Start Vite development server with Electron live reload
npm run dev
```

### Type Checking & Production Build
```bash
# Run TypeScript validation across Node & Web environments
npm run typecheck

# Build main, preload, and renderer production bundles
npm run build
```

### Desktop Packaging
```bash
# Package into Windows installer / executable
npm run build:win
```

---

## 📁 Architecture Overview

```text
├── src/
│   ├── main/
│   │   ├── services/
│   │   │   ├── fileService.ts       # Disk read/write, directory traversal, Chokidar watcher
│   │   │   └── terminalService.ts   # PTY / shell process lifecycle & streams
│   │   ├── ipcHandlers.ts           # Type-safe IPC registrations
│   │   └── index.ts                 # BrowserWindow & app lifecycle
│   ├── preload/
│   │   ├── index.ts                 # contextBridge API exposure (bodhiAPI)
│   │   └── index.d.ts               # Global Window.bodhiAPI typings
│   ├── renderer/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── TitleBar.tsx      # Draggable title bar & window controls
│   │   │   │   ├── StatusBar.tsx     # Cursor metrics, encoding, language
│   │   │   │   ├── Sidebar/          # File tree, inline actions, activity bar
│   │   │   │   ├── Editor/           # Tab bar, Monaco editor, empty landing
│   │   │   │   └── Terminal/         # Dockable xterm.js terminal panel
│   │   │   ├── store/                # Zustand workspace & editor stores
│   │   │   ├── hooks/                # Keyboard shortcuts hook
│   │   │   ├── App.tsx               # Main layout orchestrator
│   │   │   └── main.tsx
│   │   └── index.html
│   └── shared/
│       ├── types.ts                  # Shared FileNode, Tab, IPC channels
│       └── constants.ts              # IPC channel enum constants
```
