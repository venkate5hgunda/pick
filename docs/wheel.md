# Decision wheel

Everything the wheel does: options, weights, presets, spin physics and sound.

[← Back to the README](../README.md)

- Fresh sessions open with a Yes/No wheel displayed as five repeated input sets (ten visual slices).
- The wheel fills its circular enclosure on first load and stays centered and square when resizing, rotating a device, or returning from Dice. CSS controls the layout; the canvas bitmap follows that size at the display's pixel density.
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
