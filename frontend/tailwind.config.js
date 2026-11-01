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
        sans: ['"Nunito"', 'sans-serif'],
      },
      colors: {
        primary: {
          50: 'var(--color-primary-50, #f4faf9)',
          100: 'var(--color-primary-100, #d8eeed)',
          200: 'var(--color-primary-200, #b5dedc)',
          300: 'var(--color-primary-300, #88c8c6)',
          400: 'var(--color-primary-400, #5ba8a6)',
          500: 'var(--color-primary-500, #5ba8a6)',
          600: 'var(--color-primary-600, #3d8b89)',
          700: 'var(--color-primary-700, #2c6e6c)',
          800: 'var(--color-primary-800, #245856)',
          900: 'var(--color-primary-900, #1f4948)',
        },
        emerald: {
          50: 'var(--color-emerald-50, #f4faf9)',
          100: 'var(--color-emerald-100, #d8eeed)',
          200: 'var(--color-emerald-200, #b5dedc)',
          300: 'var(--color-emerald-300, #88c8c6)',
          400: 'var(--color-emerald-400, #5ba8a6)',
          500: 'var(--color-emerald-500, #5ba8a6)',
          600: 'var(--color-emerald-600, #3d8b89)',
          700: 'var(--color-emerald-700, #2c6e6c)',
          800: 'var(--color-emerald-800, #245856)',
          900: 'var(--color-emerald-900, #1f4948)',
        },
        vacation: {
          teal: 'var(--color-vacation-teal, #5ba8a6)',
          blue: 'var(--color-vacation-blue, #4d69a5)',
          gold: 'var(--color-vacation-gold, #ecd386)',
          cream: 'var(--color-vacation-cream, #eae6dd)',
          charcoal: 'var(--color-vacation-charcoal, #323232)',
        }
      }
    },
  },
  plugins: [],
}
