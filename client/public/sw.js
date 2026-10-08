/* Checkmate service worker: cache-first for versioned static assets and the
   Stockfish engine files, network-first for navigations. No background sync,
   no push — installability + offline resilience only. */

const VERSION = 'checkmate-v1';
const CORE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/og.png',
  '/engine/stockfish-lite-single.js',
  '/engine/stockfish-lite-single.wasm',
  '/pieces/merida/wK.svg',
  '/pieces/merida/wQ.svg',
  '/pieces/merida/wR.svg',
  '/pieces/merida/wB.svg',
  '/pieces/merida/wN.svg',
  '/pieces/merida/wP.svg',
  '/pieces/merida/bK.svg',
  '/pieces/merida/bQ.svg',
  '/pieces/merida/bR.svg',
  '/pieces/merida/bB.svg',
  '/pieces/merida/bN.svg',
  '/pieces/merida/bP.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((hit) => hit || Response.error()))
    );
    return;
  }

  // Static assets + engine files: cache first, populate on miss.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
