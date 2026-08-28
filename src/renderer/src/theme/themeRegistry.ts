import * as monaco from 'monaco-editor'

export interface ThemeDefinition {
  id: string
  name: string
  description: string
  type: 'dark' | 'light'
  previewColors: {
    bg: string
    sidebar: string
    panel: string
    accent: string
    text: string
  }
  cssVariables: {
    bg: string
    sidebar: string
    panel: string
    surface: string
    border: string
    active: string
    text: string
    muted: string
    selection: string
    accent: string
  }
  monacoTheme: monaco.editor.IStandaloneThemeData
}

export interface AccentColorOption {
  id: string
  name: string
  color: string
  hoverColor: string
  glowColor: string
}

export const ACCENT_COLORS: AccentColorOption[] = [
  {
    id: 'emerald',
    name: 'Cyber Emerald',
    color: '#5DD62C',
    hoverColor: '#4ec023',
    glowColor: 'rgba(93, 214, 44, 0.35)'
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    color: '#38BDF8',
    hoverColor: '#0EA5E9',
    glowColor: 'rgba(56, 189, 248, 0.35)'
  },
  {
    id: 'purple-mauve',
    name: 'Neon Violet',
    color: '#C084FC',
    hoverColor: '#A855F7',
    glowColor: 'rgba(192, 132, 252, 0.35)'
  },
  {
    id: 'cyber-cyan',
    name: 'Aqua Cyan',
    color: '#22D3EE',
    hoverColor: '#06B6D4',
    glowColor: 'rgba(34, 211, 238, 0.35)'
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Gold',
    color: '#FBBF24',
    hoverColor: '#F59E0B',
    glowColor: 'rgba(251, 191, 36, 0.35)'
  },
  {
    id: 'crimson-rose',
    name: 'Crimson Rose',
    color: '#FB7185',
    hoverColor: '#F43F5E',
    glowColor: 'rgba(251, 113, 133, 0.35)'
  },
  {
    id: 'hot-pink',
    name: 'Hyper Pink',
    color: '#F472B6',
    hoverColor: '#EC4899',
    glowColor: 'rgba(244, 114, 182, 0.35)'
  }
]

