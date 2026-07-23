import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#08070C",
        panel: "#14111C",
        panelHi: "#1C1826",
        parchment: "#EDE7DA",
        muted: "#8C8397",
        royal: "#5B3E8E",
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        ar: ["Cairo", "system-ui", "sans-serif"],
        sans: ["Barlow", "system-ui", "sans-serif"],
        data: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
