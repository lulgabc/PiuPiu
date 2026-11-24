const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const ambient = fs.readFileSync(path.join(root, "js/pixi-ambient.js"), "utf8");
const { readModularGameSource } = require("./lib-source.cjs");
const game = readModularGameSource();
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// ---------- adaptive ambient quality ----------
assert.match(ambient, /const LOW_POWER = params\.get\("lowpower"\) === "1" \|\| COARSE \|\| SMALL_SCREEN/);
assert.match(ambient, /const MAX_FPS = LOW_POWER \? 30 : 60/);
assert.match(ambient, /const MAX_DPR = LOW_POWER \? 1\.3 : 2/);
assert.match(ambient, /function qcount\(count, min = 4\)/);
assert.match(ambient, /antialias: !LOW_POWER/);
assert.match(ambient, /resolution: Math\.min\(window\.devicePixelRatio \|\| 1, MAX_DPR\)/);
assert.match(ambient, /powerPreference: LOW_POWER \? "low-power" : "high-performance"/);
assert.match(ambient, /app\.ticker\.maxFPS = MAX_FPS/);
assert.match(ambient, /grain\.visible = !LOW_POWER/);
assert.match(ambient, /vignette\.visible = !LOW_POWER/);
assert.match(ambient, /const maxW = LOW_POWER \? 1280 : 1600/);

// ---------- reduced scene complexity ----------
assert.match(ambient, /qcount\(62, 28\)/, "spring petals should be reduced on low power");
assert.match(ambient, /qcount\(130, 62\)/, "winter snow should be reduced on low power");
assert.match(ambient, /jellySpecs\.slice\(0, 3\)/, "summer jellyfish should be reduced on low power");
assert.match(ambient, /Math\.round\(spec\.count \* 0\.38\)/, "winter aurora ribbons should be reduced on low power");
assert.match(ambient, /qcount\(150, 76\)/, "space stars should be reduced on low power");

// ---------- pause ambient while an overlay is visible ----------
assert.match(ambient, /let desiredRunning = IS_DEMO/);
assert.match(ambient, /function setRunning\(run\)/);
assert.match(ambient, /app\.ticker\.stop\(\)/);
assert.match(ambient, /app\.renderer\.render\(app\.stage\)/);
assert.match(ambient, /if \(!desiredRunning\) \{/);
assert.match(ambient, /requestIdleCallback\(ensureBoot/, "low-power boot should wait for idle");
assert.match(ambient, /setTimeout\(ensureBoot, 450\)/, "browsers without idle callbacks should still defer");
assert.match(ambient, /function ensureBoot\(\)/, "WebGL boot should be lazy on low power");
assert.match(ambient, /else if \(desiredRunning\)/);
assert.match(game, /function setAmbientRunning\(running\)/);
assert.match(game, /setAmbientRunning\(true\)/, "starting/resuming should wake the ambient scene");
assert.match(game, /setAmbientRunning\(false\)/, "menus/pause/end should freeze the ambient scene");

// ---------- game loop cap ----------
assert.match(game, /const GAME_FPS = 60/);
assert.match(game, /1000 \/ GAME_FPS - 1/, "DOM word motion should be capped at 60fps");
assert.match(game, /state\.raf = requestAnimationFrame\(frame\);\s*\n\s*return;/, "skipped frames should be rescheduled");

// ---------- touch-specific CSS budget ----------
assert.match(html, /navigator\.maxTouchPoints > 1/, "touch devices should be classified early");
assert.match(html, /classList\.add\("is-touch"\)/, "the touch class should be applied before first paint");
assert.match(css, /html\.is-touch body::before \{\s*filter: none;/);
assert.match(css, /html\.is-touch \.stat \{[\s\S]*?backdrop-filter: none;/);
assert.match(css, /html\.is-touch \.word \{[\s\S]*?backdrop-filter: none;/);
assert.match(css, /html\.is-touch \.word:not\(\.settled\):not\(\.miss\)/);
assert.match(css, /rgba\(9, 13, 26, 0\.58\)/);
assert.match(css, /html\.is-touch \.overlay \{[\s\S]*?backdrop-filter: none;/);
assert.match(css, /html\.is-touch \.field-stars \{\s*animation: none;/);
assert.match(css, /html\.is-touch \.word\.focused,/);
assert.match(css, /html\.is-touch \.word-layer\.has-focus/);
assert.match(css, /html\.is-touch \.brand-mark,[\s\S]*?animation: none;/);
assert.match(css, /@keyframes starsDrift \{[\s\S]*?translate3d\(420px, 420px, 0\)/);
assert.doesNotMatch(css, /@keyframes starsDrift \{[\s\S]*?background-position: 420px/, "stars should animate with a composited transform");
assert.match(css, /@keyframes wordIn \{\s*from \{ opacity: 0; \}/, "word entry should avoid a blur filter");

console.log("✓ touch devices use a lower-resolution, 30fps, fewer-particle ambient scene");
console.log("✓ the ambient renderer pauses on menus/pause/end and resumes on play");
console.log("✓ costly live blurs and the repainting star field are removed on touch");
console.log("✓ DOM word motion is capped at 60fps and the game loop reschedules cleanly");
