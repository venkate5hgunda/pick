# Requirements and feature parity

Baseline commit: `76f540473de7737badf6afb397b550b772578d96`. Goal: preserve 100% of user-visible capabilities, saved-data compatibility, accessibility and meaningful privacy boundaries while allowing new internals and interaction flows. Equivalence is judged by outcomes, not pixel copying. Existing defects are not requirements; document intentional corrections and their regression tests.

The inventory has **12 feature groups**. Groups contain multiple acceptance cases; the count is not a claim about total individual features. The cited baseline implementations and linked product documents are normative for options and rules not restated here. Any newly discovered behavior must be added before its implementation is retired. Unmapped tests and manual flows remain explicit follow-up work.

| ID | Feature | Area | Redesign status |
| --- | --- | --- | --- |
| [P01](#p01) | Decision wheel | Wheel | Planned |
| [P02](#p02) | Weighted selection | Wheel | Planned |
| [P03](#p03) | Spin, sound and motion | Wheel | Planned |
| [P04](#p04) | Animated batches | Statistics | Planned |
| [P05](#p05) | Instant simulations and history | Statistics | Planned |
| [P06](#p06) | Standard dice | Dice | Planned |
| [P07](#p07) | Catan setup and opening order | Catan | Planned |
| [P08](#p08) | Placement and turn lifecycle | Catan | Planned |
| [P09](#p09) | Catan analytics | Catan | Planned |
| [P10](#p10) | Verse discovery | Experience | Planned |
| [P11](#p11) | Accessible expressive interface | Experience | Planned |
| [P12](#p12) | Offline and saved preferences | Platform | Planned |

## Shared release requirements

- Complete every acceptance case through a real browser flow; exercise errors, cancellation, reload and state recovery as appropriate.
- Preserve bright original artwork, legible contrast, touch and keyboard operation, focus management, reduced motion, and mobile/landscape/desktop layouts. Primary action and active actor remain apparent.
- Treat installation, first-load caching, fully offline operation, interrupted updates and multi-tab version consistency as separate cases.
- Keep behavior, domain state, persistent data and presentation independently testable; one authoritative owner for each state transition.
- A planned or merely implemented feature is not verified parity. Track pending, implemented and verified evidence separately when migration begins. Foundation status is intentionally all planned.
- A backend replacement must specify user-visible availability, consent, data retention, authority and recovery semantics before activation. Architectural freedom does not erase these requirements.

## P01

**Decision wheel** · Wheel · Planned

- Fresh Yes/No wheel repeats five input sets, ten visible slices.
- Edit labels and colors; add/remove options; repeat one to five input sets without changing semantic odds.
- Yes/No, Maybe, coin, RPS, meals and player-order presets restore useful set counts; customized configurations display Select after reload.

Sources: [js/wheel-tab.js](../../js/wheel-tab.js), [js/wheel.js](../../js/wheel.js), [docs/wheel.md](../../docs/wheel.md).

Baseline tests: [test/wheel.test.js](../../test/wheel.test.js), [test/wheel-controller.test.js](../../test/wheel-controller.test.js).

## P02

**Weighted selection** · Wheel · Planned

- Equal odds by default; optional integer weights persist.
- Mobile weight drafts remain editable; invalid blurred values revert to one.
- Visual slice sizes communicate weighted probability; crypto selection determines the result independently of animation.
- Repeated visual slices map back to the correct semantic result.

Sources: [js/random.js](../../js/random.js), [js/wheel.js](../../js/wheel.js), [js/wheel-tab.js](../../js/wheel-tab.js).

Baseline tests: [test/random.test.js](../../test/random.test.js), [test/wheel.test.js](../../test/wheel.test.js).

## P03

**Spin, sound and motion** · Wheel · Planned

- Seven-second decelerating spin lands at the exact selected segment center, including uneven weights.
- Ticks follow every crossed boundary; colors remain saturated while controls lock.
- Accessible result overlay offers dismissal and Spin again with contained celebration.
- Ambient motion starts only after two visible idle minutes, stops on activity/departure, and takes 240 seconds per revolution.
- Resize, first mount and returning from Dice keep a square centered high-DPI wheel.

Sources: [js/wheel.js](../../js/wheel.js), [js/audio.js](../../js/audio.js), [docs/wheel.md](../../docs/wheel.md).

Baseline tests: [test/wheel-animation.test.js](../../test/wheel-animation.test.js), [test/wheel-rendering.test.js](../../test/wheel-rendering.test.js), [test/audio.test.js](../../test/audio.test.js).

## P04

**Animated batches** · Statistics · Planned

- Run 2–12 miniature wheels, independently settling in six to ten seconds inside the main footprint.
- Lock options and run controls; reset cancels callbacks and records no partial batch.
- Show counts, percentages and unique-dominant result after all wheels settle.
- Return to regular mode preserves options and historical statistics; Spin can return and start a single spin.
- Scale simultaneous tick volume by wheel count.

Sources: [js/wheel-batch.js](../../js/wheel-batch.js), [js/wheel.js](../../js/wheel.js), [docs/statistics.md](../../docs/statistics.md).

Baseline tests: [test/wheel-controller.test.js](../../test/wheel-controller.test.js), [test/wheel.test.js](../../test/wheel.test.js).

## P05

**Instant simulations and history** · Statistics · Planned

- Run 13–10,000 weighted selections instantly and show per-run results.
- Aggregate duplicate labels; keep historical labels in the full denominator after option changes.
- High-DPI charts respond to size/theme with counts, percent axes and theoretical markers.
- Independently reset statistics; CSV escapes commas, quotes and newlines.

Sources: [js/stats.js](../../js/stats.js), [js/wheel-tab.js](../../js/wheel-tab.js), [docs/statistics.md](../../docs/statistics.md).

Baseline tests: [test/stats.test.js](../../test/stats.test.js).

## P06

**Standard dice** · Dice · Planned

- Roll one to ten d6 dice with positive or negative modifier.
- Pips, predetermined top faces and result expression agree.
- Felt table supports pointer and Enter/Space rolls; prevent overlapping roll commands.
- Animate lift, three-axis tumble, rail/die collisions and non-overlapping scattered rest positions.
- Persist distribution and support independent reset.

Sources: [js/dice.js](../../js/dice.js), [js/dice-tab.js](../../js/dice-tab.js), [js/dice-animation.js](../../js/dice-animation.js), [docs/dice-and-catan.md](../../docs/dice-and-catan.md).

Baseline tests: [test/dice.test.js](../../test/dice.test.js), [test/dice-controller.test.js](../../test/dice-controller.test.js).

## P07

**Catan setup and opening order** · Catan · Planned

- Configure two to six named players; suffix duplicate names.
- Placement timer range 10–600 seconds with 60-second default.
- Optional loaded dice use two independent near-fair six-face profiles, fixed for the game and regenerated for new games.
- Rank opening rolls descending, recursively reroll only tied players, exclude opening rolls from all statistics.

Sources: [js/dice.js](../../js/dice.js), [js/dice-tab.js](../../js/dice-tab.js), [docs/dice-and-catan.md](../../docs/dice-and-catan.md).

Baseline tests: [test/dice.test.js](../../test/dice.test.js), [test/dice-controller.test.js](../../test/dice-controller.test.js).

## P08

**Placement and turn lifecycle** · Catan · Planned

- Guide two settlement rounds in snake order; mandatory dialog shows actor and deadline.
- Manual Done or elapsed-time deadline advances exactly once, including hidden-page recovery.
- Roll two dice, announce robber sevens and advance active player exactly once.
- Resume the full game after reload; after one hour since latest roll reset order/history while retaining players.
- Older checkpoints derive expiration from latest log entry.

Sources: [js/dice.js](../../js/dice.js), [js/dice-tab.js](../../js/dice-tab.js).

Baseline tests: [test/dice.test.js](../../test/dice.test.js), [test/dice-controller.test.js](../../test/dice-controller.test.js).

## P09

**Catan analytics** · Catan · Planned

- Show recent rolls, full persisted log, per-player sums, robber counts and averages.
- After five gameplay rolls compare 2–12 observed sums to exact convolution of the active pair of fair or loaded dice profiles.

Sources: [js/dice.js](../../js/dice.js), [js/stats.js](../../js/stats.js), [docs/dice-and-catan.md](../../docs/dice-and-catan.md).

Baseline tests: [test/dice.test.js](../../test/dice.test.js), [test/stats.test.js](../../test/stats.test.js).

## P10

**Verse discovery** · Experience · Planned

- Footer heart opens a random curated verse.
- Fetch complete HelloAO translations grouped by language; persist selection.
- Next verse works inside the same dialog; bundled English fallback works offline.

Sources: [js/verses.js](../../js/verses.js), [js/verse-modal.js](../../js/verse-modal.js), [docs/experience.md](../../docs/experience.md).

Baseline tests: [test/verses.test.js](../../test/verses.test.js).

## P11

**Accessible expressive interface** · Experience · Planned

- OS theme plus persistent override; sound control remains available.
- Text contrast 4.5:1 and focus indicators 3:1 in both themes; custom wheel labels choose readable contrast.
- Dialogs trap focus, disable background and restore focus; Escape/backdrop close only dismissible dialogs.
- Touch, keyboard, screen readers, reduced motion and narrow/landscape layouts retain complete tasks.
- Use original wordmark and artwork with clear tooltips and live results.

Sources: [js/theme.js](../../js/theme.js), [js/modal.js](../../js/modal.js), [js/tooltip.js](../../js/tooltip.js), [js/ui-controller.js](../../js/ui-controller.js), [docs/experience.md](../../docs/experience.md).

Baseline tests: [test/contrast.test.js](../../test/contrast.test.js), [test/modal.test.js](../../test/modal.test.js), [test/haptics.test.js](../../test/haptics.test.js).

## P12

**Offline and saved preferences** · Platform · Planned

- Installable app works after completed shell caching; updates must not mix asset versions.
- Retain wheel settings/stats, selected tab, dice mode/stats, Catan checkpoint, translation, theme and sound.
- Storage failures must be visible in the redesign without losing the in-memory task.
- Local use requires no account; external verse access has an offline fallback.

Sources: [js/storage.js](../../js/storage.js), [sw.js](../../sw.js), [manifest.json](../../manifest.json), [docs/deployment.md](../../docs/deployment.md).

Baseline tests: [test/service-worker.test.js](../../test/service-worker.test.js).
