# Verification

## First-feature acceptance

The milestone must pass type checking, production bundling, inventory/source integrity and real browser wheel flows. Tests inspect the production build and exercise desktop Chromium and mobile WebKit, including no horizontal overflow and reduced motion. Isolation checks permit only the namespaced redesign wheel record and assert no external requests.

The inventory test hashes the actual baseline Git objects, verifies every cited source/test exists, and checks local documentation links. Screenshots are generated from the built preview.

## Execution evidence

Verified on 2026-10-25 against the source baseline recorded in [the inventory](parity.json):

| Check | Result |
| --- | --- |
| Redesign type check and production build | Passed |
| Inventory / source-hash / documentation checks | 3/3 passed |
| Desktop Chromium + mobile WebKit browser checks | 12/12 passed |
| Automated WCAG A/AA checks on wheel, dialog, roadmap and detail routes | No violations in tested pages |
| Root JavaScript baseline suite | 84/84 passed at the foundation baseline; rerun before parity sign-off |
| Desktop and mobile captures | Generated from production build and visually inspected |

Browser coverage edits and restores options, validates integer weight drafts, changes visual repeats, exercises presets and custom-state recovery, spins through the real result dialog, checks keyboard use and reduced motion, verifies responsive canvas geometry, traverses the roadmap, and asserts no external requests. This is implementation evidence for P01/P02, not complete parity sign-off.

Commands: `npm --prefix redesign run build`, `npm --prefix redesign test`, `npm --prefix redesign run check:format`, `npm --prefix redesign run test:browser`, `npm --prefix redesign run capture`. Browser tests use the built preview; baseline JavaScript tests use the existing root runner. Dependencies are exact-pinned with package-local locks.

## Trace findings and fixes

The trace covered the original wheel entry points, presets, option identity, input-set expansion, weight validation, cryptographic selection, animation/result ownership, persistence boundaries, canvas resizing, responsive layout, roadmap consumers, documentation, capture script and browser checks.

The browser trace caught three issues before sign-off: ambiguous option-row test selectors, a mobile-only hidden count assertion, and insufficient text contrast on the coral action color. The implementation now uses exact semantic selectors, asserts mobile-visible outcomes, and uses an AA-passing darker coral. The capture trace then exposed a blank first-frame WebKit canvas: the renderer now performs an initial layout measurement in addition to observing resizes, and both the browser suite and capture script require a painted canvas pixel. This was a missed lifecycle-to-capture trace, corrected before handoff. The capture script also still waited for the retired catalog home; tracing its consumer surfaced and corrected that stale assumption.

## Remaining release work

P01 and P02 are implemented but not yet parity-verified. Sound/ticks and ambient motion (P03), statistics, dice/Catan, verse discovery, legacy saved-data migration, offline installation and full platform recovery remain planned. The theme control is a functional preview, not yet the OS-aware persistent preference required by P11. Physical-device sound, haptics and screen-reader sign-off remain release work.
