import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F3D3E",
          light: "#155356",
          dark: "#092829",
        },
        paper: {
          DEFAULT: "#F7F5F0",
          fold: "#E4E0D6",
          card: "#FFFFFF",
        },
        brass: {
          DEFAULT: "#C9A227",
          light: "#DDBE5A",
          dark: "#9C7D1B",
        },
        text: {
          DEFAULT: "#1A1A1A",
          soft: "#565248",
        },
        alert: {
          DEFAULT: "#B3413E",
          bg: "#FBEAE9",
        },
        success: {
          DEFAULT: "#2E6B4F",
          bg: "#E9F2ED",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        ledger: ["var(--font-jetbrains)", "monospace"],
      },
      backgroundImage: {
        "stitch-v":
          "repeating-linear-gradient(to bottom, #C9A227 0, #C9A227 4px, transparent 4px, transparent 10px)",
      },
      boxShadow: {
        fold: "inset 8px 0 16px -12px rgba(15, 61, 62, 0.25)",
        card: "0 1px 2px rgba(15,61,62,0.06), 0 4px 16px rgba(15,61,62,0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
