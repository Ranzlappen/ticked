# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue.

Use GitHub's [private vulnerability reporting](https://github.com/ranzlappen/ticked/security/advisories/new)
("Report a vulnerability" under the repository's **Security** tab). We'll
acknowledge the report and follow up with a fix or assessment.

## Scope & context

Ticked is a fully client-side static PWA with **no backend and no third-party
runtime dependencies bundled into the app**:

* All user data lives locally in the browser (IndexedDB / `localStorage`). Nothing
  is transmitted to a server we control.
* Optional Google Drive backup is opt-in and uses a **client ID you supply
  yourself**; the app ships no credentials and stores your client ID only in
  `localStorage` on your device.
* External network access is limited to Google Fonts and the Workbox runtime
  (loaded inside the service worker).

Because the app is hosted on GitHub Pages, HTTP security headers (e.g. a strict
Content-Security-Policy) cannot be fully configured at the server level — this is
a known platform limitation.

The most relevant classes of report are therefore: stored-XSS via crafted
imported JSON, service-worker cache poisoning, or data-integrity bugs in the
storage/migration layer.
