import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // HLD: no `any` escape hatches on API payloads.
      '@typescript-eslint/no-explicit-any': 'error',
      // Only a feature's public index may be imported from outside it.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/**'],
              message:
                "Import from the feature's index (e.g. '@/features/recipes'), not its internals.",
            },
          ],
        },
      ],
    },
  },
  {
    // HLD: features never import one another. Pages compose them; shared code
    // lives in src/lib, src/components or packages/*.
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/**'],
              message:
                'Features must not import other features. Compose them in a page, or move shared code to src/lib.',
            },
            {
              group: ['@tastepilot/mock-api', '@tastepilot/mock-api/**'],
              message: 'Only the app bootstrap may load the stub backend.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'public/mockServiceWorker.js',
  ]),
]);
