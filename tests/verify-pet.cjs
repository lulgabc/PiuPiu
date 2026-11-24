const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const { readModularGameSource } = require("./lib-source.cjs");
const game = readModularGameSource();
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const pets = require(path.join(root, "js/pets.js"));
const { translations } = require(path.join(root, "js/i18n.js"));

// ---------- catalog ----------
assert.equal(pets.PETS.length, 35, "the roster should contain all 35 monsters");
assert.equal(pets.PET_IDS.length, 35, "the id list should contain all 35 monsters");
assert.equal(new Set(pets.PET_IDS).size, 35, "pet ids must be unique");
for (const pet of pets.PETS) {
  assert.ok(pet.emoji, `${pet.id} needs a fallback emoji`);
  assert.ok(pet.w >= 30 && pet.h >= 50, `${pet.id} needs a readable footprint`);
  assert.ok(pet.aspect > 0.5 && pet.aspect < 1.6, `${pet.id} needs a sane aspect ratio`);
  assert.ok(pet.speed > 0 && pet.hop > 0, `${pet.id} needs movement and jumping`);
  assert.ok(Array.isArray(pet.pause) && pet.pause[0] <= pet.pause[1], `${pet.id} needs rest timing`);
  assert.ok(Array.isArray(pet.hopEvery) && pet.hopEvery[0] <= pet.hopEvery[1], `${pet.id} needs hop timing`);
  assert.ok(pet.chatter >= 0 && pet.chatter <= 1, `${pet.id} needs a chatter chance`);
  assert.match(pet.body, /^#[0-9a-f]{6}$/i, `${pet.id} needs a fallback body colour`);
  assert.match(pet.accent, /^#[0-9a-f]{6}$/i, `${pet.id} needs a fallback accent colour`);
  assert.match(pet.ink, /^#[0-9a-f]{6}$/i, `${pet.id} needs a face-line colour`);
  assert.match(pet.image, new RegExp(`^assets/monsters/${pet.id}\\.webp$`), `${pet.id} needs a final image`);
  assert.match(pet.base, new RegExp(`^assets/monsters/${pet.id}-base\\.webp$`), `${pet.id} needs a base image`);
  assert.ok(["row", "column"].includes(pet.eyeLayout), `${pet.id} needs a blink layout`);
  assert.ok(pet.eyeCount >= 1 && pet.eyeCount <= 3, `${pet.id} needs 1–3 eyes`);
  assert.ok(pet.eyeX > 0 && pet.eyeX < 1, `${pet.id} eye band x`);
  assert.ok(pet.eyeY > 0 && pet.eyeY < 1, `${pet.id} eye band y`);
  assert.ok(pet.eyeSpread >= 0 && pet.eyeSpread < 0.5, `${pet.id} eye spread`);
  assert.ok(pet.mouthX > 0 && pet.mouthX < 1, `${pet.id} mouth x`);
  assert.ok(pet.mouthY > 0 && pet.mouthY < 1, `${pet.id} mouth y`);
  assert.ok(pet.mouthW > 0 && pet.mouthW < 0.6, `${pet.id} mouth width`);
  assert.ok(pet.mouthH > 0 && pet.mouthH < 0.4, `${pet.id} mouth height`);
  assert.ok(pet.voice && pet.voice.notes.length >= 2, `${pet.id} needs a playful voice`);
  assert.ok(["sine", "triangle", "square", "sawtooth"].includes(pet.voice.wave), `${pet.id} voice waveform`);
  assert.ok(pet.voice.notes.every((note) => note >= 60 && note <= 2300), `${pet.id} voice range`);
  for (const key of [`pet.name.${pet.id}`, pet.say]) {
    for (const lang of ["zh", "fr", "en"]) {
      assert.ok(translations[lang][key], `${key} missing from ${lang}`);
    }
  }
}
assert.equal(pets.ACCESSORIES.length, 0, "the old accessory layer should be retired");
assert.equal(pets.randomAccessory(), null, "there should be no random accessory any more");

// ---------- random draw ----------
const seen = new Set();
for (let i = 0; i < 400; i += 1) {
  const pet = pets.random("mochi");
  assert.ok(pet && pets.PET_IDS.includes(pet.id), "random() must return a catalog pet");
  assert.notEqual(pet.id, "mochi", "random() should avoid the previous pet");
  seen.add(pet.id);
}
assert.ok(seen.size >= 30, "random() should reach most of the 35-pet roster");

// ---------- one random pet, no selection ----------
assert.match(html, /<div id="petLayer" class="pet-layer" aria-hidden="true"><\/div>/, "the field needs a pet layer");
assert.match(html, /id="petCollectionBtn"/, "home needs the 35-pet encounter collection button (F13)");
assert.match(html, /<dialog id="petSheet"/, "35-pet collection needs a native <dialog> sheet (F13)");
assert.match(html, /js\/pets\.js/, "index.html must load the pet catalog");
assert.match(sw, /\.\/js\/pets\.js/, "the service worker must precache pets.js");

// ---------- renderer ----------
assert.match(game, /PiuPets/, "game should use the shared pet catalog");
assert.match(game, /function randomPetDef\(\)/, "each round should draw a random pet");
assert.match(game, /Pets\.random\(state\.lastPetId\)/, "the draw should avoid an immediate repeat");
assert.match(game, /state\.lastPetId = /, "the previous pet should be remembered");
assert.match(game, /const PET_SCALE = 1\.5;/, "the jelly pet should have a large readable body");
assert.match(game, /const PET_DPR =[\s\S]{0,60}Math\.min\(2,/, "the canvas must cap device pixel ratio");
assert.match(game, /function createMonsterRenderer\(/, "the game needs the jelly monster renderer");
assert.match(game, /function makeBandPatch\(/, "the renderer should build feathered face patches");
assert.match(game, /image\.src = def\.image;/, "the renderer should load the final sticker");
assert.match(game, /base\.src = def\.base;/, "the renderer should load the faceless base layer");
assert.match(game, /function closedEyes\(/, "blinking should draw closed-eye arcs");
assert.match(game, /patches\.mouthBase/, "mouth animation should cover the old mouth");
assert.match(game, /patches\.mouthFace/, "mouth animation should redraw the mouth");
assert.match(game, /scaleY = 1 \+ 0\.2 \* open/, "mouth opening should scale the mouth face");
assert.match(game, /kind: "monster"/, "debug should identify the renderer");
assert.match(game, /function createPetRenderer\(/, "the vector puppet should remain as a fallback");
assert.match(game, /pet\.renderer = createMonsterRenderer\(pet, def, PET_DPR\)/, "the monster renderer should be the default");
assert.doesNotMatch(game, /createPetSpriteRenderer/, "the Tiny Pets sprite renderer must be gone");
assert.doesNotMatch(game, /assets\/pets\//, "the game must not reference the old Tiny Pets assets");
assert.doesNotMatch(game, /PET_SPRITE_/, "the old atlas constants must be gone");

assert.match(game, /function petThink\(/, "the pet needs a behavior brain");
assert.match(game, /function petChooseAction\(/, "the brain should score actions");
assert.match(game, /function petStartAction\(/, "the brain should start named actions");
for (const action of ["wander", "observe", "climb", "sit", "groom", "nap", "nuzzle", "nervous", "chase", "startle", "cheer"]) {
  assert.ok(game.includes(`"${action}"`), `the behavior brain should include ${action}`);
}
assert.match(game, /ctx\.danger/, "the brain should react to the pile height");
assert.match(game, /ctx\.pointer/, "the brain should notice the player's pointer");
assert.match(game, /ctx\.nearest/, "the brain should notice falling words");
assert.match(game, /state\.pointer = \{/, "pointer movement should feed the brain");
assert.match(game, /petNuzzle\(px\)/, "tapping the field should call the pet over");
assert.match(game, /petMeteorStart\(\);/, "the meteor should trigger a pet reaction");
assert.match(game, /petMeteorFinish\(\);/, "the meteor ending should trigger a pet reaction");

assert.match(game, /function clearPets\(\)/, "leaving a round should clear the pet");
assert.match(game, /function resetPets\(forcedDef\)/, "each round should spawn one pet");
assert.match(game, /state\.pets = \[pet\]/, "exactly one pet should be active");
assert.match(game, /const def = forcedDef \|\| randomPetDef\(\);/, "the pet should come from the random draw unless QA forces one");
assert.match(game, /function introducePet\(pet\)/, "the new pet should introduce itself");
assert.match(game, /bubble\.textContent = tr\(`pet\.name\.\$\{pet\.id\}`\)/, "the intro should show the pet name");
assert.match(game, /resetGame\(\);\s*resetPets\(\);/, "startGame should spawn a fresh random pet");
assert.match(game, /clearPets\(\);[\s\S]{0,60}updateHUD\(true\);/, "resetGame should clear the old pet");
assert.match(game, /function updatePets\(dt\)/, "the pet needs a frame update");
assert.match(game, /for \(const pet of state\.pets\) updatePet\(pet, dt\)/, "the active pet should animate");
assert.match(game, /petStartle\(word\.x \+ word\.w \/ 2\)/, "a falling word should startle the pet");
assert.match(game, /petCheer\(\);/, "correct words should make the pet cheer");
assert.match(game, /function playPetVoice\(id\)/, "each pet should use its own voice");
assert.match(game, /voice\.notes\.forEach/, "the voice should play a per-pet note sequence");
assert.match(game, /function playPetStep\(\)/, "the pet should have footsteps");
assert.match(game, /function playPetLand\(\)/, "the pet should land with a sound");
assert.match(game, /function playPetPurr\(\)/, "petting the pet should purr");
assert.match(game, /getPetCatalog:/, "the catalog should be inspectable in debug mode");
assert.match(game, /randomPet:/, "the random draw should be inspectable in debug mode");
assert.match(game, /setPet: \(id\)/, "QA should be able to force a pet for visual checks");
assert.doesNotMatch(game, /profilePets|renderPetSheet|togglePetChoice|setActivePets/, "player pet selection must be gone");
assert.doesNotMatch(game, /state\.profiles,[\s\S]{0,40}pets/, "profiles must not store pet teams");
assert.doesNotMatch(game, /@rive-app|dotlottie|lottie-web|three\.js/, "v1 must not add a heavy animation runtime");

for (const key of ["pet.say.mochi", "pet.name.mochi", "pet.say.orb", "pet.name.wisp"]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

console.log("✓ thirty-five jelly monsters share one line-art family");
console.log("✓ card-sized widths, face bands, mouth rigs and per-pet voices are defined");
console.log("✓ the Canvas renderer blinks, chews and wobbles the original artwork");
console.log("✓ the utility brain still picks wander / observe / climb / sit / groom / nap / nuzzle / nervous / chase");
console.log("✓ each round draws exactly one random pet; no player selection or pet team");
