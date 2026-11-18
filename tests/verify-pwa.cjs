const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const manifest = JSON.parse(read("manifest.json"));
const index = read("index.html");
const pwa = read("js/pwa.js");
const sw = read("sw.js");
const i18n = read("js/i18n.js");
const css = read("css/style.css");

// ---------- manifest ----------
assert.equal(manifest.short_name, "PiuPiu", "the home-screen name should be short");
assert.equal(manifest.start_url, "./", "start_url should stay relative to the repository path");
assert.equal(manifest.scope, "./", "scope should cover the whole app");
assert.equal(manifest.display, "standalone", "the app should open without browser chrome");
assert.equal(manifest.theme_color, "#060814", "theme colour should match the app header");
assert.equal(manifest.background_color, "#05070f", "launch background should match the app");
assert.equal(manifest.lang, "zh-CN", "the default manifest language should be Chinese");
assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "icon set is required");

const iconPurposes = manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose}`).join(" ");
assert.match(iconPurposes, /192x192:any/, "a 192px icon is required for installability");
assert.match(iconPurposes, /512x512:any/, "a 512px icon is required for installability");
assert.match(iconPurposes, /512x512:maskable/, "a maskable icon is required for Android");

// ---------- real PNG dimensions ----------
function pngSize(file) {
  const data = fs.readFileSync(path.join(root, file));
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file} is not a PNG`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

for (const icon of manifest.icons) {
  const [expectedW, expectedH] = icon.sizes.split("x").map(Number);
  const [width, height] = pngSize(icon.src);
  assert.equal(width, expectedW, `${icon.src} width mismatch`);
  assert.equal(height, expectedH, `${icon.src} height mismatch`);
}
assert.deepEqual(pngSize("icons/apple-touch-icon-180.png"), [180, 180], "Apple touch icon size");

// ---------- head + install entry points ----------
assert.match(index, /rel="manifest" href="manifest.json"/, "the manifest should be linked");
assert.match(index, /rel="apple-touch-icon" sizes="180x180" href="icons\/apple-touch-icon-180\.png"/, "iOS needs a touch icon");
assert.match(index, /name="apple-mobile-web-app-capable" content="yes"/, "iOS standalone mode should be declared");
assert.match(index, /name="theme-color" content="#060814"/, "the browser UI theme should be declared");
assert.match(index, /id="installBtn"/, "the main screen needs an install shortcut");
assert.match(index, /id="installSheet"/, "manual install instructions need a dialog");
assert.match(index, /id="installClose"/, "the install dialog needs a close button");
assert.match(index, /id="installDone"/, "the install dialog needs a done button");
assert.match(index, /data-i18n="install\.cta"/, "the install shortcut should be translated");
assert.match(index, /js\/pwa\.js\?v=[\d.]+/, "the PWA controller should be loaded");
assert.match(css, /@media \(max-height: 900px\)/, "short screens should compact the start panel");
assert.match(css, /\.start-meta/, "the install shortcut and best score should share a row");

