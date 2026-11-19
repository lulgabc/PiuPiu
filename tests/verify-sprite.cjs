const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const pets = require(path.join(root, "js/pets.js"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const license = fs.readFileSync(path.join(root, "assets/pets/README.md"), "utf8");

const PET_IDS = ["cat", "dog", "bunny", "chick", "bear", "fox", "panda", "penguin", "frog", "dragon", "slime", "ghost"];
const ACTIONS = ["Idle", "Jump", "Sleep", "Happy"];

function readLosslessSize(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF", `${file} should be a RIFF container`);
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP", `${file} should be a WebP`);
  assert.equal(bytes.toString("ascii", 12, 16), "VP8L", `${file} should use lossless WebP for crisp pixel art`);
  assert.equal(bytes[20], 0x2f, `${file} should carry a VP8L signature`);
  const bits = bytes.readUInt32LE(21);
  return {
    width: (bits & 0x3fff) + 1,
    height: ((bits >>> 14) & 0x3fff) + 1,
    bytes: bytes.length,
  };
}

assert.deepEqual(pets.PET_IDS, PET_IDS, "the catalog roster should match the sprite roster exactly");
assert.equal(new Set(PET_IDS).size, 12, "the roster should not repeat a species");

let total = 0;
for (const id of PET_IDS) {
  const file = path.join(root, "assets/pets", `${id}.webp`);
  assert.ok(fs.existsSync(file), `${id}.webp should be bundled`);
  const size = readLosslessSize(file);
  assert.equal(size.width, 512, `${id} atlas should be 8 frames wide`);
  assert.equal(size.height, 256, `${id} atlas should be 4 actions tall`);
  assert.ok(size.bytes > 2 * 1024 && size.bytes < 64 * 1024, `${id} atlas should stay small`);
  total += size.bytes;
  assert.match(sw, new RegExp(`\\./assets/pets/${id}\\.webp`), `${id} atlas should be precached offline`);
  assert.ok(pets.byId(id), `${id} should exist in the catalog`);
}
assert.ok(total < 200 * 1024, "the whole twelve-pet atlas set should stay under 200KB");

assert.match(license, /labitos/, "the source author should be recorded");
assert.match(license, /https:\/\/labitos\.itch\.io\/tiny-pets/, "the source page should be recorded");
assert.match(license, /commercial/i, "the commercial-use grant should be recorded");
assert.match(license, /may not.*resell|forbids reselling/i, "the redistribution limit should be recorded");
assert.match(license, /512×256/, "the atlas layout should be documented");
assert.match(license, /Idle, Jump, Sleep, Happy/, "the four actions should be documented");

assert.match(game, /const PET_SPRITE_IDS = \["cat", "dog", "bunny", "chick", "bear", "fox", "panda", "penguin", "frog", "dragon", "slime", "ghost"\]/, "the renderer should know all twelve atlases");
assert.match(game, /function createPetSpriteRenderer\(/, "the game needs a Canvas 2D sprite renderer");
assert.match(game, /ctx\.drawImage\(image, sx, sy, 64, 64, dx, dy, size, size\)/, "the renderer should draw 64px atlas cells directly");
assert.match(game, /const PET_SPRITE_MODE = !PET_VECTOR_PREVIEW;/, "sprite pets should be the default renderer");
assert.match(game, /PET_VECTOR_PREVIEW = \["vector", "bean", "cut"\]/, "the old vector puppets should remain opt-in previews");
assert.match(game, /!PET_SPRITE_MODE && Pets/, "the sprite roster should not overlay vector accessories");
assert.match(game, /image\.onerror = \(\) => \{\s*pet\.renderer = createPetRenderer/, "a missing atlas should fall back to the vector puppet");
assert.match(game, /renderer: pet\.renderer && pet\.renderer\.isSprite \? "sprite" : "canvas"/, "debug state should expose the renderer");
assert.match(game, /spriteAction: pet\.renderer && pet\.renderer\.getAction/, "debug state should expose the playing action");
assert.match(game, /function chooseSpriteAction\(\)/, "behaviour should map onto the four sprite actions");
for (const action of ACTIONS) {
  assert.match(game, new RegExp(`${action}: \\{ row: \\d, count: 8`), `${action} should be mapped to an atlas row`);
}

console.log("✓ twelve Tiny Pets atlases are bundled, sized and documented");
console.log("✓ the whole sprite set stays under 200KB and is precached for offline play");
console.log("✓ Canvas 2D draws 64px cells as the default pet renderer");
console.log("✓ Idle / Jump / Sleep / Happy follow the behaviour brain");
console.log("✓ a missing atlas falls back to the vector puppet; ?petbody=vector keeps the old preview");
