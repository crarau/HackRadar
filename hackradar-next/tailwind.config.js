/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          400: '#00d4ff',
        },
        green: {
          400: '#00ff88',
        },
        slate: {
          900: '#1a1a2e',
        }
      },
      backgroundColor: {
        'black/30': 'rgba(0, 0, 0, 0.3)',
      },
      borderColor: {
        'cyan-400/30': 'rgba(0, 212, 255, 0.3)',
      }
    },
  },
  plugins: [],
}