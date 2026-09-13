import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#0b0710",
          900: "#140a1f",
          800: "#1f1130",
          700: "#2b1743",
        },
        pumpkin: {
          400: "#ff9a3c",
          500: "#ff7518",
          600: "#e35d00",
        },
        slime: {
          400: "#9dff5c",
          500: "#7ddb2e",
        },
      },
      fontFamily: {
        spooky: ["var(--font-spooky)", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
