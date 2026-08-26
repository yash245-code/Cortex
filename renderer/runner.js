/**
 * runner.js — Code Runner module
 * Handles ▶ Run and ⏹ Stop, streams output to the Output panel.
 */

window.RunnerManager = (() => {
  let isRunning = false;
  let activeTab = 'terminal'; // 'terminal' | 'output'

  const LANGUAGE_LABELS = {
    javascript: 'Node.js', typescript: 'ts-node', python: 'Python',
    ruby: 'Ruby', go: 'Go', php: 'PHP', lua: 'Lua', perl: 'Perl',
    r: 'R', shellscript: 'Bash', powershell: 'PowerShell',
    java: 'Java', kotlin: 'Kotlin', swift: 'Swift', dart: 'Dart',
  };

  // ── Output Panel ─────────────────────────────────────────────

  function getOutputEl() {
    return document.getElementById('output-container');
  }

  function clearOutput() {
    const el = getOutputEl();
    if (el) el.innerHTML = '';
  }

  function appendOutput(text, type = 'stdout') {
    const el = getOutputEl();
    if (!el) return;

    // Convert ANSI escape sequences to styled spans (basic)
    const sanitized = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // ANSI color codes → spans
      .replace(/\x1b\[0m/g, '</span>')
      .replace(/\x1b\[1m/g, '<span style="font-weight:700">')
      .replace(/\x1b\[38;5;141m/g, '<span style="color:#a78bfa">')
      .replace(/\x1b\[38;5;114m/g, '<span style="color:#a6e3a1">')
      .replace(/\x1b\[38;5;210m/g, '<span style="color:#f38ba8">')
      .replace(/\x1b\[38;5;240m/g, '<span style="color:#45475a">')
      .replace(/\x1b\[38;5;81m/g,  '<span style="color:#89dceb">')
      .replace(/\x1b\[\d+m/g, '')      // strip remaining ANSI
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const line = document.createElement('span');
    line.className = `output-line-${type}`;
    line.innerHTML = sanitized;
    el.appendChild(line);

    // Auto-scroll to bottom
    el.scrollTop = el.scrollHeight;
  }

  // ── Tab Switching ─────────────────────────────────────────────

  function switchToOutput() {
    document.getElementById('xterm-container')?.classList.add('hidden');
    document.getElementById('output-container')?.classList.remove('hidden');
    document.getElementById('terminal-tab-1')?.classList.remove('active');
    document.getElementById('terminal-tab-output')?.classList.add('active');
    activeTab = 'output';
  }

  function switchToTerminal() {
    document.getElementById('output-container')?.classList.add('hidden');
    document.getElementById('xterm-container')?.classList.remove('hidden');
    document.getElementById('terminal-tab-output')?.classList.remove('active');
    document.getElementById('terminal-tab-1')?.classList.add('active');
    activeTab = 'terminal';
  }

  // ── Run state UI ──────────────────────────────────────────────

  function setRunning(running) {
    isRunning = running;
    const runBtn  = document.getElementById('btn-run-file');
    const stopBtn = document.getElementById('btn-stop-run');

    if (running) {
      runBtn?.classList.add('running', 'running-pulse');
      stopBtn?.classList.remove('hidden');
    } else {
      runBtn?.classList.remove('running', 'running-pulse');
      stopBtn?.classList.add('hidden');
    }
  }

  // ── Run ───────────────────────────────────────────────────────

  async function runCurrentFile() {
    if (isRunning) return;

    const tab = window.TabManager?.getActiveTab();
    if (!tab) {
      window.App?.notify('info', 'Open a file to run it');
      return;
    }
    if (!tab.filePath) {
      window.App?.notify('info', 'Save the file before running');
      return;
    }

    // Auto-save before running
    if (tab.dirty) {
      await window.App?.saveCurrentFile(true);
    }

    // Open terminal panel and switch to Output tab
    window.TerminalManager?.show();
    clearOutput();
    switchToOutput();
    setRunning(true);

    const lang = tab.language || '';
    const label = LANGUAGE_LABELS[lang] || lang || 'code';
    appendOutput(
      `\x1b[38;5;141m▶ Running ${tab.label} with ${label}...\x1b[0m\n` +
      `\x1b[38;5;240m${'─'.repeat(45)}\x1b[0m\n`,
      'info'
    );

    const result = await window.electronAPI.runFile(tab.filePath);
    if (!result.success) {
      appendOutput(`✕ Could not run file: ${result.error}\n`, 'stderr');
      setRunning(false);
    }
  }

  async function stopCurrentRun() {
    if (!isRunning) return;
    await window.electronAPI.stopFile();
  }

  // ── Listen to runner events from main process ─────────────────

  function init() {
    // Listen for streamed output
    window.electronAPI.onRunnerOutput(data => {
      appendOutput(data.text, data.type === 'stderr' ? 'stderr' : data.type === 'info' ? 'info' : 'stdout');
    });

    // Listen for process done
    window.electronAPI.onRunnerDone(data => {
      setRunning(false);
    });

    // Run button
    document.getElementById('btn-run-file')?.addEventListener('click', runCurrentFile);

    // Stop button
    document.getElementById('btn-stop-run')?.addEventListener('click', stopCurrentRun);

    // Terminal tab switching
    document.getElementById('terminal-tab-1')?.addEventListener('click', switchToTerminal);
    document.getElementById('terminal-tab-output')?.addEventListener('click', switchToOutput);

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      if (e.key === 'F5' && !e.shiftKey) { e.preventDefault(); runCurrentFile(); }
      if (e.key === 'F5' && e.shiftKey)  { e.preventDefault(); stopCurrentRun(); }
    });
  }

  return { init, runCurrentFile, stopCurrentRun, switchToOutput, switchToTerminal };
})();
