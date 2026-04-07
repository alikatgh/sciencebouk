/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  envDir: "..",
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
          ui: [
            "@radix-ui/react-slot",
            "@radix-ui/react-avatar",
            "@radix-ui/react-progress",
            "@radix-ui/react-separator",
            "@radix-ui/react-dialog",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-tooltip",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],
          katex: ["katex", "react-katex"],
          "d3-interaction": [
            "d3-selection",
            "d3-drag",
          ],
          "d3-viz": [
            "d3-array",
            "d3-scale",
            "d3-shape",
            "d3-transition",
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
