/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdfaf1',
          100: '#f9f1d8',
          200: '#f1dfaf',
          300: '#e7c77d',
          400: '#dba94f',
          500: '#d4af37', // Premium Gold
          600: '#b88e2d',
          700: '#9a7126',
          800: '#7f5b24',
          900: '#684b21',
          950: '#3c290f',
        },
        darkblue: {
          50: '#f2f5f8',
          100: '#e1e9f0',
          200: '#c8d7e4',
          300: '#a2bbd2',
          400: '#7599bc',
          500: '#557ca7',
          600: '#43638c',
          700: '#385072',
          800: '#2f435e',
          900: '#001F3F', // Dark Blue
          950: '#1b263b',
        },
        darkgreen: {
          50: '#f0f7f4',
          100: '#daede3',
          200: '#b8dbc9',
          300: '#8cc2a8',
          400: '#64a587',
          500: '#46896c',
          600: '#376e56',
          700: '#2d5846',
          800: '#26473a',
          900: '#023020', // Updated Dark Green
          950: '#011a12',
        },
        violet: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#2e1065', // Violet
          950: '#1e0a45',
        },
        royalblue: {
          50: '#f0f4ff',
          100: '#e0e9fe',
          200: '#c0d2fe',
          300: '#90b0fd',
          400: '#608dfc',
          500: '#4169e1', // Royal Blue
          600: '#3252ce',
          700: '#2841a6',
          800: '#213586',
          900: '#002366', // Deep Royal Blue
          950: '#00153d',
        },
      },
    },
  },
  plugins: [],
};
