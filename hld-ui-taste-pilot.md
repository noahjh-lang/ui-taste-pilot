# TastePilot — Web App High-Level Design (React)

Oct 3, 2026 · @Noah

This document is the high-level frontend design for the TastePilot web app specified in the BRD, built on React. It covers the architecture, state and data strategy, and the specific engineering decisions needed to make personalization and allergy/dietary safety behave correctly and consistently across every screen.

## Architectural Principles & Overview

Five constraints should outrank convenience in every later decision:

1. **The server is the only safety authority.** The client never computes, infers, or caches a stand-in for a safe/conflict/unverified result. It renders exactly what the API returned, and while that result is loading or missing, the UI treats the item as unverified -- never defaults it to safe.
2. **Server state and UI state are different kinds of state and are never mixed in one store.** Recipes, preferences, safety results, and Party membership are server-owned data fetched and cached through one layer; things like "is this modal open" or "which tab is active" are local UI state and never touch that cache.
3. **The codebase is organized by feature domain (recipes, safety, meal-party, profile, social), not by technical layer (all reducers together, all components together).** A principal risk in a product this wide is cross-feature coupling; domain boundaries keep the safety engine's UI code from silently growing dependencies on, say, the cookbook feature.
4. **Contracts are typed end-to-end.** The shapes already established on the backend (`HardConstraints`, `SafetyResult`, the preference/evidence model) are mirrored as TypeScript types generated from or validated against the API, so a backend shape change is a compile error in the frontend, not a silent runtime bug.
5. **Web is the reference implementation; native mobile follows the same contracts and design tokens, not necessarily the same code.** Nothing here assumes React Native, but nothing here should make a future React Native client harder either -- business logic (formatting, validation, derived display state) stays out of React components so it is portable.

## Technology Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | React 18+ with TypeScript, on Next.js (App Router) | File-system routing maps cleanly onto the feature modules below; built-in image optimization matters for a recipe-photo-heavy product; server-side rendering gives the public cookbook/discovery pages SEO and fast first paint without a second framework |
| Rendering mode | Server-rendered for public/shareable pages (recipe detail, public cookbook, a shared Party invite landing page); client-rendered for the authenticated app shell (home, search, Meal Party, profile) | Matches each page's actual need instead of picking one mode for the whole app |
| Server-state & caching | TanStack Query | One cache for everything that comes from the API (recipes, preferences, safety results, Party data), with built-in revalidation, retry, and loading/error states -- this is also where the "never default to safe while loading" rule is enforced centrally |
| Local/UI state | React Context + `useReducer` for small, colocated state; Zustand for state that genuinely crosses feature boundaries (for example, the active Meal Party context) | Avoids a heavyweight global store for state that is mostly local, while still giving cross-cutting state one clear home |
| Forms & validation | React Hook Form + Zod | Zod schemas double as the runtime validation for free-text preference/allergy input and can mirror the backend's parsing rules so the UI never accepts something the backend would reject |
| Styling & components | Tailwind CSS + Radix UI primitives, themed to the palette and safety-state system already defined for the product | Radix gives accessible, unstyled primitives (dialogs, dropdowns, tooltips) so accessibility isn't rebuilt per component |
| Testing | Vitest + React Testing Library (unit/component), Playwright (end-to-end) | Fast unit feedback plus real-browser coverage for the flows that matter most (invite accept, potluck safety check, claim flow) |
| Tooling | ESLint + TypeScript strict mode, Prettier, Storybook for the shared component library | Keeps the design system and safety-badge components independently reviewable and visually testable |

## Application Architecture

&#91;embedded content: React frontend architecture · 4 layers + design system\]

Every feature module reads and writes through one state layer and one typed API client; nothing calls the backend directly, and nothing bypasses the safety or recommendation engines once past that client.

## State Management Strategy

