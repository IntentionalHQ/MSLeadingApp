// Minimal service worker — enables "installable PWA" without offline complexity.
// We deliberately do NOT cache Supabase or Next chunks; app is online-first.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* passthrough */ });
