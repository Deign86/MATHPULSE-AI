import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    testTimeout: 30000,
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', '.expo/**', 'android/**', 'ios/**', 'build/**'],
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