export const THEMES: Record<string, ThemeDefinition> = {
  'cortex-cyber': {
    id: 'cortex-cyber',
    name: 'Cortex Cyber Dark',
    description: 'Deep obsidian black with neon emerald highlights.',
    type: 'dark',
    previewColors: {
      bg: '#0F0F0F',
      sidebar: '#171717',
      panel: '#202020',
      accent: '#5DD62C',
      text: '#F8F8F8'
    },
    cssVariables: {
      bg: '#0F0F0F',
      sidebar: '#171717',
      panel: '#202020',
      surface: '#282828',
      border: '#2F2F2F',
      active: '#333333',
      text: '#F8F8F8',
      muted: '#8E8E8E',
      selection: '#33741866',
      accent: '#5DD62C'
    },
    monacoTheme: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '666666', fontStyle: 'italic' },
        { token: 'keyword', foreground: '5DD62C', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'F8F8F8' },
        { token: 'string', foreground: 'A3E635' },
        { token: 'number', foreground: '86EFAC' },
        { token: 'type', foreground: '4ADE80' },
        { token: 'function', foreground: 'BEF264' },
        { token: 'operator', foreground: '5DD62C' },
        { token: 'delimiter', foreground: '94A3B8' }
      ],
      colors: {
        'editor.background': '#0F0F0F',
        'editor.foreground': '#F8F8F8',
        'editor.lineHighlightBackground': '#181818',
        'editor.selectionBackground': '#33741866',
        'editorCursor.foreground': '#5DD62C',
        'editorWhitespace.foreground': '#242424',
        'editorIndentGuide.background': '#202020',
        'editorIndentGuide.activeBackground': '#337418',
        'editorLineNumber.foreground': '#555555',
        'editorLineNumber.activeForeground': '#5DD62C',
        'editorGutter.background': '#0F0F0F'
      }
    }
  },

  'tokyo-night': {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Clean dark theme inspired by the lights of downtown Tokyo.',
    type: 'dark',
    previewColors: {
      bg: '#1a1b26',
      sidebar: '#16161e',
      panel: '#1f2335',
      accent: '#7aa2f7',
      text: '#c0caf5'
    },
    cssVariables: {
      bg: '#1a1b26',
      sidebar: '#16161e',
      panel: '#1f2335',
      surface: '#24283b',
      border: '#292e42',
      active: '#2f354d',
      text: '#c0caf5',
      muted: '#787c99',
      selection: '#515c7e66',
      accent: '#7aa2f7'
    },
    monacoTheme: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'bb9af7', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'c0caf5' },
        { token: 'string', foreground: '9ece6a' },
        { token: 'number', foreground: 'ff9e64' },
        { token: 'type', foreground: '2ac3de' },
        { token: 'function', foreground: '7aa2f7' },
        { token: 'operator', foreground: '89ddff' },
        { token: 'delimiter', foreground: '787c99' }
      ],
      colors: {
        'editor.background': '#1a1b26',
        'editor.foreground': '#c0caf5',
        'editor.lineHighlightBackground': '#1f2335',
        'editor.selectionBackground': '#515c7e66',
        'editorCursor.foreground': '#7aa2f7',
        'editorWhitespace.foreground': '#292e42',
        'editorIndentGuide.background': '#24283b',
        'editorIndentGuide.activeBackground': '#7aa2f788',
        'editorLineNumber.foreground': '#565f89',
        'editorLineNumber.activeForeground': '#7aa2f7',
        'editorGutter.background': '#1a1b26'
      }
    }
  },

  'catppuccin-mocha': {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    description: 'Soothing pastel dark theme with rich contrast and warm accents.',
    type: 'dark',
    previewColors: {
      bg: '#1e1e2e',
      sidebar: '#181825',
      panel: '#11111b',
      accent: '#cba6f7',
      text: '#cdd6f4'
    },
    cssVariables: {
      bg: '#1e1e2e',
      sidebar: '#181825',
      panel: '#11111b',
      surface: '#313244',
      border: '#45475a',
      active: '#585b70',
      text: '#cdd6f4',
      muted: '#a6adc8',
      selection: '#585b7066',
      accent: '#cba6f7'
    },
    monacoTheme: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6c7086', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'cba6f7', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'cdd6f4' },
        { token: 'string', foreground: 'a6e3a1' },
        { token: 'number', foreground: 'fab387' },
        { token: 'type', foreground: '89dceb' },
        { token: 'function', foreground: '89b4fa' },
        { token: 'operator', foreground: '94e2d5' },
        { token: 'delimiter', foreground: '9399b2' }
      ],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.lineHighlightBackground': '#31324466',
        'editor.selectionBackground': '#585b7066',
        'editorCursor.foreground': '#cba6f7',
        'editorWhitespace.foreground': '#45475a',
        'editorIndentGuide.background': '#313244',
        'editorIndentGuide.activeBackground': '#cba6f788',
        'editorLineNumber.foreground': '#6c7086',
        'editorLineNumber.activeForeground': '#cba6f7',
        'editorGutter.background': '#1e1e2e'
      }
    }
  },

  'dracula': {
    id: 'dracula',
    name: 'Dracula',
    description: 'Famous gothic high-contrast dark theme with vampire hues.',
    type: 'dark',
    previewColors: {
      bg: '#282a36',
      sidebar: '#21222c',
      panel: '#191a21',
      accent: '#bd93f9',
      text: '#f8f8f2'
    },
    cssVariables: {
      bg: '#282a36',
      sidebar: '#21222c',
      panel: '#191a21',
      surface: '#44475a',
      border: '#6272a4',
      active: '#6272a488',
      text: '#f8f8f2',
      muted: '#6272a4',
      selection: '#44475a88',
      accent: '#bd93f9'
    },
    monacoTheme: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff79c6', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'f8f8f2' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'operator', foreground: 'ff79c6' },
        { token: 'delimiter', foreground: 'f8f8f2' }
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#44475a55',
        'editor.selectionBackground': '#44475a88',
        'editorCursor.foreground': '#ff79c6',
        'editorWhitespace.foreground': '#44475a',
        'editorIndentGuide.background': '#44475a',
        'editorIndentGuide.activeBackground': '#bd93f988',
        'editorLineNumber.foreground': '#6272a4',
        'editorLineNumber.activeForeground': '#f8f8f2',
        'editorGutter.background': '#282a36'
      }
    }
  },

  'one-dark-pro': {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    description: "Atom's iconic One Dark syntax and UI theme.",
    type: 'dark',
    previewColors: {
      bg: '#282c34',
      sidebar: '#21252b',
      panel: '#1b1d23',
      accent: '#61afef',
      text: '#abb2bf'
    },
    cssVariables: {
      bg: '#282c34',
      sidebar: '#21252b',
      panel: '#1b1d23',
      surface: '#2c313a',
      border: '#3e4451',
      active: '#4b5263',
      text: '#abb2bf',
      muted: '#5c6370',
      selection: '#3e445188',
      accent: '#61afef'
    },
    monacoTheme: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c678dd', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'abb2bf' },
        { token: 'string', foreground: '98c379' },
        { token: 'number', foreground: 'd19a66' },
        { token: 'type', foreground: 'e5c07b' },
        { token: 'function', foreground: '61afef' },
        { token: 'operator', foreground: '56b6c2' },
        { token: 'delimiter', foreground: 'abb2bf' }
      ],
      colors: {
        'editor.background': '#282c34',
        'editor.foreground': '#abb2bf',
        'editor.lineHighlightBackground': '#2c313a',
        'editor.selectionBackground': '#3e445188',
        'editorCursor.foreground': '#528bff',
        'editorWhitespace.foreground': '#3b4048',
        'editorIndentGuide.background': '#3b4048',
        'editorIndentGuide.activeBackground': '#61afef88',
        'editorLineNumber.foreground': '#5c6370',
        'editorLineNumber.activeForeground': '#abb2bf',
        'editorGutter.background': '#282c34'
      }
    }
  },

  'github-dark': {
    id: 'github-dark',
    name: 'GitHub Dark',
    description: 'Official GitHub dark color palette and typography.',
    type: 'dark',
    previewColors: {
      bg: '#0d1117',
      sidebar: '#161b22',
      panel: '#010409',
      accent: '#58a6ff',
      text: '#c9d1d9'
    },
    cssVariables: {
      bg: '#0d1117',
      sidebar: '#161b22',
      panel: '#010409',
      surface: '#21262d',
      border: '#30363d',
      active: '#383e47',
      text: '#c9d1d9',
      muted: '#8b949e',
      selection: '#1f6feb44',
      accent: '#58a6ff'
    },
    monacoTheme: {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'c9d1d9' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'type', foreground: 'ffa657' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'operator', foreground: 'ff7b72' },
        { token: 'delimiter', foreground: 'c9d1d9' }
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editor.selectionBackground': '#1f6feb44',
        'editorCursor.foreground': '#58a6ff',
        'editorWhitespace.foreground': '#30363d',
        'editorIndentGuide.background': '#21262d',
        'editorIndentGuide.activeBackground': '#58a6ff88',
        'editorLineNumber.foreground': '#6e7681',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'editorGutter.background': '#0d1117'
      }
    }
  },

  'github-light': {
    id: 'github-light',
    name: 'GitHub Light',
    description: 'Crisp and elegant GitHub light workspace.',
    type: 'light',
    previewColors: {
      bg: '#ffffff',
      sidebar: '#f6f8fa',
      panel: '#eaeef2',
      accent: '#0969da',
      text: '#1f2328'
    },
    cssVariables: {
      bg: '#ffffff',
      sidebar: '#f6f8fa',
      panel: '#eaeef2',
      surface: '#f3f4f6',
      border: '#d0d7de',
      active: '#e5e7eb',
      text: '#1f2328',
      muted: '#656d76',
      selection: '#0969da22',
      accent: '#0969da'
    },
    monacoTheme: {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '656d76', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'cf222e', fontStyle: 'bold' },
        { token: 'identifier', foreground: '1f2328' },
        { token: 'string', foreground: '0a3069' },
        { token: 'number', foreground: '0550ae' },
        { token: 'type', foreground: '953800' },
        { token: 'function', foreground: '8250df' },
        { token: 'operator', foreground: 'cf222e' },
        { token: 'delimiter', foreground: '1f2328' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1f2328',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editor.selectionBackground': '#0969da22',
        'editorCursor.foreground': '#0969da',
        'editorWhitespace.foreground': '#d0d7de',
        'editorIndentGuide.background': '#e5e7eb',
        'editorIndentGuide.activeBackground': '#0969da88',
        'editorLineNumber.foreground': '#8c959f',
        'editorLineNumber.activeForeground': '#1f2328',
        'editorGutter.background': '#ffffff'
      }
    }
  }
}

