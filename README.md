# Ticked — GitHub Pages + TWA Setup

## Files in this package
```
index.html              ← Your app
sw.js                   ← Service worker (offline + notifications)
manifest.json           ← PWA manifest
icon-192.png            ← App icon 192×192
icon-512.png            ← App icon 512×512
icon-maskable-192.png   ← Adaptive icon 192×192
icon-maskable-512.png   ← Adaptive icon 512×512
```

---

## Step 1 — Create GitHub repo & upload (2 min)

1. Go to **https://github.com** → sign in
2. Click **+** (top right) → **New repository**
3. Repository name: **ticked**
4. Set to **Public** ← important!
5. Click **Create repository**
6. On the empty repo page, click the **"uploading an existing file"** link
7. Drag ALL 7 files into the upload area
8. Click **Commit changes**

## Step 2 — Enable GitHub Pages (30 sec)

1. In your repo, go to **Settings** (tab at top)
2. Scroll down to **Pages** in the left sidebar
3. Under "Build and deployment" → Source: **Deploy from a branch**
4. Branch: **main** / Folder: **/ (root)**
5. Click **Save**
6. Wait ~60 seconds
7. Your site is now live at:
   ```
   https://YOUR_USERNAME.github.io/ticked/
   ```

## Step 3 — Verify it works

Open your URL in Chrome on your phone. You should see:
- The Ticked app loads
- Chrome shows an "Install" or "Add to Home Screen" prompt
- The bell button sends notifications with "✓ Log Now" action

## Step 4 — Generate APK with PWABuilder (3 min)

1. Go to **https://www.pwabuilder.com**
2. Paste your GitHub Pages URL → click **Start**
3. It will scan and show a score — should pass all checks
4. Click **Package for stores** → **Android**
5. Choose **Google Play (TWA)**
6. Fill in:
   - **App name**: Ticked
   - **Package ID**: com.yourname.ticked
   - Leave everything else as default
7. Click **Generate** → **Download**
8. Unzip → your `.apk` is inside

## Step 5 — Upload assetlinks.json (removes browser bar)

PWABuilder gives you an `assetlinks.json` file in the download.
Upload it to your repo in this exact path:

```
.well-known/assetlinks.json
```

To do this on GitHub:
1. In your repo, click **Add file** → **Create new file**
2. In the filename field type: `.well-known/assetlinks.json`
   (this creates the folder automatically)
3. Paste the contents from PWABuilder's assetlinks.json
4. Click **Commit changes**
5. Verify it works: visit
   `https://YOUR_USERNAME.github.io/ticked/.well-known/assetlinks.json`
   — you should see the JSON

## Step 6 — Install APK

Transfer the `.apk` to your phone and install.
The app opens full-screen — no browser bar!

---

## Notes

- **Data persists** between browser and TWA (shared Chrome storage)
- **Auto-updates**: edit files on GitHub → app updates on next SW check
- **Notifications**: "✓ Log Now" button works in the TWA
- **Offline**: works fully offline after first load
- **Play Store**: the PWABuilder download includes an `.aab` for
  Google Play Console upload ($25 one-time dev fee)
