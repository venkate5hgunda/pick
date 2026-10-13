<div align="center">

# 🎡 Pick!

**Can't decide? Spin it.** A fluid yes/no wheel, a batch simulator, 3D dice and a Catan companion — all in your browser.

[![Live app](https://img.shields.io/badge/▶_Open_the_app-ff5a52?style=for-the-badge)](https://venkate5hgunda.github.io/pick/)
![No build step](https://img.shields.io/badge/build-none-2ea44f?style=for-the-badge)
![License: MIT](https://img.shields.io/badge/license-MIT-f5a00b?style=for-the-badge)

<img src="docs/images/spin.gif" alt="The Pick wheel spinning and landing on a result" width="640">

</div>

## ✨ Highlights

| | |
| --- | --- |
| 🎡 **Wheel** | Custom options, colors, optional weights, presets and a seven-second physics-based spin. |
| 📊 **Statistics** | Run 2–12 animated wheels or up to 10,000 instant spins and see the distribution. |
| 🎲 **Dice** | One to ten 3D dice on a felt table, plus a Catan mode with turn order and analytics. |
| 🌗 **Polished** | Light/dark themes, sound, haptics, WCAG AA contrast, reduced-motion support. |
| 🔒 **Private** | Static files only — no accounts, cookies, API keys or server state. |

<p align="center">
  <img src="docs/images/wheel-light.png" alt="Wheel in light theme" width="49%">
  <img src="docs/images/wheel-dark.png" alt="Wheel in dark theme" width="49%">
</p>

## 🚀 Quick start

```bash
python3 -m http.server 8080   # serve over HTTP (ES modules don't load from file://)
# open http://localhost:8080
npm test                      # unit tests, Node's built-in runner
```

## 📚 Documentation

| Topic | Page |
| --- | --- |
| Wheel options, weights, presets, spin and sound | [docs/wheel.md](docs/wheel.md) |
| Batch simulation and distribution charts | [docs/statistics.md](docs/statistics.md) |
| Dice and the Catan companion | [docs/dice-and-catan.md](docs/dice-and-catan.md) |
| Themes, accessibility and the easter egg | [docs/experience.md](docs/experience.md) |
| Local development and tests | [docs/development.md](docs/development.md) |
| Hosting on GitHub Pages | [docs/deployment.md](docs/deployment.md) |

<p align="center">
  <img src="docs/images/dice.png" alt="3D dice on a felt table" width="49%">
  <img src="docs/images/mobile.png" alt="Pick on a phone" width="22%">
</p>

## 🗂️ Repository layout

```
index.html, css/, js/, assets/   the app (static, no build)
test/                            unit tests
docs/                            documentation and screenshots
```

## 📄 License

[MIT](LICENSE) © 2026 Venkatesh Gunda. Third-party code, assets and content remain subject to their own licenses.
