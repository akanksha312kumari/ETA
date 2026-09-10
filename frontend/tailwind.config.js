/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          50: '#fbf9f5',
          100: '#f5f2e9',
          200: '#e9e4d4',
          300: '#d9d2be',
          400: '#c5baa2',
          500: '#a89a80',
          600: '#8c7d65',
          700: '#6f624f',
          800: '#4d4437',
          900: '#2c271f',
        },
        neutral: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        }
      },
      boxShadow: {
        'clay-light': '8px 12px 24px rgba(0, 0, 0, 0.04), -6px -6px 16px rgba(255, 255, 255, 0.95), inset 2px 2px 4px rgba(255, 255, 255, 0.9), inset -3px -3px 6px rgba(217, 210, 190, 0.15)',
        'clay-card': '10px 14px 28px rgba(0, 0, 0, 0.05), -8px -8px 20px rgba(255, 255, 255, 0.95), inset 3px 3px 6px rgba(255, 255, 255, 0.9), inset -4px -4px 8px rgba(217, 210, 190, 0.18)',
        'clay-hover': '14px 18px 32px rgba(0, 0, 0, 0.08), -10px -10px 24px rgba(255, 255, 255, 1)',
        'clay-btn': '4px 6px 14px rgba(0, 0, 0, 0.25), -3px -3px 8px rgba(255, 255, 255, 0.6), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.25), inset -1.5px -1.5px 3px rgba(0, 0, 0, 0.3)',
        'clay-dark': '8px 12px 24px rgba(0, 0, 0, 0.6), -6px -6px 16px rgba(40, 40, 45, 0.3), inset 2px 2px 4px rgba(60, 60, 68, 0.2), inset -3px -3px 6px rgba(0, 0, 0, 0.6)',
        'clay-dark-card': '10px 14px 28px rgba(0, 0, 0, 0.7), -8px -8px 20px rgba(40, 40, 45, 0.35), inset 2px 2px 5px rgba(60, 60, 68, 0.25), inset -4px -4px 8px rgba(0, 0, 0, 0.7)',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'float-reverse': 'floatReverse 10s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.45, 0, 0.55, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(12px, -15px) scale(1.03)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-15px, 12px) scale(0.97)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 0.9, transform: 'scale(1)' },
          '50%': { opacity: 1, transform: 'scale(1.02)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: 0.8 },
          '100%': { transform: 'scale(2.2)', opacity: 0 },
        }
      }
    },
  },
  plugins: [],
}
