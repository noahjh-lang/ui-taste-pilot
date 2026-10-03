# ui-taste-pilot

TastePilot web frontend. Design: [hld-ui-taste-pilot.md](hld-ui-taste-pilot.md) · Requirements: [../brd-ui-taste-pilot.md](../brd-ui-taste-pilot.md) · Outstanding work: [NOT_IMPLEMENTED.md](NOT_IMPLEMENTED.md) · **Dev setup: [LOCAL_DEV.md](LOCAL_DEV.md)** · **Deploy: [DEPLOY.md](DEPLOY.md)** · **Environment: [DEV_ENVIRONMENT.md](DEV_ENVIRONMENT.md)**

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
| `npm run build` | Static export to `apps/web/out` |
| `npm run preview` | Build and serve the static export on :3001, as CloudFront would |
| `npm run deploy` / `deploy:diff` / `deploy:destroy` | Deploy to AWS. See [DEPLOY.md](DEPLOY.md) |
| `npm test` / `npm run test:watch` | Vitest unit + component tests across all workspaces |
| `npm run e2e` | Playwright smoke tests against the static export. First run: `npx playwright install chromium` in `apps/web` |
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
infra/                    AWS CDK: S3 + CloudFront + WAF allowlist + budget; CloudFront Function
```

Workspace packages ship TypeScript source and are compiled by Next (`transpilePackages`), so edits to them hot reload too.
