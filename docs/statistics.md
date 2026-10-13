# Statistical mode

Run many simulated spins at once and study the distribution.

[← Back to the README](../README.md)

- Keep the main interface quiet by expanding statistical controls only from the collapsed More Options disclosure.
- Run 2–12 miniature wheels simultaneously inside the main wheel footprint; each settles independently at a random time between six and ten seconds.
- Miniature wheels use dynamic row and column counts with square, container-relative canvases at every supported batch size.
- Animated batches hide the original canvas, identify the active parallel run, and give every miniature wheel its own pointer.
- Once every animated wheel settles, an accessible overlay summarizes that batch's counts and percentages and highlights the uniquely dominant option when one exists.
- Run 13–10,000 weighted selections instantly for larger samples.
- Every instant run opens its own results overlay with option-level counts, percentages, proportional chart bars, and unique-dominant highlighting.
- Return from either batch view with **Reset to regular mode**, always visible beside SPIN; **SPIN** also restores the regular wheel and starts a single spin. Reset cancels an unfinished animated batch without recording partial results and preserves accumulated statistics and wheel options.
- Animated and instant runs feed the same persistent distribution tracker.
- Parallel wheel ticks use count-aware attenuation and slight per-wheel volume variation to avoid stacked, artificial loudness.
- Responsive high-DPI histograms redraw programmatically when their measured container or theme changes.
- Charts include percentage axes, adaptive labels, observed counts, and theoretical markers where applicable.
- Reset wheel statistics or export them as CSV.
