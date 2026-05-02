import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["functions/**", "build/**", "dist/**", "node_modules/**"],
    setupFiles: ["@testing-library/jest-dom/vitest"],
  },
  resolve: {
    alias: {
      "@": "C:/Users/Deign/Downloads/MATHPULSE-AI/src",
    },
  },
});
