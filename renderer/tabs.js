/**
 * tabs.js — Multi-tab management
 * Handles opening, closing, switching, and dirty-state tracking for editor tabs.
 */

window.TabManager = (() => {
  let tabs = [];       // { id, filePath, label, dirty, viewState }
  let activeTabId = null;
  let tabIdCounter = 0;

  const container = () => document.getElementById('tabs-container');

  function getExt(filePath) {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  function getFileIcon(filePath) {
    const ext = getExt(filePath);
    const icons = {
      js: '🟨', ts: '🔷', jsx: '⚛️', tsx: '⚛️',
      html: '🌐', css: '🎨', scss: '🎨', less: '🎨',
      json: '📋', md: '📝', py: '🐍', rb: '💎',
      go: '🔵', rs: '🦀', cpp: '⚡', c: '⚡', h: '⚡',
      java: '☕', kt: '🟣', swift: '🍊', php: '🐘',
      sh: '⬛', bash: '⬛', zsh: '⬛', ps1: '🔷',
      yml: '📄', yaml: '📄', toml: '📄', ini: '📄',
      xml: '📄', svg: '🖼️', png: '🖼️', jpg: '🖼️',
      gif: '🖼️', pdf: '📕', zip: '📦', tar: '📦',
      sql: '🗄️', graphql: '🔴', vue: '💚', dart: '🎯',
    };
    return icons[ext] || '📄';
  }

  function getLanguage(filePath) {
    const ext = getExt(filePath);
    const langMap = {
      js: 'javascript', mjs: 'javascript', cjs: 'javascript',
      ts: 'typescript', mts: 'typescript',
      jsx: 'javascript', tsx: 'typescript',
      html: 'html', htm: 'html',
      css: 'css', scss: 'scss', less: 'less',
      json: 'json', jsonc: 'json',
      md: 'markdown', mdx: 'markdown',
      py: 'python', pyw: 'python',
      rb: 'ruby', go: 'go', rs: 'rust',
      cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
      c: 'c', h: 'c', hpp: 'cpp',
      java: 'java', kt: 'kotlin', swift: 'swift',
      php: 'php', cs: 'csharp', dart: 'dart',
      sh: 'shell', bash: 'shell', zsh: 'shell',
      ps1: 'powershell', yml: 'yaml', yaml: 'yaml',
      toml: 'ini', ini: 'ini', xml: 'xml',
      sql: 'sql', graphql: 'graphql', vue: 'html',
      r: 'r', lua: 'lua', perl: 'perl',
    };
    return langMap[ext] || 'plaintext';
  }

  function render() {
    const c = container();
    c.innerHTML = '';
    tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = 'tab' + (tab.id === activeTabId ? ' active' : '') + (tab.dirty ? ' dirty' : '');
      el.dataset.tabId = tab.id;
      el.title = tab.filePath || tab.label;
      el.innerHTML = `
        <span class="tab-icon">${getFileIcon(tab.filePath || '')}</span>
        <span class="tab-label">${tab.label}</span>
        <span class="tab-dirty-dot"></span>
        <span class="tab-close" title="Close">✕</span>
      `;
      el.addEventListener('click', e => {
        if (e.target.classList.contains('tab-close')) {
          closeTab(tab.id);
        } else {
          switchTab(tab.id);
        }
      });

      // Middle-click to close
      el.addEventListener('mousedown', e => {
        if (e.button === 1) { e.preventDefault(); closeTab(tab.id); }
      });

      c.appendChild(el);
    });
  }

  function openTab(filePath, content) {
    // Check if already open
    const existing = tabs.find(t => t.filePath === filePath);
    if (existing) {
      switchTab(existing.id);
      return existing.id;
    }

    const id = ++tabIdCounter;
    const label = filePath ? filePath.split(/[\\/]/).pop() : `Untitled-${id}`;
    const language = getLanguage(filePath || '');

    tabs.push({ id, filePath, label, dirty: false, viewState: null, language });
    render();
    switchTab(id, content);
    return id;
  }

  function switchTab(tabId, content) {
    // Save current editor view state
    if (activeTabId && window.EditorManager) {
      const curr = tabs.find(t => t.id === activeTabId);
      if (curr) curr.viewState = window.EditorManager.saveViewState();
    }

    activeTabId = tabId;
    render();

    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (window.EditorManager) {
      window.EditorManager.setContent(content !== undefined ? content : null, tab.language, tab.filePath);
      if (content === undefined && tab.viewState) {
        window.EditorManager.restoreViewState(tab.viewState);
      }
    }

    // Update status bar
    const statusLang = document.getElementById('status-lang');
    if (statusLang) statusLang.textContent = tab.language || '—';

    // Hide welcome, show editor
    const welcome = document.getElementById('welcome-screen');
    if (welcome) welcome.classList.add('hidden');

    // Update sidebar active file
    document.querySelectorAll('.tree-item').forEach(el => {
      el.classList.toggle('active-file', el.dataset.path === tab.filePath);
    });
  }

  function closeTab(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    if (tab.dirty) {
      const confirmed = window.confirm(`"${tab.label}" has unsaved changes. Close anyway?`);
      if (!confirmed) return;
    }

    const idx = tabs.findIndex(t => t.id === tabId);
    tabs.splice(idx, 1);

    if (tabs.length === 0) {
      activeTabId = null;
      if (window.EditorManager) window.EditorManager.setEmpty();
      const welcome = document.getElementById('welcome-screen');
      if (welcome) welcome.classList.remove('hidden');
      const statusLang = document.getElementById('status-lang');
      if (statusLang) statusLang.textContent = '—';
    } else if (activeTabId === tabId) {
      const newActive = tabs[Math.min(idx, tabs.length - 1)];
      switchTab(newActive.id);
    }

    render();
  }

  function closeAllTabs() {
    const dirtyTabs = tabs.filter(t => t.dirty);
    if (dirtyTabs.length > 0) {
      const confirmed = window.confirm(`${dirtyTabs.length} file(s) have unsaved changes. Close all anyway?`);
      if (!confirmed) return;
    }
    tabs = [];
    activeTabId = null;
    render();
    if (window.EditorManager) window.EditorManager.setEmpty();
    const welcome = document.getElementById('welcome-screen');
    if (welcome) welcome.classList.remove('hidden');
  }

  function markDirty(isDirty) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && tab.dirty !== isDirty) {
      tab.dirty = isDirty;
      render();
    }
  }

  function getActiveTab() {
    return tabs.find(t => t.id === activeTabId) || null;
  }

  function getAllTabs() { return [...tabs]; }

  return { openTab, switchTab, closeTab, closeAllTabs, markDirty, getActiveTab, getAllTabs, getLanguage, getFileIcon };
})();
