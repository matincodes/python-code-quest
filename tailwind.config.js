/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        space: {
          950: '#0A0A0A',
          900: '#141414',
          800: '#1F1F1F',
          700: '#2A2A2A',
          600: '#363636',
        },
        accent: {
          gold: '#B58542',
          'gold-light': '#D4A373',
          'gold-muted': '#8B6B3D',
        },
        status: {
          success: '#34D399',
          warning: '#FBBF24',
          danger: '#FB7185',
          info: '#94A3B8',
        },
      },
      boxShadow: {
        'gold-sm': '0 0 12px rgba(181,133,66,0.15)',
        'gold-md': '0 0 24px rgba(181,133,66,0.2)',
        'gold-lg': '0 0 40px rgba(181,133,66,0.25)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.3)',
        'glass-inset': 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-premium': 'linear-gradient(145deg, #0A0A0A 0%, #141414 50%, #0A0A0A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #B58542 0%, #D4A373 50%, #B58542 100%)',
        'gradient-surface': 'linear-gradient(145deg, rgba(31,31,31,0.8) 0%, rgba(20,20,20,0.6) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'twinkle': 'twinkle 4s ease-in-out infinite',
        'scroll-ticker': 'scrollTicker 30s linear infinite',
        'count-up': 'countUp 0.3s ease-out',
        'gradient-flow': 'gradientFlow 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        },
        scrollTicker: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        countUp: {
          '0%': { transform: 'scale(1.2)', color: '#FBBF24' },
          '100%': { transform: 'scale(1)', color: 'inherit' },
        },
        gradientFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