// ---------- install controller ----------
assert.match(index, /__PIUPIU_INSTALL_PROMPT__/, "the install event should be captured before the app scripts load");
assert.match(pwa, /beforeinstallprompt/, "the browser install prompt should be captured");
assert.match(pwa, /__PIUPIU_INSTALL_PROMPT__/, "the early install event should be reused");
assert.match(pwa, /event\.preventDefault\(\)/, "the default mini-infobar should be suppressed");
assert.match(pwa, /appinstalled/, "successful installation should hide the shortcut");
assert.match(pwa, /display-mode: standalone/, "standalone mode should hide the shortcut");
assert.match(pwa, /navigator\.standalone === true/, "iOS standalone mode should be detected");
assert.match(pwa, /classList\.toggle\("is-standalone"/, "standalone launches should be marked before layout");
assert.match(index, /classList\.add\("is-standalone"\)/, "standalone mode should be marked before first paint");
assert.match(pwa, /iphone\|ipad\|ipod/i, "iOS manual instructions should be detected");
assert.match(pwa, /maxTouchPoints > 1/, "iPadOS desktop user agents should be treated as iOS");
assert.match(pwa, /\.register\("\.\/sw\.js"/, "the service worker should be registered at the app root");
assert.match(pwa, /scope: "\.\/"/, "the service worker should control the whole app");
assert.match(pwa, /updateViaCache: "none"/, "the service worker should not be HTTP-cached");
assert.match(pwa, /piupiu:langchange/, "the install dialog should follow language changes");
assert.match(pwa, /event\.key !== "Escape"/, "Escape should close the install dialog");
assert.match(pwa, /event\.target === installSheet/, "clicking the backdrop should close the install dialog");
assert.match(pwa, /if \(standalone\) \{\s*hideInstallButton\(\)/, "standalone launches should hide the shortcut");
assert.match(pwa, /install\.ios1/, "iOS steps should be rendered");
assert.match(pwa, /__PIU_PWA__/, "debug install hooks should be available with ?debug=1");

// ---------- service worker ----------
assert.equal(sw.includes(`const VERSION = "${pkg.version}"`), true, "the cache version should match package.json");
assert.match(sw, /const PRECACHE = \[/, "the app shell should be precached");
assert.match(sw, /self\.skipWaiting\(\)/, "updates should activate promptly");
assert.match(sw, /self\.clients\.claim\(\)/, "the worker should control the first page");
assert.match(sw, /key\.startsWith\(CACHE_PREFIX\)/, "old app caches should be removed");
assert.match(sw, /request\.mode === "navigate"/, "navigation should have an offline fallback");
assert.match(sw, /const isShell = url\.pathname === OFFLINE_PATH/, "only the app shell should replace the offline page");
assert.match(sw, /OFFLINE_URL/, "the shell should be the offline fallback");
assert.match(sw, /url\.origin !== self\.location\.origin/, "cross-origin requests should be left alone");
assert.match(sw, /request\.method !== "GET"/, "only reads should be intercepted");
assert.match(sw, /response\.type === "basic"/, "only same-origin responses should be cached");

const precacheBlock = sw.slice(sw.indexOf("const PRECACHE"), sw.indexOf("];", sw.indexOf("const PRECACHE")));
const precache = [...precacheBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
assert.ok(precache.includes("./"), "the start URL should be precached");
assert.ok(precache.includes("./index.html"), "the offline shell should be precached");

function normalize(url) {
  return url.startsWith("./") ? url : `./${url}`;
}

const indexAssets = [...index.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((url) => !/^(?:data:|https?:|#)/.test(url));
for (const asset of indexAssets) {
  assert.ok(precache.includes(normalize(asset)), `precache is missing ${asset}`);
}
for (const icon of manifest.icons) {
  assert.ok(precache.includes(normalize(icon.src)), `precache is missing ${icon.src}`);
}

for (const url of precache) {
  const file = url.replace(/^\.\//, "").replace(/\?.*$/, "") || "index.html";
  assert.ok(fs.existsSync(path.join(root, file)), `precache file does not exist: ${url}`);
}

// ---------- translations ----------
for (const key of [
  "install.cta",
  "install.title",
  "install.close",
  "install.done",
  "install.ios",
  "install.ios1",
  "install.ios2",
  "install.ios3",
  "install.android",
  "install.desktop",
  "install.unsupported",
  "install.note",
]) {
  const matches = i18n.match(new RegExp(`"${key.replace(/\./g, "\\.")}"`, "g")) || [];
  assert.equal(matches.length, 3, `${key} should be translated in zh / fr / en`);
}

console.log("✓ installable manifest, icons and Apple touch icon are present");
console.log("✓ install shortcut, native prompt and iOS instructions are wired");
console.log("✓ service worker precaches the shell and updates its cache version");
