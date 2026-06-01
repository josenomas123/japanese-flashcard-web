import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Catppuccin Mocha
        base:    '#1e1e2e',
        mantle:  '#181825',
        crust:   '#11111b',
        surface: '#313244',
        overlay: '#45475a',
        muted:   '#6c7086',
        subtle:  '#a6adc8',
        text:    '#cdd6f4',
        blue:    '#89b4fa',
        lavender:'#b4befe',
        green:   '#a6e3a1',
        red:     '#f38ba8',
        yellow:  '#f9e2af',
        peach:   '#fab387',
      },
      fontFamily: {
        sans: ['"Segoe UI"', '"Yu Gothic UI"', 'Meiryo', 'sans-serif'],
        mono: ['"Cascadia Code"', '"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
