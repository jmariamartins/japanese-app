// 日本語 Study — Service Worker
// Bump CACHE_VERSION any time you change app-shell files (index.html, drills,
// manifest, icons) so the new version gets picked up. Exercise/cheatsheet
// content updates automatically (see fetch handler below) without needing a
// version bump.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `nihongo-study-${CACHE_VERSION}`;

// App shell — the files needed for the app to boot offline.
const APP_SHELL = [
  './',
  './index.html',
  './kana_drill.html',
  './kanji_drill.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin requests ourselves. Cross-origin calls (Jotoba
  // dictionary API, KanjiVG stroke data on GitHub, Google Fonts) go straight
  // to the network untouched — never cached, never intercepted.
  if (url.origin !== self.location.origin) return;

  // App shell: cache-first (instant load, works offline).
  if (APP_SHELL.some((p) => url.pathname.endsWith(p.replace('./', '/')))) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Everything else same-origin (exercises/*.txt, cheatsheets/*.html,
  // config/cheatsheet_map.txt, exercises/index.json, etc.): stale-while-
  // revalidate. Serve the cached copy immediately if there is one, and in
  // the background fetch the latest version from the network and store it,
  // so the next load picks up anything you've pushed to GitHub.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((response) => {
            if (response && response.ok) cache.put(req, response.clone());
            return response;
          })
          .catch(() => cached); // offline: fall back to whatever's cached
        return cached || networkFetch;
      })
    )
  );
});
