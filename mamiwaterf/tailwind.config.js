/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Sui-style neobrutalism palette ──
        // Existing token names are kept and remapped to the Sui palette so
        // every consumer recolors automatically. New semantic aliases below.
        'neo-white': '#FAF8F5', // cream canvas
        'neo-black': '#000000',
        'neo-pink': '#CAB1FF',  // remapped → violet (primary accent)
        'neo-green': '#E8FF75', // remapped → lime/yellow-green (highlight)
        'neo-yellow': '#F0FFA0', // remapped → soft lime
        'neo-blue': '#CAB1FF',  // remapped → violet
        'neo-purple': '#CAB1FF', // remapped → violet
        'neo-cyan': '#CAB1FF',  // remapped → violet
        'neo-orange': '#F0FFA0', // remapped → soft lime

        // Semantic Sui aliases (prefer these for new work)
        'neo-cream': '#FAF8F5',
        'neo-violet': '#CAB1FF',
        'neo-violet-soft': '#DCC9FF',
        'neo-lime': '#E8FF75',
        'neo-lime-soft': '#F0FFA0',
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
        'neo-violet': '4px 4px 0px 0px #CAB1FF',
        'neo-lime': '4px 4px 0px 0px #E8FF75',
      },
      borderRadius: {
        // Sui rounded language
        'neo': '12px',
        'neo-sm': '8px',
        'neo-lg': '16px',
        'neo-xl': '20px',
      },
      borderWidth: {
        // Sui uses thinner 2px borders — remap the legacy `border-3` so the
        // whole app slims down without editing every consumer.
        '3': '2px',
      },
      backgroundImage: {
        'sui-gradient': 'linear-gradient(180deg, #CAB1FF 0%, #E8FF75 100%)',
        'sui-gradient-135': 'linear-gradient(135deg, #CAB1FF, #E8FF75)',
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
