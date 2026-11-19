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
  assert.match(pet.accent, /^#[0-9a-f]{6}$/i, `${pet.id} needs a sticker accent colour`);
  assert.ok(["thin", "fluffy", "round", "tuft", "tiny", "none"].includes(pet.tail), `${pet.id} needs a tail type`);
  assert.ok(["round", "point", "webbed", "flipper", "wing"].includes(pet.paw), `${pet.id} needs a paw shape`);
  assert.ok(["round", "long", "webbed", "stub", "small"].includes(pet.foot), `${pet.id} needs a foot shape`);
  assert.match(pet.body, /^#[0-9a-f]{6}$/i, `${pet.id} needs its own body colour`);
  assert.ok(["plain", "stripes", "spots", "belly", "tuxedo", "shell", "sparkle"].includes(pet.pattern), `${pet.id} needs a body pattern`);
  for (const key of [`pet.name.${pet.id}`, pet.say]) {
    for (const lang of ["zh", "fr", "en"]) {
      assert.ok(translations[lang][key], `${key} missing from ${lang}`);
    }
  }
}
assert.equal(pets.byId("frog").emoji, "🐸");
assert.equal(pets.byId("missing"), null);
assert.ok(pets.ACCESSORIES.length >= 4, "the accessory layer should offer several pieces");
for (const acc of pets.ACCESSORIES) {
  assert.match(acc.color, /^#[0-9a-f]{6}$/i, `${acc.id} needs a colour`);
  assert.match(acc.shade, /^#[0-9a-f]{6}$/i, `${acc.id} needs a shade`);
}
for (let i = 0; i < 80; i += 1) {
  const acc = pets.randomAccessory("scarf");
  assert.ok(acc && pets.ACCESSORIES.some((item) => item.id === acc.id), "randomAccessory must stay valid");
  assert.notEqual(acc.id, "scarf", "randomAccessory should avoid an immediate repeat");
}

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

// ---------- Canvas sticker puppet ----------
assert.match(css, /\.pet-layer \{/, "pets need a dedicated layer");
assert.match(css, /\.pet\[data-shape="tall"\] \.pet-body/, "the emoji fallback keeps tall silhouettes");
assert.match(css, /\.pet-canvas \{/, "the puppet needs a canvas layer");
assert.match(css, /translateY\(var\(--pet-hop/, "the canvas should lift with the pet hop");
assert.match(css, /scaleX\(var\(--pet-face/, "the canvas should face the direction of travel");
assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.pet,/, "pets should calm down for reduced motion");
assert.doesNotMatch(css, /pet-choice|player-pet/, "removed warehouse UI must not leave styling behind");

assert.match(game, /const Pets = window\.PiuPets/, "game.js should use the shared pet catalog");
assert.match(game, /function randomPetDef\(\)/, "each round should draw a random pet");
assert.match(game, /Pets\.random\(state\.lastPetId\)/, "the draw should avoid an immediate repeat");
assert.match(game, /state\.lastPetId = def\.id/, "the previous pet should be remembered");
assert.match(game, /const PET_SCALE = 1\.34;/, "the pet should have room for limbs and a tail");
assert.match(game, /const PET_DPR = Math\.min\(2,/, "the sprite canvas must cap device pixel ratio");
assert.match(game, /const PET_SPRITE_MODE = !PET_VECTOR_PREVIEW;/, "the animated sprite roster should be the default renderer");
assert.match(game, /function createPetSpriteRenderer\(/, "the default renderer should play sprite atlases");
assert.match(game, /function createPetRenderer\(/, "the vector puppet should remain as the offline fallback");
assert.match(game, /function makePetHead\(/, "the emoji head should be pre-rendered as a sticker sprite");
assert.match(game, /function drawPetBodyPattern\(/, "each species should draw its own body markings");
assert.match(game, /ctx\.fillStyle = def\.body \|\| palette\.card/, "the body should use the species colour instead of a white circle");
assert.match(game, /function petBodyPath\(/, "the body should be a soft bean, not a circle");
assert.match(game, /PET_BODY_VARIANT = PET_PARAMS\.get\("petbody"\)/, "the organic die-cut should stay available as a preview variant");
assert.match(game, /function petCutBodyPath\(/, "the preview needs a scalloped die-cut path");
assert.match(game, /if \(cut\) \{/, "the preview should branch on the cut style");
assert.match(game, /function drawPetAccessoryBack\(/, "backpacks should draw behind the body");
assert.match(game, /function drawPetAccessoryFront\(/, "scarves, bows and pins should draw in front");
assert.match(game, /function drawPetStar\(/, "the star pin needs a star shape");
assert.match(game, /Pets\.randomAccessory\(state\.lastAccessory\)/, "each round should draw a varied accessory");
assert.match(game, /state\.lastAccessory = accessory\.id/, "the previous accessory should be remembered");
assert.match(game, /function createPetRenderer\(/, "the game needs a Canvas 2D renderer");
assert.match(game, /function drawPetTail\(/, "the renderer should draw a species tail");
assert.match(game, /function drawPetFoot\(/, "the renderer should draw feet");
assert.match(game, /function drawPetPaw\(/, "the renderer should draw paws");
assert.match(game, /function petUpdateMotion\(/, "the puppet should have procedural motion");
assert.match(game, /m\.breathPhase/, "the puppet should breathe");
assert.match(game, /m\.tailPhase/, "the tail should sway");
assert.match(game, /m\.lookX/, "the puppet should look toward a target");
assert.match(game, /m\.squashX/, "the puppet should squash and stretch");
assert.match(game, /m\.footL/, "the feet should step");
assert.match(game, /m\.pawL/, "the paws should move");
assert.match(game, /spawnDust/, "steps and landings should make small dust puffs");

assert.match(game, /function petThink\(/, "the pet needs a behavior brain");
assert.match(game, /function petChooseAction\(/, "the brain should score actions");
assert.match(game, /function petStartAction\(/, "the brain should start named actions");
for (const action of ["wander", "observe", "climb", "sit", "groom", "nap", "nuzzle", "nervous", "chase", "startle", "cheer"]) {
  assert.ok(game.includes(`"${action}"`), `the behavior brain should include ${action}`);
}
assert.match(game, /b\.energy/, "the brain should track energy");
assert.match(game, /b\.recent/, "the brain should remember recent actions");
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
assert.match(game, /clearPets\(\);\s*updateHUD\(true\);/, "resetGame should clear the old pet");
assert.match(game, /function updatePets\(dt\)/, "the pet needs a frame update");
assert.match(game, /for \(const pet of state\.pets\) updatePet\(pet, dt\)/, "the active pet should animate");
assert.match(game, /petStartle\(word\.x \+ word\.w \/ 2\)/, "a falling word should startle the pet");
assert.match(game, /petCheer\(\);/, "correct words should make the pet cheer");
assert.match(game, /function playPetVoice\(id\)/, "each pet should use its own voice");
assert.match(game, /function playPetStep\(\)/, "the puppet should have footsteps");
assert.match(game, /function playPetLand\(\)/, "the puppet should land with a sound");
assert.match(game, /function playPetPurr\(\)/, "petting the puppet should purr");
assert.match(game, /getPetCatalog:/, "the catalog should be inspectable in debug mode");
assert.match(game, /randomPet:/, "the random draw should be inspectable in debug mode");
assert.match(game, /setPet: \(id\)/, "QA should be able to force a pet for visual checks");
assert.doesNotMatch(game, /profilePets|renderPetSheet|togglePetChoice|setActivePets/, "player pet selection must be gone");
assert.doesNotMatch(game, /state\.profiles,[\s\S]{0,40}pets/, "profiles must not store pet teams");
assert.doesNotMatch(game, /@rive-app|dotlottie|lottie-web|three\.js/, "v1 must not add a heavy animation runtime");

for (const key of ["pet.say.cat", "pet.name.bunny", "pet.say.dragon", "pet.name.ghost"]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

console.log("✓ twelve Tiny Pets share one cohesive animated sprite family");
console.log("✓ the sprite atlas is the default renderer, with a vector fallback and ?petbody=vector preview");
console.log("✓ a random scarf / backpack / bow / star can still be layered in the vector preview");
console.log("✓ the behavior brain still drives wander / observe / climb / sit / groom / nap / nuzzle / nervous / chase");
console.log("✓ each round draws exactly one random pet; no player selection or pet team");
