// Service worker for the Audiobook Reader app shell.
// Lives at the repo root so its scope can cover /public/ — a worker's
// default scope is limited to its own directory and everything below it.

const CACHE_NAME = "audiobook-reader-v1";
const APP_SHELL = [
    "public/audiobook-reader.html",
    "assets/css/audiobook-reader.css",
    "assets/js/audiobook-reader.js",
    "assets/manifest.webmanifest",
    "assets/icons/icon-192.png",
    "assets/icons/icon-512.png",
    "assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).catch(() => cached);
        })
    );
});
