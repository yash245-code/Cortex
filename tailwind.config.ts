import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cortex: {
          bg: '#0F0F0F',
          sidebar: '#171717',
          panel: '#202020',
          surface: '#282828',
          border: '#2F2F2F',
          active: '#333333',
          accent: '#5DD62C',
          accentHover: '#4ec023',
          accentSecondary: '#337418',
          text: '#F8F8F8',
          muted: '#8E8E8E',
          selection: '#337418'
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
