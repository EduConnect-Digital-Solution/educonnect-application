/**
 * EduConnect Service Worker
 * Version: 1.0.0
 *
 * Strategy:
 * - Static assets (JS, CSS, images): Cache-First with versioned cache busting
 * - API calls: Network-First with fallback to cache (non-sensitive only)
 * - Navigation: Network-First with offline fallback page
 */

const SW_VERSION = '1.0.3'; // drops caches that may hold a page saved in place of a script or stylesheet
const CACHE_STATIC = `educonnect-static-v${SW_VERSION}`;
const CACHE_PAGES  = `educonnect-pages-v${SW_VERSION}`;

// Assets to pre-cache on install (app shell)
const APP_SHELL = [
    '/',
    '/offline.html',
    '/manifest.json',
];

// ─── Install ──────────────────
self.addEventListener('install', (event) => {
    console.log(`[SW v${SW_VERSION}] Installing…`);
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// ─── Activate ──────────────────
self.addEventListener('activate', (event) => {
    console.log(`[SW v${SW_VERSION}] Activating…`);
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('educonnect-') && name !== CACHE_STATIC && name !== CACHE_PAGES)
                    .map((name) => {
                        console.log(`[SW] Deleting old cache: ${name}`);
                        return caches.delete(name);
                    })
            )
        ).then(() => self.clients.claim()) // Take control of all open tabs
    );
    // Notify all clients that a new SW version is active
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION }));
        })
    );
});

// ─── Fetch ──────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and cross-origin requests
    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin && !url.pathname.startsWith('/api')) return;

    // Skip Vite dev server internal assets & node_modules dependency requests
    if (
        url.pathname.includes('/node_modules/') ||
        url.pathname.includes('/@vite') ||
        url.pathname.includes('/@fs') ||
        url.searchParams.has('v') ||
        url.searchParams.has('t')
    ) {
        return;
    }

    // API routes: Network-Only
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request).catch(() => new Response(
            JSON.stringify({ error: 'Offline', message: 'No network connection available.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        )));
        return;
    }

    // Navigation requests: Network-First, fallback to offline page
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    if (res.ok) {
                        const clone = res.clone();
                        event.waitUntil(caches.open(CACHE_PAGES).then((cache) => cache.put(request, clone)).catch(() => {}));
                    }
                    return res;
                })
                .catch(async () => (await caches.match('/offline.html')) || new Response('You are offline.', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                }))
        );
        return;
    }

    // Static assets (JS, CSS, fonts, images): Cache-First
    if (/\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|ico|webp)(\?.*)?$/.test(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Default: Network with cache fallback
    event.respondWith(networkFirstWithCache(request, CACHE_STATIC));
});

// ─── Helper: is this response really the asset that was asked for? ───────────
// After a deploy an old script URL no longer exists, and the host's single-page fallback answers it
// with index.html and status 200. Caching that would break the page for good, so anything that is
// not a successful response of the right kind is passed through without being stored.
function isCacheableAsset(request, response) {
    if (!response || !response.ok || response.type === 'opaque') return false;
    const type = (response.headers.get('Content-Type') || '').toLowerCase();
    if (type.includes('text/html')) return false;
    const path = new URL(request.url).pathname;
    if (/\.js$/.test(path)) return type.includes('javascript') || type.includes('ecmascript');
    if (/\.css$/.test(path)) return type.includes('text/css');
    return true;
}

// ─── Helper: Cache-First ────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (isCacheableAsset(request, response)) {
            const copy = response.clone();
            // A failed write (storage full) must not cost the page the asset it just downloaded
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
    } catch {
        return new Response('Asset unavailable offline', { status: 503 });
    }
}

// ─── Helper: Network-First with optional TTL ─────────────────────────────────
async function networkFirstWithCache(request, cacheName, ttlSeconds = null) {
    try {
        const response = await fetch(request);
        // Never store an error page in place of the real thing
        if (!response.ok) return response;
        const cache = await caches.open(cacheName);
        const responseToCache = response.clone();

        if (ttlSeconds) {
            // Store with timestamp header for TTL enforcement
            const headers = new Headers(responseToCache.headers);
            headers.append('sw-cached-at', Date.now().toString());
            const body = await responseToCache.text();
            cache.put(request, new Response(body, { status: response.status, headers }));
        } else {
            cache.put(request, responseToCache);
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) {
            // Check TTL if applicable
            if (ttlSeconds) {
                const cachedAt = cached.headers.get('sw-cached-at');
                if (cachedAt && (Date.now() - parseInt(cachedAt, 10)) > ttlSeconds * 1000) {
                    return new Response(JSON.stringify({ error: 'Stale cache', offline: true }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
            }
            return cached;
        }
        return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

// ─── Message Handler (for manual cache clearing on logout) ───────────────────
self.addEventListener('message', (event) => {
    if (event.data?.type === 'CLEAR_USER_CACHE') {
        caches.delete(CACHE_PAGES).then(() => {
            event.ports[0]?.postMessage({ success: true });
        });
    }

    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data?.type === 'GET_VERSION') {
        event.ports[0]?.postMessage({ version: SW_VERSION });
    }
});

// ─── Push notifications ───────────────────
// The server sends { title, body, url, tag } (see educonnect-backend pushService).
self.addEventListener('push', (event) => {
    let data = {};
    try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'EduConnect', body: event.data ? event.data.text() : '' }; }
    const title = data.title || 'EduConnect';
    event.waitUntil(self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: data.tag || undefined,
        data: { url: data.url || '/' },
    }));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if ('focus' in client) { client.navigate(target).catch(() => {}); return client.focus(); }
            }
            return self.clients.openWindow(target);
        })
    );
});

