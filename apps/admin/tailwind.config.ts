import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paprica: { DEFAULT: "#E5402A", light: "#FF6A4D", dark: "#C32E1C" },
        gema: { DEFAULT: "#FFB02E", light: "#FFDD86", dot: "#FFC53D" },
        cafe: "#2A1410",
        creme: "#FFF3E9",
        body: "#33333C",
        muted: "#8A6A5E",
        neutral: "#9A9AA4",
      },
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        sans: ["Manrope", "system-ui", "sans-serif"],
        mono: ["Spline Sans Mono", "monospace"],
      },
      borderRadius: {
        btn: "11px",
        card: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
