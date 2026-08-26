/**
 * search.js — Global file search across open folder
 */

window.SearchManager = (() => {
  let rootPath = null;
  let lastQuery = '';
  let caseSensitive = false;
  let wholeWord = false;
  let isSearching = false;
  let debounceTimer = null;

  function setRootPath(path) { rootPath = path; }

  // ── Debounced search trigger ──────────────────────────────────
  function onQueryChange() {
    const query = document.getElementById('global-search-input')?.value?.trim() || '';
    const clearBtn = document.getElementById('btn-clear-search-query');
    if (clearBtn) clearBtn.classList.toggle('hidden', !query);

    clearTimeout(debounceTimer);
    if (!query) { clearResults(); return; }
    debounceTimer = setTimeout(() => runSearch(query), 350);
  }

  // ── Run search via IPC ────────────────────────────────────────
  async function runSearch(query) {
    if (!rootPath) {
      showEmpty('Open a folder first');
      return;
    }
    if (isSearching) return;
    isSearching = true;
    lastQuery = query;

    const countEl = document.getElementById('search-results-count');
    if (countEl) { countEl.textContent = 'Searching…'; countEl.classList.remove('hidden'); }
    document.getElementById('search-empty')?.classList.add('hidden');
    document.getElementById('search-results').innerHTML = '';

    try {
      const results = await window.electronAPI.searchInFiles(rootPath, query, {
        caseSensitive,
        wholeWord,
        maxResults: 300,
      });
      renderResults(results, query);
    } catch (e) {
      showEmpty('Search error: ' + e.message);
    } finally {
      isSearching = false;
    }
  }

  // ── Render grouped results ────────────────────────────────────
  function renderResults(results, query) {
    const container = document.getElementById('search-results');
    const countEl = document.getElementById('search-results-count');
    const emptyEl = document.getElementById('search-empty');
    container.innerHTML = '';

    if (!results || results.length === 0) {
      countEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');

    // Group by file
    const grouped = {};
    results.forEach(r => {
      if (!grouped[r.file]) grouped[r.file] = [];
      grouped[r.file].push(r);
    });

    const fileCount = Object.keys(grouped).length;
    countEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} in ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    countEl.classList.remove('hidden');

    Object.entries(grouped).forEach(([filePath, matches]) => {
      const group = document.createElement('div');
      group.className = 'search-file-group';

      const fileName = filePath.split(/[\\/]/).pop();
      const fileIcon = window.TabManager ? window.TabManager.getFileIcon(filePath) : '📄';

      const header = document.createElement('div');
      header.className = 'search-file-header';
      header.innerHTML = `
        <span class="search-file-icon">${fileIcon}</span>
        <span class="search-file-name" title="${filePath}">${fileName}</span>
        <span class="search-match-count">${matches.length}</span>
      `;

      let childrenVisible = true;
      const childrenEl = document.createElement('div');
      childrenEl.className = 'search-file-children';

      header.addEventListener('click', () => {
        childrenVisible = !childrenVisible;
        childrenEl.style.display = childrenVisible ? '' : 'none';
      });

      matches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const highlightedText = highlightMatch(match.text, query, caseSensitive);
        item.innerHTML = `
          <span class="search-line-num">${match.line}</span>
          <span class="search-line-text">${highlightedText}</span>
        `;

        item.addEventListener('click', () => {
          openSearchResult(filePath, match.line, match.col, query);
        });

        childrenEl.appendChild(item);
      });

      group.appendChild(header);
      group.appendChild(childrenEl);
      container.appendChild(group);
    });
  }

  function highlightMatch(text, query, caseSensitive) {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const flags = caseSensitive ? 'g' : 'gi';
    const safeQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(safeQ, flags), m =>
      `<span class="search-highlight">${m}</span>`);
  }

  async function openSearchResult(filePath, line, col, query) {
    // Open file in editor
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) return;
    const tabId = window.TabManager.openTab(filePath, result.content);

    // Jump to line after editor is ready
    setTimeout(() => {
      if (window.EditorManager) {
        const ed = window.EditorManager.getEditor();
        if (ed) {
          ed.revealLineInCenter(line);
          ed.setPosition({ lineNumber: line, column: col || 1 });
          ed.focus();

          // Highlight the search term
          const model = ed.getModel();
          if (model && query) {
            ed.trigger('search', 'editor.action.setSearchString', { searchString: query });
          }
        }
      }
    }, 100);
  }

  function clearResults() {
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-results-count')?.classList.add('hidden');
    document.getElementById('search-empty')?.classList.add('hidden');
  }

  function showEmpty(msg) {
    const el = document.getElementById('search-empty');
    if (el) { el.querySelector('p').textContent = msg; el.classList.remove('hidden'); }
    document.getElementById('search-results-count')?.classList.add('hidden');
  }

  function toggleOption(type) {
    if (type === 'case') {
      caseSensitive = !caseSensitive;
      document.getElementById('gs-case')?.classList.toggle('active', caseSensitive);
    } else if (type === 'word') {
      wholeWord = !wholeWord;
      document.getElementById('gs-word')?.classList.toggle('active', wholeWord);
    }
    // Re-run search if there's a query
    const query = document.getElementById('global-search-input')?.value?.trim();
    if (query) runSearch(query);
  }

  function init() {
    document.getElementById('global-search-input')?.addEventListener('input', onQueryChange);
    document.getElementById('global-search-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) runSearch(q);
      }
      if (e.key === 'Escape') {
        e.target.value = '';
        clearResults();
      }
    });

    document.getElementById('btn-clear-search-query')?.addEventListener('click', () => {
      const input = document.getElementById('global-search-input');
      if (input) { input.value = ''; input.focus(); }
      document.getElementById('btn-clear-search-query')?.classList.add('hidden');
      clearResults();
    });

    document.getElementById('btn-clear-search-results')?.addEventListener('click', () => {
      const input = document.getElementById('global-search-input');
      if (input) input.value = '';
      clearResults();
    });

    document.getElementById('gs-case')?.addEventListener('click', () => toggleOption('case'));
    document.getElementById('gs-word')?.addEventListener('click', () => toggleOption('word'));
  }

  return { init, setRootPath, runSearch, clearResults };
})();
