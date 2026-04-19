// ── Workbox Service Worker for Ticked ────────────────────
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');

// ── Precaching ───────────────────────────────────────────
// IMPORTANT: Bump CACHE_REV on every deploy so Workbox invalidates stale assets.
// Without this, PWA users will never receive updates after first install.
const CACHE_REV = '20260419-1';

workbox.precaching.precacheAndRoute([
    { url: './', revision: CACHE_REV },
    { url: 'index.html', revision: CACHE_REV },
    { url: 'styles/tokens.css', revision: CACHE_REV },
    { url: 'styles/layout.css', revision: CACHE_REV },
    { url: 'styles/list.css', revision: CACHE_REV },
    { url: 'styles/sheet-views.css', revision: CACHE_REV },
    { url: 'styles/processes-tags.css', revision: CACHE_REV },
    { url: 'styles/stats-misc.css', revision: CACHE_REV },
    { url: 'i18n.js', revision: CACHE_REV },
    { url: 'js/core.js', revision: CACHE_REV },
    { url: 'js/lists.js', revision: CACHE_REV },
    { url: 'js/interactions.js', revision: CACHE_REV },
    { url: 'js/views.js', revision: CACHE_REV },
    { url: 'js/actions.js', revision: CACHE_REV },
    { url: 'js/pwa.js', revision: CACHE_REV },
    { url: 'manifest.json', revision: CACHE_REV },
    { url: 'icon-192.png', revision: CACHE_REV },
    { url: 'icon-512.png', revision: CACHE_REV },
    { url: 'icon-maskable-192.png', revision: CACHE_REV },
    { url: 'icon-maskable-512.png', revision: CACHE_REV },
]);

// ── Runtime caching for Google Fonts ─────────────────────
workbox.routing.registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: 'google-fonts',
        plugins: [
            new workbox.expiration.ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
        ],
    })
);

// ── Skip waiting & claim clients ─────────────────────────
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// ── Notification action handler ──────────────────────────
self.addEventListener('notificationclick', event => {
    const note = event.notification;
    const data = note.data || {};
    const action = event.action || data.action || 'open';

    // "Log now" / quick-log: silently log, keep notification visible, do NOT open/focus app
    if (action === 'quick-log') {
        event.waitUntil((async () => {
            // Re-show the persistent notification so it stays visible
            if (data.keepAlive) {
                await self.registration.showNotification(note.title, {
                    body: note.body,
                    icon: note.icon,
                    badge: note.badge,
                    tag: note.tag,
                    renotify: false,
                    requireInteraction: true,
                    actions: note.actions || [],
                    data,
                });
            } else {
                note.close();
            }
            // Post message to client to create a silent log entry — no focus
            const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const c of allClients) {
                c.postMessage({ type: 'ticked-action', action: 'quick-log', keepAlive: !!data.keepAlive });
                return; // message sent, done — do NOT focus
            }
            // No open client: open with hash so the entry is created on load
            if (self.clients.openWindow) {
                return self.clients.openWindow('./#action=quick-log');
            }
        })());
        return;
    }

    // "Insta Log" for checkpoint notifications
    if (action === 'insta-log') {
        note.close();
        event.waitUntil((async () => {
            const hash = '#action=insta-log&proc=' + encodeURIComponent(data.procId || '') + '&cp=' + encodeURIComponent(String(data.cpIdx ?? ''));
            const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            for (const c of allClients) {
                c.postMessage({ type: 'ticked-action', action: 'insta-log', procId: data.procId, cpIdx: data.cpIdx });
                if ('focus' in c) return c.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow('./' + hash);
        })());
        return;
    }

    // Default / "Open App": focus or open the app
    note.close();
    event.waitUntil((async () => {
        const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const c of allClients) {
            if ('focus' in c) {
                c.postMessage({ type: 'ticked-action', action: 'open' });
                return c.focus();
            }
        }
        if (self.clients.openWindow) return self.clients.openWindow('./');
    })());
});
