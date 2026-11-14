// FitSmarter – offline cache. App files: network first; fonts, Leaflet and Firebase SDK: cache first.
const CACHE = "fitsmarter-v1";
const CORE = ["./", "./index.html", "./styles.css", "./app.js", "./store.js", "./firebase-config.js", "./manifest.webmanifest", "./logo.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  const put = res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; };
  if (u.origin === location.origin) { e.respondWith(fetch(r).then(put).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("./index.html")))); return; }
  const lib = /^fonts\.(googleapis|gstatic)\.com$|^cdnjs\.cloudflare\.com$/.test(u.hostname) || (u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/"));
  if (lib)
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(put)));
  // map tiles, Firestore and auth: always network
});
