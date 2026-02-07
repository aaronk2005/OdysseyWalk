import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta)", "system-ui", "sans-serif"],
      },
      colors: {
        // Legacy (keep for map etc.)
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
        // New light theme tokens
        surface: {
          DEFAULT: "#ffffff",
          elevated: "#ffffff",
          muted: "#f8fafc",
        },
        app: {
          bg: "#f1f5f9",
          border: "#e2e8f0",
        },
        ink: {
          primary: "#0f172a",
          secondary: "#64748b",
          tertiary: "#94a3b8",
        },
        brand: {
          primary: "#0d9488",
          primaryHover: "#0f766e",
          secondary: "#f97316",
          secondaryHover: "#ea580c",
        },
      },
      backgroundImage: {
        "gradient-glow": "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)",
        "gradient-hero": "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "ring-listening": "ring-listening 1.5s ease-in-out infinite",
        "ring-pulse-outer": "ring-pulse-outer 1.5s ease-in-out infinite",
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
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(13, 148, 136, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(13, 148, 136, 0)" },
        },
        "ring-pulse-outer": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.7" },
          "50%": { transform: "scale(1.12)", opacity: "0.25" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        card: "1rem",
        button: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
