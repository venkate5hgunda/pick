// Pick! PWA service worker — offline-first with runtime caching.
// KISS: a single static cache plus a generic runtime cache for same-origin
// fetches. Network-first for navigations so the latest shell loads.

const STATIC_CACHE = 'pick:static:v1';
const RUNTIME_CACHE = 'pick:runtime:v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/audio.js',
  './js/celebration.js',
  './js/dice-animation.js',
  './js/dice-tab.js',
  './js/dice.js',
  './js/modal.js',
  './js/random.js',
  './js/stats.js',
  './js/storage.js',
  './js/theme.js',
  './js/tooltip.js',
  './js/ui-controller.js',
  './js/verse-modal.js',
  './js/verses.js',
  './js/wheel-batch.js',
  './js/wheel-tab.js',
  './js/wheel.js',
  './assets/favicon.svg',
  './assets/logo.svg',
  './assets/spin-wordmark.svg',
  './assets/wordmark.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  // HTML navigation: network-first so the latest shell loads, fall back offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || !response.ok) return response;
          const clone = response.clone();
          event.waitUntil(caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone)));
          return response;
        })
        .catch((error) => {
          console.error('Offline asset unavailable:', request.url, error);
          throw error;
        });
    })
  );
});
