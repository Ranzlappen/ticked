# Repo Setup Instructions

These are copy-paste prompts for setting up each extracted repository via separate Claude Code sessions.
After all 4 repos are set up, return to the `ticked` repo session to clean up and refactor.

---

## Session 1: court-procedure-guide

Paste this into a new Claude Code session connected to `ranzlappen/court-procedure-guide`:

```
I need you to set up this repository. It was extracted from ranzlappen/ticked.

## Step 1: Download and commit the source files

Download these 3 files from the ticked repo and commit them:

1. `https://raw.githubusercontent.com/ranzlappen/ticked/main/court.html` → save as `index.html`
2. `https://raw.githubusercontent.com/ranzlappen/ticked/main/court.css` → save as `court.css`
3. `https://raw.githubusercontent.com/ranzlappen/ticked/main/court.js` → save as `court.js`

Use curl to download them:
- curl -o index.html "https://raw.githubusercontent.com/ranzlappen/ticked/main/court.html"
- curl -o court.css "https://raw.githubusercontent.com/ranzlappen/ticked/main/court.css"
- curl -o court.js "https://raw.githubusercontent.com/ranzlappen/ticked/main/court.js"

Commit with message: "Initial commit: Court Procedure Algorithm Guide"
Push to main.

## Step 2: Create README.md

