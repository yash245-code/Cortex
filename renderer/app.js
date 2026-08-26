/**
 * app.js — Main application orchestrator (v2)
 * Wires all modules together, global keybindings, breadcrumb, git, zoom, autosave.
 */

window.App = (() => {
  let currentTheme = 'dark';
  let sidebarVisible = true;
  let zoomLevel = 0;

  // ── Notification System ──────────────────────────────────────
  function notify(type, message, duration = 3000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const note = document.createElement('div');
    note.className = `notification ${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    note.innerHTML = `<span style="font-weight:700">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(note);

    setTimeout(() => {
      note.style.opacity = '0';
      note.style.transform = 'translateX(20px)';
      note.style.transition = '0.3s ease';
      setTimeout(() => note.remove(), 300);
    }, duration);
  }

  // ── Theme ────────────────────────────────────────────────────
  function setTheme(theme) {
    currentTheme = theme;
    document.body.dataset.theme = theme;
    if (window.EditorManager) window.EditorManager.setTheme(theme);
    if (window.TerminalManager) window.TerminalManager.updateTheme();

    // Sync settings swatches
    document.querySelectorAll('.theme-swatch').forEach(s =>
      s.classList.toggle('active', s.dataset.theme === theme));

    // Sync View menu items
    document.querySelectorAll('[data-theme]').forEach(el =>
      el.classList.toggle('active-theme', el.dataset.theme === theme));
  }

  // ── Zoom ─────────────────────────────────────────────────────
  function zoom(delta) {
    zoomLevel = Math.max(-5, Math.min(10, zoomLevel + delta));
    const { webFrame } = require ? undefined : null;
    // Use CSS zoom instead
    const pct = 1 + (zoomLevel * 0.1);
    document.documentElement.style.setProperty('--zoom', pct);
    if (window.EditorManager) {
      const ed = window.EditorManager.getEditor();
      const base = window.SettingsManager ? window.SettingsManager.get('fontSize') : 14;
      if (ed) ed.updateOptions({ fontSize: Math.max(8, base + zoomLevel) });
    }
  }

  // ── Save ─────────────────────────────────────────────────────
  async function saveCurrentFile(silent = false) {
    const tab = window.TabManager.getActiveTab();
    if (!tab) { if (!silent) notify('info', 'Nothing to save'); return; }

    let filePath = tab.filePath;

    // If untitled, show Save As dialog
    if (!filePath) {
      filePath = await window.electronAPI.saveFile('untitled.txt');
      if (!filePath) return;
    }

    const content = window.EditorManager.getContent();
    const result = await window.electronAPI.writeFile(filePath, content);
    if (result.success) {
      window.TabManager.markDirty(false);
      if (!silent) notify('success', `Saved: ${tab.label}`);
    } else {
      notify('error', `Save failed: ${result.error}`);
    }
  }

  async function saveFileAs() {
    const tab = window.TabManager.getActiveTab();
    const defaultPath = tab?.filePath || 'untitled.txt';
    const filePath = await window.electronAPI.saveFile(defaultPath);
    if (!filePath) return;
    const content = window.EditorManager.getContent();
    const result = await window.electronAPI.writeFile(filePath, content);
    if (result.success) {
      window.TabManager.markDirty(false);
      notify('success', `Saved as: ${filePath.split(/[\\/]/).pop()}`);
    } else {
      notify('error', `Save failed: ${result.error}`);
    }
  }

  async function saveAllFiles() {
    const tabs = window.TabManager.getAllTabs().filter(t => t.dirty);
    if (tabs.length === 0) { notify('info', 'All files are saved'); return; }
    let saved = 0;
    for (const tab of tabs) {
      if (!tab.filePath) continue;
      try {
        const model = monaco.editor.getModel(monaco.Uri.file(tab.filePath));
        if (!model) continue;
        const result = await window.electronAPI.writeFile(tab.filePath, model.getValue());
        if (result.success) { saved++; }
      } catch {}
    }
    notify('success', `Saved ${saved} file${saved !== 1 ? 's' : ''}`);
  }

  // ── Breadcrumb ───────────────────────────────────────────────
  function updateBreadcrumb(filePath, language) {
    const bar = document.getElementById('breadcrumb-bar');
    const pathEl = document.getElementById('breadcrumb-path');
    const langEl = document.getElementById('breadcrumb-lang');
    const breadLang = document.getElementById('breadcrumb-lang');

    if (!filePath) {
      bar?.classList.add('hidden');
      return;
    }

    bar?.classList.remove('hidden');
    if (langEl) langEl.textContent = language || '—';
    if (breadLang) breadLang.textContent = language || '—';

    // Build path parts
    const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
    pathEl.innerHTML = parts.map((part, i) => {
      const isLast = i === parts.length - 1;
      return `<span class="breadcrumb-part">${part}</span>` +
        (isLast ? '' : `<span class="breadcrumb-sep">›</span>`);
    }).join('');

    // Update status bar lang
    const statusLang = document.getElementById('status-lang');
    if (statusLang) statusLang.textContent = language || '—';
  }

  // ── Git Info ─────────────────────────────────────────────────
  let gitRefreshTimer = null;
  async function refreshGit(rootPath) {
    if (!rootPath) return;

    const branchResult = await window.electronAPI.gitGetBranch(rootPath);
    const branchEl = document.getElementById('status-branch');
    const branchName = document.getElementById('status-branch-name');

    if (branchResult.success) {
      if (branchEl) branchEl.classList.remove('hidden');
      if (branchName) branchName.textContent = branchResult.branch;
    } else {
      if (branchEl) branchEl.classList.add('hidden');
    }

    // Git status for panel
    const statusResult = await window.electronAPI.gitGetStatus(rootPath);
    const badge = document.getElementById('git-badge');
    const noRepo = document.getElementById('git-no-repo');
    const changesEl = document.getElementById('git-changes');
    const filesList = document.getElementById('git-files-list');

    if (statusResult.success) {
      const files = statusResult.files;
      if (badge) {
        badge.textContent = files.length;
        badge.classList.toggle('hidden', files.length === 0);
      }

      if (noRepo) noRepo.classList.add('hidden');
      if (changesEl) changesEl.classList.remove('hidden');
      if (filesList) {
        filesList.innerHTML = files.map(f => {
          const statusClass = `git-status-${f.status[0] || '?'}`;
          return `
            <div class="git-file-item" title="${f.file}">
              <span class="git-status-badge ${statusClass}">${f.status}</span>
              <span>${f.file.split('/').pop()}</span>
            </div>
          `;
        }).join('') || '<div style="padding:8px 14px;font-size:12px;color:var(--text-muted)">No changes</div>';
      }
    } else {
      if (badge) badge.classList.add('hidden');
      if (noRepo) noRepo.classList.remove('hidden');
      if (changesEl) changesEl.classList.add('hidden');
    }
  }

  // ── Sidebar Toggle ───────────────────────────────────────────
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebarVisible = !sidebarVisible;
    sidebar.classList.toggle('collapsed', !sidebarVisible);
    setTimeout(() => window.EditorManager?.getEditor()?.layout(), 150);
  }

  // ── Menu Bar ─────────────────────────────────────────────────
  function initMenuBar() {
    const menus = [
      { btn: 'menu-file', dropdown: 'dropdown-file' },
      { btn: 'menu-edit', dropdown: 'dropdown-edit' },
      { btn: 'menu-view', dropdown: 'dropdown-view' },
      { btn: 'menu-help', dropdown: 'dropdown-help' },
    ];

    menus.forEach(({ btn, dropdown }) => {
      const btnEl = document.getElementById(btn);
      const ddEl  = document.getElementById(dropdown);
      if (!btnEl || !ddEl) return;

      btnEl.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = ddEl.classList.contains('open');
        closeAllMenus();
        if (!isOpen) {
          ddEl.classList.add('open');
          btnEl.classList.add('open');
          const rect = btnEl.getBoundingClientRect();
          ddEl.style.left = `${rect.left}px`;
          ddEl.style.top  = `${rect.bottom}px`;
        }
      });
    });

    document.addEventListener('click', closeAllMenus);
    document.addEventListener('contextmenu', e => {
      if (!e.target.closest('#file-tree')) closeAllMenus();
    });
  }

  function closeAllMenus() {
    document.querySelectorAll('.menu-dropdown.open').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.menu-item.open').forEach(b => b.classList.remove('open'));
  }

  // ── Keybindings ──────────────────────────────────────────────
  function initKeybindings() {
    document.addEventListener('keydown', async e => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl && !e.altKey && e.key !== 'F1' && e.key !== 'Escape') return;

      // Ctrl+S Save
      if (ctrl && !e.shiftKey && !e.altKey && e.key === 's') {
        e.preventDefault(); await saveCurrentFile();
      }
      // Ctrl+Shift+S Save As
      if (ctrl && e.shiftKey && e.key === 'S') {
        e.preventDefault(); await saveFileAs();
      }
      // Ctrl+Alt+S Save All
      if (ctrl && e.altKey && e.key === 's') {
        e.preventDefault(); await saveAllFiles();
      }
      // Ctrl+O Open File
      if (ctrl && !e.shiftKey && e.key === 'o') {
        e.preventDefault();
        const paths = await window.electronAPI.openFile();
        if (paths) paths.forEach(p => window.SidebarManager.openFile(p));
      }
      // Ctrl+Shift+O Open Folder
      if (ctrl && e.shiftKey && e.key === 'O') {
        e.preventDefault(); window.SidebarManager.openFolder();
      }
      // Ctrl+N New File
      if (ctrl && !e.shiftKey && e.key === 'n') {
        e.preventDefault(); newUntitledFile();
      }
      // Ctrl+W Close Tab
      if (ctrl && e.key === 'w') {
        e.preventDefault();
        const tab = window.TabManager.getActiveTab();
        if (tab) window.TabManager.closeTab(tab.id);
      }
      // Ctrl+H Find & Replace
      if (ctrl && e.key === 'h') {
        e.preventDefault(); window.FindReplaceManager.toggle();
      }
      // Ctrl+F Find in file
      if (ctrl && !e.shiftKey && e.key === 'f') {
        e.preventDefault();
        if (window.EditorManager) {
          const ed = window.EditorManager.getEditor();
          if (ed) ed.trigger('keyboard', 'actions.find', null);
        }
      }
      // Ctrl+Shift+F Global Search
      if (ctrl && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        window.SidebarManager.showPanel('search');
        setTimeout(() => document.getElementById('global-search-input')?.focus(), 50);
      }
      // Ctrl+` Terminal
      if (ctrl && e.key === '`') {
        e.preventDefault(); window.TerminalManager.toggle();
      }
      // Ctrl+B Sidebar
      if (ctrl && e.key === 'b') {
        e.preventDefault(); toggleSidebar();
      }
      // Ctrl+, Settings
      if (ctrl && e.key === ',') {
        e.preventDefault(); window.SidebarManager.showPanel('settings');
      }
      // Ctrl+= Zoom in
      if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault(); zoom(1);
      }
      // Ctrl+- Zoom out
      if (ctrl && e.key === '-') {
        e.preventDefault(); zoom(-1);
      }
      // Alt+Z Word Wrap toggle
      if (e.altKey && e.key === 'z') {
        e.preventDefault();
        const cb = document.getElementById('setting-wordwrap');
        if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
      }
      // Shift+Alt+F Format
      if (e.shiftKey && e.altKey && e.key === 'F') {
        e.preventDefault();
        if (window.EditorManager) {
          const ed = window.EditorManager.getEditor();
          if (ed) ed.getAction('editor.action.formatDocument')?.run();
        }
      }
      // Ctrl+/ Toggle comment
      if (ctrl && e.key === '/') {
        e.preventDefault();
        if (window.EditorManager) {
          const ed = window.EditorManager.getEditor();
          if (ed) ed.getAction('editor.action.commentLine')?.run();
        }
      }
      // F1 Command palette
      if (e.key === 'F1') {
        e.preventDefault();
        if (window.EditorManager) {
          const ed = window.EditorManager.getEditor();
          if (ed) ed.trigger('keyboard', 'editor.action.quickCommand', null);
        }
      }
      // Escape
      if (e.key === 'Escape') {
        closeAllMenus();
        document.getElementById('shortcuts-overlay')?.classList.add('hidden');
        document.getElementById('about-overlay')?.classList.add('hidden');
      }
    });
  }

  // ── New Untitled File ────────────────────────────────────────
  function newUntitledFile() {
    window.TabManager.openTab(null, '');
    const welcome = document.getElementById('welcome-screen');
    if (welcome) welcome.classList.add('hidden');
  }

  // ── Wire All Events ──────────────────────────────────────────
  function initEvents() {
    // Window controls
    document.getElementById('btn-minimize')?.addEventListener('click', () =>
      window.electronAPI.windowMinimize());
    document.getElementById('btn-maximize')?.addEventListener('click', () =>
      window.electronAPI.windowMaximize());
    document.getElementById('btn-close')?.addEventListener('click', () =>
      window.electronAPI.windowClose());

    // ── File Menu ──────────────────────────────────────────────
    document.getElementById('action-open-folder')?.addEventListener('click', () => {
      closeAllMenus(); window.SidebarManager.openFolder();
    });
    document.getElementById('action-open-file')?.addEventListener('click', async () => {
      closeAllMenus();
      const paths = await window.electronAPI.openFile();
      if (paths) paths.forEach(p => window.SidebarManager.openFile(p));
    });
    document.getElementById('action-new-file')?.addEventListener('click', () => {
      closeAllMenus(); newUntitledFile();
    });
    document.getElementById('action-save')?.addEventListener('click', () => {
      closeAllMenus(); saveCurrentFile();
    });
    document.getElementById('action-save-as')?.addEventListener('click', () => {
      closeAllMenus(); saveFileAs();
    });
    document.getElementById('action-save-all')?.addEventListener('click', () => {
      closeAllMenus(); saveAllFiles();
    });
    document.getElementById('action-close-file')?.addEventListener('click', () => {
      closeAllMenus();
      const tab = window.TabManager.getActiveTab();
      if (tab) window.TabManager.closeTab(tab.id);
    });

    // ── Edit Menu ──────────────────────────────────────────────
    document.getElementById('action-find-replace')?.addEventListener('click', () => {
      closeAllMenus(); window.FindReplaceManager.toggle();
    });
    document.getElementById('action-find')?.addEventListener('click', () => {
      closeAllMenus();
      const ed = window.EditorManager?.getEditor();
      if (ed) ed.trigger('keyboard', 'actions.find', null);
    });
    document.getElementById('action-command-palette')?.addEventListener('click', () => {
      closeAllMenus();
      const ed = window.EditorManager?.getEditor();
      if (ed) ed.trigger('keyboard', 'editor.action.quickCommand', null);
    });
    document.getElementById('action-format')?.addEventListener('click', () => {
      closeAllMenus();
      const ed = window.EditorManager?.getEditor();
      if (ed) ed.getAction('editor.action.formatDocument')?.run();
    });
    document.getElementById('action-toggle-comment')?.addEventListener('click', () => {
      closeAllMenus();
      const ed = window.EditorManager?.getEditor();
      if (ed) ed.getAction('editor.action.commentLine')?.run();
    });

    // ── View Menu ──────────────────────────────────────────────
    document.getElementById('action-toggle-sidebar')?.addEventListener('click', () => {
      closeAllMenus(); toggleSidebar();
    });
    document.getElementById('action-toggle-terminal')?.addEventListener('click', () => {
      closeAllMenus(); window.TerminalManager.toggle();
    });
    document.getElementById('action-toggle-minimap')?.addEventListener('click', () => {
      closeAllMenus();
      const cb = document.getElementById('setting-minimap');
      if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
    });
    document.getElementById('action-toggle-wordwrap')?.addEventListener('click', () => {
      closeAllMenus();
      const cb = document.getElementById('setting-wordwrap');
      if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
    });
    document.getElementById('action-zoom-in')?.addEventListener('click', () => {
      closeAllMenus(); zoom(1);
    });
    document.getElementById('action-zoom-out')?.addEventListener('click', () => {
      closeAllMenus(); zoom(-1);
    });
    document.getElementById('action-open-settings')?.addEventListener('click', () => {
      closeAllMenus(); window.SidebarManager.showPanel('settings');
    });
    ['dark', 'midnight', 'light'].forEach(t => {
      document.getElementById(`theme-${t}`)?.addEventListener('click', () => {
        closeAllMenus(); setTheme(t);
      });
    });

    // ── Help Menu ──────────────────────────────────────────────
    document.getElementById('action-show-shortcuts')?.addEventListener('click', () => {
      closeAllMenus();
      document.getElementById('shortcuts-overlay').classList.remove('hidden');
    });
    document.getElementById('action-about')?.addEventListener('click', () => {
      closeAllMenus();
      document.getElementById('about-overlay').classList.remove('hidden');
    });
    document.getElementById('btn-close-shortcuts')?.addEventListener('click', () =>
      document.getElementById('shortcuts-overlay').classList.add('hidden'));
    document.getElementById('btn-close-about')?.addEventListener('click', () =>
      document.getElementById('about-overlay').classList.add('hidden'));

    // Close overlays on backdrop click
    document.getElementById('shortcuts-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });
    document.getElementById('about-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });

    // ── Activity Bar ──────────────────────────────────────────
    document.getElementById('act-explorer')?.addEventListener('click', () =>
      window.SidebarManager.showPanel('explorer'));
    document.getElementById('act-search')?.addEventListener('click', () => {
      window.SidebarManager.showPanel('search');
      setTimeout(() => document.getElementById('global-search-input')?.focus(), 50);
    });
    document.getElementById('act-git')?.addEventListener('click', () =>
      window.SidebarManager.showPanel('git'));
    document.getElementById('act-settings')?.addEventListener('click', () =>
      window.SidebarManager.showPanel('settings'));

    // ── Sidebar File Actions ───────────────────────────────────
    document.getElementById('btn-open-folder')?.addEventListener('click', () =>
      window.SidebarManager.openFolder());
    document.getElementById('btn-open-folder-empty')?.addEventListener('click', () =>
      window.SidebarManager.openFolder());
    document.getElementById('btn-new-file')?.addEventListener('click', () =>
      window.SidebarManager.createNewFile());
    document.getElementById('btn-new-folder')?.addEventListener('click', () =>
      window.SidebarManager.createNewFolder());
    document.getElementById('btn-refresh-tree')?.addEventListener('click', () =>
      window.SidebarManager.refreshTree());
    document.getElementById('btn-collapse-tree')?.addEventListener('click', () =>
      window.SidebarManager.collapseAll());

    // ── Tab Bar ───────────────────────────────────────────────
    document.getElementById('btn-close-all-tabs')?.addEventListener('click', () =>
      window.TabManager.closeAllTabs());
    document.getElementById('btn-split-editor')?.addEventListener('click', () =>
      notify('info', 'Split editor coming soon!'));

    // ── Terminal ──────────────────────────────────────────────
    document.getElementById('btn-close-terminal')?.addEventListener('click', () =>
      window.TerminalManager.hide());
    document.getElementById('btn-clear-terminal')?.addEventListener('click', () =>
      window.TerminalManager.clear());

    // ── Welcome ───────────────────────────────────────────────
    document.getElementById('welcome-open-folder')?.addEventListener('click', () =>
      window.SidebarManager.openFolder());
    document.getElementById('welcome-open-file')?.addEventListener('click', async () => {
      const paths = await window.electronAPI.openFile();
      if (paths) paths.forEach(p => window.SidebarManager.openFile(p));
    });
    document.getElementById('welcome-new-file')?.addEventListener('click', newUntitledFile);

    // ── Context Menu ──────────────────────────────────────────
    document.getElementById('ctx-open')?.addEventListener('click', () =>
      window.SidebarManager.handleCtxOpen());
    document.getElementById('ctx-new-file')?.addEventListener('click', () => {
      window.SidebarManager.hideContextMenu();
      window.SidebarManager.createNewFile();
    });
    document.getElementById('ctx-new-folder')?.addEventListener('click', () => {
      window.SidebarManager.hideContextMenu();
      window.SidebarManager.createNewFolder();
    });
    document.getElementById('ctx-rename')?.addEventListener('click', () =>
      window.SidebarManager.handleCtxRename());
    document.getElementById('ctx-copy-path')?.addEventListener('click', () => {
      const target = window.SidebarManager.getContextTarget();
      if (target) {
        navigator.clipboard.writeText(target.path);
        notify('success', 'Path copied!');
      }
      window.SidebarManager.hideContextMenu();
    });
    document.getElementById('ctx-delete')?.addEventListener('click', () =>
      window.SidebarManager.handleCtxDelete());
    document.addEventListener('click', e => {
      if (!e.target.closest('#context-menu')) window.SidebarManager.hideContextMenu();
    });

    // ── Git Refresh ───────────────────────────────────────────
    document.getElementById('btn-git-refresh')?.addEventListener('click', () => {
      const root = window.SidebarManager.getRootPath();
      if (root) refreshGit(root);
    });

    // ── Status bar interactions ───────────────────────────────
    document.getElementById('status-lang')?.addEventListener('click', () => {
      const ed = window.EditorManager?.getEditor();
      if (ed) ed.trigger('keyboard', 'editor.action.changeLanguageMode', null);
    });
    document.getElementById('status-position')?.addEventListener('click', () => {
      const ed = window.EditorManager?.getEditor();
      if (ed) ed.trigger('keyboard', 'editor.action.gotoLine', null);
    });
  }

  // ── Editor change hook (for autosave & breadcrumb) ──────────
  function onEditorChange() {
    if (window.SettingsManager) window.SettingsManager.scheduleAutoSave();
  }

  function onTabSwitch(filePath, language) {
    updateBreadcrumb(filePath, language);
  }

  // ── Boot ─────────────────────────────────────────────────────
  function boot() {
    initMenuBar();
    initKeybindings();
    initEvents();

    // Init all modules in order
    window.SettingsManager.init();
    window.EditorManager.init(onEditorChange, onTabSwitch);
    window.SidebarManager.initResize();
    window.TerminalManager.initResizeHandle();
    window.FindReplaceManager.init();
    window.SearchManager.init();
    window.RunnerManager.init();

    // Welcome notification
    setTimeout(() => notify('info', '👋 Welcome to Codex Editor!', 2500), 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  return {
    notify,
    setTheme,
    toggleSidebar,
    saveCurrentFile,
    refreshGit,
    onTabSwitch,
    updateBreadcrumb,
  };
})();
