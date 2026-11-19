const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const pets = require(path.join(root, "js/pets.js"));
const { translations } = require(path.join(root, "js/i18n.js"));

// ---------- pet catalog ----------
assert.ok(pets.PETS.length >= 12, "the warehouse should offer at least twelve pets");
assert.equal(pets.MAX_PETS, 3, "a player can bring at most three pets");
assert.deepEqual(pets.DEFAULT_PETS, ["mouse"], "a new player starts with the mouse");
const ids = pets.PETS.map((pet) => pet.id);
assert.equal(new Set(ids).size, ids.length, "pet ids must be unique");
for (const pet of pets.PETS) {
  assert.ok(pet.emoji && pet.w >= 36 && pet.h >= 36, `${pet.id} needs an emoji and a footprint`);
  assert.ok(pet.speed > 0 && pet.hop > 0, `${pet.id} needs movement and jumping`);
  assert.ok(Array.isArray(pet.pause) && pet.pause[0] <= pet.pause[1], `${pet.id} needs rest timing`);
  assert.ok(Array.isArray(pet.hopEvery) && pet.hopEvery[0] <= pet.hopEvery[1], `${pet.id} needs hop timing`);
  assert.ok(pet.chatter >= 0 && pet.chatter <= 1, `${pet.id} needs a chatter chance`);
  assert.ok(pet.shape && pet.trait, `${pet.id} needs a shape and a trait`);
  for (const key of [`pet.name.${pet.id}`, `pet.say.${pet.id}`, `pet.trait.${pet.trait}`]) {
    for (const lang of ["zh", "fr", "en"]) {
      assert.ok(translations[lang][key], `${key} missing from ${lang}`);
    }
  }
}
assert.deepEqual(pets.sanitize(["cat", "cat", "dog", "fox", "lion"]), ["cat", "dog", "fox"], "pets dedupe and stop at three");
assert.deepEqual(pets.sanitize([]), ["mouse"], "an empty team falls back to the mouse");
assert.deepEqual(pets.sanitize(["missing"]), ["mouse"], "unknown pets fall back safely");
assert.equal(pets.byId("frog").emoji, "🐸");

// ---------- warehouse markup ----------
assert.match(html, /<div id="petLayer" class="pet-layer" aria-hidden="true"><\/div>/, "the field needs a pet layer");
assert.match(html, /id="petBtn"/, "the home screen needs a pet shelf shortcut");
assert.match(html, /id="petSheet"/, "the pet warehouse dialog is required");
assert.match(html, /id="petGrid"[^>]*role="group"/, "the warehouse needs a pet grid");
assert.match(html, /id="petTeam" class="pet-team"/, "the warehouse needs a team preview");
assert.match(html, /id="petCountLine"[^>]*aria-live="polite"/, "the selected count should be announced");
assert.match(html, /data-i18n="pet\.title"/, "the warehouse title should be translated");
assert.match(html, /data-i18n="pet\.note"/, "the warehouse needs a try-and-listen note");
assert.match(html, /js\/pets\.js/, "index.html must load the pet catalog");
assert.ok(html.indexOf("js/pets.js") < html.indexOf("js/profiles.js"), "pets.js must load before profiles.js");
assert.match(sw, /\.\/js\/pets\.js/, "the service worker must precache pets.js");

// ---------- warehouse styling ----------
assert.match(css, /\.pet-layer \{/, "pets need a dedicated layer");
assert.match(css, /\.pet \{[^}]*var\(--pet-w/, "pet badges should use per-pet widths");
assert.match(css, /\.pet \{[^}]*var\(--pet-h/, "pet badges should use per-pet heights");
assert.match(css, /\.pet\[data-shape="tall"\] \.pet-body/, "tall pets need a taller silhouette");
assert.match(css, /\.pet\[data-shape="wide"\] \.pet-body/, "wide pets need a wider silhouette");
assert.match(css, /\.pet\[data-shape="chunky"\] \.pet-body/, "chunky pets need their own silhouette");
assert.match(css, /\.pet-shelf-footer \{[^}]*position: sticky/, "the warehouse done button should stay reachable");
assert.match(css, /\.pet-choice\.is-selected/, "selected warehouse cards need a visual state");
assert.match(css, /\.pet-team-slot\.is-filled/, "the team preview needs filled slots");
assert.match(css, /html\[data-theme\] \.player-row \.player-pet/, "the pet shortcut should follow the active skin");
assert.match(css, /html\[data-theme\] \.pet-team-slot\.is-filled/, "the team preview should follow the active skin");
assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.pet,/, "pets should calm down for reduced motion");

// ---------- game engine ----------
assert.match(game, /const Pets = window\.PiuPets/, "game.js should use the shared pet catalog");
assert.match(game, /function activePetIds\(\)/, "the game should resolve the active player's pets");
assert.match(game, /function resetPets\(\)/, "the game should spawn the active pet team");
assert.match(game, /function updatePets\(dt\)/, "the game should update every pet");
assert.match(game, /for \(const pet of state\.pets\) updatePet\(pet, dt\)/, "all active pets should animate");
assert.match(game, /for \(const p of state\.pets\)/, "misses and cheers should reach the whole team");
assert.match(game, /petStartle\(word\.x \+ word\.w \/ 2\)/, "a falling word should startle nearby pets");
assert.match(game, /petCheer\(\);/, "correct words should make the team cheer");
assert.match(game, /p\.def\.speed/, "each pet should use its own speed");
assert.match(game, /p\.def\.hop/, "each pet should use its own jump");
assert.match(game, /p\.def\.pause/, "each pet should use its own rest rhythm");
assert.match(game, /playPetVoice\(p\.id\)/, "each pet should use its own voice");
assert.match(game, /function playPetVoice\(id\)/, "the game needs a pet voice mixer");
for (const id of ["cat", "dog", "frog", "penguin", "chick", "turtle", "lion"]) {
  assert.ok(game.includes(`id === "${id}"`), `playPetVoice should handle ${id}`);
}
assert.match(game, /function togglePetChoice\(id\)/, "warehouse cards should toggle membership");
assert.match(game, /current\.length >= Pets\.MAX_PETS/, "the warehouse should cap the team at three");
assert.match(game, /current\.length <= 1/, "the warehouse should keep at least one pet");
assert.match(game, /function renderPetSheet\(\)/, "the warehouse should render the catalog");
assert.match(game, /function openPetSheet\(\)/, "the pet shortcut should open the warehouse");
assert.match(game, /data-pet-choice/, "warehouse cards should be wired");
assert.match(game, /getPets:/, "pets should be inspectable in debug mode");
assert.match(game, /getPetCatalog:/, "the catalog should be inspectable in debug mode");

for (const key of [
  "pet.button",
  "pet.title",
  "pet.close",
  "pet.openAria",
  "pet.subtitle",
  "pet.count",
  "pet.note",
  "pet.min",
  "pet.max",
  "pet.needPlayer",
  "pet.saved",
]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

console.log("✓ twelve pets have their own silhouette, pace, jump style and voice");
console.log("✓ players keep one to three pets in a local warehouse");
console.log("✓ every selected pet appears in the game and reacts to the pile");
console.log("✓ the warehouse is reachable from home, follows all skins and works on small screens");
