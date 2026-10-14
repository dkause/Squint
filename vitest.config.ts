import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Standard Vitest-Konfiguration
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'public/**/*.test.ts'],
    // e2e/ Verzeichnis ausschließen - Playwright-Tests werden separat ausgeführt
    exclude: ['**/e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