Create a README.md with:
- Title: "Court Procedure Algorithm Guide"
- Description: Autism-friendly, real-time court procedure algorithm guide for watching court cams or sitting in the gallery
- Key features: Phase-based navigation, criminal/civil toggle, role perspective selector (judge/prosecution/defense/observer), jurisdiction filter (federal/state), interactive SVG flowchart, glossary with modal popups, search across all phases, personal notes per phase, progress tracking checkboxes, bookmarks, dark/light theme, fully responsive, localStorage persistence
- Tech stack: Vanilla HTML/CSS/JS, no frameworks, no build tools
- How to use: Open index.html in any browser, or deploy via GitHub Pages
- Add ko-fi badge: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F1140LWT)
- Credit: Made by [ranzlappen](https://github.com/ranzlappen)

Commit and push.

## Step 3: Refactor — Rename files for consistency

Rename court.css → styles.css and court.js → app.js for consistency across all repos.
Update the <link> and <script> references in index.html to match.
Commit with message: "Rename court.css/court.js to styles.css/app.js for consistency"
Push to main.

## Step 4: Verify

Check that index.html still references styles.css and app.js correctly. List all files to confirm the repo structure is:
- index.html
- styles.css
- app.js
- README.md
```

---

## Session 2: twitch-mood-radar

Paste this into a new Claude Code session connected to `ranzlappen/twitch-mood-radar`:

```
I need you to set up this repository. It was extracted from ranzlappen/ticked.

## Step 1: Download and commit the source file

Download this file from the ticked repo:

curl -o index.html "https://raw.githubusercontent.com/ranzlappen/ticked/main/moodradar.html"

Commit with message: "Initial commit: Twitch Mood Radar"
Push to main.

## Step 2: Create README.md

Create a README.md with:
- Title: "Twitch Mood Radar"
- Subtitle: "Real-time Twitch Chat Mood Analyzer"
- Description: Visualizes the emotional tone of Twitch chat in real time with sliders, bubbles, pie charts, timeline and more
- Key features: Live Twitch chat connection + mood detection, approval slider, mood bubbles, pie chart, radar spiderweb chart (Chart.js), timeline visualization, resizable sections with persistent layout, channel history with dropdown, disconnect detection + auto-reconnect, scanline/CRT visual effects, offline capable once saved as .html, localStorage persistence
- Tech stack: Vanilla HTML/CSS/JS, Chart.js v4.4.1 (CDN), no build tools
- How to use: Open index.html in any browser. Enter a Twitch channel name to start analyzing chat mood.
- Add ko-fi badge: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F1140LWT)
- Credit: Made by [ranzlappen](https://github.com/ranzlappen)

Commit and push.

## Step 3: Refactor — Split monolithic file into HTML + CSS + JS

The index.html is a monolithic 3,227-line file with all CSS and JS inline. Split it:

1. Extract everything inside <style>...</style> tags → create `styles.css`
2. Extract everything inside <script>...</script> tags (NOT the Chart.js CDN script tag) → create `app.js`
3. In index.html, replace the inline <style> block with: <link rel="stylesheet" href="styles.css">
4. In index.html, replace the inline <script> block with: <script src="app.js"></script>
5. Keep the Chart.js CDN <script> tag in index.html
6. Keep all <meta>, <title>, <link> (fonts), and HTML structure in index.html

Expected result:
- index.html: ~100-200 lines (HTML structure only)
- styles.css: ~800+ lines (all CSS)
- app.js: ~2000+ lines (all JavaScript)

Commit with message: "Refactor: Split monolithic HTML into separate CSS and JS files"
Push to main.

## Step 4: Verify

Confirm the final repo structure is:
- index.html (HTML shell with CDN links)
- styles.css (all CSS)
- app.js (all JavaScript)
- README.md
```

---

## Session 3: worldmap

Paste this into a new Claude Code session connected to `ranzlappen/worldmap`:

```
I need you to set up this repository. It was extracted from ranzlappen/ticked.

## Step 1: Download and commit the source file

Download this file from the ticked repo:

curl -o index.html "https://raw.githubusercontent.com/ranzlappen/ticked/main/worldmap.html"

Commit with message: "Initial commit: Global Connections Worldmap"
Push to main.

## Step 2: Create README.md

Create a README.md with:
- Title: "Global Connections"
- Subtitle: "Interactive World Map Visualization"
- Description: Interactive world map with refined data points and multiple layers for exploring global and civilizational information
- Key features: Interactive world map with zoom/pan, multiple data layers, coherent researched data entries, highly responsive layout (mobile to desktop), lazy loading for performance, clean text rendering
- Tech stack: Vanilla HTML/CSS/JS, D3.js v7.8.5 (CDN), TopoJSON v3.0.2 (CDN), no build tools
- How to use: Open index.html in any browser
- Add ko-fi badge: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F1140LWT)
- Credit: Made by [ranzlappen](https://github.com/ranzlappen)

Commit and push.

## Step 3: Refactor — Split monolithic file into HTML + CSS + JS

The index.html is a monolithic 1,246-line file with all CSS and JS inline. Split it:

1. Extract everything inside <style>...</style> tags → create `styles.css`
2. Extract everything inside <script>...</script> tags (NOT the D3.js/TopoJSON CDN script tags) → create `app.js`
3. In index.html, replace the inline <style> block with: <link rel="stylesheet" href="styles.css">
4. In index.html, replace the inline <script> block with: <script src="app.js"></script>
5. Keep the D3.js and TopoJSON CDN <script> tags in index.html
6. Keep all <meta>, <title>, <link> (fonts), and HTML structure in index.html

Expected result:
- index.html: ~80-120 lines (HTML structure only)
- styles.css: ~300+ lines
- app.js: ~700+ lines

Commit with message: "Refactor: Split monolithic HTML into separate CSS and JS files"
Push to main.

## Step 4: Verify

Confirm the final repo structure is:
- index.html
- styles.css
- app.js
- README.md
```

---

## Session 4: intuino

Paste this into a new Claude Code session connected to `ranzlappen/intuino`:

```
I need you to set up this repository. It was extracted from ranzlappen/ticked.

## Step 1: Download and commit the source files

Download these 3 files from the ticked repo:

curl -o index.html "https://raw.githubusercontent.com/ranzlappen/ticked/main/intuino/index.html"
curl -o app.js "https://raw.githubusercontent.com/ranzlappen/ticked/main/intuino/app.js"
curl -o styles.css "https://raw.githubusercontent.com/ranzlappen/ticked/main/intuino/styles.css"

Commit with message: "Initial commit: IntuiNO - Intuitively Wrong"
Push to main.

## Step 2: Create README.md

Create a README.md with:
- Title: "IntuiNO — Intuitively Wrong"
- Description: Anti-UX satirical experience that teaches UX design principles through 5 increasingly chaotic levels
- Key features: 5 progressive levels of UX chaos, chaos scoring and achievements system, deliberately confusing UI elements (educational), neon/glass-card aesthetic, GSAP animations, responsive design, teaches UX principles by showing what NOT to do
- Tech stack: Vanilla HTML/JS, Tailwind CSS v3 (CDN), GSAP v3.12.5 (CDN), Google Fonts (Inter)
- How to use: Open index.html in any browser. Try to navigate through all 5 levels!
- Add ko-fi badge: [![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F1140LWT)
- Credit: Made by [ranzlappen](https://github.com/ranzlappen)

Commit and push.

## Step 3: Verify

IntuiNO is already split into separate files (index.html, app.js, styles.css), so no refactoring needed. Just verify that index.html correctly references app.js and styles.css. List all files to confirm:
- index.html
- app.js
- styles.css
- README.md
```

---

## After all 4 sessions are done

Return to your `ticked` repo Claude Code session and tell it:
"All 4 repos are set up. Continue with Batch 1E (cleanup) and the remaining stages."
