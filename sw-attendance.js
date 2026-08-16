// Service worker for the RFID + Face Attendance app shell.
// Lives at the repo root so its scope can cover /public/ — a worker's
// default scope is limited to its own directory and everything below it.

const CACHE_NAME = "attendance-app-v1";
const APP_SHELL = [
    "public/attendance-app.html",
    "public/attendance-dashboard.html",
    "assets/css/attendance-app.css",
    "assets/js/attendance-store.js",
    "assets/js/attendance-app.js",
    "assets/js/attendance-dashboard.js",
    "assets/manifest-attendance.webmanifest",
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
    // Only manage same-origin app-shell requests; let cross-origin CDN
    // requests (face-api.js, EmailJS) go straight to the network.
    if (new URL(event.request.url).origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).catch(() => cached);
        })
    );
});
