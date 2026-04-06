# Ticked - Project Guide for Claude Code

## Overview
Ticked is a Process & Workflow Tracker — a PWA built with vanilla HTML/CSS/JS.

## Architecture
- `index.html` — HTML structure and layout (~400 lines)
- `styles.css` — All CSS styles (~2,200 lines)
- `app.js` — All JavaScript logic (~2,600 lines)
- `sw.js` — Service worker for offline caching
- `manifest.json` — PWA manifest
- `icon-*.png` — PWA icons (4 files)

## Key Conventions
- No frameworks, no build tools — vanilla HTML/CSS/JS only
- All data persists via `localStorage` (key: `ticked_store`)
- PWA: service worker caches all assets for offline use
- Dark theme by default, CSS custom properties for theming
- Fonts: IBM Plex Mono + Syne (Google Fonts CDN)
- Mobile-first responsive design

## When Making Changes
- After modifying `styles.css` or `app.js`, bump the cache version in `sw.js` (line 1: `const CACHE = 'ticked-vN'`)
- Keep `index.html` as a thin shell — CSS goes in `styles.css`, JS goes in `app.js`
- Test on mobile viewport sizes — the app is primarily used on phones
- Preserve localStorage backwards compatibility when changing data structures

## GitHub Pages
This app is deployed via GitHub Pages from the `main` branch root.
Live at: https://ranzlappen.github.io/ticked/
