const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const license = fs.readFileSync(path.join(root, "assets/monsters/README.md"), "utf8");
const pets = require(path.join(root, "js/pets.js"));

function readLosslessSize(file) {
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF", `${file} should be a RIFF container`);
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP", `${file} should be a WebP`);
  assert.equal(bytes.toString("ascii", 12, 16), "VP8L", `${file} should use lossless WebP for crisp line art`);
  assert.equal(bytes[20], 0x2f, `${file} should carry a VP8L signature`);
  const bits = bytes.readUInt32LE(21);
  return {
    width: (bits & 0x3fff) + 1,
    height: ((bits >>> 14) & 0x3fff) + 1,
    bytes: bytes.length,
  };
}

assert.equal(pets.PETS.length, 35, "all 35 monsters should be in the catalog");
assert.equal(new Set(pets.PETS.map((pet) => pet.id)).size, 35, "the roster should be unique");
assert.ok(!fs.existsSync(path.join(root, "assets/pets")), "the old Tiny Pets folder should be removed");

let total = 0;
for (const pet of pets.PETS) {
  const finalFile = path.join(root, pet.image);
  const baseFile = path.join(root, pet.base);
  assert.ok(fs.existsSync(finalFile), `${pet.id} final sticker should be bundled`);
  assert.ok(fs.existsSync(baseFile), `${pet.id} base layer should be bundled`);
  const finalSize = readLosslessSize(finalFile);
  const baseSize = readLosslessSize(baseFile);
  assert.deepEqual(
    [finalSize.width, finalSize.height],
    [baseSize.width, baseSize.height],
    `${pet.id} final and base must align pixel-for-pixel`,
  );
  assert.ok(finalSize.width > 140, `${pet.id} should have enough horizontal source detail`);
  assert.ok(finalSize.height > 160, `${pet.id} should have enough vertical source detail`);
  assert.ok(finalSize.bytes > 5 * 1024 && finalSize.bytes < 100 * 1024, `${pet.id} final sticker should be lightweight`);
  assert.ok(baseSize.bytes > 4 * 1024 && baseSize.bytes < 100 * 1024, `${pet.id} base sticker should be lightweight`);
  const aspect = finalSize.width / finalSize.height;
  assert.ok(
    Math.abs(aspect - pet.aspect) < 0.08,
    `${pet.id} catalog aspect should match the artwork`,
  );
  assert.match(sw, new RegExp(`\\./assets/monsters/${pet.id}\\.webp`), `${pet.id} final should be precached`);
  assert.match(sw, new RegExp(`\\./assets/monsters/${pet.id}-base\\.webp`), `${pet.id} base should be precached`);
  total += finalSize.bytes + baseSize.bytes;
}
assert.ok(total < 3.2 * 1024 * 1024, `the whole 70-asset monster set should stay under 3.2MB (got ${Math.round(total / 1024)}KB)`);

assert.match(license, /35/, "the asset readme should describe the 35-monster roster");
assert.match(license, /lucasnachbauer|estudiopharcosart/i, "the reference line-art credit should be recorded");
assert.match(license, /base\.webp/, "the faceless base layer should be documented");
assert.match(license, /盲|授權|授权|licen[cs]e/i, "the usage note should be recorded");

assert.match(game, /assets\/monsters\//, "the renderer should point at the monster assets");
assert.match(game, /image\.src = def\.image/, "the final sticker should load from the catalog");
assert.match(game, /base\.src = def\.base/, "the base layer should load for face motion");
assert.match(game, /function createMonsterRenderer\(/, "the Canvas renderer should draw the new roster");
assert.match(game, /function makeBandPatch\(/, "eye and mouth areas should be cut into feathered patches");
assert.match(game, /patches\.eye/, "blink should use the eye patch");
assert.match(game, /patches\.mouthFace/, "mouth motion should use the mouth face patch");
assert.match(game, /ctx\.drawImage\(image, ox, oy, fitW, fitH\)/, "the final sticker should be drawn at its natural aspect");
assert.match(game, /ctx\.rotate\(rot\)/, "the jelly body should tilt");
assert.match(game, /ctx\.transform\(1, 0, shear, 1, 0, 0\)/, "the jelly body should shear as it wobbles");
assert.match(game, /ctx\.drawImage\(mf\.canvas/, "the mouth should be redrawn with a vertical scale");

const gallery = fs.readFileSync(path.join(root, "monster-preview/gallery.html"), "utf8");
assert.equal((gallery.match(/class="g-card"/g) || []).length, 35, "the gallery should show all 35 monsters");
assert.match(gallery, /\.\.\/assets\/monsters\//, "the gallery should use the final monster assets");
assert.ok(fs.existsSync(path.join(root, "monster-preview/index.html")), "the two-pet style preview should stay available");

console.log("✓ thirty-five final stickers and thirty-five faceless base layers are bundled");
console.log("✓ final/base pairs align, match the catalog aspect and stay under 3.2MB total");
console.log("✓ every monster asset is precached for offline play");
console.log("✓ the renderer draws the original line art, blinks and chews through patches");
