# Ticked

A vanilla-JS PWA for timestamped logging and multi-checkpoint process tracking. Hosted on GitHub Pages at the custom domain `ticked.ranzlappen.com` (see `CNAME`).

## Architecture

Single-page app served as static files from the repo root. No build step, no bundler, no package manager. The browser loads `index.html`, which pulls in `styles.css`, `i18n.js`, and `app.js` directly. A Workbox-based service worker (`sw.js`) precaches the entire shell so the app works offline once installed. All user data lives in `localStorage`.

The whole project is a single "module" — there are no sub-projects.

## Build & Development

```
# Quick check — opens the file directly, no SW
open index.html

# Full PWA / service-worker testing requires a static server
python3 -m http.server 8080      # then visit http://localhost:8080/
```

There is no build, lint, format, or test command yet. Tests are deferred (UI-heavy app, no isolated business logic modules at the moment).

After changing any precached asset (`index.html`, `styles.css`, `app.js`, `i18n.js`, `manifest.json`, or any icon), bump `CACHE_REV` in `sw.js` (line 7, format `'YYYYMMDD-N'`). Without the bump, installed users will keep serving the old shell.

## Key Conventions

* **Storage keys are sacred.** Never rename a `localStorage` key without a migration. Current keys: `ticked_store` (main store, schema v7), `ticked_settings` (i18n + fonts), `gdriveClientId`, `kofiHidden`, `persistentLogNotification`, `statsOpen`. Legacy keys `tickedEntries` and `tickedEntries_v2` are read once and migrated on load — leave the migration code alone.
* **Schema migrations are append-only.** `SCHEMA_VERSION` (in `app.js`) bumps when the data shape changes; add a new step to the migrations table, never edit an existing step. The current version is 7.
* **No frameworks, no build tools.** Vanilla HTML/CSS/JS only. External CDNs are limited to Google Fonts (IBM Plex Mono + Syne) and the Workbox runtime loaded inside `sw.js`.
* **`sw.js` lives at the repo root.** GitHub Pages doesn't allow custom `Service-Worker-Allowed` headers, so moving the file would shrink its scope and break installed users.
* **Manifest identity is fixed.** `start_url`, `scope`, and `id` are all `./`. Changing them invalidates every installed PWA on every user's home screen.
* **Mobile-first.** The primary target is a phone in portrait. Test responsive breakpoints, not just desktop.
* **i18n covers everything user-visible.** New strings go through `t('key')` and into all four dictionaries in `i18n.js` (en/es/de/fr).
* **`gdriveClientId` is user-supplied.** The app never ships a Google Drive client ID — users paste their own in Settings. Don't commit any secret.

## Deployment & CI/CD

| Workflow | Trigger | Scope | Deploys |
| --- | --- | --- | --- |
| GitHub Pages (built-in) | push to `main` | repo root | `ticked.ranzlappen.com` (custom domain via `CNAME`) |

A static-HTML validation workflow (HTML + JSON + manifest/SW path checks) is being added in a follow-up PR. Once present, it'll run on PRs touching the source files and skip on docs-only changes.

**Concurrency**: GitHub Pages deploys serially per branch.

**Runtime versions**: N/A — pure browser code.

**Required secrets**: none.

## Tech Stack

| Layer | Technology | Role | Why |
| --- | --- | --- | --- |
| Markup | HTML5 | Single shell page | Zero build |
| Styles | CSS custom properties | Theming + layout | No preprocessor needed |
| Logic | Vanilla JS (ES2020+) | App behavior, storage, UI | Direct, debuggable, ages well |
| i18n | Hand-written dictionaries | en/es/de/fr | No runtime dependency |
| PWA shell | Workbox 7 (CDN, in SW) | Precache + runtime caching | Battle-tested SW patterns |
| Storage | `localStorage` (JSON-serialized) | Persistent user data | Synchronous, simple, sufficient |
| Optional sync | Google Drive REST API | Backup/restore | User brings their own client ID |
| Hosting | GitHub Pages + CNAME | Static delivery | Free, fast, SSL included |

## Project Structure

```
ticked/
├── index.html               # markup shell + <script> tags
├── styles.css               # all styles (theme, layout, components)
├── app.js                   # all app logic
├── i18n.js                  # language dictionaries + settings persistence
├── sw.js                    # Workbox service worker
├── manifest.json            # PWA manifest
├── icon-192.png             # PWA icon (regular)
├── icon-512.png             # PWA icon (regular)
├── icon-maskable-192.png    # PWA icon (maskable)
├── icon-maskable-512.png    # PWA icon (maskable)
├── CNAME                    # custom domain for GitHub Pages
├── CLAUDE.md                # this file
├── LICENSE                  # MIT
└── README.md                # user-facing docs
```

`app.js` and `styles.css` are large single files (over 800 lines each). A modular refactor following the PWA Refactor Addendum in the standards repo is planned as a separate PR — no module split has happened yet, so don't introduce ES-module imports without that refactor.

## Post-task self-check

After every turn that produces a branch, PR, feature, or bug fix, do a quick self-check before replying: does the change introduce anything worth codifying in docs or automation? Scan for new storage keys, new precached files, new permissions, new external dependencies, new conventions, or workflow paths that should be reflected in `README.md`, `CLAUDE.md`, `sw.js` (precache list + `CACHE_REV`), `manifest.json`, or `.github/`.

Decide per case:

* **Auto-implement** small, unambiguous updates — bumping `CACHE_REV` after changing a precached file, adding a new precache entry when a new top-level asset is introduced, noting a new storage key in this file's "Key Conventions", extending a workflow `paths` filter to a new file. Make the edit in the same turn and call it out in the summary.
* **Prompt first** for anything ambiguous — schema migrations, manifest `start_url`/`scope`/`id` changes, new top-level docs, structural refactors.

If nothing is warranted, say "no doc/workflow updates needed" in one line. Skip this self-check entirely for pure Q&A turns that don't change code.
