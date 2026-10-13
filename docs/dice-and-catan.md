# Dice and Catan companion

Standard 3D dice plus a turn-order and analytics companion for Catan games.

[← Back to the README](../README.md)

- Roll one to ten conventional six-sided dice at once and apply a positive or negative modifier.
- Dice use valid one-through-six pip layouts without printed numerals; each settled top face is derived from the same predetermined value shown in the final `x + y = z` expression, including positive or negative modifiers.
- Render the actual requested number of six-face 3D dice across a top-down felt table with planar friction, visible three-axis tumbling and lift, rail restitution, and die-to-die collisions.
- Click anywhere on the felt dice table, or focus it and press Enter/Space, to roll again without returning to the Roll button.
- Preserve naturally scattered, non-overlapping resting positions instead of arranging results into a row.
- Layered table thumps and dice clacks respond to collision velocity; final values remain determined by the fair random roll rather than the animation.
- Track persistent total distributions in a responsive high-DPI histogram and reset them independently.

### Catan companion

- Set up two to six players with optional names and a configurable per-settlement placement timer (10–600s, default 60s).
- Opt into subtly loaded dice that assign small, independent random deviations across all six faces of each die; the two distinct profiles persist only for that game, regenerate for a new game, and do not systematically favor high or low numbers.
- Decide turn order at game start: every player rolls once, ranked by descending total; tied players immediately reroll against just each other (repeating until every tie is broken) before turn order is finalized. These order-decision rolls are excluded from all analytics (player stats, histograms, and the full log).
- Once turn order is set, guide players through initial settlement placement with a pop-up that highlights the current player and counts down the configurable timer, auto-advancing (or via a manual "Done" button) to the next player in snake order — first settlement forward through turn order, then second settlement in reverse, so the last player to go first goes twice in a row before play begins.
- Track the active player and automatically advance turns after each roll.
- Animate two physical d6 dice and call out robber rolls.
- Keep a concise recent-roll summary plus a complete persistent roll log.
- Show per-player roll totals, robber counts, averages, and a 2–12 sum histogram.
- Compare observed sums with the active game's exact 2d6 distribution after five rolls, using either fair odds or its two randomized loaded-die profiles.
- Resume an in-progress game after reloading or explicitly start a new game.
- Automatically reset turn order and roll history one hour after the latest roll while preserving the current players; older saved games derive expiry from their latest logged roll.
