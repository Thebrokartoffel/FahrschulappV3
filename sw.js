/* Schaltpunkt - Service Worker.
   Nach jeder Aenderung die Zahl in CACHE erhoehen, sonst bleibt die alte Version. */

var CACHE = 'schaltpunkt-v3';

var DATEIEN = [
  './',
  'index.html',
  'style.css',
  'logic.js',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(DATEIEN.map(function (d) {
        return c.add(new Request(d, { cache: 'reload' })).catch(function () { });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (n) {
      return Promise.all(n.map(function (x) { return x === CACHE ? null : caches.delete(x); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var kopie = res.clone();
        caches.open(CACHE).then(function (c) { c.put('index.html', kopie); });
        return res;
      }).catch(function () {
        return caches.match('index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (treffer) {
      var netz = fetch(req).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          var kopie = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, kopie); });
        }
        return res;
      }).catch(function () { return treffer; });
      return treffer || netz;
    })
  );
});
