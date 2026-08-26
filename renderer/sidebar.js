/**
 * sidebar.js — File tree / sidebar management
 */

window.SidebarManager = (() => {
  let rootPath = null;
  let contextTarget = null; // { path, isDirectory }

  function getRootPath() { return rootPath; }
  function getContextTarget() { return contextTarget; }

  // ── File Tree ────────────────────────────────────────────────

  async function openFolder(folderPath) {
    if (!folderPath) {
      folderPath = await window.electronAPI.openFolder();
    }
    if (!folderPath) return;

    rootPath = folderPath;
    const rootName = folderPath.split(/[\/\\]/).pop().toUpperCase();
    const rootLabel = document.getElementById('explorer-root-name');
    if (rootLabel) rootLabel.textContent = rootName;

    document.getElementById('no-folder-msg').classList.add('hidden');
    document.getElementById('file-tree').classList.remove('hidden');

    // Update search root
    if (window.SearchManager) window.SearchManager.setRootPath(folderPath);

    // Refresh git info
    if (window.App) window.App.refreshGit(folderPath);

    await refreshTree();
  }

  async function refreshTree() {
    if (!rootPath) return;
    const entries = await window.electronAPI.readDir(rootPath);
    renderTree(entries, document.getElementById('file-tree'), rootPath, 0);
  }

  function renderTree(entries, container, parentPath, depth) {
    container.innerHTML = '';
    entries.forEach(entry => renderEntry(entry, container, depth));
  }

  function renderEntry(entry, container, depth) {
    const item = document.createElement('div');
    item.className = 'tree-item';
    item.dataset.path = entry.path;
    item.dataset.isDir = entry.isDirectory ? 'true' : 'false';
    item.style.paddingLeft = `${12 + depth * 16}px`;

    if (entry.isDirectory) {
      const chevron = document.createElement('span');
      chevron.className = 'tree-chevron';
      chevron.textContent = '›';

      const icon = document.createElement('span');
      icon.className = 'tree-icon';
      icon.textContent = '📁';

      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = entry.name;

      item.append(chevron, icon, label);

      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-children';

      item.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = childrenContainer.classList.contains('open');
        if (isOpen) {
          childrenContainer.classList.remove('open');
          chevron.classList.remove('open');
          icon.textContent = '📁';
        } else {
          childrenContainer.classList.add('open');
          chevron.classList.add('open');
          icon.textContent = '📂';
          if (childrenContainer.innerHTML === '') {
            renderTree(entry.children || [], childrenContainer, entry.path, depth + 1);
          }
        }
        selectItem(item);
      });

      container.appendChild(item);
      container.appendChild(childrenContainer);
    } else {
      const icon = document.createElement('span');
      icon.className = 'tree-icon';
      icon.textContent = window.TabManager ? window.TabManager.getFileIcon(entry.path) : '📄';

      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = entry.name;

      item.append(icon, label);

      item.addEventListener('click', e => {
        e.stopPropagation();
        selectItem(item);
        openFile(entry.path);
      });

      container.appendChild(item);
    }

    // Right-click context menu
    item.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      selectItem(item);
      showContextMenu(e.clientX, e.clientY, { path: entry.path, isDirectory: entry.isDirectory });
    });
  }

  function selectItem(el) {
    document.querySelectorAll('.tree-item.selected').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
  }

  async function openFile(filePath) {
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) {
      showNotification('error', `Failed to open: ${result.error}`);
      return;
    }
    window.TabManager.openTab(filePath, result.content);

    // Mark active in tree
    document.querySelectorAll('.tree-item').forEach(el => {
      el.classList.toggle('active-file', el.dataset.path === filePath);
    });
  }

  // ── Context Menu ─────────────────────────────────────────────

  function showContextMenu(x, y, target) {
    contextTarget = target;
    const menu = document.getElementById('context-menu');
    menu.classList.remove('hidden');
    menu.style.left = `${Math.min(x, window.innerWidth - 180)}px`;
    menu.style.top  = `${Math.min(y, window.innerHeight - 120)}px`;
  }

  function hideContextMenu() {
    document.getElementById('context-menu').classList.add('hidden');
    contextTarget = null;
  }

  async function handleCtxOpen() {
    if (!contextTarget) return;
    hideContextMenu();
    if (!contextTarget.isDirectory) await openFile(contextTarget.path);
  }

  async function handleCtxRename() {
    if (!contextTarget) return;
    hideContextMenu();
    const target = contextTarget;

    // Inline rename
    const item = document.querySelector(`.tree-item[data-path="${CSS.escape(target.path)}"]`);
    if (!item) return;

    const label = item.querySelector('.tree-label');
    const oldName = label.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.className = 'tree-rename-input';
    label.replaceWith(input);
    input.focus();
    input.select();

    const finish = async (save) => {
      const newName = input.value.trim();
      input.replaceWith(label);
      if (!save || !newName || newName === oldName) return;

      const dir = target.path.replace(/[\\/][^\\/]+$/, '');
      const newPath = dir + '/' + newName;
      const result = await window.electronAPI.renameEntry(target.path, newPath);
      if (result.success) {
        await refreshTree();
        showNotification('success', `Renamed to "${newName}"`);
      } else {
        showNotification('error', `Rename failed: ${result.error}`);
      }
    };

    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
  }

  async function handleCtxDelete() {
    if (!contextTarget) return;
    const target = contextTarget;
    hideContextMenu();

    const name = target.path.split(/[\\/]/).pop();
    const confirmed = window.confirm(`Delete "${name}"? This cannot be undone.`);
    if (!confirmed) return;

    const result = await window.electronAPI.deleteEntry(target.path);
    if (result.success) {
      await refreshTree();
      showNotification('success', `Deleted "${name}"`);
    } else {
      showNotification('error', `Delete failed: ${result.error}`);
    }
  }

  // ── New File / Folder ────────────────────────────────────────

  async function createNewFile() {
    if (!rootPath) { showNotification('info', 'Open a folder first'); return; }
    const name = window.prompt('New file name:');
    if (!name) return;

    // Try to create in selected folder or root
    const selected = document.querySelector('.tree-item.selected');
    const dir = selected && selected.dataset.isDir === 'true'
      ? selected.dataset.path
      : rootPath;

    const filePath = dir + '/' + name;
    const result = await window.electronAPI.createFile(filePath);
    if (result.success) {
      await refreshTree();
      openFile(filePath);
    } else {
      showNotification('error', `Failed: ${result.error}`);
    }
  }

  async function createNewFolder() {
    if (!rootPath) { showNotification('info', 'Open a folder first'); return; }
    const name = window.prompt('New folder name:');
    if (!name) return;

    const selected = document.querySelector('.tree-item.selected');
    const dir = selected && selected.dataset.isDir === 'true'
      ? selected.dataset.path
      : rootPath;

    const dirPath = dir + '/' + name;
    const result = await window.electronAPI.createDir(dirPath);
    if (result.success) {
      await refreshTree();
      showNotification('success', `Folder "${name}" created`);
    } else {
      showNotification('error', `Failed: ${result.error}`);
    }
  }

  // ── Panel Switching ──────────────────────────────────────────

  function collapseAll() {
    document.querySelectorAll('.tree-children.open').forEach(el => {
      el.classList.remove('open');
    });
    document.querySelectorAll('.tree-chevron.open').forEach(el => {
      el.classList.remove('open');
    });
    document.querySelectorAll('.tree-icon').forEach(el => {
      if (el.textContent === '📂') el.textContent = '📁';
    });
  }

  function showPanel(panelId) {
    document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.activity-btn').forEach(b => b.classList.remove('active'));

    // Make sidebar visible if collapsed
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      window.App && window.App.toggleSidebar && (() => {})(); // just ensure visible
    }

    const panel = document.getElementById('panel-' + panelId);
    if (panel) panel.classList.add('active');

    // Map panel IDs to activity button IDs
    const actMap = { explorer: 'act-explorer', search: 'act-search', git: 'act-git', settings: 'act-settings' };
    const btnId = actMap[panelId] || ('act-' + panelId);
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');
  }

  // ── Sidebar Resize ───────────────────────────────────────────

  function initResize() {
    const handle = document.getElementById('sidebar-resize-handle');
    const sidebar = document.getElementById('sidebar');
    let startX, startWidth;

    handle.addEventListener('mousedown', e => {
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = e => {
        const w = Math.max(160, Math.min(600, startWidth + e.clientX - startX));
        sidebar.style.width = w + 'px';
        sidebar.style.setProperty('--sidebar-width-override', w + 'px');
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

  // ── Notification helper ───────────────────────────────────────
  function showNotification(type, message) {
    if (window.App && window.App.notify) {
      window.App.notify(type, message);
    }
  }

  return {
    openFolder,
    refreshTree,
    openFile,
    createNewFile,
    createNewFolder,
    collapseAll,
    showPanel,
    initResize,
    showContextMenu,
    hideContextMenu,
    handleCtxOpen,
    handleCtxRename,
    handleCtxDelete,
    getRootPath,
    getContextTarget,
  };
})();
