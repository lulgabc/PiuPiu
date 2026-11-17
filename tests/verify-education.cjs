const assert = require("node:assert/strict");
const education = require("../js/education.js");
const { translations } = require("../js/i18n.js");

const byId = Object.fromEntries(education.map((category) => [category.id, category]));

assert.ok(Array.isArray(education), "education lists must export an array");
assert.deepEqual(
  education.map((category) => category.id),
  ["dolch", "fry", "dale"],
  "expected Dolch, Fry and Dale-Chall categories",
);

function checkWords(category, band) {
  assert.ok(Array.isArray(band.words), `${category.id}/${band.id} words missing`);
  for (const word of band.words) {
    assert.match(word, /^[A-Za-z']+$/, `${category.id}/${band.id} has a bad word: ${word}`);
    assert.ok(word.length >= 1, `${category.id}/${band.id} has an empty word`);
  }
  const keys = band.words.map((word) => word.toLowerCase());
  assert.equal(new Set(keys).size, keys.length, `${category.id}/${band.id} has duplicates`);
}

for (const category of education) {
  assert.ok(category.nameKey, `${category.id} missing nameKey`);
  assert.equal(category.education, true, `${category.id} must be an education category`);
  assert.ok(Array.isArray(category.bands) && category.bands.length > 0, `${category.id} bands missing`);
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(
      translations[lang][category.nameKey],
      `${category.id} nameKey missing from ${lang}`,
    );
  }
  for (const band of category.bands) {
    assert.ok(band.id && band.labelKey, `${category.id} has an incomplete band`);
    for (const lang of ["zh", "fr", "en"]) {
      assert.ok(translations[lang][band.labelKey], `${band.labelKey} missing from ${lang}`);
    }
    checkWords(category, band);
  }

  const all = category.bands.flatMap((band) => band.words);
  const keys = all.map((word) => word.toLowerCase());
  assert.equal(new Set(keys).size, keys.length, `${category.id} repeats a word across bands`);
}

// Dolch: 40 + 52 + 41 + 46 + 41 = 220 service words, plus 95 nouns.
const dolch = byId.dolch;
assert.deepEqual(
  dolch.bands.map((band) => band.id),
  ["prek", "kindergarten", "grade1", "grade2", "grade3", "nouns"],
);
assert.deepEqual(
  dolch.bands.map((band) => band.words.length),
  [40, 52, 41, 46, 41, 95],
);
assert.equal(
  dolch.bands.slice(0, 5).reduce((total, band) => total + band.words.length, 0),
  220,
);
assert.equal(dolch.bands[5].words.length, 95);

// Fry: ten bands of exactly 100.
const fry = byId.fry;
assert.equal(fry.bands.length, 10);
assert.ok(fry.bands.every((band) => band.words.length === 100));
assert.equal(fry.bands.reduce((total, band) => total + band.words.length, 0), 1000);

// Dale-Chall: roughly 3,000 familiar words, one playable list.
const dale = byId.dale;
assert.equal(dale.bands.length, 1);
assert.ok(dale.bands[0].words.length >= 2900, "Dale-Chall list looks too small");
assert.ok(dale.bands[0].words.length <= 3100, "Dale-Chall list looks too large");

for (const lang of ["zh", "fr", "en"]) {
  assert.ok(translations[lang]["group.education"], `group.education missing from ${lang}`);
  assert.ok(translations[lang]["group.themes"], `group.themes missing from ${lang}`);
  assert.ok(translations[lang]["pack.band"], `pack.band missing from ${lang}`);
  assert.ok(translations[lang]["band.all"], `band.all missing from ${lang}`);
}

console.log("✓ Dolch: 220 service words + 95 nouns = 315");
console.log(`✓ Fry: 1000 words in 10 bands of 100`);
console.log(`✓ Dale-Chall: ${dale.bands[0].words.length} familiar words`);
console.log("✓ education names and every band label translated in zh / fr / en");
