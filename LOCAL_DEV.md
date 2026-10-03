# Running TastePilot Web Locally

A quick guide to getting the web app running on your machine.

## 1. Install Node

You need Node 24 LTS (pinned in `.nvmrc`). The easiest way to get it is [nvm](https://github.com/nvm-sh/nvm):

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
# open a new terminal, then from the repo root:
nvm install    # reads .nvmrc
nvm use
```

Check it worked: `node -v` should print `v24.x`.

## 2. Install dependencies

From the repo root, run this once:

```sh
npm install
```

This installs everything for all workspaces (`apps/web`, `packages/*` and `infra`).

## 3. Configure the environment

```sh
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `/api` | Where the frontend sends API requests |
| `NEXT_PUBLIC_API_MOCKING` | `enabled` | `enabled` answers `/api/*` with the stub backend in your browser; `disabled` uses a real backend |

**You don't need a backend.** With mocking enabled, a stub backend (`packages/mock-api`, built on [MSW](https://mswjs.io)) runs inside the browser. It implements the BRD's rules: the tri-state safety engine, natural-language parsing, preference learning, ranking, Meal Party invites, and so on. Its data is seeded with a demo household and lives in your browser's `localStorage`.

## 4. Start the dev server

```sh
npm run dev
```

Open http://localhost:3000 and log in with a demo account. The login page has a "Fill in Alex" button.

| Account | Password | Who they are |
| --- | --- | --- |
| `alex@tastepilot.dev` | `tastepilot` | Tree-nut allergy, loves spicy and Thai food, dislikes cilantro. Hosts the "Friday Potluck" |
| `jordan@tastepilot.dev` | `tastepilot` | Vegetarian, same household |

Things to try:

- **Safety states:** `/recipes/thai-basil-chicken` (safe), `/recipes/pesto-pasta` (conflict: pine nuts), `/recipes/pad-thai` (unverified: tamarind paste isn't in the verified data).
- **Meal Party:** `/party/pty_friday` has a host safety summary, potluck checks and invite links.
- **Join as a guest:** open http://localhost:3000/invite/friday-group in a private window (or log out first) and join with an allergy, e.g. "I'm allergic to sesame".
- **Teach your profile:** on `/profile`, type "I'm allergic to nuts" and see why it's not guessed.

**Reset the demo data:** in the browser console, run `__tastepilotMock.reset()`, then reload.

**Simulate slow or failing API calls** (to check loading and error states):

```js
localStorage.setItem('tastepilot:mock-controls', JSON.stringify({ hang: ['/safety'], fail: ['/feed'] }))
// undo:
localStorage.removeItem('tastepilot:mock-controls')
```

**Hot reload:** saving a file under `apps/web/src` or `packages/*/src` updates the browser immediately. Workspace packages ship TypeScript source, so you never need to build them first.

**Query devtools:** the TanStack Query devtools button appears in the bottom corner in dev mode. Use it to inspect cached API data.

## 5. Run the tests

All commands run from the repo root.

| Command | What it runs |
| --- | --- |
| `npm test` | Unit and component tests (Vitest), once |
| `npm run test:watch` | The same tests, re-running when you save |
| `npm run e2e` | Playwright browser tests, desktop and mobile |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (rewrites files) |
| `npm run storybook` | Design system in Storybook on http://localhost:6006 (light/dark toggle, a11y panel) |
| `npm run check:bundle` | Bundle-size budget (after `npm run build`) |

Before your first e2e run, install the test browser once:

```sh
cd apps/web && npx playwright install chromium
```

`npm run e2e` builds the static export and serves it on http://localhost:3001 through the same CloudFront rewrite used in production, so it tests what actually gets deployed. If something is already serving on 3001, it reuses that instead, so stop any old `npm run preview` first to avoid testing a stale build. For an interactive runner, use `npm run e2e:ui -w @tastepilot/web`.

Before pushing, run `npm run typecheck && npm run lint && npm test && npm run e2e`. CI (`.github/workflows/ci.yml`) runs the same checks plus the bundle budget and a Storybook build.

The e2e suite covers the HLD's critical flows: invite to guest account to safety summary, a potluck dish flagged unsafe, the claim flow keeping history, revoking one of two links, the duplicate-guest hint, and "never shown as safe while loading or failed". It also runs axe accessibility checks.

## 6. Production build (optional)

```sh
npm run preview   # http://localhost:3001
```

This builds the static export (`apps/web/out`) and serves it the way S3 + CloudFront will. It catches problems the dev server tolerates, such as build-time type errors, prerendering failures, and dynamic-route issues. To deploy, see [DEPLOY.md](DEPLOY.md).

**Dynamic routes** (`/recipes/[id]` and similar): read the id with `useRouteParam('recipes')`, not `useParams()`. In the deployed build `useParams()` returns the `_` placeholder. [DEPLOY.md](DEPLOY.md#how-spa-routing-works-on-s3) explains why.

## Where things go

| You're adding… | Put it in |
| --- | --- |
| A page or route | `apps/web/src/app/(public \| auth \| app)/...` |
| Feature code (hooks, API calls, components) | `apps/web/src/features/<domain>/`, exported through its `index.ts` |
| A shared UI component | `packages/ui/src/` |
| A backend response shape (Zod schema) | `packages/api-client/src/schemas/` |
| A new endpoint | `packages/api-client/src/endpoints.ts`, plus a stub in `packages/mock-api/src/handlers.ts` |
| Shared query keys / cross-feature invalidation | `apps/web/src/lib/query-keys.ts` |
| Framework-free logic or types | `packages/shared/src/` |
| A unit test | Next to the file, as `*.test.ts(x)` |
| A browser test | `apps/web/e2e/*.spec.ts` |
| AWS infrastructure | `infra/lib/web-stack.ts` (see [DEPLOY.md](DEPLOY.md)) |

Features must not import from each other: ESLint enforces it. Pages compose features, and shared code goes in `apps/web/src/lib` or `packages/*`. Safety results are only ever rendered from server data through `SafetyBadge`; never compute safety in the UI. See the [HLD](hld-ui-taste-pilot.md) for the reasoning.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `node: command not found` after installing nvm | Open a new terminal, or run `source ~/.zshrc` |
| `Port 3000 is in use` | Another dev server is running. Stop it with `lsof -ti :3000 \| xargs kill`, or run on another port with `PORT=3001 npm run dev` |
| Changed `.env.local` but nothing happened | Restart `npm run dev`. Env vars are read at startup |
| Weird stale build or caching errors | Stop the server, run `rm -rf apps/web/.next`, then restart |
| Stuck on "Loading TastePilot…" | The stub backend's Service Worker couldn't start. Use a normal (non-private) window, and check `NEXT_PUBLIC_API_MOCKING=enabled` |
| Everything says "Unverified" | The API isn't answering: check the mock controls above aren't set, or that your real backend is running |
| Demo data looks wrong after a code change | Run `__tastepilotMock.reset()` in the console; seeded data is cached in `localStorage` |
| Playwright says the browser isn't installed | `cd apps/web && npx playwright install chromium` |
