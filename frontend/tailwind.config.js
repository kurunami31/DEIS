/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef4fa',
          100: '#dbe7f3',
          200: '#b6cde4',
          300: '#8fb0d3',
          600: '#14437b',
          700: '#10365f',
          800: '#0b2a4a',
          900: '#08203a',
        },
        accent: {
          start: '#e9781b',
          mid: '#f59e0b',
          end: '#b3551a',
        },
      },
    },
  },
  plugins: [],
};