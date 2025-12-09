const CACHE_NAME = 'kmart-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.jpeg',  // ലോഗോ 1 (നിങ്ങളുടെ ഫയൽ പേര് jpeg ആണ്)
  '/icon-512.png'    // ലോഗോ 2
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
