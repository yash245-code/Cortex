/**
 * findreplace.js — Find & Replace panel
 */

window.FindReplaceManager = (() => {
  let isCaseSensitive = false;
  let isWholeWord = false;
  let isRegex = false;

  function toggle() {
    const overlay = document.getElementById('find-replace-overlay');
    const isHidden = overlay.classList.contains('hidden');
    if (isHidden) {
      open();
    } else {
      close();
    }
  }

  function open() {
    const overlay = document.getElementById('find-replace-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('fr-find-input').focus();
    document.getElementById('fr-find-input').select();
  }

  function close() {
    document.getElementById('find-replace-overlay').classList.add('hidden');
    // Clear Monaco search decorations
    if (window.EditorManager && window.EditorManager.getEditor()) {
      window.EditorManager.getEditor().trigger('keyboard', 'closeFindWidget', null);
    }
    if (window.EditorManager) window.EditorManager.focus();
  }

  function getFindOptions() {
    return {
      searchString: document.getElementById('fr-find-input').value,
      replaceString: document.getElementById('fr-replace-input').value,
      isRegex,
      matchCase: isCaseSensitive,
      wordSeparators: isWholeWord ? '~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?' : null,
      wholeWord: isWholeWord,
    };
  }

  function findNext() {
    const query = document.getElementById('fr-find-input').value;
    if (!query || !window.EditorManager) return;
    const editor = window.EditorManager.getEditor();
    if (!editor) return;

    editor.trigger('keyboard', 'editor.action.nextMatchFindAction', null);
  }

  function findPrev() {
    const query = document.getElementById('fr-find-input').value;
    if (!query || !window.EditorManager) return;
    const editor = window.EditorManager.getEditor();
    if (!editor) return;

    editor.trigger('keyboard', 'editor.action.previousMatchFindAction', null);
  }

  function replaceOne() {
    const editor = window.EditorManager && window.EditorManager.getEditor();
    if (!editor) return;
    editor.trigger('keyboard', 'editor.action.replaceOne', null);
  }

  function replaceAll() {
    const editor = window.EditorManager && window.EditorManager.getEditor();
    if (!editor) return;
    editor.trigger('keyboard', 'editor.action.replaceAll', null);
  }

  function syncToMonaco() {
    const query = document.getElementById('fr-find-input').value;
    if (!query || !window.EditorManager) return;
    const editor = window.EditorManager.getEditor();
    if (!editor) return;

    // Open Monaco's built-in find widget with our options
    editor.trigger('keyboard', 'actions.find', null);
  }

  function toggleOption(type) {
    if (type === 'case') {
      isCaseSensitive = !isCaseSensitive;
      document.getElementById('fr-case').classList.toggle('active', isCaseSensitive);
    } else if (type === 'word') {
      isWholeWord = !isWholeWord;
      document.getElementById('fr-word').classList.toggle('active', isWholeWord);
    } else if (type === 'regex') {
      isRegex = !isRegex;
      document.getElementById('fr-regex').classList.toggle('active', isRegex);
    }
  }

  function init() {
    document.getElementById('btn-close-fr').addEventListener('click', close);
    document.getElementById('fr-close-widget').addEventListener('click', close);
    document.getElementById('fr-find-next').addEventListener('click', findNext);
    document.getElementById('fr-find-prev').addEventListener('click', findPrev);
    document.getElementById('fr-replace-one').addEventListener('click', replaceOne);
    document.getElementById('fr-replace-all').addEventListener('click', replaceAll);

    document.getElementById('fr-case').addEventListener('click', () => toggleOption('case'));
    document.getElementById('fr-word').addEventListener('click', () => toggleOption('word'));
    document.getElementById('fr-regex').addEventListener('click', () => toggleOption('regex'));

    // Keyboard shortcuts within panel
    document.getElementById('fr-find-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.shiftKey ? findPrev() : findNext();
        syncToMonaco();
      }
      if (e.key === 'Escape') close();
    });

    document.getElementById('fr-replace-input').addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });

    // Make panel draggable
    const panel = document.getElementById('find-replace-panel');
    const header = panel.querySelector('.fr-header');
    let isDragging = false, dragOffsetX, dragOffsetY;

    header.addEventListener('mousedown', e => {
      if (e.target.closest('.icon-btn')) return;
      isDragging = true;
      const overlay = document.getElementById('find-replace-overlay');
      const rect = overlay.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const overlay = document.getElementById('find-replace-overlay');
      overlay.style.left = `${e.clientX - dragOffsetX}px`;
      overlay.style.top  = `${e.clientY - dragOffsetY}px`;
      overlay.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });
  }

  return { init, open, close, toggle };
})();
