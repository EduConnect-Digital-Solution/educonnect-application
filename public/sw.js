/**
 * EduConnect Service Worker
 * Version: 1.0.0
 *
 * Strategy:
 * - Static assets (JS, CSS, images): Cache-First with versioned cache busting
 * - API calls: Network-First with fallback to cache (non-sensitive only)
 * - Navigation: Network-First with offline fallback page
 */

const SW_VERSION = '1.0.0';
const CACHE_STATIC = `educonnect-static-v${SW_VERSION}`;
const CACHE_PAGES  = `educonnect-pages-v${SW_VERSION}`;

// Assets to pre-cache on install (app shell)
const APP_SHELL = [
    '/',
    '/offline.html',
    '/manifest.json',
];

// Routes that should NEVER be cached (sensitive auth/data endpoints)
const NEVER_CACHE_PATTERNS = [
    /\/api\/school\/auth/,
    /\/api\/user\/auth/,
    /\/api\/admin\/dashboard\/users/,
    /\/api\/students/,
    /\/api\/parent\/profile/,
    /\/api\/teacher\/grades/,
];

// API routes that are safe to cache briefly (analytics, read-only data)
const SAFE_CACHE_PATTERNS = [
    /\/api\/admin\/dashboard\/analytics/,
    /\/api\/teacher\/classes/,
    /\/api\/teacher\/dashboard/,
    /\/api\/parent\/dashboard/,
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log(`[SW v${SW_VERSION}] Installing…`);
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// ─── Activate ────────────────────────────────────────────────────────────────
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
    self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION }));
    });
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and cross-origin requests
    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin && !url.pathname.startsWith('/api')) return;

    // Never cache sensitive auth/user endpoints
    if (NEVER_CACHE_PATTERNS.some((p) => p.test(url.pathname))) {
        event.respondWith(fetch(request));
        return;
    }

    // Safe API routes: Network-First, short-lived cache (5 min)
    if (SAFE_CACHE_PATTERNS.some((p) => p.test(url.pathname))) {
        event.respondWith(networkFirstWithCache(request, CACHE_PAGES, 300));
        return;
    }

    // API routes (non-matched): Network-Only
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
                    const clone = res.clone();
                    caches.open(CACHE_PAGES).then((cache) => cache.put(request, clone));
                    return res;
                })
                .catch(() => caches.match('/offline.html'))
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

// ─── Helper: Cache-First ──────────────────────────────────────────────────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_STATIC);
        cache.put(request, response.clone());
        return response;
    } catch {
        return new Response('Asset unavailable offline', { status: 503 });
    }
}

// ─── Helper: Network-First with optional TTL ─────────────────────────────────
async function networkFirstWithCache(request, cacheName, ttlSeconds = null) {
    try {
        const response = await fetch(request);
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
