import type { Config } from "tailwindcss";
import svgToDataUri from "mini-svg-data-uri";
import plugin from "tailwindcss/plugin";
// @ts-expect-error - Tailwind'in bu dahili modülü için tip tanımı yok.
import flattenColorPalette from "tailwindcss/lib/util/flattenColorPalette";

const config: Config = {
  // --- KRİTİK DÜZELTME BURADA ---
  // Config dosyan zaten 'src/web' içinde olduğu için, 'app' klasörüne doğrudan erişmelisin.
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", 
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#020204', // Deep Void
        discord: {
          DEFAULT: '#5865F2',
          light: '#7289da',
        },
      },
      animation: {
        'twinkle': 'twinkle 4s ease-in-out infinite',
        'meteor': 'meteor 5s linear infinite',
        'float-slow': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        meteor: {
          '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { transform: 'rotate(215deg) translateX(-500px)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotateX(10deg) rotateY(-10deg)' },
          '50%': { transform: 'translateY(-20px) rotateX(12deg) rotateY(-8deg)' },
        }
      }
    },
  },
  plugins: [
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "bg-grid": (value) => ({
            backgroundImage: `url("${svgToDataUri(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="${value}"><path d="M0 .5H31.5V32"/></svg>`
            )}")`,
          }),
        },
        { values: flattenColorPalette(theme("backgroundColor")), type: "color" }
      );
    }),
  ],
};

export default config;