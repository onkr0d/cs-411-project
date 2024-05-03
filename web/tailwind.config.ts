import type { Config } from "tailwindcss";
import daisyui from 'daisyui';

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        'gradient': 'gradient 8s linear infinite',
        // 'spin': 'spin 2s linear infinite',
        'rainbow': 'rainbow 5s linear infinite',
      },
      keyframes: {
        gradient: {
          to: { 'background-position': '-200% center' }
        },
        // spin: {
        //   '0%': { transform: 'rotate(0deg)' },
        //   '100%': { transform: 'rotate(360deg)' },
        // },
        // rainbow: {
        //   '0%': { 'background-color': 'red' },
        //   '14%': { 'background-color': 'orange' },
        //   '28%': { 'background-color': 'yellow' },
        //   '42%': { 'background-color': 'green' },
        //   '57%': { 'background-color': 'blue' },
        //   '71%': { 'background-color': 'indigo' },
        //   '85%': { 'background-color': 'violet' },
        //   '100%': { 'background-color': 'red' },
        // },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [daisyui],
};

export default config;