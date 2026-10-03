import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/** Lint for the shared packages and infra. The web app has its own config in apps/web. */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: 'apps/web' } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Not a Next.js app: no pages directory to check.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  globalIgnores([
    'apps/**',
    '**/node_modules/**',
    '**/cdk.out/**',
    '**/storybook-static/**',
    '**/*.tmp.*',
  ]),
]);
