# Experience and accessibility

Theming, accessibility commitments and the hidden verse easter egg.

[← Back to the README](../README.md)

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
- Dialogs move keyboard focus inside, keep Tab within the dialog, disable the background, and restore focus when closed. Dismissible dialogs close from a persistent top-right control, Escape, or a backdrop click. The required settlement-placement dialog stays open until placement advances or completes.
- Static HTML, CSS, and JavaScript with no build step, accounts, cookies, API keys, or server-side state.
