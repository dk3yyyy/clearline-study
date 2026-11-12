/* ShiftReady offline shell. Bump CACHE when the app version changes. */
const CACHE = 'shiftready-20261112aq';
const SHELL = [
  './',
  './index.html',
  './assets/styles.css?v=20261112aq',
  './assets/shiftready.css?v=20261112aq',
  './assets/app.js?v=20261112aq',
  './assets/store.js?v=20261112aq',
  './assets/scoring.js?v=20261112aq',
  './assets/favicon.svg?v=20261112aq',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './data/syllabus.json?v=20261112aq',
  './data/exam_formats.json?v=20261112aq',
  './data/questions.json?v=20261112aq',
  './data/checklists.json?v=20261112aq'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put('./index.html', copy)).catch(() => {});
        return response;
      }).catch(() => caches.match('./index.html').then((cached) => cached || Response.error()))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
      }
      return response;
    }))
  );
});
