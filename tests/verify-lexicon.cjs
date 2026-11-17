const assert = require("node:assert/strict");
const categories = require("../js/lexicon.js");
const { translations } = require("../js/i18n.js");

const BANNED = new Set(
  `the and an of to in on at for with from by is are was were be been being am do does did have has had will would can could shall should may might must not no yes he she it they we you i me my your his her its our their this that these those a as or but if so than then there here when where why how who whom which what all any both each few more most other some such only own same too very just up down out off over under again once ever never always often sometimes also into onto upon across around before after above below between during through about against among within without`.split(
    /\s+/,
  ),
);

assert.ok(Array.isArray(categories), "lexicon must export an array");
assert.ok(categories.length >= 20, `expected at least 20 categories, got ${categories.length}`);

const ids = new Set();
const words = [];
let total = 0;

for (const category of categories) {
  assert.match(category.id, /^[a-z]+$/, `bad category id: ${category.id}`);
  assert.ok(!ids.has(category.id), `duplicate category id: ${category.id}`);
  ids.add(category.id);
  assert.ok(category.icon, `${category.id} is missing an icon`);
  assert.ok(category.nameKey, `${category.id} is missing a nameKey`);

  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(
      translations[lang][category.nameKey],
      `${category.id} nameKey ${category.nameKey} is missing from ${lang}`,
    );
  }

  const categoryWords = [];
  for (const level of [1, 2, 3]) {
    const list = category.levels[level];
    assert.ok(Array.isArray(list), `${category.id} level ${level} is not an array`);
    assert.ok(list.length >= 10, `${category.id} level ${level} has only ${list.length} words`);
    assert.equal(new Set(list).size, list.length, `${category.id} level ${level} has duplicates`);

    for (const word of list) {
      assert.match(word, /^[a-z]+$/, `${category.id} has a bad word: ${word}`);
      assert.ok(word.length >= 3, `${category.id} has a short word: ${word}`);
      assert.ok(!BANNED.has(word), `${category.id} contains a function word: ${word}`);
      categoryWords.push(word);
    }
  }

  assert.equal(
    new Set(categoryWords).size,
    categoryWords.length,
    `${category.id} repeats a word across levels`,
  );
  total += categoryWords.length;
  words.push(...categoryWords);
}

for (const lang of ["zh", "fr", "en"]) {
  assert.ok(translations[lang]["cat.core"], `core category name missing from ${lang}`);
}

console.log(`✓ ${categories.length} themed categories (≥20)`);
console.log(`✓ ${total} themed words, ${new Set(words).size} unique`);
console.log("✓ 3 levels per category, 10+ words per level");
console.log("✓ category names translated in zh / fr / en");
