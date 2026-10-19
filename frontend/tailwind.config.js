/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#131316',
          pill: '#1A1A1E',
          gold: '#FDB813',
          goldHover: '#F59E0B',
          sky: '#38BDF8',
          canvas: '#ECEEF2'
        },
        surface: {
          canvas: '#ECEEF2',
          card: '#FFFFFF',
          darkCard: '#131316',
          darkPill: '#1A1A1E',
          border: 'rgba(0, 0, 0, 0.05)',
          muted: '#71717A'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'bento': '0 12px 32px -8px rgba(0, 0, 0, 0.05), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'bento-hover': '0 20px 40px -12px rgba(0, 0, 0, 0.1), 0 6px 16px -4px rgba(0, 0, 0, 0.04)',
        'glass': '0 24px 60px -15px rgba(0, 0, 0, 0.08)'
      }
    }
  },
  plugins: []
};
