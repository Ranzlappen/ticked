const CACHE = 'ticked-v4';
const PRECACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => clients.claim())
    );
});

self.addEventListener('fetch', e => {
    if (e.request.url.includes('fonts.googleapis') || e.request.url.includes('fonts.gstatic')) {
        e.respondWith(
            caches.open(CACHE).then(cache =>
                fetch(e.request).then(res => { cache.put(e.request, res.clone()); return res; })
                .catch(() => caches.match(e.request))
            )
        );
    } else {
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE).then(cache => cache.put(e.request, clone));
                }
                return res;
            }))
        );
    }
});

// ── Notification action handler ──
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const action = e.action;
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'ticked-action', action: action || 'open' });
                    return;
                }
            }
            return clients.openWindow(self.registration.scope + 'index.html#action=' + (action || 'open'));
        })
    );
});
