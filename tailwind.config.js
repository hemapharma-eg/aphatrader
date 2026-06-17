/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#eef2f6',
          100: '#dce5ee',
          200: '#b9cbe1',
          300: '#96b1d4',
          400: '#7397c7',
          500: '#507dba',
          600: '#406495',
          700: '#304b70',
          800: '#20324a',
          900: '#101925',
        },
        accent: {
          teal: '#00d2ff',
          coral: '#ff6b6b',
          gold: '#ffd166',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
