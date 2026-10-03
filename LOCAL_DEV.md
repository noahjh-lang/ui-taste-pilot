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

This installs everything for all workspaces (`apps/web` and `packages/*`).

## 3. Configure the environment

```sh
cp apps/web/.env.example apps/web/.env.local
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Where the frontend sends API requests |

You don't need a running backend to work on the UI. Pages still render. Anything that fetches data (for example, the recipe safety badge on `/recipes/[id]`) will show **Unverified**. That is the intended behaviour when there is no backend answer.

## 4. Start the dev server

```sh
npm run dev
```

Open http://localhost:3000. Good starting points:

- `/`: the public landing page
- `/home`: the logged-in app (no login is enforced yet)
- `/recipes/42`: an example page wired to the API, showing the safety badge

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

Before your first e2e run, install the test browser once:

```sh
cd apps/web && npx playwright install chromium
```

`npm run e2e` uses your dev server if it's already running and starts one otherwise. For an interactive runner, use `npm run e2e:ui -w @tastepilot/web`.

Before pushing, run `npm run typecheck && npm run lint && npm test && npm run e2e`.

## 6. Production build (optional)

```sh
npm run build && npm start
```

This catches errors the dev server tolerates, such as build-time type errors and prerendering failures.

## Where things go

| You're adding… | Put it in |
| --- | --- |
| A page or route | `apps/web/src/app/(public \| auth \| app)/...` |
| Feature code (hooks, API calls, components) | `apps/web/src/features/<domain>/`, exported through its `index.ts` |
| A shared UI component | `packages/ui/src/` |
| A backend response shape (Zod schema) | `packages/api-client/src/schemas/` |
| Framework-free logic or types | `packages/shared/src/` |
| A unit test | Next to the file, as `*.test.ts(x)` |
| A browser test | `apps/web/e2e/*.spec.ts` |

Features must not import from each other. Shared code goes in `packages/*`. See the [HLD](hld-ui-taste-pilot.md) for the reasoning.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `node: command not found` after installing nvm | Open a new terminal, or run `source ~/.zshrc` |
| `Port 3000 is in use` | Another dev server is running. Stop it with `lsof -ti :3000 \| xargs kill`, or run on another port with `PORT=3001 npm run dev` |
| Changed `.env.local` but nothing happened | Restart `npm run dev`. Env vars are read at startup |
| Weird stale build or caching errors | Stop the server, run `rm -rf apps/web/.next`, then restart |
| Safety badge always says "Unverified" | Expected with no backend. Point `NEXT_PUBLIC_API_BASE_URL` at a running API |
| Playwright says the browser isn't installed | `cd apps/web && npx playwright install chromium` |
