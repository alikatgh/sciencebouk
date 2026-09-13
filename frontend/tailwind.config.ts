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
      fontFamily: {
        display: ['"STIX Two Text"', "serif"],
        body: ['"STIX Two Text"', "serif"],
        ui: ['"Manrope"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
