/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ICON Academic Studio Brand Colors
        brand: {
          navy: '#1A2744',     // Deep Navy — structural elements, headers, navigation
          purple: '#6B21A8',   // Rich Purple — primary actions, accents
          gold: '#F5C518',     // Golden Yellow — highlights, warnings, CTA borders
          charcoal: '#1E1E2E', // Charcoal — dark backgrounds
          white: '#FFFFFF',
        },
        primary: {
          50: '#f5f0fb',
          100: '#ebe0f6',
          200: '#d8c0ec',
          300: '#be95dd',
          400: '#a069cc',
          500: '#8446b8',
          600: '#6B21A8',    // ICON Rich Purple
          700: '#5a1d91',
          800: '#4a1878',
          900: '#3c1462',
          950: '#240c3e',
        },
        surface: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          700: '#616161',
          800: '#424242',
          900: '#212121',
          950: '#141414',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
