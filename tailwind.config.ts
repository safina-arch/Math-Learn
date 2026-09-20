import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7209B7",
          50: "#F6EDFB",
          100: "#EDD9F7",
          200: "#D9B0EE",
          600: "#7209B7",
          700: "#5E0798",
          800: "#4A0678",
        },
        ink: {
          DEFAULT: "#111113",
          soft: "#3F3F46",
          muted: "#6B7280",
          faint: "#9CA3AF",
        },
        line: "#E9E9EC",
        canvas: "#FFFFFF",
        wash: "#F7F7F8",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,16,20,0.05)",
        pop: "0 8px 30px rgba(17,17,19,0.10)",
      },
      borderRadius: {
        xl2: "12px",
      },
      maxWidth: {
        notion: "900px",
      },
    },
  },
  plugins: [],
};
export default config;
