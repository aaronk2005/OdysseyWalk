import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a0e17",
          900: "#0f1629",
          800: "#151d33",
          700: "#1a2540",
        },
        accent: {
          blue: "#3b82f6",
          purple: "#8b5cf6",
        },
      },
      backgroundImage: {
        "gradient-glow": "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #a855f7 100%)",
        "gradient-hero": "linear-gradient(180deg, rgba(15,22,41,0.95) 0%, rgba(10,14,23,1) 100%)",
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "ring-listening": "ring-listening 1.5s ease-in-out infinite",
        "pulse-marker": "pulse-marker 1.5s ease-in-out infinite",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "pulse-marker": {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.15)", opacity: "0.9" },
        },
        "ring-listening": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(59, 130, 246, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(59, 130, 246, 0)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
