const CACHE_NAME = 'bkash-loan-v3'; // Bumped version to v3
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// Force immediate activation
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Clear old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  return self.clients.claim();
});

// Network First Strategy
self.addEventListener('fetch', (e) => {
  // We want to fetch from network first for HTML and JS to ensure updates
  if (e.request.mode === 'navigate' || e.request.destination === 'script') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // For other assets like icons/fonts, cache is fine
    e.respondWith(
      caches.match(e.request).then((res) => res || fetch(e.request))
    );
  }
});