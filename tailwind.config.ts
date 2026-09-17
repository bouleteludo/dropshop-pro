import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Near-black charcoal ground — deliberately desaturated, not purple-cartoon-dark.
        ink: {
          950: "#08090b",
          900: "#0f1113",
          800: "#17191c",
          700: "#212326",
          600: "#2c2f33",
        },
        // Burnt/rust orange — the single accent, used sparingly to direct the eye.
        ember: {
          300: "#e8a978",
          400: "#d98a4f",
          500: "#c1651f",
          600: "#9c4e15",
        },
        // Deep, muted violet — a secondary mood accent, never the main call-to-action color.
        eclipse: {
          900: "#170f26",
          700: "#2c1c47",
          500: "#4a2f74",
        },
        // Off-white for body text — warmer and easier to read than pure white on charcoal.
        bone: {
          50: "#f6f1ea",
          200: "#e4dbcd",
          400: "#a89e90",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
