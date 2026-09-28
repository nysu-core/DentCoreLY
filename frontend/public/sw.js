// OrthoCore service worker
//
// IMPORTANT: This app handles sensitive clinical information. This worker
// intentionally caches ONLY the static application shell (HTML/CSS/JS/icons/
// manifest) so the app can install and boot offline. It NEVER caches
// requests to /api/* — no patient records, medical images, or any
// confidential API response is ever stored here.

const SHELL_CACHE = "orthocore-shell-v4";

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/apple-touch-icon.png",
  "/WhatsApp_Image_2026-09-27_at_10.02.08-removebg-preview.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept or cache API traffic — always go straight to the network.
  // If the network is unavailable, the app's own UI (via navigator.onLine and
  // failed requests) is responsible for showing an "offline — not saved"
  // state. We deliberately do not fabricate offline API responses here.
  if (isApiRequest(url) || event.request.method !== "GET") {
    return;
  }

  // App-shell navigation requests: network first, fall back to cached shell,
  // then to the offline page.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(
        () => caches.match(event.request).then((res) => res || caches.match("/index.html") || caches.match("/offline.html"))
      )
    );
    return;
  }

  // Static same-origin assets (JS/CSS/icons/fonts): cache-first, then network,
  // updating the cache in the background.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request)
          .then((res) => {
            if (res.ok) {
              caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, res.clone()));
            }
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
