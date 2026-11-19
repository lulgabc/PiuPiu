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
assert.ok(pets.PETS.length >= 12, "the game should draw from at least twelve pets");
const ids = pets.PETS.map((pet) => pet.id);
assert.equal(new Set(ids).size, ids.length, "pet ids must be unique");
for (const pet of pets.PETS) {
  assert.ok(pet.emoji && pet.w >= 36 && pet.h >= 36, `${pet.id} needs an emoji and a footprint`);
  assert.ok(pet.speed > 0 && pet.hop > 0, `${pet.id} needs movement and jumping`);
  assert.ok(Array.isArray(pet.pause) && pet.pause[0] <= pet.pause[1], `${pet.id} needs rest timing`);
  assert.ok(Array.isArray(pet.hopEvery) && pet.hopEvery[0] <= pet.hopEvery[1], `${pet.id} needs hop timing`);
  assert.ok(pet.chatter >= 0 && pet.chatter <= 1, `${pet.id} needs a chatter chance`);
  assert.ok(pet.shape && pet.say, `${pet.id} needs a shape and a saying`);
  for (const key of [`pet.name.${pet.id}`, pet.say]) {
    for (const lang of ["zh", "fr", "en"]) {
      assert.ok(translations[lang][key], `${key} missing from ${lang}`);
    }
  }
}
assert.equal(pets.byId("frog").emoji, "🐸");
assert.equal(pets.byId("missing"), null);

// The draw must be random, valid and avoid an immediate repeat.
const seen = new Set();
for (let i = 0; i < 300; i += 1) {
  const pet = pets.random("mouse");
  assert.ok(pet && pets.PET_IDS.includes(pet.id), "random() must return a catalog pet");
  assert.notEqual(pet.id, "mouse", "random() should avoid the previous pet when asked");
  seen.add(pet.id);
}
assert.ok(seen.size >= 8, "random() should reach a broad part of the catalog");
for (let i = 0; i < 80; i += 1) {
  const pet = pets.random();
  assert.ok(pet && pets.PET_IDS.includes(pet.id), "random() without an exclusion must stay valid");
}

// ---------- one random pet, no player choice ----------
assert.match(html, /<div id="petLayer" class="pet-layer" aria-hidden="true"><\/div>/, "the field needs a pet layer");
assert.doesNotMatch(html, /id="petBtn"/, "players must not choose pets from home");
assert.doesNotMatch(html, /id="petSheet"/, "there should be no pet warehouse dialog");
assert.doesNotMatch(html, /id="petGrid"/, "there should be no pet selection grid");
assert.match(html, /js\/pets\.js/, "index.html must load the pet catalog");
assert.match(sw, /\.\/js\/pets\.js/, "the service worker must precache pets.js");

assert.match(css, /\.pet-layer \{/, "pets need a dedicated layer");
assert.match(css, /\.pet \{[^}]*var\(--pet-w/, "pet badges should use per-pet widths");
assert.match(css, /\.pet \{[^}]*var\(--pet-h/, "pet badges should use per-pet heights");
assert.match(css, /\.pet\[data-shape="tall"\] \.pet-body/, "tall pets need a taller silhouette");
assert.match(css, /\.pet\[data-shape="wide"\] \.pet-body/, "wide pets need a wider silhouette");
assert.match(css, /\.pet\[data-shape="chunky"\] \.pet-body/, "chunky pets need their own silhouette");
assert.doesNotMatch(css, /pet-choice/, "the removed warehouse should not leave styling behind");
assert.doesNotMatch(css, /player-pet/, "the removed pet shortcut should not leave styling behind");
assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.pet,/, "pets should calm down for reduced motion");

assert.match(game, /const Pets = window\.PiuPets/, "game.js should use the shared pet catalog");
assert.match(game, /function randomPetDef\(\)/, "each round should draw a random pet");
assert.match(game, /Pets\.random\(state\.lastPetId\)/, "the draw should avoid an immediate repeat");
assert.match(game, /state\.lastPetId = def\.id/, "the previous pet should be remembered");
assert.match(game, /function clearPets\(\)/, "leaving a round should clear the pet");
assert.match(game, /function resetPets\(\)/, "each round should spawn one pet");
assert.match(game, /state\.pets = \[pet\]/, "exactly one pet should be active");
assert.match(game, /const def = randomPetDef\(\);/, "the pet should come from the random draw");
assert.match(game, /function introducePet\(pet\)/, "the new pet should introduce itself");
assert.match(game, /bubble\.textContent = tr\(`pet\.name\.\$\{pet\.id\}`\)/, "the intro should show the pet name");
assert.match(game, /resetGame\(\);\s*resetPets\(\);/, "startGame should spawn a fresh random pet");
assert.match(game, /clearPets\(\);\s*updateHUD\(true\);/, "resetGame should clear the old pet");
assert.match(game, /function updatePets\(dt\)/, "the pet needs a frame update");
assert.match(game, /for \(const pet of state\.pets\) updatePet\(pet, dt\)/, "the active pet should animate");
assert.match(game, /petStartle\(word\.x \+ word\.w \/ 2\)/, "a falling word should startle the pet");
assert.match(game, /petCheer\(\);/, "correct words should make the pet cheer");
assert.match(game, /p\.def\.speed/, "each pet should use its own speed");
assert.match(game, /p\.def\.hop/, "each pet should use its own jump");
assert.match(game, /p\.def\.pause/, "each pet should use its own rest rhythm");
assert.match(game, /playPetVoice\(p\.id\)/, "each pet should use its own voice");
assert.match(game, /function playPetVoice\(id\)/, "the game needs a pet voice mixer");
for (const id of ["cat", "dog", "frog", "penguin", "chick", "turtle", "lion"]) {
  assert.ok(game.includes(`id === "${id}"`), `playPetVoice should handle ${id}`);
}
assert.match(game, /getPetCatalog:/, "the catalog should be inspectable in debug mode");
assert.match(game, /randomPet:/, "the random draw should be inspectable in debug mode");
assert.doesNotMatch(game, /profilePets|renderPetSheet|togglePetChoice|setActivePets/, "player pet selection must be gone");
assert.doesNotMatch(game, /state\.profiles,[\s\S]{0,40}pets/, "profiles must not store pet teams");

for (const key of ["pet.say.mouse", "pet.name.mouse", "pet.say.frog", "pet.name.unicorn"]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

console.log("✓ twelve pets keep their own silhouette, pace, jump style and voice");
console.log("✓ each round draws exactly one random pet and avoids an immediate repeat");
console.log("✓ players can no longer choose, keep or bring multiple pets");
console.log("✓ the random pet follows the pile, introduces itself and reacts to the round");
