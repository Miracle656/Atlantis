/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neo-white': '#FFFDF5',
        'neo-black': '#000000',
        'neo-pink': '#FF00FF',
        'neo-green': '#CCFF00',
        'neo-yellow': '#FFF500',
        'neo-blue': '#3B82F6', // Standard blue for links/info if needed, but keep it raw
        'neo-purple': '#A855F7',
        'neo-cyan': '#06B6D4',
        'neo-orange': '#F97316',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', '"Lexend Mega"', 'sans-serif'],
        heading: ['"Lexend Mega"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
        dungeon: ['"Dungeon Depths"', 'sans-serif'],
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px #000000',
        'neo-lg': '8px 8px 0px 0px #000000',
        'neo-sm': '2px 2px 0px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
    },
  },
  plugins: [],
}