/**
 * Registers all themes with Monaco Editor
 */
export function registerMonacoThemes(monacoInstance: typeof monaco): void {
  for (const [themeId, theme] of Object.entries(THEMES)) {
    try {
      monacoInstance.editor.defineTheme(themeId, theme.monacoTheme)
    } catch {
      // Ignore if already registered
    }
  }
}

/**
 * Applies CSS variables and sets Monaco editor theme dynamically
 */
export function applyThemeAndAccent(themeId: string, customAccent?: string): void {
  const theme = THEMES[themeId] || THEMES['cortex-cyber']
  const root = document.documentElement

  const activeAccent = customAccent || theme.cssVariables.accent

  // Set CSS variables on root
  root.style.setProperty('--cortex-bg', theme.cssVariables.bg)
  root.style.setProperty('--cortex-sidebar', theme.cssVariables.sidebar)
  root.style.setProperty('--cortex-panel', theme.cssVariables.panel)
  root.style.setProperty('--cortex-surface', theme.cssVariables.surface)
  root.style.setProperty('--cortex-border', theme.cssVariables.border)
  root.style.setProperty('--cortex-active', theme.cssVariables.active)
  root.style.setProperty('--cortex-text', theme.cssVariables.text)
  root.style.setProperty('--cortex-muted', theme.cssVariables.muted)
  root.style.setProperty('--cortex-selection', theme.cssVariables.selection)
  root.style.setProperty('--cortex-accent', activeAccent)

  // Derive accent hover and subtle glow
  root.style.setProperty('--cortex-accent-hover', activeAccent)
  root.style.setProperty('--cortex-accent-glow', `${activeAccent}40`)

  if (theme.type === 'light') {
    root.classList.remove('dark')
    root.classList.add('light')
  } else {
    root.classList.remove('light')
    root.classList.add('dark')
  }

  // Update Monaco theme if loaded
  if (typeof monaco !== 'undefined' && monaco.editor?.setTheme) {
    try {
      monaco.editor.setTheme(themeId)
    } catch {
      // Fallback
    }
  }
}
