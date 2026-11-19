const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const asset = path.join(root, "assets/pets/cat-sprite.webp");
const license = fs.readFileSync(path.join(root, "assets/pets/README.md"), "utf8");

assert.ok(fs.existsSync(asset), "the pilot sprite atlas should be bundled");
const bytes = fs.readFileSync(asset);
assert.ok(bytes.length > 100 * 1024 && bytes.length < 400 * 1024, "the pilot atlas should stay around 200-300KB");
assert.equal(bytes.toString("ascii", 0, 4), "RIFF", "the atlas should be a WebP");
assert.equal(bytes.toString("ascii", 8, 12), "WEBP", "the atlas should be a WebP");

assert.match(license, /CC0/, "the source license should be recorded");
assert.match(license, /opengameart\.org/, "the source URL should be recorded");
assert.match(license, /pzUH/, "the source author should be recorded");

assert.match(game, /PET_SPRITE_PILOT = new URLSearchParams\(location\.search\)\.get\("petdemo"\) === "sprite"/, "the sprite pilot should be opt-in");
assert.match(game, /const PET_SPRITE_CAT = \{/, "the cat atlas metadata should be defined");
assert.match(game, /image: "assets\/pets\/cat-sprite\.webp"/, "the renderer should point at the bundled atlas");
assert.match(game, /function createPetSpriteRenderer\(/, "the pilot needs a Canvas 2D sprite renderer");
assert.match(game, /ctx\.drawImage\(image, sx, sy, cfg\.cell, cfg\.cell, dx, dy, size, size\)/, "the pilot should draw atlas cells directly");
assert.match(game, /if \(PET_SPRITE_PILOT && Pets/, "the pilot should force the cat");
assert.match(game, /renderer: pet\.renderer && pet\.renderer\.isSprite \? "sprite" : "canvas"/, "debug state should expose the renderer");
assert.match(game, /spriteAction: pet\.renderer && pet\.renderer\.getAction/, "debug state should expose the sprite action");
assert.match(game, /!PET_SPRITE_PILOT && Pets/, "the sprite pilot should not overlay a vector accessory");
assert.match(sw, /\.\/assets\/pets\/cat-sprite\.webp/, "the atlas should be precached for offline use");
assert.match(html, /js\/game\.js\?v=\d+\.\d+\.\d+/, "the app should load the current game script");

console.log("✓ the CC0 cat atlas is bundled, attributed and precached");
console.log("✓ ?petdemo=sprite draws real frame animation through Canvas 2D");
console.log("✓ the pilot stays opt-in and does not disturb the default bean companion");
