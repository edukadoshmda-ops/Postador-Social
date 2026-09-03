/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#090d16',
          card: '#0f172a',
          sidebar: '#0c1222',
          border: '#1e293b',
          input: '#131c31',
          hover: '#1e293b',
        },
        brand: {
          primary: '#6366f1',
          secondary: '#3b82f6',
          accent: '#a855f7',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
