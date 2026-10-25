# Target architecture

## Decision and scope

Use **Svelte + TypeScript + Vite**. This supersedes the original no-frontend-build constraint for the redesign, following the framework discussion and explicit redesign request. The existing root app remains the behavior reference during phased migration. The first milestone implements the foundation and traceable feature explorer only.

Vite builds static assets; hash navigation keeps preview deep links independent of server rewrites. A production route scheme will preserve existing inbound hashes or supply an explicit alias adapter. Runtime servers are introduced only for features that need them. Dependencies are exact-pinned with a separate lockfile; upgrades receive their own review.

## Ownership

```text
User input → route/view → feature controller → domain transition
                                    ↓                ↓
                             effects adapter ← committed result
                                    ↓
                           persistence / transport
```

- `redesign/src/App.svelte` owns the shell, wheel controller composition and route composition.
- `redesign/src/domain/wheel.ts` owns presets, option expansion, weight validation and cryptographic selection. `redesign/src/features/wheel/WheelCanvas.svelte` owns high-DPI rendering only; it never chooses outcomes.
- `redesign/src/lib/catalog.ts` adapts the durable parity inventory for the explorer. Production logic is not imported into this preview.
- `redesign/src/styles.css` owns shared layout; `theme.css` owns this product's tokens. Avoid scattered override stylesheets.
- Add `src/features/<feature>/` for cohesive view/controller code when that feature is implemented, `src/domain/` for pure rules, `src/platform/` for browser persistence/audio/timers/network, and `src/components/` for genuinely shared controls. Do not create empty abstraction layers in advance.
- `docs/redesign/` owns requirements, decisions, migration and evidence. `docs/images/` owns actual browser captures. Existing root source/tests remain the reference during migration.

## State and lifecycle

Local view state controls disclosures, filters and temporary inputs. Durable domain state owns user progress/game outcomes. Components subscribe to committed snapshots and dispatch intentions. Do not mirror durable state into a competing UI store. All timers, animation frames, listeners, network requests and workers have explicit ownership and cleanup. Late results carry session/route identity and cannot mutate a replacement view.

Randomness, time and identifiers are injected into pure rules so tests can replay transitions. Cryptographic randomness remains the production choice where outcomes require it. Animation visualizes a chosen result; frame rate cannot change that result. Persistence adapters distinguish a committed write from an in-memory optimistic update.

## Routes and composition

Target product surfaces: Wheel, Statistics, Dice, Catan, verse dialog, preferences. Foundation routes are `/` and `/requirements/:id` within the URL hash. Unknown feature routes provide recovery; route changes focus the heading. Catalog search and category buttons are accessible native controls. The browser tests cover actual built navigation and data rendering.

## Svelte boundaries

Use Svelte reactive state and derived values for wheel options, disclosures and displayed totals. Share only state that crosses feature boundaries. Use SvelteKit if independently addressable tool routes or richer loading conventions justify it later; the initial focused client app uses Vite directly.

Separate fair/weighted selection, statistics and Catan phase transitions from Canvas/3D rendering. Prefer adapting tested probability/dice functions before rewriting them. Wheel and dice renderers expose mount/update/dispose contracts and accept predetermined outcomes. Catan is an explicit setup → order/tie-break → placement → play state machine, with deadlines persisted as timestamps. The verse API is a replaceable adapter with bundled offline content. No application server is currently needed.

## Delivery, PWA and security

The redesign serves on loopback on a dedicated port, imports only its own code and the public parity JSON, and never registers a service worker. The first wheel slice persists only `pick:redesign:wheel-v1`, keeping it separate from the original schema until the explicit migration phase. Vite's filesystem allowlist is restricted to the package and `docs/redesign/`. Build output is not deployed by existing production workflows.

Before product rollout, introduce a dedicated manifest, asset graph and scope-owned service worker, then test install/update/offline behavior. Avoid CDN runtime dependencies. Static hosting must include the correct repository base path and all lazy feature assets. Use a separate preview origin for any later migration experiments so production storage and workers cannot be modified accidentally.

Treat imported content as text and validate serialized input at boundaries. Keep secrets server-side. Preserve content/art licenses. Add dependencies only where they remove a concrete responsibility; TypeScript is shared across UI, domain types and adapter contracts.

## Design direction

Retain the app's identity while improving clarity and movement. Use the current foundation's bright palette and original geometric illustration as an initial direction, not a final art system. Future game/exercise views require task-specific original artwork, visible action/state feedback, compact secondary settings and full keyboard/touch behavior. Visual approval is based on real desktop/mobile flows and captures, including light/dark and reduced motion.

## Test-runner isolation

Foundation checks live under `redesign/checks/`, with an explicitly invoked `inventory.check.mjs` and Playwright specs. The baseline repos use Node automatic test discovery; a nested `test/` directory would cause Node to execute Playwright specs with the wrong runner. Keep the new package checks explicit so root test commands remain independent.
