// Offline support: cache the app shell + demo assets so the demo opens without internet.
// API calls are never cached (always network); static files use stale-while-revalidate.
const CACHE = 'wanderly-v2';
const SHELL = [
  '/', '/manifest.json',
  '/static/css/styles.css',
  '/static/vendor/leaflet/leaflet.css', '/static/vendor/leaflet/leaflet.js',
  '/static/js/app.js', '/static/js/api.js', '/static/js/ui.js', '/static/js/store.js', '/static/js/components.js',
  '/static/js/catalog.js', '/static/js/demo-data.js', '/static/js/recommender.js',
  '/static/js/views/home.js', '/static/js/views/plan.js', '/static/js/views/trip.js', '/static/js/views/trips.js',
  '/static/js/views/discover.js', '/static/js/views/nearby.js', '/static/js/views/lens.js', '/static/js/views/foryou.js',
  '/static/js/views/chat.js', '/static/js/views/settings.js', '/static/js/views/demo.js', '/static/js/views/more.js',
  '/static/img/sample-taj.svg', '/static/img/sample-panipuri.svg', '/static/img/sample-sign.svg', '/static/img/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  const key = url.pathname === '/demo' ? '/' : url.pathname;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(key);
      const network = fetch(e.request).then(resp => {
        if (resp.ok) cache.put(key, resp.clone());
        return resp;
      }).catch(() => cached);
      return cached || network;
    }),
  );
});
