/* ═══════════════════════════════════════════════════════════
   sw.js — HTIE Service Worker
   Must be served from root: /sw.js  (Flask handles this)
   Scope: / — covers the entire app
   This file is what makes the PWA install button appear.
   Blob URL service workers DO NOT trigger beforeinstallprompt.
   A real file served from the server is required.
═══════════════════════════════════════════════════════════ */

const CACHE_NAME  = 'htie-v3-app';
const CACHE_URLS  = [
  '/',
  '/static/htie.js',
  '/static/favicon.svg',
  '/static/manifest.json',
];

/* ── Install: cache all core assets ─────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting(); // activate immediately without waiting
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
  self.clients.claim(); // take control of open tabs immediately
});

/* ── Fetch: serve from cache, fall back to network ──────── */
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache it
      return fetch(event.request)
        .then((response) => {
          // Only cache valid responses
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback — return cached homepage
          return caches.match('/');
        });
    })
  );
});