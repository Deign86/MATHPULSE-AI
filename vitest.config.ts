import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    testTimeout: 30000,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["functions/**", "build/**", "dist/**", "node_modules/**"],
    setupFiles: ["@testing-library/jest-dom/vitest", "./src/test-setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
