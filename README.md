# Ticked

**Process & Workflow Tracker** — a fast, offline-capable PWA for logging timestamped entries and tracking multi-step processes through checkpoints.

> **New here?** If you just want to use the app, jump to [Getting Started](#getting-started). If you're a developer (or Claude) working on the code, see [Developer Setup](#developer-setup).

---

## What this is

Ticked is a single-page PWA for keeping a timestamped log and tracking processes that move through named checkpoints. It runs entirely in the browser, stores your data locally (primarily in **IndexedDB**, with `localStorage` for small settings and as a migration/fallback path), and works offline once installed. Mobile-first, dark by default, no account required.

Use it for: tracking work sessions, daily routines, recurring procedures, anything where you'd otherwise reach for a notes app and a stopwatch.

---

## Quick Reference

The most common tasks. For deeper architecture details, see [`CLAUDE.md`](./CLAUDE.md).

| I want to... | Do this |
| --- | --- |
| Use the app | Open <https://ticked.ranzlappen.com/> in any modern browser |
| Install it like a native app | Open the live site on mobile, then "Add to Home Screen" |
| Run it locally without a server | Open `index.html` directly in a browser (works without ES modules) |
| Run it locally with a server | Use any static server in the repo root, e.g. GitHub Codespaces preview |
| Change the language | Open ⚙ Settings in-app — English, Spanish, German, French |
| Back up data | ⚙ Settings → enable Google Drive sync (you provide a client ID) |
| Force PWA users to get an update | Bump `CACHE_REV` in [`sw.js`](./sw.js) and push to `main` |
| Change UI strings | Edit [`i18n.js`](./i18n.js) (all four language dictionaries live there) |
| Add or change a workflow on GitHub | Edit files in `.github/workflows/` (see [`CLAUDE.md`](./CLAUDE.md) for what each does) |

---

## Getting Started

1. Visit <https://ticked.ranzlappen.com/> on phone or desktop.
2. Tap the input bar to log a timestamped entry, or open the **Processes** tab to define a multi-checkpoint workflow.
3. Optional: install to your home screen (mobile) or as a desktop PWA. Your data stays local — no account, no server.

---

## Developer Setup

### Prerequisites

* A modern browser (Chrome, Firefox, Safari) — Service Worker + Notifications APIs required.
* No build tools, no `npm install`, no runtime to install. The repo deploys as-is.

### Run locally

```
# Quickest — works for everything except service-worker registration
open index.html                       # macOS
xdg-open index.html                   # Linux
start index.html                      # Windows

# To exercise the service worker / install flow you need a static server
python3 -m http.server 8080           # then visit http://localhost:8080/
```

The PWA install prompt and offline cache only work over HTTP(S), not `file://`.

### Architecture source of truth

[`CLAUDE.md`](./CLAUDE.md) is the authoritative architecture doc — module layout, conventions, deployment, tech stack, CI/CD. When this README and `CLAUDE.md` disagree, `CLAUDE.md` wins and this README needs updating.

### CI/CD at a glance

| Workflow | Trigger | What it does |
| --- | --- | --- |
| [`ci.yml`](./.github/workflows/ci.yml) | PRs + pushes to `main` touching source, the workflow, or the validators | Static validation: HTML parses, manifest identity + icons, SW precache list + `CACHE_REV` format & bump reminder, i18n dictionary parity |

Deployment is GitHub Pages from the `main` branch root, served on the custom domain `ticked.ranzlappen.com` (see `CNAME`).

---

## Project Structure

```
ticked/
├── index.html                  ← thin shell — markup + script tags
├── styles/                     ← feature CSS (tokens, layout, list, sheets, processes, stats)
├── js/                         ← feature JS (core, lists, interactions, views, actions, pwa, storage)
├── i18n.js                     ← language dictionaries + settings persistence
├── sw.js                       ← Workbox service worker (precaches the shell)
├── manifest.json               ← PWA manifest
├── icons/                      ← PWA icon set (regular + maskable, 192 + 512, favicons, apple-touch)
├── scripts/                    ← CI validators (pure stdlib Python)
├── CNAME                       ← custom domain for GitHub Pages
├── CLAUDE.md                   ← architecture source of truth (full module map)
└── README.md                   ← this file
```

**For everyday use** you only touch:

* `js/*.js` — application logic (see [`CLAUDE.md`](./CLAUDE.md) for what each module owns).
* `styles/*.css` — visual changes.
* `i18n.js` — UI string changes / new languages.
* `sw.js` — bump `CACHE_REV` after changing any precached asset.

**For deeper changes** (refactoring, new modules, CI) see [`CLAUDE.md`](./CLAUDE.md).

---

## Support

If Ticked is useful to you:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F1140LWT)

## Related Projects

Other tools by ranzlappen:

* [Court Procedure Algorithm Guide](https://github.com/ranzlappen/court-procedure-guide) — Autism-friendly real-time court procedure guide
* [Twitch Mood Radar](https://github.com/ranzlappen/twitch-mood-radar) — Real-time Twitch chat mood analyzer
* [Global Connections Worldmap](https://github.com/ranzlappen/worldmap) — Interactive world map visualization
* [IntuiNO](https://github.com/ranzlappen/intuino) — Anti-UX satirical educational experience

---

## License

MIT. See [`LICENSE`](./LICENSE).

Made with ☕ by [ranzlappen](https://github.com/ranzlappen).
