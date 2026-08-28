import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cortex: {
          bg: 'var(--cortex-bg, #0F0F0F)',
          sidebar: 'var(--cortex-sidebar, #171717)',
          panel: 'var(--cortex-panel, #202020)',
          surface: 'var(--cortex-surface, #282828)',
          border: 'var(--cortex-border, #2F2F2F)',
          active: 'var(--cortex-active, #333333)',
          accent: 'var(--cortex-accent, #5DD62C)',
          accentHover: 'var(--cortex-accent-hover, #4ec023)',
          accentSecondary: 'var(--cortex-selection, #337418)',
          text: 'var(--cortex-text, #F8F8F8)',
          muted: 'var(--cortex-muted, #8E8E8E)',
          selection: 'var(--cortex-selection, #33741866)'
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', 'monospace'],
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config
