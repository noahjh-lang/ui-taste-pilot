# Not Implemented Yet

The current state is the foundation only: a monorepo, routing skeleton, providers, the typed API client core, the shared `SafetyBadge`, and local test tooling. This file tracks everything from the [HLD](hld-ui-taste-pilot.md) and [BRD](../brd-ui-taste-pilot.md) that is **not** built yet, grouped by HLD section. Check items off or delete them as they land.

## What exists today (for context)

- npm-workspaces monorepo: `apps/web`, `packages/ui`, `packages/api-client`, `packages/shared`
- Next.js 16 (App Router, Turbopack hot reload), React 19, TypeScript 5 strict, Tailwind CSS 4
- Route groups `(public)`, `(auth)`, `(app)` with a placeholder page for every route listed in the HLD
- TanStack Query provider + devtools; retry policy (no retry on 4xx, exponential backoff otherwise)
- `createApiClient`: fetch wrapper with Zod response validation, `ApiError` / `ApiContractError`
- `SafetyBadge` + `resolveSafetyStatus`: missing, loading, or errored results render **unverified**
- One wired example: `/recipes/[id]` calls `GET /recipes/:id/safety` and renders `SafetyBadge`
- Vitest + React Testing Library (21 tests, including the release-blocking SafetyBadge suite), Playwright smoke suite (desktop + mobile), ESLint, Prettier

## Tech stack items not installed or configured

- [ ] **Radix UI**: not installed. `Button` is a plain `<button>`. Add Radix and rebuild the primitives (Dialog, Dropdown, Tooltip, Badge) on top of it.
- [ ] **Zustand**: not installed. Add it when the first cross-feature UI state appears (for example, the active Meal Party context).
- [ ] **React Hook Form**: not installed. Add it with the first real form (login/signup/claim, allergy entry).
- [ ] **Storybook**: not set up for `packages/ui`.
- [ ] **Visual regression** (Chromatic or similar): not set up.
- [ ] **ESLint for `packages/*`**: lint runs on `apps/web` only. Add a root/shared config that covers the packages.
- [ ] **Enforced feature boundaries**: "features never import from one another" is only a convention right now. Add an ESLint rule (for example `no-restricted-imports` or `eslint-plugin-boundaries`) so `features/a` can't import `features/b/*`, and so deep imports past a feature's `index.ts` are blocked.

## Routing & feature modules

- [ ] Every route except `/recipes/[id]` (safety badge only) is a placeholder.
- [ ] Feature folders: only `features/safety` exists. Still to create: `recipes`, `meal-party`, `profile`, `social`, `food-history`, `pantry`, `restaurants`, `cookbook`, `calendar`, `search`/`discover`.
- [ ] **Public route paths are provisional.** `/r/[id]` (public recipe) and `/c/[handle]` (public cookbook) were chosen to avoid clashing with the authenticated `/recipes/[id]` and `/cookbook`. Confirm the final URL scheme, especially since these are SEO and share links.
- [ ] Route-level `loading.tsx` and `error.tsx` boundaries.
- [ ] Per-page metadata/OG tags for public share pages.

## Data / API layer

- [ ] **Real backend contracts.** `safetyResultSchema` models only `{ status }` as a placeholder. Mirror the real `SafetyResult`, `HardConstraints`, and preference/evidence models, and decide between an OpenAPI-generated client and hand-maintained Zod (HLD open question).
- [ ] The API endpoint path `GET /recipes/:id/safety` is assumed. Confirm it with the backend.
- [ ] Safety query keys are `['safety', 'recipe', recipeId]`. The HLD specifies `['safety', userId, recipeId]`. Add the user/Party context to the key once auth exists, so switching users can't serve another user's cached result.
- [ ] Central 401/403 handling: route a 401 to sign-in or the lite-account claim prompt, and render a permission-denied state on 403.
- [ ] Mutations with cross-query invalidation (food log → preferences/recommendations; invite accept → Party members + safety summary).
- [ ] Optimistic-update policy: allowed for low-stakes actions, banned for safety and for in-edit preferences. Nothing enforces this yet; consider a lint rule or a review checklist.
- [ ] Party merged safety-summary endpoint (`member_safety_summary`) query and its UI.
- [ ] Natural-language allergy/preference input: send it to the backend parsing endpoint and render the structured result. No client-side keyword matching.
- [ ] Frontend event instrumentation to the `beta_events` pipeline, correlated by session and Party.
- [ ] **Local mock backend.** Nothing stands in for the API locally, so the recipe page shows "Unverified" (correctly) with no backend running. Consider MSW handlers for dev and tests, or a documented way to run the real backend locally.

