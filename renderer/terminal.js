/**
 * terminal.js — Integrated terminal using xterm.js (simulated for web-based env)
 * Uses a simulated shell experience since node-pty is not available without native build tools.
 */

window.TerminalManager = (() => {
  let term = null;
  let fitAddon = null;
  let isOpen = false;
  let commandBuffer = '';
  let historyBuffer = [];
  let historyIndex = -1;
  let currentDir = '';

  // Simulated filesystem state for demo
  let simFiles = {};

  const PROMPT_COLOR = '\x1b[38;5;141m'; // Purple
  const DIR_COLOR    = '\x1b[38;5;81m';  // Cyan
  const ERROR_COLOR  = '\x1b[38;5;210m'; // Red
  const SUCCESS_COLOR= '\x1b[38;5;114m'; // Green
  const RESET        = '\x1b[0m';
  const BOLD         = '\x1b[1m';

  async function init() {
    // Lazy-load xterm from node_modules
    if (typeof Terminal === 'undefined') {
      await loadXterm();
    }

    const { Terminal: Term } = window.XTermModule || {};
    if (!Term) { initFallback(); return; }

    const { FitAddon } = window.XTermFitModule || {};

    term = new Term({
      fontFamily: "'JetBrains Mono', 'Consolas', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowTransparency: true,
      scrollback: 2000,
      theme: getXtermTheme(),
    });

    if (FitAddon) {
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
    }

    const container = document.getElementById('xterm-container');
    term.open(container);
    if (fitAddon) fitAddon.fit();

    // Get home dir as starting point
    try {
      currentDir = await window.electronAPI.homedir() || '~';
    } catch { currentDir = '~'; }

    printWelcome();
    writePrompt();

    // Handle input
    term.onData(data => handleInput(data));

    // Resize observer
    const resizeObs = new ResizeObserver(() => {
      if (fitAddon) fitAddon.fit();
    });
    resizeObs.observe(container);
  }

  async function loadXterm() {
    return new Promise(resolve => {
      // Try to load from node_modules via file
      const s1 = document.createElement('script');
      s1.src = '../node_modules/xterm/lib/xterm.js';
      s1.onload = () => {
        window.XTermModule = { Terminal };
        const s2 = document.createElement('script');
        s2.src = '../node_modules/xterm-addon-fit/lib/xterm-addon-fit.js';
        s2.onload = () => {
          window.XTermFitModule = { FitAddon };
          resolve();
        };
        s2.onerror = resolve;
        document.head.appendChild(s2);
      };
      s1.onerror = resolve;
      document.head.appendChild(s1);
    });
  }

  function initFallback() {
    // Simple textarea-based fallback if xterm.js fails to load
    const container = document.getElementById('xterm-container');
    container.innerHTML = `
      <div style="padding:12px;font-family:'JetBrains Mono',monospace;font-size:13px;color:#cdd6f4;height:100%;display:flex;flex-direction:column;">
        <div id="term-output" style="flex:1;overflow-y:auto;white-space:pre-wrap;color:#a6adc8;font-size:12px;"></div>
        <div style="display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px solid #3a3a55;">
          <span style="color:#7c3aed;">❯</span>
          <input id="term-input" type="text" style="flex:1;background:transparent;border:none;outline:none;color:#cdd6f4;font-family:inherit;font-size:13px;" placeholder="Type a command..." />
        </div>
      </div>
    `;

    const output = document.getElementById('term-output');
    const input = document.getElementById('term-input');

    output.textContent = 'Codex Terminal\n─────────────\n';

    input.addEventListener('keydown', async e => {
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        output.textContent += `❯ ${cmd}\n`;
        input.value = '';
        const result = await runSimCommand(cmd);
        output.textContent += result + '\n';
        output.scrollTop = output.scrollHeight;
      }
    });
  }

  function getXtermTheme() {
    const theme = document.body.dataset.theme;
    if (theme === 'light') {
      return {
        background: '#f8f9fc', foreground: '#2d3044',
        cursor: '#7c3aed', selection: '#d8dae8',
        black: '#2d3044', red: '#dc2626', green: '#15803d',
        yellow: '#92400e', blue: '#1d4ed8', magenta: '#6d28d9',
        cyan: '#0891b2', white: '#f8f9fc',
      };
    }
    if (theme === 'midnight') {
      return {
        background: '#0a0e1a', foreground: '#e2e8f7',
        cursor: '#60a5fa', selection: '#1f2d4d',
        black: '#0a0e1a', red: '#f87171', green: '#86efac',
        yellow: '#fde68a', blue: '#60a5fa', magenta: '#c4b5fd',
        cyan: '#67e8f9', white: '#e2e8f7',
      };
    }
    return {
      background: '#1e1e2e', foreground: '#cdd6f4',
      cursor: '#8b5cf6', selection: '#363660',
      black: '#45475a', red: '#f38ba8', green: '#a6e3a1',
      yellow: '#f9e2af', blue: '#89b4fa', magenta: '#cba6f7',
      cyan: '#89dceb', white: '#cdd6f4',
    };
  }

  function printWelcome() {
    term.writeln(`${BOLD}${PROMPT_COLOR}Codex Terminal${RESET}`);
    term.writeln(`${'\x1b[38;5;240m'}Type 'help' for available commands.${RESET}`);
    term.writeln('');
  }

  function writePrompt() {
    const dir = currentDir.split(/[\\/]/).pop() || currentDir;
    term.write(`${DIR_COLOR}${dir}${RESET} ${PROMPT_COLOR}❯${RESET} `);
  }

  function handleInput(data) {
    // Handle special keys
    if (data === '\r') {          // Enter
      term.writeln('');
      const cmd = commandBuffer.trim();
      commandBuffer = '';
      if (cmd) {
        historyBuffer.unshift(cmd);
        historyIndex = -1;
        executeCommand(cmd);
      } else {
        writePrompt();
      }
    } else if (data === '\x7f') { // Backspace
      if (commandBuffer.length > 0) {
        commandBuffer = commandBuffer.slice(0, -1);
        term.write('\b \b');
      }
    } else if (data === '\x1b[A') { // Up arrow — history
      if (historyIndex < historyBuffer.length - 1) {
        historyIndex++;
        clearLine();
        commandBuffer = historyBuffer[historyIndex];
        term.write(commandBuffer);
      }
    } else if (data === '\x1b[B') { // Down arrow — history
      if (historyIndex > 0) {
        historyIndex--;
        clearLine();
        commandBuffer = historyBuffer[historyIndex];
        term.write(commandBuffer);
      } else if (historyIndex === 0) {
        historyIndex = -1;
        clearLine();
        commandBuffer = '';
      }
    } else if (data === '\x03') { // Ctrl+C
      term.writeln('^C');
      commandBuffer = '';
      writePrompt();
    } else if (data.charCodeAt(0) >= 32) { // Printable characters
      commandBuffer += data;
      term.write(data);
    }
  }

  function clearLine() {
    term.write('\r\x1b[K');
    const dir = currentDir.split(/[\\/]/).pop() || currentDir;
    term.write(`${DIR_COLOR}${dir}${RESET} ${PROMPT_COLOR}❯${RESET} `);
  }

  async function executeCommand(cmd) {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'help':
        term.writeln(`${BOLD}Available commands:${RESET}`);
        term.writeln(`  ${SUCCESS_COLOR}help${RESET}        Show this help`);
        term.writeln(`  ${SUCCESS_COLOR}clear${RESET}       Clear terminal`);
        term.writeln(`  ${SUCCESS_COLOR}echo${RESET} <msg>  Print a message`);
        term.writeln(`  ${SUCCESS_COLOR}date${RESET}        Show current date/time`);
        term.writeln(`  ${SUCCESS_COLOR}ls${RESET}          List files in open folder`);
        term.writeln(`  ${SUCCESS_COLOR}pwd${RESET}         Print working directory`);
        term.writeln(`  ${SUCCESS_COLOR}version${RESET}     Show Codex version`);
        term.writeln(`  ${SUCCESS_COLOR}theme${RESET} <n>   Switch theme: dark, midnight, light`);
        break;

      case 'clear':
      case 'cls':
        term.clear();
        break;

      case 'echo':
        term.writeln(args.join(' '));
        break;

      case 'date':
        term.writeln(new Date().toLocaleString());
        break;

      case 'pwd':
        term.writeln(currentDir);
        break;

      case 'ls':
      case 'dir': {
        try {
          const entries = await window.electronAPI.readDir(currentDir);
          entries.forEach(e => {
            const color = e.isDirectory ? DIR_COLOR : RESET;
            const suffix = e.isDirectory ? '/' : '';
            term.writeln(`  ${color}${e.name}${suffix}${RESET}`);
          });
        } catch {
          term.writeln(`${ERROR_COLOR}No directory opened. Use File > Open Folder.${RESET}`);
        }
        break;
      }

      case 'version':
        term.writeln(`${BOLD}${PROMPT_COLOR}Codex Editor${RESET} v1.0.0`);
        break;

      case 'theme':
        if (args[0] && ['dark', 'midnight', 'light'].includes(args[0])) {
          if (window.App) window.App.setTheme(args[0]);
          term.writeln(`${SUCCESS_COLOR}Theme set to "${args[0]}"${RESET}`);
        } else {
          term.writeln(`${ERROR_COLOR}Usage: theme <dark|midnight|light>${RESET}`);
        }
        break;

      default:
        term.writeln(`${ERROR_COLOR}command not found: ${command}${RESET}`);
        term.writeln(`Type 'help' for available commands.`);
    }

    term.writeln('');
    writePrompt();
  }

  async function runSimCommand(cmd) {
    // Simple fallback runner for textarea mode
    const parts = cmd.split(' ');
    const c = parts[0];
    if (c === 'help') return 'Commands: help, clear, echo, date, version, ls, pwd, theme';
    if (c === 'echo') return parts.slice(1).join(' ');
    if (c === 'date') return new Date().toLocaleString();
    if (c === 'version') return 'Codex Editor v1.0.0';
    return `command not found: ${c}`;
  }

  function show() {
    const panel = document.getElementById('terminal-panel');
    const handle = document.getElementById('terminal-resize-handle');
    panel.classList.remove('hidden');
    handle.classList.remove('hidden');
    isOpen = true;

    if (!term) {
      init();
    } else {
      if (fitAddon) fitAddon.fit();
      if (term) term.focus();
    }
  }

  function hide() {
    document.getElementById('terminal-panel').classList.add('hidden');
    document.getElementById('terminal-resize-handle').classList.add('hidden');
    isOpen = false;
  }

  function toggle() {
    if (isOpen) hide(); else show();
  }

  function clear() {
    if (term) term.clear();
  }

  function updateTheme() {
    if (term) {
      term.options.theme = getXtermTheme();
    }
  }

  function initResizeHandle() {
    const handle = document.getElementById('terminal-resize-handle');
    const panel = document.getElementById('terminal-panel');
    let startY, startHeight;

    handle.addEventListener('mousedown', e => {
      startY = e.clientY;
      startHeight = panel.offsetHeight;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const onMove = e => {
        const h = Math.max(80, Math.min(600, startHeight - (e.clientY - startY)));
        panel.style.height = h + 'px';
        if (fitAddon) fitAddon.fit();
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  return { init, show, hide, toggle, clear, updateTheme, initResizeHandle };
})();
