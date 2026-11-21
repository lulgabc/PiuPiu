/* PiuPiu service worker: app-shell precache + offline navigation fallback. */
"use strict";

const VERSION = "2.26.4";
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
  "./assets/monsters/fluff.webp",
  "./assets/monsters/fluff-base.webp",
  "./assets/monsters/mochi.webp",
  "./assets/monsters/mochi-base.webp",
  "./assets/monsters/pudding.webp",
  "./assets/monsters/pudding-base.webp",
  "./assets/monsters/spike.webp",
  "./assets/monsters/spike-base.webp",
  "./assets/monsters/orb.webp",
  "./assets/monsters/orb-base.webp",
  "./assets/monsters/gummy.webp",
  "./assets/monsters/gummy-base.webp",
  "./assets/monsters/trio.webp",
  "./assets/monsters/trio-base.webp",
  "./assets/monsters/hornpip.webp",
  "./assets/monsters/hornpip-base.webp",
  "./assets/monsters/snowball.webp",
  "./assets/monsters/snowball-base.webp",
  "./assets/monsters/kitty.webp",
  "./assets/monsters/kitty-base.webp",
  "./assets/monsters/doodle.webp",
  "./assets/monsters/doodle-base.webp",
  "./assets/monsters/antenna.webp",
  "./assets/monsters/antenna-base.webp",
  "./assets/monsters/cream.webp",
  "./assets/monsters/cream-base.webp",
  "./assets/monsters/bean.webp",
  "./assets/monsters/bean-base.webp",
  "./assets/monsters/bubble.webp",
  "./assets/monsters/bubble-base.webp",
  "./assets/monsters/sunny.webp",
  "./assets/monsters/sunny-base.webp",
  "./assets/monsters/wingy.webp",
  "./assets/monsters/wingy-base.webp",
  "./assets/monsters/flappy.webp",
  "./assets/monsters/flappy-base.webp",
  "./assets/monsters/chirpy.webp",
  "./assets/monsters/chirpy-base.webp",
  "./assets/monsters/fuzz.webp",
  "./assets/monsters/fuzz-base.webp",
  "./assets/monsters/starey.webp",
  "./assets/monsters/starey-base.webp",
  "./assets/monsters/hornbud.webp",
  "./assets/monsters/hornbud-base.webp",
  "./assets/monsters/boo.webp",
  "./assets/monsters/boo-base.webp",
  "./assets/monsters/jitters.webp",
  "./assets/monsters/jitters-base.webp",
  "./assets/monsters/droopy.webp",
  "./assets/monsters/droopy-base.webp",
  "./assets/monsters/tower.webp",
  "./assets/monsters/tower-base.webp",
  "./assets/monsters/grinny.webp",
  "./assets/monsters/grinny-base.webp",
  "./assets/monsters/dumpling.webp",
  "./assets/monsters/dumpling-base.webp",
  "./assets/monsters/toothy.webp",
  "./assets/monsters/toothy-base.webp",
  "./assets/monsters/dino.webp",
  "./assets/monsters/dino-base.webp",
  "./assets/monsters/fluffet.webp",
  "./assets/monsters/fluffet-base.webp",
  "./assets/monsters/sigh.webp",
  "./assets/monsters/sigh-base.webp",
  "./assets/monsters/quilly.webp",
  "./assets/monsters/quilly-base.webp",
  "./assets/monsters/liz.webp",
  "./assets/monsters/liz-base.webp",
  "./assets/monsters/wisp.webp",
  "./assets/monsters/wisp-base.webp",
  "./css/style.css?v=2.26.4",
  "./js/i18n.js?v=2.26.4",
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
  "./js/pixi-ambient.js?v=2.26.4",
  "./js/game.js?v=2.26.4",
  "./js/pwa.js?v=2.26.4",
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
