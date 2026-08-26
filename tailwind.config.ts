import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cortex: {
          bg: '#0f1117',
          sidebar: '#141721',
          panel: '#181b27',
          surface: '#1e2235',
          border: '#272c42',
          active: '#2e3550',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          text: '#f1f5f9',
          muted: '#8b949e',
          selection: '#264f78'
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
