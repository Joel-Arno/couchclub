/* Couchclub – Offline-Speicher der Web-App.
   build.py setzt VERSION und die Dateiliste bei jeder Veröffentlichung neu.
   Online kommt immer der neueste Stand aus dem Netz, ohne Netz der zuletzt gespeicherte. */
const VERSION = '@VERSION@';
const FILES = ['@FILES@'];
const CACHE = 'couchclub-' + VERSION;
const FONTS = 'couchclub-schriften';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('couchclub-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // Zuerst das Netz fragen (am Browser-Cache vorbei), damit Änderungen sofort ankommen
    e.respondWith(
      fetch(new Request(req, { cache: 'no-cache' }))
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./') : Response.error())))
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // Schriften: gespeicherte Fassung sofort nehmen und im Hintergrund auffrischen
    e.respondWith(
      caches.open(FONTS).then((c) => c.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; })
          .catch(() => hit || Response.error());
        return hit || net;
      }))
    );
  }
});
