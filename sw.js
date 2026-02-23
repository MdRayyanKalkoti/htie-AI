/* ═══════════════════════════════════════════════════════════
   sw.js — HTIE Service Worker v4
   Must be served from root: /sw.js  (Flask handles this)
   Scope: / — covers the entire app
═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'htie-v4-app';

/* Core URLs to cache — SW install ONLY fails if '/' fails */
const CACHE_REQUIRED = ['/'];
const CACHE_OPTIONAL = [
  '/static/index.html',
  '/static/pwa-install.js',
  '/static/htie.js',
  '/static/favicon.svg',
  '/static/manifest.json',
];

/* ── Install: cache required assets, try optional ─────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Required — fail SW install if these 404
      await cache.addAll(CACHE_REQUIRED);
      // Optional — silently ignore failures (won't block install)
      for (const url of CACHE_OPTIONAL) {
        try { await cache.add(url); } catch(e) {}
      }
    })
  );
  self.skipWaiting();
});

/* ── Activate: clean up old caches ──────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList
          .filter((key) => key.startsWith('htie-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: network first for API, cache first for assets ─ */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API calls — always go to network
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/'));
    })
  );
});