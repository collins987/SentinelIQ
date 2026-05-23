/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui'],
        display: ['Fraunces', 'ui-serif', 'Georgia'],
      },
      colors: {
        earth: {
          50: '#faf7f2',
          100: '#f3eee5',
          200: '#e6ddcf',
          300: '#d6c8b1',
          400: '#c2ad8a',
          500: '#ad9063',
          600: '#8f7448',
          700: '#745c38',
          800: '#5a462b',
          900: '#3f3120',
        },
        ink: {
          50: '#f7f7f5',
          100: '#e9e6e1',
          200: '#d2ccc4',
          300: '#b4aaa0',
          400: '#8f8377',
          500: '#6a5e52',
          600: '#564a40',
          700: '#433a31',
          800: '#2f2923',
          900: '#1b1714',
        },
      },
      boxShadow: {
        glass: '0 16px 45px rgba(30, 24, 20, 0.18)',
      },
      backgroundImage: {
        'sunrise': 'radial-gradient(circle at 10% 10%, rgba(173, 144, 99, 0.35), transparent 45%), radial-gradient(circle at 90% 20%, rgba(200, 170, 120, 0.35), transparent 40%), linear-gradient(135deg, #f7f7f5 0%, #efe9df 100%)',
      },
    },
  },
  plugins: [],
};
