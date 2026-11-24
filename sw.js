/* PiuPiu service worker: 3-bucket cache (shell / static / data) + offline navigation fallback. */
"use strict";

const VERSION = "2.33.0";
const SHELL_CACHE = `piupiu-shell-v${VERSION}`;
const STATIC_CACHE = "piupiu-static-v1";
const DATA_CACHE = "piupiu-data-v1";
const SHELL_PREFIX = "piupiu-shell-";
const LEGACY_PREFIX = "piupiu-v";
const OFFLINE_URL = "./index.html";
const OFFLINE_PATH = new URL(OFFLINE_URL, self.registration.scope).pathname;
const ROOT_PATH = new URL(self.registration.scope).pathname;

const SHELL_PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/apple-touch-icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./css/style.css?v=2.33.0",
  "./css/arcade.css?v=2.33.0",
  "./css/poetry.css?v=2.33.0",
  "./css/theme-a11y.css?v=2.33.0",
  "./js/i18n.js?v=2.33.0",
  "./js/words.js",
  "./js/lexicon.js",
  "./js/phrases.js?v=2.2.0",
  "./js/numbers.js",
  "./js/custom-packs.js?v=2.33.0",
  "./js/pets.js",
  "./js/profiles.js",
  "./js/emojis.js",
  "./js/pwa.js?v=2.33.0",
  "./js/main.js?v=2.33.0",
  "./js/core/events.js",
  "./js/core/loader.js",
  "./js/core/state.js",
  "./js/core/storage.js",
  "./js/data/pack-manifest.js",
  "./js/data/packs.js",
  "./js/modes/rain.js",
  "./js/modes/fill.js",
  "./js/modes/paint.js",
  "./js/modes/poem.js",
  "./js/systems/audio.js",
  "./js/systems/fx.js",
  "./js/systems/pet.js",
  "./js/systems/physics.js",
  "./js/systems/speech.js",
  "./js/ui/dialogs.js",
  "./js/ui/feedback.js",
  "./js/ui/pets-ui.js",
  "./js/ui/profiles.js",
  "./js/ui/packs-ui.js",
  "./js/ui/poetry-ui.js",
  "./js/ui/settings-ui.js",
];

function isStaticAsset(pathname) {
  return (
    pathname.includes("/assets/monsters/") ||
    pathname.includes("/js/vendor/") ||
    pathname.endsWith("/js/pixi-ambient.js") ||
    pathname.includes("/icons/")
  );
}

function isDataAsset(pathname) {
  return (
    pathname.endsWith("/js/education.js") ||
    pathname.endsWith("/js/families.js") ||
    pathname.endsWith("/js/poetry.js")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .open(SHELL_CACHE)
        .then((cache) =>
          cache.addAll(
            SHELL_PRECACHE.map(
              (url) => new Request(new URL(url, self.registration.scope).href, { cache: "reload" }),
            ),
          ),
        ),
      caches.open(STATIC_CACHE),
      caches.open(DATA_CACHE),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                (key.startsWith(SHELL_PREFIX) && key !== SHELL_CACHE) ||
                key.startsWith(LEGACY_PREFIX),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => Promise.all([caches.open(STATIC_CACHE), caches.open(DATA_CACHE)]))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

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
            const cache = await caches.open(SHELL_CACHE);
            await cache.put(OFFLINE_URL, response.clone());
          }
          return response;
        } catch {
          if (!isShell) return Response.error();
          const cache = await caches.open(SHELL_CACHE);
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

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isDataAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, DATA_CACHE));
    return;
  }

  event.respondWith(cacheFirst(request, SHELL_CACHE));
});
