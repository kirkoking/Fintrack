/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       'var(--bg)',
        surface:  'var(--surface)',
        surface2: 'var(--surface2)',
        surface3: 'var(--surface3)',
        border:   'var(--border)',
        border2:  'var(--border2)',
        text:     'var(--text)',
        text2:    'var(--text2)',
        text3:    'var(--text3)',
        accent:   'var(--accent)',
        accent2:  'var(--accent2)',
        accent3:  'var(--accent3)',
        danger:   'var(--danger)',
        warning:  'var(--warning)',
        success:  'var(--success)',
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans:  ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:  ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}

