/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cricket Coaching AI Theme - Cornflower Blue
        primary: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#8193f8',
          500: '#6495ED',  // Cornflower Blue
          600: '#4c6fd1',
          700: '#3b5ab5',
          800: '#2f4899',
          900: '#29397d',
        },
        cricket: {
          green: '#228B22',
          red: '#DC143C',
          white: '#FFFFFF',
          pitch: '#D4A373',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
