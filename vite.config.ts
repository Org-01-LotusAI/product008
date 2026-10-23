import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    proxy: {
      "/api": "https://product008-ai-backend.vercel.app",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/__tests__/setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
  },
});
