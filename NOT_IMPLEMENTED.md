# Not Implemented Yet

The web UI for the [BRD](../brd-ui-taste-pilot.md) and [HLD](hld-ui-taste-pilot.md) is built end to end against a **stub backend** (`packages/mock-api`). This file tracks what is still missing or deliberately simplified. Check items off or delete them as they land.

## What exists today

**Every BRD surface has a working UI:**

- Taste profile: a "what we've learned" view with traceable evidence, natural-language statements with a parse preview, structured allergies and diets, taste sharing, data export and deletion.
- Home, search and discover, all ranked by one explainable score with a "Why this recipe?" breakdown.
- Recipe catalog and detail, with per-ingredient verification.
- AI-assisted drafting and a recipe editor.
- Food history, which recomputes preferences when an entry is removed.
- Pantry.
- Restaurant recommendations, using the same safety engine and ranking as recipes.
- Community cookbook: publishing, reviews, tips, comments, photos, @mentions and follows.
- Family calendar.
- Meal Party:
  - Host safety summary and a "who's eating" table.
  - Multiple invite links, each revocable with confirmation.
  - Lite (guest) accounts, a dismissible duplicate-guest hint, and the claim flow.
  - Potluck dishes checked against every other member.
  - Group recommendations, with a diagnosis when nothing fits everyone.
  - Polling, plus an immediate safety refetch when membership changes.

**Every HLD technical choice is in place:**

- TanStack Query, with domain-namespaced keys.
- Zustand for cross-feature UI state.
- React Hook Form and Zod.
- Radix UI primitives.
- Tailwind with a dark mode toggle.
- Feature modules whose boundaries are enforced by ESLint.
- A typed API client that validates every response.
- A strict optimistic-update policy: never for safety, constraints or preferences.
- Frontend event instrumentation.
- Storybook (with the a11y add-on).
- Vitest, React Testing Library, Playwright (desktop and mobile), and axe accessibility checks.
- A bundle-size budget.
- A GitHub Actions CI workflow.

**Stub backend:** MSW in the browser. It implements the BRD's server-side rules, so the UI can be exercised realistically:

- The tri-state, fail-closed safety engine, with word-boundary and longest-match ingredient matching.
- The fixed natural-language rule set.
- The evidence-based preference model.
- The shared ranking function.
- Party exclusion and diagnosis.
- Atomic invite consumption.
- CSRF double-submit protection, login rate limiting, and IDOR-safe 404s.

## Real backend (the main remaining work)

- [ ] **Build or connect the real API.** The contract is [packages/api-client/src/endpoints.ts](packages/api-client/src/endpoints.ts), with Zod schemas in [packages/api-client/src/schemas](packages/api-client/src/schemas). The stub in `packages/mock-api` is a reference implementation of every endpoint's behavior and error codes. To switch over, set `NEXT_PUBLIC_API_MOCKING=disabled` and route `/api/*` to the backend, ideally through the same CloudFront distribution so it stays same-origin.
- [ ] **Decide how contracts stay in sync** (HLD open question): either generate the client from a published OpenAPI spec, or keep hand-maintained Zod schemas covered by contract tests against the backend.
- [ ] **Things the stub only approximates:**
  - Session cookies can't be `HttpOnly` in a Service Worker. The real backend must set `HttpOnly; Secure`.
  - Rate limiting is per email only.
  - Invite consumption is atomic only because JavaScript is single-threaded. The real backend needs a database transaction or conditional update.
  - Passwords are stored in plain text in the browser.
