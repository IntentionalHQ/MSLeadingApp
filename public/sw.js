// MS Leading service worker.
// Strategy:
//  - App shell (HTML/JS/CSS/icons/manifest) → cache-first, background revalidate.
//  - Supabase REST (writes and reads) → network-first with cache fallback for reads.
//  - We NEVER cache POST/PATCH/DELETE responses.
//
// Version bump forces cache clear.
const CACHE = "msleading-v3";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GETs and Supabase REST reads
  const isSameOrigin = url.origin === self.location.origin;
  const isSupabase = url.hostname.endsWith(".supabase.co");

  if (req.method !== "GET") return; // pass through — writes go through app queue

  if (isSameOrigin) {
    // network-first for HTML, cache-first for assets
    if (req.destination === "document") {
      event.respondWith(
        fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put(req, r.clone())); return r; })
          .catch(() => caches.match(req).then((m) => m || caches.match("/")))
      );
      return;
    }
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put(req, r.clone())); return r; })
      )
    );
    return;
  }

  if (isSupabase) {
    // Network-first, fall back to cached GET on offline
    event.respondWith(
      fetch(req).then((r) => {
        if (r.ok) caches.open(CACHE).then((c) => c.put(req, r.clone()));
        return r;
      }).catch(() => caches.match(req).then((m) => m || new Response(JSON.stringify([]), { headers: { "content-type": "application/json" } })))
    );
  }
});
