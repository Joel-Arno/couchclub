/* Eier-Timer – Offline-Speicher.
   Online kommt immer der neueste Stand aus dem Netz, ohne Netz der zuletzt gespeicherte.
   Der Luftdruck von Open-Meteo läuft am Service Worker vorbei. */
const CACHE = 'eier-timer-v1';
const DATEIEN = [
  './', 'index.html', 'styles.css', 'config.js', 'physik.js', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(DATEIEN.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('eier-timer-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(new Request(req, { cache: 'no-cache' }))
      .then((res) => {
        if (res.ok) { const kopie = res.clone(); caches.open(CACHE).then((c) => c.put(req, kopie)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((treffer) => treffer || (req.mode === 'navigate' ? caches.match('./') : Response.error())))
  );
});