- **TanStack Query is the one server-state cache.** Every value that originates on the backend -- recipes, preferences, safety results, Party membership, invites -- is fetched and cached here, with query keys namespaced by domain (`['recipe', id]`, `['safety', userId, recipeId]`, `['party', partyId]`) so invalidation is precise.
- **No optimistic updates on anything touching safety.** A recipe or dish's safety badge only ever renders a value the server returned; while that query is loading or has failed, the UI shows an unverified state, never a cached or assumed "safe" one. Optimistic updates are fine for low-stakes interactions (liking a recipe, reordering a list) but are explicitly disallowed for safety and for preference values the user is actively editing.
- **Mutations invalidate the queries they affect, not just their own.** Logging a meal (food history) invalidates both the history list and any preference/recommendation queries that evidence feeds; accepting an invite invalidates the Party's member and safety-summary queries.
- **UI-only state stays out of the server cache.** Which modal is open, the active tab, an in-progress invite form -- these live in component state or a small Zustand slice, never in TanStack Query, so a UI concern can never be mistaken for a fact from the backend.
- This split is a deliberate mirror of the backend's own separation of concerns: just as the safety engine is the one place safety is decided, the state layer is the one place server truth is cached, and neither boundary is allowed to blur for convenience.

## Routing & Feature Modules

Next.js App Router route groups, matched to rendering needs:

| Route group | Example routes | Rendering |
| --- | --- | --- |
| `(public)` | Landing page, a public recipe page, the public cookbook, a shared Party invite-landing page | Server-rendered, for SEO and fast first paint on links people share |
| `(auth)` | Login, signup, lite-account claim flow | Server-rendered shell, client-rendered form |
| `(app)` | `/home`, `/search`, `/discover`, `/recipes/[id]`, `/party/[id]`, `/profile`, `/food-history`, `/pantry`, `/restaurants`, `/cookbook`, `/calendar` | Client-rendered behind authentication, hydrated from the state layer |

Each feature owns one folder with its components, hooks, API calls, and types colocated (`features/meal-party/{components,hooks,api,types}`), matching the BRD's feature areas. Features never import from one another directly; anything shared (the design system, the API client core, formatting utilities) lives in a `shared/` layer that every feature depends on, and cross-feature coordination happens through routing or the shared state layer, not direct imports -- this keeps the safety-engine UI code, for instance, from quietly growing a dependency on the cookbook feature.

## Component & Design System Architecture

Four layers, each only depending on the one below it:

1. **Primitives** -- Button, Dialog, Dropdown, Tooltip, Badge: thin, accessible wrappers over Radix UI, styled with the Tailwind tokens for the agreed palette (warm neutral brand colors, with red/amber/gray reserved strictly for safety states).
2. **Composed patterns** -- `RecipeCard`, `PreferenceChip`, and the `SafetyBadge`: the single shared component for `status: "safe" | "conflict" | "unverified"`, used everywhere a recipe or dish's safety is shown (recipe card, recipe detail, a Party's dish list, a potluck contribution). It is never re-implemented per feature -- one component, one place to fix a safety-display bug, mirroring the backend's one safety engine.
3. **Feature components** -- `PartyMemberList`, `PotluckContributionForm`, `InviteLinkList`: feature-specific compositions of the layer above, living inside their feature folder.
4. **Pages** -- the route-level components that assemble feature components into a screen.

All shared components are documented and visually tested in Storybook, so a change to `SafetyBadge` or the palette is reviewed once, in isolation, rather than rediscovered feature by feature.

## Data Flow for Safety-Critical Rendering

