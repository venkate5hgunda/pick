# Migration, decisions and delivery

## Decision trace

- Start from refreshed `origin/main` at `76f540473de7737badf6afb397b550b772578d96`. The existing code, its tests, product documentation and the [source snapshot](source-snapshot.json) anchor the requirements.
- The initial no-build architecture optimized direct static deployment. The user's redesign request supersedes that implementation constraint, while preserving user capabilities and allowing new logic, flows and backend internals.
- The agreed first milestone is requirements, architecture and runnable foundations. Full implementation is intentionally deferred and each [parity record](parity.json) remains planned.
- The practical stack chosen in the conversation is Svelte/TypeScript/Vite for Pick and React/TypeScript/Vite/React Router for Arcade and Sharp. Vue was considered for Sharp; common React tooling across the larger apps is the selected tradeoff.
- Maintain product-specific implementations in their own repos. Share conventions first; extract a shared package only after actual duplication and compatible ownership justify it.

## Source-of-truth and discrepancy handling

Inspect behavior in source and tests before trusting an older README or architecture summary. Preserve intentional behavior; record a discovered bug as a correction with a regression case. An unverified baseline test mapping is a starting point, not proof of end-to-end coverage. The source snapshot records hashes rather than copying all old source into the new app.

The full wheel and dice docs were reviewed alongside controllers, probability helpers and existing regressions. Wheel presets, statistical cancellation, valid top-face animation, Catan tie breaks and placement deadlines are distinct requirements. The hidden verse experience is retained. The source storage wrapper silently tolerates failure; the redesign intentionally adds visible persistence feedback while retaining playable in-memory behavior.

## Persistent contracts

The `pick:` localStorage namespace contains wheel segments, input sets, weighting mode, cumulative statistics, active tab, dice mode/statistics, Catan checkpoint, translation, sound and theme. Exact key names remain in [storage.js](../../js/storage.js). The Catan game object in `catan.log` includes phases, order/tie information, players, placement deadlines, per-game die profiles and history. Preserve the existing legacy-expiry reader.

Before first migrated write, capture representative old records, validate and version the new envelope, preserve original bytes, then migrate idempotently. Test fresh, valid, expired, malformed, quota-blocked and duplicate-label histories. New serializers must not make the old app overwrite new data silently. An explicit migration/export step is preferable to opening both versions on the same origin while schemas differ.

## Implementation sequence

1. **Foundation (this branch):** source inventory, acceptance criteria, architecture, isolated package, typed shell, accessible feature explorer, browser checks and screenshots.
2. **First complete feature:** Extract seeded probability and Catan transitions into typed domain modules, then deliver one complete wheel flow with save/resume and accessible results.
3. **Expand in coherent groups:** implement the remaining feature families with current state/serialization fixtures and browser evidence. Maintain old routes through aliases where required. Update parity status and attach exact test paths and evidence commits.
4. **PWA and recovery:** versioned storage migration, offline asset graph, scope-safe update handling, install/standalone testing, quota/private mode and multi-tab behavior.
5. **Parity release:** execute every acceptance case and the full original regression suite; review documented corrections, data migration, artwork and real device behavior. No open blocker may be hidden behind an implemented status.

## Branch and rollout policy

Push this milestone to `codex/redesign-foundation`; do not merge or deploy it automatically. The dedicated workflow validates the new package on that branch and relevant pull requests. Existing app source, root package dependencies, production service workers and release flags are not changed by the foundation. Build output stays in ignored package-local cache; the lockfile is committed.

Use a separate preview origin during later implementation. Before replacing the public app, validate old-to-new storage fixtures, an explicit return/backup path, inbound URLs, service-worker update behavior and full feature parity. An old service worker can intercept new paths on the same origin, so preview isolation must be operational rather than a folder name alone.

## Trace checklist for every migrated feature

Trace UI entry points → controller/actions → domain rules → persistence/transport → projections/rendering → serialized output → docs and tests. Include every consumer of changed roles, phases, flags, IDs and fields. Revisit the original decision when changing its premise. Record newly discovered requirements and additional edits; identify missed traces explicitly if they cause a defect.
