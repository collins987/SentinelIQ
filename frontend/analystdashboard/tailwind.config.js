/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        slateblue: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        graphite: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5f5',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
        display: ['Sora', 'ui-sans-serif', 'system-ui'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular'],
      },
      boxShadow: {
        glass: '0 10px 30px rgba(15, 23, 42, 0.35)',
      },
      backgroundImage: {
        'analyst-radial': 'radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.18), transparent 45%), radial-gradient(circle at 85% 10%, rgba(6, 182, 212, 0.22), transparent 40%), radial-gradient(circle at 70% 80%, rgba(16, 185, 129, 0.16), transparent 40%)',
      },
    },
  },
  plugins: [],
};
