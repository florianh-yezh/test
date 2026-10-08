// Service worker : garde l'appli disponible hors connexion.
// Pense à changer VERSION à chaque mise à jour des fichiers pour que les téléphones la récupèrent.
const VERSION = "gm-v12";
const SHELL = ["./", "index.html", "app.css", "app.js", "data.js", "extras.js", "bebe3d.js", "config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];
const RUNTIME_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "www.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && !RUNTIME_HOSTS.includes(url.hostname)) return; // Firebase, assistante : toujours en direct
  // Fichiers de l'appli : réseau d'abord (mises à jour rapides), cache si hors ligne.
  if (same){
    e.respondWith(fetch(req).then(res => {
      if (res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch:true}).then(r => r || caches.match("index.html"))));
    return;
  }
  // Polices et SDK Firebase : cache d'abord.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === "opaque"){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
