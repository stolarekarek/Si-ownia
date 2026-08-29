// Service worker — plan v4 Arek
// Strategia: HTML zawsze z sieci (network-first), reszta z cache.
// Dzięki temu każda aktualizacja index.html w repo trafia na telefon od razu.

const VERSION = 'v4-2026-08-29';        // <-- podbijaj przy każdej większej zmianie
const CACHE = `arek-plan-${VERSION}`;
const CORE = ['./', './index.html', './manifest.webmanifest'];

// INSTALACJA: pobierz szkielet, nie czekaj na zamknięcie starych okien
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(CORE.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

// AKTYWACJA: skasuj stare cache i natychmiast przejmij kontrolę nad stronami
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // NETWORK-FIRST: świeży plan, offline dopiero jako awaryjne wyjście
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // RESZTA (fonty, ikony): cache-first + odświeżanie w tle
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
