# Ticked

A vanilla-JS PWA for timestamped logging and multi-checkpoint process tracking. Hosted on GitHub Pages at the custom domain `ticked.ranzlappen.com` (see `CNAME`).

## Architecture

Single-page app served as static files from the repo root. No build step, no bundler, no package manager. The browser loads `index.html`, which pulls in six feature CSS files from `styles/`, `i18n.js`, and six feature JS files from `js/` directly. A Workbox-based service worker (`sw.js`) precaches the entire shell so the app works offline once installed. All user data lives in `localStorage`.

The whole project is a single "module" — there are no sub-projects.

## Build & Development

```
# Quick check — opens the file directly, no SW
open index.html

# Full PWA / service-worker testing requires a static server
python3 -m http.server 8080      # then visit http://localhost:8080/
```

There is no build, lint, format, or test command yet. Tests are deferred (UI-heavy app, no isolated business logic modules at the moment).

After changing any precached asset (`index.html`, anything under `styles/`, anything under `js/`, `i18n.js`, `manifest.json`, or any icon), bump `CACHE_REV` in `sw.js` (line 7, format `'YYYYMMDD-N'`). Without the bump, installed users will keep serving the old shell. CI's bump-reminder catches this on PRs.

## Key Conventions

* **Storage keys are sacred.** Never rename a storage key without a migration. The main payload lives in **IndexedDB** under database `ticked_idb`, object store `kv`, key `ticked_store` (schema v8). Pre-v8 installs keep the same payload in `localStorage['ticked_store']`; `load()` relocates it into IDB on first run after upgrade. Other small values stay in localStorage: `ticked_settings` (i18n + fonts), `gdriveClientId`, `kofiHidden`, `persistentLogNotification`, `statsOpen`. Legacy keys `tickedEntries` and `tickedEntries_v2` are read once and migrated on load — leave the migration code alone. Downgrading to a pre-v8 build after the migration will show an empty store (pre-v8 only reads localStorage, which has been cleared).
* **Schema migrations are append-only.** `SCHEMA_VERSION` (in `js/core.js`) bumps when the data shape changes; add a new step to the migrations table, never edit an existing step. The current version is 8. (v8 is a version-only marker for the localStorage→IndexedDB cutover; the actual relocation lives in `load()`.)
* **No frameworks, no build tools.** Vanilla HTML/CSS/JS only. External CDNs are limited to Google Fonts (IBM Plex Mono + Syne) and the Workbox runtime loaded inside `sw.js`.
* **Classic scripts, not ES modules.** Every `<script src>` in `index.html` is a classic script. All top-level `const` / `let` / `function` declarations share the global scope, which is what keeps the ~40 inline `onclick="foo()"` handlers in the markup working without rewiring. Don't add `type="module"` or `import`/`export` without also migrating every inline handler.
* **`sw.js` lives at the repo root.** GitHub Pages doesn't allow custom `Service-Worker-Allowed` headers, so moving the file would shrink its scope and break installed users.
* **Manifest identity is fixed.** `start_url`, `scope`, and `id` are all `./`. Changing them invalidates every installed PWA on every user's home screen.
* **Mobile-first.** The primary target is a phone in portrait. Test responsive breakpoints, not just desktop.
* **i18n covers everything user-visible.** New strings go through `t('key')` and into all four dictionaries in `i18n.js` (en/es/de/fr).
* **`gdriveClientId` is user-supplied.** The app never ships a Google Drive client ID — users paste their own in Settings. Don't commit any secret.

## Deployment & CI/CD

| Workflow | Trigger | Scope | Deploys |
| --- | --- | --- | --- |
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | PRs + pushes to `main` touching source or the workflow itself | static validation: HTML parses, manifest identity + icons, SW precache list + `CACHE_REV` format, CACHE_REV-bump reminder on PRs | Nothing (validation only) |
| GitHub Pages (built-in) | push to `main` | repo root | `ticked.ranzlappen.com` (custom domain via `CNAME`) |

**What fires on a given change:**

| Change | CI | Deploy |
| --- | --- | --- |
| Source (`index.html`, `styles/**`, `js/**`, `i18n.js`, `sw.js`, `manifest.json`, `icons/**`) | ✓ | ✓ |
| Workflow or validator script (`.github/workflows/ci.yml`, `scripts/**`) | ✓ | ✓ |
| Docs (`README.md`, `CLAUDE.md`, `LICENSE`) | — | ✓ (Pages rebuilds on every push but nothing user-visible changes) |

