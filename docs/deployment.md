# Deploying to GitHub Pages

Pick is fully static, so any static host works.

[← Back to the README](../README.md)

1. Push this repo (or the `pick/` folder) to GitHub.
2. In **Settings → Pages**, set the source to the branch/folder containing `index.html` (e.g. `main` branch, `/pick` folder, or move contents to repo root / `docs/`).
3. Visit the published URL — everything runs client-side, no server or API keys required.

The original app is published at the site root. The in-progress redesign is published separately at `/pick/redesign/preview/` from the checked-in build in `redesign/preview/`. After changing redesign source, refresh that build before committing:

```sh
npm --prefix redesign ci
npm --prefix redesign run build
rm -rf redesign/preview
mkdir -p redesign/preview
cp -R redesign/node_modules/.cache/redesign-dist/. redesign/preview/
```

Commit the refreshed preview with the source changes. GitHub Pages publishes it from `main` along with the original app.