1. The backend's one safety engine computes a result -- safe, conflict, or unverified -- per recipe or dish, per user or Party context.
2. The API returns that result alongside the recipe/dish payload (or from a dedicated safety endpoint for a Party's merged view); the frontend never derives it from raw ingredient or allergy data itself.
3. TanStack Query caches it under its own key, and the shared `SafetyBadge` component renders directly from that cached value through a union type (`"safe" | "conflict" | "unverified"`) -- never a boolean, so conflict and unverified can never collapse into one "not safe" or, worse, one "safe-ish" bucket.
4. **No allergen or ingredient keyword matching exists anywhere in the frontend.** Free-text allergy or preference input is sent to the backend's parsing endpoint and rendered back as structured data; the client never pre-filters or interprets it locally.
5. **A loading or failed safety fetch renders the unverified treatment**, with a retry affordance -- never a blank state that could be mistaken for "nothing to worry about," and never a cached stale "safe" value held past its query's invalidation.
6. A Meal Party view consumes one merged safety-summary endpoint (mirroring `member_safety_summary` on the backend) rather than recomputing group exclusion client-side from each member's raw constraints -- keeping the single source of truth server-side, exactly as the personalization audit established.

## API Integration Layer

- A thin typed client wraps `fetch`, with request and response shapes validated against Zod schemas mirrored from the backend's own models (`HardConstraints`, `SafetyResult`, the preference/evidence shape) -- a backend contract change becomes a type error in the frontend build, not a runtime surprise.
- No `any` escape hatches on safety- or preference-related payloads; a new field from the backend must be modeled before it can be used.
- Central error handling: a 401 routes to sign-in or the lite-account claim prompt as appropriate; a 403 renders a permission-denied state; network failures retry with backoff through TanStack Query's own retry policy, surfaced to the user only once retries are exhausted.
- Frontend-originated events (a user viewing a Party's safety summary, dismissing a duplicate-identity hint) are sent through the same event-instrumentation pipeline the backend already logs to (`beta_events`), so frontend and backend events can be correlated by session and Party.

## Authentication & Session Handling

- **Full accounts** authenticate with email and password against the backend's session endpoints, with a persistent session cookie or token shared across web and, later, mobile.
- **Lite accounts** are created transparently during invite acceptance -- the UI never asks a guest to "sign up," only to confirm a name and any allergy/dietary note before joining a Party. A persisted device-level identifier supports the backend's cross-device identity recovery without extra steps from the guest.
- **The claim flow** turns a lite account into a full one through a low-pressure, dismissible prompt ("Save your profile") rather than a forced wall -- completing it sets a password/email on the existing account and carries every bit of history, preference, and Party membership forward untouched.
- When the backend's duplicate-lite-identity heuristic fires, the UI does not block the join (matching the backend's deliberately non-blocking design) -- it may offer a soft "did you already join as \[name\]?" hint, dismissible with one tap.
- Route guards recognize three levels: public, lite-authenticated (valid only within the Party that created the lite account), and fully authenticated -- enforced both by the Next.js middleware and by the backend, never by the frontend alone.

## Real-Time Collaboration (Meal Party)

- A Party's host dashboard, potluck list, and invite list need near-real-time updates as guests join, flag allergies, or claim a dish to bring. For v1, short-interval polling through TanStack Query's `refetchInterval` on the open Party's queries is the simplest reliable approach and avoids standing up WebSocket infrastructure before it's proven necessary; a lightweight WebSocket or server-sent-events channel is a documented upgrade path if polling proves too chatty at scale.
- Anything that can change the safety picture -- a new member joining with an allergy on file -- triggers an immediate refetch of the safety-summary query specifically, not just the membership list, so the host's exclusion view never lags behind who is actually in the Party.
- Optimistic UI is acceptable for non-safety actions (claiming a potluck slot, marking a dish as brought) with a visible pending state while the mutation is in flight, reconciled against the server's response -- the same optimistic-update ban from the state-management strategy applies to anything touching safety.

## Performance, Code-Splitting & Asset Strategy

- Next.js's route-based code splitting is the default; feature modules additionally lazy-load their heaviest, least-frequently-used components (the AI recipe-generation assistant, a chart-heavy history view) so the initial bundle for common flows stays small.
- Recipe and cookbook photos are served through Next.js's built-in image component: responsive sizing, lazy loading below the fold, and a CDN -- important given how image-forward the recipe and cookbook surfaces are.
- Likely next navigations are prefetched: hovering a recipe card prefetches its detail query (TanStack Query) and its route (Next.js link prefetching), so the common path from a feed to a recipe feels instant.
- A bundle-size budget is enforced in CI, since the authenticated app shell is used heavily on mobile web where bundle size directly affects time-to-interactive.

## Accessibility & Responsive Strategy

- WCAG 2.1 AA is the baseline (per the BRD's non-functional requirements). Every safety status is conveyed through an icon and a text label as well as color -- never color alone -- so the distinction between conflict and unverified survives for colorblind users, exactly where it matters most.
- Radix UI primitives provide keyboard navigability and focus management (focus trapping in dialogs, roving tab index in menus) out of the box, so these aren't rebuilt per feature.
- Layouts are mobile-first. The Meal Party "who's eating" view in particular is a utility pattern, not a card gallery: a scannable table on larger screens, collapsing to a stacked list on mobile, so a host can find an allergy fast under time pressure.
- Dark mode is supported through Tailwind's class-based dark mode and CSS custom properties; the reserved safety colors (conflict, unverified) are separately contrast-checked in both themes, not just inherited from the light-mode values.
- Touch targets are at least 44x44px for high-frequency mobile-web actions (claiming a dish, confirming an allergy).

## Testing Strategy

| Level | Tool | Focus |
| --- | --- | --- |
| Unit | Vitest | Pure logic: formatting, derived display state, Zod schema validation against backend contracts |
| Component | React Testing Library | Shared components rendered against every state they can receive -- `SafetyBadge` in particular, tested against all three safety states plus loading and error |
| End-to-end | Playwright | Full critical flows: accept an invite into a lite account and see the Party's safety summary; a potluck contribution flagged unsafe; the claim flow preserving history; revoking one of two concurrent invite links without breaking the other |
| Visual regression | Storybook + a snapshot tool (e.g. Chromatic) | The design-system components, so a palette or spacing change is reviewed deliberately, not discovered in production |

Safety-adjacent code carries disproportionate test weight relative to its size: an explicit test asserts that `SafetyBadge` and every component that consumes a safety result render the unverified treatment -- never a safe one -- when the underlying query is `null`, loading, or errored. This is treated as a release-blocking test class, not a nice-to-have.

## Project Structure, Build & Deployment

A monorepo keeps the contracts between layers enforceable and pays off if a React Native client is ever added:

- `apps/web` -- the Next.js application (routes, pages)
- `packages/ui` -- the design system (primitives, composed patterns, `SafetyBadge`), documented in Storybook
- `packages/api-client` -- the typed REST client and the Zod schemas mirrored from the backend's models
- `packages/shared` -- framework-agnostic utilities, types, and formatting logic usable outside React

**CI**, required before merge: lint, typecheck, unit and component tests, a Playwright smoke suite covering the flows in Testing Strategy, a bundle-size check, and a Storybook visual-regression build.

**Deployment**: the web app deploys to standard Next.js hosting with environment-specific configuration (staging and production API base URLs); each pull request gets a preview deployment for design and product review before merge; feature flags gate the phased rollout described in the BRD (Meal Party, then food history/restaurants, then cookbook/social/calendar, then native mobile).

## Risks & Open Technical Questions

**Risks**

- The frontend's safety union type (`safe` / `conflict` / `unverified`) can drift from the backend's model as the backend evolves; mitigate with generated or contract-tested types rather than hand-copied ones.
- Polling-based Party updates may not scale cleanly to very large or very active Parties; the WebSocket/SSE upgrade path should be designed now, even if not built for v1.
- A single shared `SafetyBadge` and design-system package becomes a bottleneck for every feature team if it has no clear owner; it needs one before multiple teams are building against it concurrently.

**Open questions**

- Will native mobile be built with React Native (sharing `packages/shared` and possibly more) or fully native per platform? This changes how aggressively business logic should be pulled out of React components now versus later.
- What Party size or update-frequency threshold would justify moving off polling to a push-based channel?
- Should the typed API client be generated from a published OpenAPI contract, or hand-maintained as Zod schemas kept in sync with the backend models -- this depends on whether the backend team will commit to publishing and versioning an OpenAPI spec.
- What hosting environment is the web app targeting (managed platform vs. the organization's own infrastructure), since that affects the deployment and preview-environment design above.
