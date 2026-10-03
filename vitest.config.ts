import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// One Vitest run covers unit + component tests across every workspace.
// Playwright e2e specs live in apps/web/e2e and are run separately.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['{apps,packages}/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'apps/web/e2e/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
