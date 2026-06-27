import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paprica: { DEFAULT: "#E5402A", light: "#FF6A4D", dark: "#C32E1C" },
        gema: { DEFAULT: "#FFB02E", light: "#FFE08A", dot: "#FFC53D" },
        cafe: { DEFAULT: "#2A1410", deep: "#1E0F0B", soft: "#3D2520" },
        creme: "#FFF3E9",
        offwhite: "#FFFAF6",
        body: "#33333C",
        muted: "#8A6A5E",
        border: "#EFE1D7",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        btn: "11px",
        card: "10px",
        pill: "100px",
      },
      maxWidth: {
        content: "1200px",
      },
      boxShadow: {
        cta: "0 6px 20px rgba(229,64,42,.3)",
        "card-hover": "0 8px 24px rgba(229,64,42,.1)",
        dashboard: "0 20px 60px rgba(42,20,16,.12)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        fadeUp: { from: { opacity: "0", transform: "translateY(24px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        fadeUp: "fadeUp .6s ease-out both",
        marquee: "marquee 32s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
