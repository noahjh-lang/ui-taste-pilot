# ui-taste-pilot

TastePilot web frontend. Design: [hld-ui-taste-pilot.md](hld-ui-taste-pilot.md) · Requirements: [../brd-ui-taste-pilot.md](../brd-ui-taste-pilot.md) · Outstanding work: [NOT_IMPLEMENTED.md](NOT_IMPLEMENTED.md) · **Dev setup: [LOCAL_DEV.md](LOCAL_DEV.md)**

## Prerequisites

Node 24 LTS (see `.nvmrc`). With nvm: `nvm use`.

## Getting started

```sh
npm install
cp apps/web/.env.example apps/web/.env.local   # set NEXT_PUBLIC_API_BASE_URL
npm run dev                                     # http://localhost:3000 (hot reload via Turbopack)
```

## Scripts (run from the repo root)

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server with hot reload |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` / `npm run test:watch` | Vitest unit + component tests across all workspaces |
| `npm run e2e` | Playwright smoke tests (starts the dev server if it isn't running). First run: `npx playwright install chromium` in `apps/web` |
| `npm run typecheck` | `tsc --noEmit` in every workspace |
| `npm run lint` | ESLint (Next.js config) |
| `npm run format` | Prettier |

## Layout

```
apps/web/                 Next.js App Router app
  src/app/(public)/       Server-rendered public pages: /, /r/[id], /c/[handle], /invite/[token]
  src/app/(auth)/         /login, /signup, /claim
  src/app/(app)/          Authenticated app shell: /home, /search, /recipes/[id], /party/[id], ...
  src/features/<domain>/  Feature modules ({api,components,hooks,types}); import only via index.ts
  src/lib/                API client instance, TanStack Query client
  e2e/                    Playwright specs
packages/ui/              Design system (primitives, SafetyBadge)
packages/api-client/      Typed fetch client + Zod schemas mirrored from the backend
packages/shared/          Framework-agnostic types and display logic
```

Workspace packages ship TypeScript source and are compiled by Next (`transpilePackages`), so edits to them hot reload too.
