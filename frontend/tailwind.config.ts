import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#112236",
        mist: "#f4f8ff",
        ocean: "#4f73ff",
        aqua: "#25a67f",
        sunrise: "#ffd56a",
        ember: "#ff9f6b",
      },
      boxShadow: {
        panel: "0 24px 54px rgba(32, 56, 47, 0.08)",
      },
      fontFamily: {
        display: ['"Newsreader"', "serif"],
        body: ['"Manrope"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
