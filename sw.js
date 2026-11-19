/* PiuPiu service worker: app-shell precache + offline navigation fallback. */
"use strict";

const VERSION = "2.18.1";
const CACHE_NAME = `piupiu-v${VERSION}`;
const CACHE_PREFIX = "piupiu-";
const OFFLINE_URL = "./index.html";
const OFFLINE_PATH = new URL(OFFLINE_URL, self.registration.scope).pathname;
const ROOT_PATH = new URL(self.registration.scope).pathname;

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/apple-touch-icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./css/style.css?v=2.18.1",
  "./js/i18n.js?v=2.18.1",
  "./js/words.js",
  "./js/lexicon.js",
  "./js/education.js",
  "./js/families.js",
  "./js/phrases.js?v=2.2.0",
  "./js/numbers.js",
  "./js/pets.js",
  "./js/profiles.js",
  "./js/emojis.js",
  "./js/vendor/pixi.min.js?v=2.0.1",
  "./js/vendor/matter.min.js",
  "./js/pixi-ambient.js?v=2.18.1",
  "./js/game.js?v=2.18.1",
  "./js/pwa.js?v=2.18.1",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          PRECACHE.map(
            (url) => new Request(new URL(url, self.registration.scope).href, { cache: "reload" }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const isShell = url.pathname === OFFLINE_PATH || url.pathname === ROOT_PATH;
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (isShell && response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(OFFLINE_URL, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(OFFLINE_URL)) ||
            (await cache.match("./")) ||
            Response.error()
          );
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response && response.ok && response.type === "basic") {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
