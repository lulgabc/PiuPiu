const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const phrases = require("../js/phrases.js");
const { translations } = require("../js/i18n.js");

const root = path.join(__dirname, "..");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const LANGS = ["zh", "fr", "en"];
const hasKey = (key) => LANGS.every((lang) => typeof translations[lang][key] === "string" && translations[lang][key].trim());

assert.equal(phrases.length, 2, "expected two phrasal banks");
const [phave, phrase] = phrases;

// ---------- PHaVE ----------
assert.equal(phave.id, "phave");
assert.equal(phave.group, "phrases");
assert.equal(phave.education, true);
assert.equal(phave.bands.length, 3, "PHaVE should have three frequency bands");
const phaveWords = phave.bands.flatMap((band) => band.words);
assert.equal(phaveWords.length, 150, "PHaVE should contain 150 phrasal verbs");
assert.equal(new Set(phaveWords).size, 150, "PHaVE verbs must be unique");
for (const band of phave.bands) {
  assert.equal(band.words.length, 50, `PHaVE band ${band.id} should contain 50 verbs`);
}
for (const verb of phaveWords) {
  assert.match(verb, /^[a-z]+(?: [a-z]+)+$/, `bad PHaVE verb: ${verb}`);
}

// ---------- PHRASE ----------
assert.equal(phrase.id, "phrase");
assert.equal(phrase.group, "phrases");
assert.equal(phrase.education, true);
assert.equal(phrase.bands.length, 5, "PHRASE should keep the 1K–5K bands");
const phraseWords = phrase.bands.flatMap((band) => band.words);
assert.equal(phraseWords.length, 499, "PHRASE should contain 499 unique playable phrases");
assert.equal(new Set(phraseWords).size, 499, "PHRASE entries must be unique");
assert.deepEqual(
  phrase.bands.map((band) => band.words.length),
  [32, 84, 126, 155, 102],
  "unexpected PHRASE band sizes",
);
for (const item of phraseWords) {
  assert.match(item, /^[A-Za-z']+(?: [A-Za-z']+)+$/, `bad PHRASE entry: ${item}`);
  assert.equal(item.trim(), item, `PHRASE entry has outer whitespace: ${item}`);
}

// ---------- translations / wiring ----------
for (const key of [
  "group.phrases",
  "cat.phave",
  "cat.phrase",
  "pack.countPhrases",
  "band.phave1",
  "band.phave2",
  "band.phave3",
  "band.phrase1k",
  "band.phrase2k",
  "band.phrase3k",
  "band.phrase4k",
  "band.phrase5k",
]) {
  assert.ok(hasKey(key), `missing translation: ${key}`);
}
for (const category of phrases) {
  assert.ok(hasKey(category.nameKey), `missing category name: ${category.nameKey}`);
  for (const band of category.bands) assert.ok(hasKey(band.labelKey), `missing band label: ${band.labelKey}`);
}
assert.match(game, /PIU_PHRASES/, "game.js must read the phrase bank");
assert.match(game, /key: "phrases"/, "game.js must expose the phrase group");
assert.match(game, /group: category\.group \|\| "phrases"/, "game.js must register phrase categories");
assert.match(game, /countKey/, "game.js must use the phrase count label");
assert.match(html, /js\/phrases\.js/, "index.html must load phrases.js");
assert.match(html, /PHaVE\/PHRASE/, "start screen should mention the phrasal banks");

console.log("✓ PHaVE: 150 phrasal verbs in three 50-item frequency bands");
console.log("✓ PHRASE: 499 unique phrases in the published 1K–5K bands");
console.log("✓ no duplicate entries within either bank");
console.log("✓ phrase counts, group and band labels translated in zh / fr / en");
console.log("✓ game wiring and start-screen description are present");
