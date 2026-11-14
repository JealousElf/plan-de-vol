/* Plan de vol : tout le contenu est mis en cache à l'installation, puis servi sans réseau. */
var VERSION = "pdv-7b5c36007e5c";
var FICHIERS = [
  "index.html",
  "styles.css",
  "config.js",
  "app.js",
  "suivi.js",
  "graph.js",
  "synchro.js",
  "manifest.webmanifest",
  "fonts/b612-latin-400-normal.woff2",
  "fonts/b612-latin-700-normal.woff2",
  "fonts/fonts.css",
  "fonts/spectral-latin-400-italic.woff2",
  "fonts/spectral-latin-400-normal.woff2",
  "fonts/spectral-latin-500-normal.woff2",
  "fonts/spectral-latin-600-normal.woff2",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "data/aae.js",
  "data/citations.js",
  "data/conflits.js",
  "data/contexte.js",
  "data/france.js",
  "data/monde.js",
  "data/operations.js",
  "data/organisation.js",
  "data/programmes.js",
  "data/sujets.js"
];
var ACTU = 'pdv-actu';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(['./'].concat(FICHIERS).map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== VERSION && k !== ACTU; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  var vif = url.pathname.match(/\/data\/(actu|news)\.json$/);
  if (vif) {
    var cle = 'data/' + vif[1] + '.json';   // fichiers qui changent souvent : réseau d'abord, dernière copie hors connexion
    e.respondWith(fetch(req, { cache: 'no-store' }).then(function (rep) {
      if (rep.ok) { var copie = rep.clone(); caches.open(ACTU).then(function (c) { c.put(cle, copie); }); }
      return rep;
    }).catch(function () {
      return caches.open(ACTU).then(function (c) { return c.match(cle); }).then(function (rep) {
        return rep || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      });
    }));
    return;
  }
  e.respondWith(caches.open(VERSION).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (rep) {
      if (rep) return rep;
      return fetch(req).catch(function () { return c.match('index.html'); });
    });
  }));
});