**Concurrency**: CI cancels superseded runs per PR; GitHub Pages deploys serially per branch.

**Runtime versions**: CI uses Python 3.12 (for the pure-stdlib validators). App itself is pure browser code — no server runtime.

**Required secrets**: none.

**Dependabot**: [`.github/dependabot.yml`](./.github/dependabot.yml) watches the `github-actions` ecosystem weekly (Monday), minor+patch grouped.

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
├── index.html                  # markup shell — <link>s to styles/, <script>s to js/
├── i18n.js                     # language dictionaries + settings persistence
├── sw.js                       # Workbox service worker (root path is load-bearing)
├── manifest.json               # PWA manifest (start_url/scope/id must stay './')
├── icons/                      # favicon + PWA icon set (shared "icon universe")
│   ├── favicon.ico             # multi-res 16/32/48
│   ├── favicon-16x16.png  favicon-32x32.png
│   ├── apple-touch-icon.png    # 180×180 on theme bg
│   ├── icon-192.png  icon-512.png            # PWA "any"
│   └── icon-maskable-192.png  icon-maskable-512.png
├── CNAME                       # custom domain for GitHub Pages
├── js/
│   ├── core.js                 # constants, state, DOM refs, migrations, storage, utilities
│   ├── lists.js                # entry/process CRUD, filter/sort, lazy + keyed rendering
│   ├── interactions.js         # swipe, bottom sheet, action menu, color/time/text editors
│   ├── views.js                # checkpoint detail, reminders, timeline + daily views
│   ├── actions.js              # master render, UI actions, export/import, source viewer
│   └── pwa.js                  # gdrive sync, notifications, PWA init, streak, window.onload
├── styles/
│   ├── tokens.css              # reset + :root custom properties (must load first)
│   ├── layout.css              # header, tabs, palette, input, section header
│   ├── list.css                # toolbar, filter, entry list, swipe, toast
│   ├── sheet-views.css         # view toggle, timeline, source viewer, bottom sheet
│   ├── processes-tags.css      # checkpoint timeline, stage detail, tag input & chips
│   └── stats-misc.css          # streak/heatmap, mobile, settings, daily view
├── scripts/                    # CI validators (pure stdlib Python)
│   ├── validate_html.py        # HTML parses + local refs resolve
│   ├── validate_manifest.py    # manifest JSON valid + identity fields unchanged
│   ├── validate_sw.py          # sw.js precache list + CACHE_REV format
│   └── check_cache_rev.py      # PR-only bump reminder
├── .github/
│   ├── dependabot.yml          # weekly github-actions updates, grouped
│   └── workflows/
│       └── ci.yml              # static-validation workflow (PRs + pushes to main)
├── CLAUDE.md                   # this file
├── LICENSE                     # MIT
└── README.md                   # user-facing docs
```

Every source file is under 800 lines; the single largest is `styles/list.css` at 733. Concatenating `js/*.js` in load order reproduces the original `app.js` byte-for-byte; same for `styles/*.css` against the original `styles.css`.

## Post-task self-check

After every turn that produces a branch, PR, feature, or bug fix, do a quick self-check before replying: does the change introduce anything worth codifying in docs or automation? Scan for new storage keys, new precached files, new permissions, new external dependencies, new conventions, or workflow paths that should be reflected in `README.md`, `CLAUDE.md`, `sw.js` (precache list + `CACHE_REV`), `manifest.json`, or `.github/`.

Decide per case:

* **Auto-implement** small, unambiguous updates — bumping `CACHE_REV` after changing a precached file, adding a new precache entry when a new top-level asset is introduced, noting a new storage key in this file's "Key Conventions", extending a workflow `paths` filter to a new file. Make the edit in the same turn and call it out in the summary.
* **Prompt first** for anything ambiguous — schema migrations, manifest `start_url`/`scope`/`id` changes, new top-level docs, structural refactors.

If nothing is warranted, say "no doc/workflow updates needed" in one line. Skip this self-check entirely for pure Q&A turns that don't change code.
