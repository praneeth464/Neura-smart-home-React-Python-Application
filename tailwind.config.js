/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        midnight: '#0a0f1f',
        aurora: '#1f2b53',
        frost: 'rgba(255, 255, 255, 0.85)',
        'frost-muted': 'rgba(255, 255, 255, 0.6)',
        'card-glass': 'rgba(17, 25, 40, 0.45)',
        'card-highlight': 'rgba(255, 255, 255, 0.2)',
        accent: '#8ddcff',
        'accent-soft': '#73b1ff',
        'accent-warm': '#febb71',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 25px 50px -12px rgba(15, 23, 42, 0.45)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      },
      backgroundImage: {
        'noise-light': "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\" viewBox=\"0 0 200 200\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"1.2\" numOctaves=\"4\" stitchTiles=\"stitch\"/></filter><rect width=\"200\" height=\"200\" filter=\"url(%23n)\" opacity=\"0.12\" /></svg>')",
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.6s ease forwards',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
