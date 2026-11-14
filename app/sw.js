// Offline-Cache: alle App-Dateien beim Installieren laden.
// Bei jeder Veröffentlichung CACHE-Version erhöhen (gleich wie APP_VERSION in app.js).
const CACHE = "einbuergerung-ag-v3";
const FILES = ["./", "index.html", "style.css", "app.js", "data.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "img/q72.png", "img/q137.png", "img/q156.png", "img/q165.png", "img/q174.png", "img/q196.png", "img/q239.png"];

self.addEventListener("install", e => {
  // cache: "reload" umgeht den HTTP-Zwischenspeicher, damit wirklich die neuen Dateien geladen werden
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // Zuerst Netz – immer beim Server nachfragen (no-cache), offline aus dem Cache
  e.respondWith(fetch(url.href, { cache: "no-cache" })
    .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
