import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", sm: "2rem" },
      screens: { "2xl": "1200px" },
    },
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
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.8)",
        ember: "0 0 0 1px rgba(193,101,31,0.35), 0 12px 40px -12px rgba(193,101,31,0.55)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.9s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
