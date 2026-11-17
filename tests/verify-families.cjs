const assert = require("node:assert/strict");
const families = require("../js/families.js");
const { translations } = require("../js/i18n.js");

assert.ok(Array.isArray(families), "families must export an array");
assert.equal(families.length, 1, "expected one BNC/COCA category");

const bnc = families[0];
assert.equal(bnc.id, "bnc");
assert.equal(bnc.education, true);
assert.equal(bnc.group, "families");
assert.equal(bnc.nameKey, "cat.bnc");

for (const lang of ["zh", "fr", "en"]) {
  assert.ok(translations[lang][bnc.nameKey], `cat.bnc missing from ${lang}`);
  assert.ok(translations[lang]["group.families"], `group.families missing from ${lang}`);
}

assert.equal(bnc.bands.length, 25, "expected 25 BNC/COCA 1000-word lists");
assert.deepEqual(
  bnc.bands.map((band) => band.id),
  Array.from({ length: 25 }, (_, index) => `bnc${index + 1}`),
);

const all = [];
for (const band of bnc.bands) {
  assert.ok(band.labelKey, `${band.id} missing labelKey`);
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][band.labelKey], `${band.labelKey} missing from ${lang}`);
  }
  assert.ok(
    band.words.length >= 990 && band.words.length <= 1010,
    `${band.id} has an unexpected count: ${band.words.length}`,
  );
  for (const word of band.words) {
    assert.match(word, /^[a-z']+$/, `${band.id} has a bad word: ${word}`);
    assert.ok(word.length >= 1, `${band.id} has an empty word`);
  }
  const keys = band.words.map((word) => word.toLowerCase());
  assert.equal(new Set(keys).size, keys.length, `${band.id} has duplicates`);
  all.push(...band.words);
}

assert.equal(new Set(all.map((word) => word.toLowerCase())).size, all.length);
assert.equal(all.length, 25002, "expected 25,002 headwords");
assert.ok(bnc.bands[0].words.includes("a"));
assert.ok(bnc.bands[0].words.includes("the"));
assert.ok(bnc.bands[24].words.includes("zowie"));

console.log("✓ BNC/COCA: 25 word-family lists (1st–25th 1000)");
console.log(`✓ ${all.length} unique headwords`);
console.log("✓ every list and group label translated in zh / fr / en");
