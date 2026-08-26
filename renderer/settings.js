/**
 * settings.js — Editor settings panel & auto-save management
 */

window.SettingsManager = (() => {
  const defaults = {
    fontSize: 14,
    tabSize: 2,
    wordWrap: false,
    minimap: true,
    lineNumbers: true,
    ligatures: true,
    autoSave: false,
    autoSaveDelay: 1000,
  };

  let current = { ...defaults };
  let autoSaveTimer = null;

  // ── Load / Save from localStorage ─────────────────────────────
  function load() {
    try {
      const saved = localStorage.getItem('codex-settings');
      if (saved) current = { ...defaults, ...JSON.parse(saved) };
    } catch {}
    applyToUI();
  }

  function save() {
    try { localStorage.setItem('codex-settings', JSON.stringify(current)); } catch {}
  }

  // ── Apply to Monaco editor ─────────────────────────────────────
  function applyToEditor() {
    if (!window.EditorManager) return;
    const ed = window.EditorManager.getEditor();
    if (!ed) return;

    ed.updateOptions({
      fontSize: current.fontSize,
      tabSize: current.tabSize,
      wordWrap: current.wordWrap ? 'on' : 'off',
      minimap: { enabled: current.minimap },
      lineNumbers: current.lineNumbers ? 'on' : 'off',
      fontLigatures: current.ligatures,
    });
  }

  // ── Apply to UI controls ───────────────────────────────────────
  function applyToUI() {
    const fs = document.getElementById('font-size-value');
    const ts = document.getElementById('tab-size-value');
    const ad = document.getElementById('autosave-delay-value');
    if (fs) fs.textContent = current.fontSize;
    if (ts) ts.textContent = current.tabSize;
    if (ad) ad.textContent = current.autoSaveDelay;

    const ww = document.getElementById('setting-wordwrap');
    const mm = document.getElementById('setting-minimap');
    const ln = document.getElementById('setting-linenumbers');
    const lg = document.getElementById('setting-ligatures');
    const as = document.getElementById('setting-autosave');
    if (ww) ww.checked = current.wordWrap;
    if (mm) mm.checked = current.minimap;
    if (ln) ln.checked = current.lineNumbers;
    if (lg) lg.checked = current.ligatures;
    if (as) as.checked = current.autoSave;

    // Update theme swatches
    document.querySelectorAll('.theme-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.theme === document.body.dataset.theme);
    });

    updateAutoSaveStatus();
  }

  // ── Auto-save ──────────────────────────────────────────────────
  function scheduleAutoSave() {
    if (!current.autoSave) return;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      if (window.App) await window.App.saveCurrentFile(true); // silent save
    }, current.autoSaveDelay);
  }

  function updateAutoSaveStatus() {
    const indicator = document.getElementById('autosave-indicator');
    const statusLabel = document.getElementById('status-autosave');
    if (indicator) indicator.classList.toggle('hidden', !current.autoSave);
    if (statusLabel) statusLabel.classList.toggle('hidden', !current.autoSave);
  }

  // ── Stepper helpers ────────────────────────────────────────────
  function changeFontSize(delta) {
    current.fontSize = Math.max(8, Math.min(32, current.fontSize + delta));
    document.getElementById('font-size-value').textContent = current.fontSize;
    applyToEditor();
    save();
  }

  function changeTabSize(delta) {
    current.tabSize = Math.max(1, Math.min(8, current.tabSize + delta));
    document.getElementById('tab-size-value').textContent = current.tabSize;
    applyToEditor();
    save();
  }

  function changeAutoSaveDelay(delta) {
    current.autoSaveDelay = Math.max(500, Math.min(10000, current.autoSaveDelay + delta * 500));
    document.getElementById('autosave-delay-value').textContent = current.autoSaveDelay;
    save();
  }

  // ── Init event listeners ───────────────────────────────────────
  function init() {
    load();

    // Font size steppers
    document.getElementById('font-size-up')?.addEventListener('click', () => changeFontSize(1));
    document.getElementById('font-size-down')?.addEventListener('click', () => changeFontSize(-1));

    // Tab size steppers
    document.getElementById('tab-size-up')?.addEventListener('click', () => changeTabSize(1));
    document.getElementById('tab-size-down')?.addEventListener('click', () => changeTabSize(-1));

    // Auto-save delay steppers
    document.getElementById('autosave-delay-up')?.addEventListener('click', () => changeAutoSaveDelay(1));
    document.getElementById('autosave-delay-down')?.addEventListener('click', () => changeAutoSaveDelay(-1));

    // Toggle switches
    document.getElementById('setting-wordwrap')?.addEventListener('change', e => {
      current.wordWrap = e.target.checked;
      applyToEditor(); save();
    });

    document.getElementById('setting-minimap')?.addEventListener('change', e => {
      current.minimap = e.target.checked;
      applyToEditor(); save();
    });

    document.getElementById('setting-linenumbers')?.addEventListener('change', e => {
      current.lineNumbers = e.target.checked;
      applyToEditor(); save();
    });

    document.getElementById('setting-ligatures')?.addEventListener('change', e => {
      current.ligatures = e.target.checked;
      applyToEditor(); save();
    });

    document.getElementById('setting-autosave')?.addEventListener('change', e => {
      current.autoSave = e.target.checked;
      updateAutoSaveStatus(); save();
    });

    // Theme swatches
    document.querySelectorAll('.theme-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.App) window.App.setTheme(btn.dataset.theme);
        document.querySelectorAll('.theme-swatch').forEach(s =>
          s.classList.toggle('active', s === btn));
      });
    });
  }

  function get(key) { return current[key]; }
  function getAll() { return { ...current }; }

  return { init, load, applyToEditor, scheduleAutoSave, get, getAll };
})();