## Authentication & session

- [ ] Full-account login/signup forms and session handling (cookie/token).
- [ ] Lite-account creation during invite acceptance, plus a persisted device identifier.
- [ ] Claim flow ("Save your profile"): a dismissible prompt that carries history forward.
- [ ] Duplicate-lite-identity soft hint ("did you already join as [name]?").
- [ ] **Route guards**: three levels (public, lite-in-Party, full). In Next 16 this goes in `proxy.ts` (formerly `middleware.ts`), backed by the backend. The `(app)` group is currently open to anyone.

## Meal Party / real-time

- [ ] Host dashboard, member list, potluck contributions, `InviteLinkList` (multiple concurrent links, per-link revoke).
- [ ] Polling via `refetchInterval` on open Party queries.
- [ ] Immediate safety-summary refetch when membership changes.
- [ ] A design note for the WebSocket/SSE upgrade path (the HLD asks for this to be designed now).

## Design system

- [ ] **Palette is a placeholder.** `apps/web/src/app/globals.css` uses invented warm neutrals plus green/red/amber for safe/conflict/unverified. Replace it with the product's agreed palette. Also clarify the HLD's "red/amber/gray reserved for safety states": which state is gray, and what color "safe" uses.
- [ ] Contrast-check the safety colors in both themes (WCAG AA).
- [ ] Dark-mode toggle and persisted preference. The `.dark` class tokens exist, but nothing sets the class.
- [ ] Composed patterns: `RecipeCard`, `PreferenceChip`.
- [ ] Feature components: `PartyMemberList`, `PotluckContributionForm`, `InviteLinkList`.
- [ ] Icon set (the `SafetyBadge` icons are hand-drawn inline SVGs).

## Performance

- [ ] Lazy-loading of heavy feature components (AI recipe assistant, history charts).
- [ ] `next/image` configuration for recipe photos (remote patterns / CDN).
- [ ] Hover prefetch of recipe detail queries.
- [ ] Bundle-size budget in CI.

## Accessibility

- [ ] Accessibility audit tooling (for example `@axe-core/playwright` in the e2e suite, `eslint-plugin-jsx-a11y` beyond Next's defaults).
- [ ] Skip-to-content link and focus management on route change.
- [ ] A responsive "who's eating" table/stacked-list pattern for Meal Party.

## Testing

- [ ] E2E critical flows from the HLD: invite → lite account → Party safety summary; potluck contribution flagged unsafe; claim flow preserving history; revoking one of two invite links.
- [ ] Tests asserting that **every** consumer of a safety result (not just `SafetyBadge`) renders unverified on null/loading/error. This is a release-blocking class.
- [ ] Contract tests between Zod schemas and the backend models.
- [ ] Coverage reporting.

## Build, CI & deployment

- [ ] CI pipeline: lint, typecheck, unit/component tests, Playwright smoke, bundle-size check, Storybook build.
- [ ] Preview deployments per PR.
- [x] ~~Hosting target~~: static SPA on S3 + CloudFront, IP-allowlisted (see DEPLOY.md).
- [ ] **SSR deviation from the HLD.** The static export drops server rendering, which the HLD wanted for public and share pages (SEO, fast first paint). Revisit before public launch: options are pre-rendering known public pages at build time, or moving to a Next.js server host.
- [ ] Separate staging/production stacks, and per-environment `NEXT_PUBLIC_API_BASE_URL` at build time.
- [ ] Deploy from CI with an OIDC role instead of local credentials.
- [ ] Custom domain (Route 53 + ACM certificate in us-east-1).
- [ ] The allowlist only protects the web app. The backend API will need its own access control and cost limits.
- [ ] Feature flags for the BRD's phased rollout.

## BRD product features (all pending)

Taste profile and "what we've learned" view · home/search/discover personalized ranking UI · recipe catalog and detail · AI recipe generation · food history logging · pantry tracking · restaurant recommendations · community cookbook · social connections · family calendar · native mobile apps (out of scope for this repo).