- [ ] **Verified ingredient and allergen data at catalog scale** (BRD dependency). The stub dictionary is about 160 entries in [packages/mock-api/src/data/ingredients.ts](packages/mock-api/src/data/ingredients.ts). The real source must be curated or licensed. Composite products (curry paste, kimchi, chili crisp…) are deliberately unmapped, so they stay unverified.
- [ ] **Real AI-assisted generation.** The stub fills in templates. Whatever model is used, drafts must keep going through structuring and the safety engine on save. The UI already treats drafts that way.
- [ ] **Restaurant and menu data source.** It's seeded today.
- [ ] **Recency or decay for preference confidence** (BRD known limitation). The UI states "Preferences don't fade over time yet."
- [ ] **Photo storage.** Review photos are downscaled in the browser and sent as data URLs. A real backend should use object storage (for example, presigned S3 uploads) served through a CDN with `next/image`, or an image CDN, since the static export disables Next's image optimizer.

## Product gaps in the UI

- [ ] **Household management.** Households are seeded (the Rivera family). There's no UI to create a household, invite members or leave one. New accounts see a "join or create a household" message on the calendar.
- [ ] **Account deletion UI.** `DELETE /me` exists in the API and the stub, but the profile page only offers "Delete my profile data".
- [ ] Editing or deleting your own reviews, tips and comments; reporting or moderating community content.
- [ ] Party management:
  - Edit the name, date or description.
  - Remove a member.
  - Leave a party.
  - Transfer the host role.
  - Delete a party.
- [ ] Notifications for @mentions, new party members and potluck changes. Mentions are only listed under Cookbook → Mentions.
- [ ] Pagination or infinite scroll for search, cookbook and food history. The stub catalog is small.
- [ ] @mention autocomplete in the post composer.

## Architecture deviations to revisit

- [ ] **No server-side rendering.** The S3/CloudFront static export drops the SSR the HLD wanted for public and share pages (SEO, fast first paint). Public pages render client-side today. Before a public launch, either pre-render known public recipes and cookbooks at build time or move to a Next.js server host.
- [ ] **Route guards are client-side only.** `AuthGate` keeps people on pages they can use, and the backend enforces access on every request. The HLD's `proxy.ts` (middleware) layer needs a server, so it can't run in a static export.
- [ ] **WebSocket/SSE design note.** The HLD asks for the push-based upgrade path to be designed now. Polling every 10 seconds is implemented; the design doc isn't written.
- [ ] **Public URL scheme is provisional:** `/r/[id]` and `/c/[handle]`. Confirm before share links go out.
- [ ] **In stub mode, prerendered HTML is only a loading screen.** The app waits for the stub backend to start before rendering. This goes away with a real backend.

## Design system

- [ ] **Palette is still a placeholder** ([packages/ui/src/theme.css](packages/ui/src/theme.css)). Swap in the agreed palette. Clarify the HLD's "red/amber/gray reserved for safety": this build uses green/red/amber for safe/conflict/unverified and keeps decorative surfaces neutral.
- [ ] **Visual regression** (Chromatic or similar). Storybook builds in CI, but snapshots aren't compared.
- [ ] Assign an owner for `packages/ui` (HLD risk).

## Testing & quality

- [ ] Contract tests against the real backend.
- [ ] Coverage reporting and thresholds.
- [ ] Component tests that render feature components against the stub through `msw/node` (`createMockServer` exists in `@tastepilot/mock-api/node`). Today, feature-level behavior is covered by Playwright.
- [ ] Error monitoring (for example, Sentry) and a dashboard for the `beta_events` stream.

## Build, CI & deployment

- [ ] **Deploy from CI with an OIDC role** instead of local credentials, plus preview deployments per PR.
- [ ] **Separate staging and production stacks**, with per-environment `NEXT_PUBLIC_*` values at build time.
- [ ] **Feature flags** for the BRD's phased rollout.
- [ ] **Custom domain:** Route 53 plus an ACM certificate in us-east-1.
- [ ] **Backend protection.** The WAF allowlist only protects the web app. The backend API needs its own access control and cost limits.
- [ ] **AWS deploy is blocked.** The AWS account's organization policy (SCP) denies CloudFormation and Lambda. See [DEPLOY.md](DEPLOY.md).

## Out of scope for this repo

Native iOS and Android apps (BRD phase 5). They should reuse `packages/api-client` and `packages/shared`.
