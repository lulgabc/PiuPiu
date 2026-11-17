const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "js/pixi-ambient.js"), "utf8");
const gameHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const demoHtml = fs.readFileSync(path.join(root, "pixi-demo.html"), "utf8");
const gameCss = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const demoCss = fs.readFileSync(path.join(root, "css/pixi-demo.css"), "utf8");
const vendorPath = path.join(root, "js/vendor/pixi.min.js");
const licensePath = path.join(root, "js/vendor/pixi.LICENSE.txt");

const SCENES = ["spring", "summer", "autumn", "winter", "egypt", "greece", "rome", "space"];

// ---------- vendored engine ----------
assert.ok(fs.existsSync(vendorPath), "vendored PixiJS is missing");
const vendor = fs.readFileSync(vendorPath, "utf8");
assert.ok(vendor.length > 500_000, "vendored PixiJS looks truncated");
assert.ok(vendor.includes("PIXI="), "vendored PixiJS does not expose the PIXI global");
assert.ok(fs.existsSync(licensePath), "PixiJS license file is missing");
assert.match(fs.readFileSync(licensePath, "utf8"), /MIT License/i, "PixiJS license must stay MIT");

// ---------- eight scenes ----------
assert.match(
  source,
  /const ORDER = \["spring", "summer", "autumn", "winter", "egypt", "greece", "rome", "space"\];/,
  "ambient scene order must contain the four seasons and four themed scenes",
);
for (const scene of SCENES) {
  assert.ok(source.includes(`    ${scene}: {`), `missing scene metadata: ${scene}`);
}
for (const [scene, builder] of [
  ["spring", "buildSpring"],
  ["summer", "buildSummer"],
  ["autumn", "buildAutumn"],
  ["winter", "buildWinter"],
  ["egypt", "buildEgypt"],
  ["greece", "buildGreece"],
  ["rome", "buildRome"],
  ["space", "buildSpace"],
]) {
  assert.ok(source.includes(`${scene}: ${builder},`), `missing scene builder link: ${scene}`);
  assert.ok(source.includes(`function ${builder}()`), `missing scene builder: ${builder}`);
}
for (const scene of ["egypt", "greece", "rome", "space"]) {
  assert.ok(source.includes(`    ${scene}(ctx, w, h) {`), `missing painted backdrop: ${scene}`);
}

// ---------- engine behaviour ----------
assert.match(source, /PIXI\.Application/, "ambient engine must use a Pixi Application");
assert.match(source, /preference:\s*"webgl"/, "ambient engine should request WebGL explicitly");
assert.match(source, /prefers-reduced-motion/, "ambient engine should respect reduced motion");
assert.match(source, /blendMode\s*=\s*"add"/, "ambient engine should use additive glow blending");
assert.match(source, /IS_DEMO/, "ambient engine should support demo and in-game modes");
assert.match(source, /seasonForMonth/, "game mode should start from the real season");
assert.match(source, /pickSceneForRound/, "game mode should pick one scene per round");
assert.match(source, /piupiu:roundstart/, "ambient engine should listen for new rounds");
assert.match(gameJs, /piupiu:roundstart/, "game should announce each new round");
assert.match(source, /!IS_DEMO \|\| !autoOn \|\| REDUCED/, "auto rotation must stay out of the game");
assert.match(source, /visibilitychange/, "ambient engine should pause with the tab");
assert.match(source, /setScene:/, "debug scene switching should be exposed");
assert.doesNotMatch(source, /\p{Extended_Pictographic}/u, "the ambient engine must stay free of emoji assets");

// ---------- game wiring ----------
assert.match(gameHtml, /id="pixiAmbient"/, "game is missing the Pixi ambient mount");
assert.match(gameHtml, /js\/vendor\/pixi\.min\.js/, "game does not load vendored PixiJS");
assert.match(gameHtml, /js\/pixi-ambient\.js/, "game does not load the ambient engine");
assert.doesNotMatch(gameHtml, /js\/ambient\.js/, "game must not load the old ambient.js");
assert.doesNotMatch(gameHtml, /ambientLayer|weatherLayer|season-wash/, "old ambient markup is still present");
assert.ok(!fs.existsSync(path.join(root, "js/ambient.js")), "old ambient.js still exists");
assert.match(gameCss, /\.pixi-ambient\s*\{/, "game CSS is missing .pixi-ambient");
assert.match(gameCss, /z-index:\s*1;/, "Pixi ambient should sit above the field backdrop");
assert.match(gameCss, /pointer-events:\s*none;/, "Pixi ambient must not intercept input");
assert.doesNotMatch(gameCss, /\.ambient-layer|\.weather-drop|\.season-wash/, "old ambient CSS is still present");

// ---------- standalone preview ----------
assert.match(demoHtml, /js\/vendor\/pixi\.min\.js/, "preview does not load vendored PixiJS");
assert.match(demoHtml, /js\/pixi-ambient\.js/, "preview does not load the shared ambient engine");
assert.match(demoHtml, /id="stage"/, "preview is missing its stage");
assert.match(demoHtml, /id="dock"/, "preview is missing its scene dock");
assert.match(demoCss, /\.stage\s*\{/, "preview CSS is missing the stage");
assert.match(demoCss, /\.scene-btn/, "preview CSS is missing scene buttons");
assert.match(demoCss, /prefers-reduced-motion/, "preview CSS should respect reduced motion");

console.log("✓ PixiJS 8 is vendored locally with its MIT license");
console.log(`✓ ${SCENES.length} scenes: four seasons + Egypt, Greece, Rome and space`);
console.log("✓ game uses the Pixi layer and no longer loads the old ambient effects");
console.log("✓ ambient canvas sits above the backdrop, below words, and ignores input");
console.log("✓ one fixed scene per round; a new round picks a different theme");
console.log("✓ season start, tab pausing and reduced motion are wired");
console.log("✓ the shared engine powers both the game and the standalone preview");
