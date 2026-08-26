/**
 * editor.js — Monaco Editor setup & management
 */

window.EditorManager = (() => {
  let editor = null;
  let isReady = false;
  let pendingContent = null;

  const THEMES = {
    dark: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'cdd6f4', background: '1e1e2e' },
        { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
        { token: 'keyword', foreground: '89b4fa', fontStyle: 'bold' },
        { token: 'string', foreground: 'a6e3a1' },
        { token: 'number', foreground: 'fab387' },
        { token: 'type', foreground: 'f5c2e7' },
        { token: 'class', foreground: 'f9e2af' },
        { token: 'function', foreground: '89dceb' },
        { token: 'variable', foreground: 'cdd6f4' },
        { token: 'operator', foreground: '89dceb' },
        { token: 'delimiter', foreground: 'a6adc8' },
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editorLineNumber.foreground': '#45475a',
        'editorLineNumber.activeForeground': '#7c7f93',
        'editor.selectionBackground': '#363660',
        'editor.lineHighlightBackground': '#25253a',
        'editorCursor.foreground': '#8b5cf6',
        'editor.findMatchBackground': '#7c3aed50',
        'editor.findMatchHighlightBackground': '#7c3aed30',
        'editorWidget.background': '#252535',
        'editorWidget.border': '#3a3a55',
        'editorSuggestWidget.background': '#252535',
        'editorSuggestWidget.border': '#3a3a55',
        'editorSuggestWidget.selectedBackground': '#363652',
        'input.background': '#1e1e2e',
        'input.border': '#3a3a55',
        'scrollbarSlider.background': '#3a3a5540',
        'scrollbarSlider.hoverBackground': '#3a3a5580',
        'scrollbarSlider.activeBackground': '#7c3aed80',
        'editorGutter.background': '#1e1e2e',
        'minimap.background': '#181825',
      },
    },
    midnight: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'e2e8f7', background: '0a0e1a' },
        { token: 'comment', foreground: '4a5a80', fontStyle: 'italic' },
        { token: 'keyword', foreground: '60a5fa', fontStyle: 'bold' },
        { token: 'string', foreground: '86efac' },
        { token: 'number', foreground: 'fcd34d' },
        { token: 'type', foreground: 'c4b5fd' },
        { token: 'class', foreground: 'fde68a' },
        { token: 'function', foreground: '67e8f9' },
        { token: 'variable', foreground: 'e2e8f7' },
        { token: 'operator', foreground: '93c5fd' },
      ],
      colors: {
        'editor.background': '#0a0e1a',
        'editor.foreground': '#e2e8f7',
        'editorLineNumber.foreground': '#2a3a60',
        'editorLineNumber.activeForeground': '#4a5a80',
        'editor.selectionBackground': '#1f2d4d',
        'editor.lineHighlightBackground': '#0f1525',
        'editorCursor.foreground': '#60a5fa',
        'editorWidget.background': '#0f1525',
        'editorWidget.border': '#1e2d50',
        'editorSuggestWidget.background': '#0f1525',
        'editorSuggestWidget.border': '#1e2d50',
        'editor.findMatchBackground': '#3b82f650',
        'editor.findMatchHighlightBackground': '#3b82f630',
        'scrollbarSlider.background': '#1e2d5040',
        'minimap.background': '#070b16',
      },
    },
    light: {
      base: 'vs',
      inherit: true,
      rules: [
        { token: '', foreground: '2d3044', background: 'f8f9fc' },
        { token: 'comment', foreground: '8890a8', fontStyle: 'italic' },
        { token: 'keyword', foreground: '6d28d9', fontStyle: 'bold' },
        { token: 'string', foreground: '15803d' },
        { token: 'number', foreground: 'c2410c' },
        { token: 'type', foreground: '0e7490' },
        { token: 'class', foreground: '92400e' },
        { token: 'function', foreground: '0891b2' },
        { token: 'variable', foreground: '2d3044' },
        { token: 'operator', foreground: '0891b2' },
      ],
      colors: {
        'editor.background': '#f8f9fc',
        'editor.foreground': '#2d3044',
        'editorLineNumber.foreground': '#b8bcd0',
        'editorLineNumber.activeForeground': '#8890a8',
        'editor.selectionBackground': '#d8dae8',
        'editor.lineHighlightBackground': '#f0f1f5',
        'editorCursor.foreground': '#7c3aed',
        'editorWidget.background': '#f0f1f5',
        'editorWidget.border': '#d0d3e0',
        'minimap.background': '#ffffff',
      },
    },
  };

  let _onChangeCallback = null;
  let _onTabSwitchCallback = null;

  function init(onChangeCallback, onTabSwitchCallback) {
    _onChangeCallback = onChangeCallback || null;
    _onTabSwitchCallback = onTabSwitchCallback || null;

    require.config({
      paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
    });

    require(['vs/editor/editor.main'], () => {
      // Register all custom themes
      Object.entries(THEMES).forEach(([name, def]) => {
        monaco.editor.defineTheme('codex-' + name, def);
      });

      // Get current theme
      const currentTheme = document.body.dataset.theme || 'dark';

      editor = monaco.editor.create(document.getElementById('monaco-container'), {
        theme: 'codex-' + currentTheme,
        language: 'plaintext',
        fontFamily: "'JetBrains Mono', 'Consolas', monospace",
        fontSize: 14,
        lineHeight: 22,
        fontLigatures: true,
        minimap: { enabled: true, scale: 1 },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        cursorBlinking: 'phase',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        renderWhitespace: 'selection',
        padding: { top: 16, bottom: 16 },
        wordWrap: 'off',
        automaticLayout: true,
        formatOnPaste: true,
        suggest: { showColors: true, showFiles: true },
        quickSuggestions: { other: true, comments: false, strings: false },
        acceptSuggestionOnEnter: 'smart',
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: true,
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'mouseover',
        glyphMargin: true,
        lineNumbers: 'on',
        lineDecorationsWidth: 0,
        overviewRulerLanes: 3,
        hideCursorInOverviewRuler: false,
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
      });

      // Track cursor position in status bar
      editor.onDidChangeCursorPosition(e => {
        const pos = document.getElementById('status-position');
        if (pos) pos.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
      });

      // Track dirty state and call autosave hook
      editor.onDidChangeModelContent(() => {
        if (window.TabManager) window.TabManager.markDirty(true);
        if (_onChangeCallback) _onChangeCallback();
      });

      isReady = true;

      if (pendingContent !== null) {
        const { content, language, filePath } = pendingContent;
        pendingContent = null;
        setContent(content, language, filePath);
      }
    });
  }

  function setContent(content, language, filePath) {
    if (!isReady) {
      pendingContent = { content, language, filePath };
      return;
    }
    if (content === null) return; // switching tabs – content already in model

    const oldModel = editor.getModel();
    const uri = filePath
      ? monaco.Uri.file(filePath)
      : monaco.Uri.parse(`inmemory://model/${Date.now()}`);

    // Reuse existing model if same file
    let model = monaco.editor.getModel(uri);
    if (model) {
      model.setValue(content);
    } else {
      model = monaco.editor.createModel(content, language || 'plaintext', uri);
    }

    editor.setModel(model);

    // Dispose old model if it was inmemory
    if (oldModel && oldModel !== model && oldModel.uri.scheme === 'inmemory') {
      oldModel.dispose();
    }

    if (window.TabManager) window.TabManager.markDirty(false);

    // Notify breadcrumb / status bar
    if (_onTabSwitchCallback) _onTabSwitchCallback(filePath, language || 'plaintext');

    // Apply current settings
    if (window.SettingsManager) window.SettingsManager.applyToEditor();
  }

  function setEmpty() {
    if (!isReady) return;
    const oldModel = editor.getModel();
    editor.setModel(null);
    if (oldModel && oldModel.uri.scheme === 'inmemory') oldModel.dispose();
  }

  function saveViewState() {
    return isReady ? editor.saveViewState() : null;
  }

  function restoreViewState(state) {
    if (isReady && state) editor.restoreViewState(state);
  }

  function getContent() {
    if (!isReady || !editor.getModel()) return '';
    return editor.getValue();
  }

  function setTheme(themeName) {
    if (!isReady) return;
    monaco.editor.setTheme('codex-' + themeName);
  }

  function openFindReplace() {
    if (!isReady) return;
    editor.getAction('editor.action.startFindReplaceAction').run();
  }

  function focus() {
    if (isReady) editor.focus();
  }

  function getEditor() { return editor; }

  return { init, setContent, setEmpty, saveViewState, restoreViewState, getContent, setTheme, openFindReplace, focus, getEditor };
})();
