import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#17213a",
        mist: "#f3f6fb",
        ocean: "#315cdd",
        aqua: "#167c66",
        sunrise: "#ffd56a",
        ember: "#ff9f6b",
      },
      fontFamily: {
        display: ['"Manrope"', "sans-serif"],
        body: ['"IBM Plex Sans"', "sans-serif"],
        ui: ['"IBM Plex Sans"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
