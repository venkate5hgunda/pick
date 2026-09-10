# Pick!

A fluid, static "yes/no wheel" — replicating [pickerwheel.com](https://pickerwheel.com/tools/yes-or-no-wheel/) — plus statistical batch simulation, a dice roller (standard + Catan mode), and a hidden bible-verse easter egg. Pure HTML/CSS/JS, no build step, deployable directly on GitHub Pages.

## Full feature list

### Decision wheel

- Fresh sessions open with a Yes/No wheel displayed as five repeated input sets (ten visual slices).
- Choose one to five input sets to repeat a short option list without changing its underlying odds.
- Add and remove options, edit labels, and choose colors with compact field labels for clarity.
- Keep equal odds by default, or reveal optional integer weights with a persistent Weighted toggle; weight fields allow free mobile editing and validate only when focus leaves, reverting invalid drafts to `1`.
- Load Yes/No, Yes/No/Maybe, Heads/Tails, Rock/Paper/Scissors, meal, and player-order presets.
- Keep the preset selector synchronized with the persisted wheel: exact built-in configurations show their preset name, while any option, color, weight, input-set, or weighting customization shows **Select**, including after reload.
- Presets automatically choose a useful input-set count for a lively wheel composition.
- Cryptographically strong selection keeps repeated visual slices mapped to their semantic result.
- Weighted mode resizes visual slices proportionally so the wheel always communicates the configured odds.
- A seven-second spin uses exponential velocity decay for a fast initial impulse, natural speed variation, a suspenseful final crawl, and mathematically exact center landing on the fairly selected result, including uneven weighted wheels with many options.
- Segment colors retain their full saturation during active spins while the interaction surface is temporarily locked.
- Ticker clicks occur on the actual weighted segment edges, including every edge crossed between animation frames, so their cadence naturally slows with the wheel.
- Layered Web Audio synthesis combines filtered noise and resonant body tones for tactile wheel clicks, dice impacts, and a restrained finish chime without external sound assets.
- After each spin, an accessible result overlay presents the selected option, a dismiss control, a **Spin again** button, and a contained confetti burst.
- Ambient rotation begins only after two minutes of continuous, visible-page inactivity, stops on any user activity or page departure, and completes one gentle revolution every 240 seconds.
- Optional vibration and a persistent sound toggle respect the user's device and preference.
- A central pointer hub uses an original path-based SPIN! wordmark and remains click-through to the wheel surface.
- Automatic light/dark text selection keeps labels legible against custom segment colors.
- Wheel options, input-set count, accumulated results, and active app tab persist in `localStorage`.

### Statistical mode

- Keep the main interface quiet by expanding statistical controls only from the collapsed More Options disclosure.
- Run 2–12 miniature wheels simultaneously inside the main wheel footprint; each settles independently at a random time between six and ten seconds.
- Miniature wheels use dynamic row and column counts with square, container-relative canvases at every supported batch size.
- Animated batches hide the original canvas, identify the active parallel run, and give every miniature wheel its own pointer.
- Once every animated wheel settles, an accessible overlay summarizes that batch's counts and percentages and highlights the uniquely dominant option when one exists.
- Run 13–10,000 weighted selections instantly for larger samples.
- Every instant run opens its own results overlay with option-level counts, percentages, proportional chart bars, and unique-dominant highlighting.
- Animated and instant runs feed the same persistent distribution tracker.
- Parallel wheel ticks use count-aware attenuation and slight per-wheel volume variation to avoid stacked, artificial loudness.
- Responsive high-DPI histograms redraw programmatically when their measured container or theme changes.
- Charts include percentage axes, adaptive labels, observed counts, and theoretical markers where applicable.
- Reset wheel statistics or export them as CSV.

### Standard dice

- Roll one to ten conventional six-sided dice at once and apply a positive or negative modifier.
- Dice use valid one-through-six pip layouts without printed numerals; each settled top face is derived from the same predetermined value shown in the final `x + y = z` expression, including positive or negative modifiers.
- Render the actual requested number of six-face 3D dice across a top-down felt table with planar friction, visible three-axis tumbling and lift, rail restitution, and die-to-die collisions.
- Click anywhere on the felt dice table, or focus it and press Enter/Space, to roll again without returning to the Roll button.
- Preserve naturally scattered, non-overlapping resting positions instead of arranging results into a row.
- Layered table thumps and dice clacks respond to collision velocity; final values remain determined by the fair random roll rather than the animation.
- Track persistent total distributions in a responsive high-DPI histogram and reset them independently.

### Catan companion

- Set up two to six players with optional names.
- Opt into subtly loaded dice that assign small, independent random deviations across all six faces of each die; the two distinct profiles persist only for that game, regenerate for a new game, and do not systematically favor high or low numbers.
- Track the active player and automatically advance turns after each roll.
- Animate two physical d6 dice and call out robber rolls.
- Keep a concise recent-roll summary plus a complete persistent roll log.
- Show per-player roll totals, robber counts, averages, and a 2–12 sum histogram.
- Compare observed sums with the active game's exact 2d6 distribution after five rolls, using either fair odds or its two randomized loaded-die profiles.
- Resume an in-progress game after reloading or explicitly start a new game.
- Automatically reset turn order and roll history one hour after the latest roll while preserving the current players; older saved games derive expiry from their latest logged roll.

### Bible verse easter egg

- The heart in the “Made with ♥ by Venkatesh” footer opens a random curated Bible verse.
- Load the live [HelloAO Bible API](https://bible.helloao.org/docs/) catalog of complete JSON translations.
- Group Bible versions by language and retain the selected version as a local preference.
- Request another random verse without closing the dialog.
- Use a bundled English fallback when the live service is unavailable.

### Experience and accessibility

- Treat WCAG AA contrast as a release requirement in both themes: normal text and action labels target at least 4.5:1, while focus indicators target at least 3:1.
- Enforce core theme-pair contrast with automated tests so palette changes cannot silently reduce legibility.
- Original path-based SVG logo, favicon, and hand-lettered Pick! wordmark.
- Automatic OS light/dark theme detection with a persistent manual override and familiar mode icons.
- Persistent sound preference with an always-available sound control.
- Responsive layouts for phone, tablet, laptop, and wide desktop without horizontal overflow.
- Keyboard-focus styles, semantic labels, live result regions, high-contrast wheel text, and `prefers-reduced-motion` support; reduced motion retains result feedback without confetti or ambient rotation.
- Keep icon-only controls and interactive graphics simple while exposing concise hover/focus hints that mirror their accessible names.
- Dialogs close from a persistent top-right control, the Escape key, or a click on the backdrop.
- Static HTML, CSS, and JavaScript with no build step, accounts, cookies, API keys, or server-side state.

## Local development

No build step is required, but ES module scripts need to be served over HTTP (not `file://`):

```bash
cd pick
python3 -m http.server 8080
# open http://localhost:8080
```

## Tests

Pure logic (probability, wheel geometry and motion, boundary-aligned audio timing, dice math, stats, and Catan turn/expiry state) is unit tested with Node's built-in test runner:

```bash
npm test
```

## Deploying to GitHub Pages

1. Push this repo (or the `pick/` folder) to GitHub.
2. In **Settings → Pages**, set the source to the branch/folder containing `index.html` (e.g. `main` branch, `/pick` folder, or move contents to repo root / `docs/`).
3. Visit the published URL — everything runs client-side, no server or API keys required.
