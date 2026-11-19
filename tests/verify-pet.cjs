const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const { translations } = require(path.join(root, "js/i18n.js"));

assert.match(html, /<div id="pet" class="pet" aria-hidden="true">/, "the field needs a pet layer");
assert.match(html, /class="pet-body">🐭</, "the pet should be a mouse");
assert.match(html, /id="petSqueak"[^>]*data-i18n="pet\.squeak"/, "the squeak bubble should be translated");
assert.match(html, /class="pet-shadow"/, "the pet needs a ground shadow");

assert.match(css, /\.pet \{/, "the pet needs its own positioning layer");
assert.match(css, /\.pet-body \{/, "the mouse needs a sticker body");
assert.match(css, /\.pet-squeak \{/, "the mouse needs a squeak bubble");
assert.match(css, /body\.phase-playing \.pet/, "the pet should only appear while playing");
assert.match(css, /body\.phase-paused \.pet/, "the pet should stay visible while paused");
assert.match(css, /html\[data-theme\] \.pet-body \{/, "the pet should follow the active skin");
assert.match(css, /html\[data-theme\] \.pet-squeak \{/, "the squeak bubble should follow the active skin");
assert.match(css, /html\[data-theme="bubblegum"\] \.pet-shadow/, "the dark skin needs a darker pet shadow");
assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.pet,/, "the pet should calm down for reduced motion");

assert.match(game, /const PET_W = 46;/, "the pet needs a fixed footprint");
assert.match(game, /function petGroundAt\(x\)/, "the pet needs pile-aware ground detection");
assert.match(game, /for \(const settled of state\.settled\)/, "ground detection should read settled words");
assert.match(game, /function petPickTarget\(p, fieldW, bias = 0\)/, "the pet needs wandering targets");
assert.match(game, /state\.settled\.length > 1 && Math\.random\(\) < 0\.68/, "the pet should favour playing on the pile");
assert.match(game, /function updatePet\(dt\)/, "the pet needs a frame update");
assert.match(game, /updatePet\(dt\);/, "the game loop should update the pet");
assert.match(game, /petStartle\(word\.x \+ word\.w \/ 2\)/, "a falling word should startle the pet");
assert.match(game, /petCheer\(\);/, "correct words should make the pet cheer");
assert.match(game, /petSqueak\(true\)/, "tapping the mouse should squeak");
assert.match(game, /getPet:/, "the pet should be inspectable in debug mode");
assert.match(game, /p\.x \+= p\.dir \* \(REDUCED_MOTION \? PET_SPEED \* 0\.55 : PET_SPEED\) \* dt/, "the pet should run slower for reduced motion");

for (const lang of ["zh", "fr", "en"]) {
  assert.ok(translations[lang]["pet.squeak"], `pet.squeak missing from ${lang}`);
}

console.log("✓ a mouse runs, hops and squeaks on the settled pile");
console.log("✓ the pet follows the terrain and reacts to misses and correct words");
console.log("✓ pet taps squeak, reduced motion is calmer, and all skins style the pet");
