const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const EMOJI = require("../js/emojis.js");
const coreWords = require("../js/words.js");
const categories = require("../js/lexicon.js");
const education = require("../js/education.js");
const families = require("../js/families.js");

const source = fs.readFileSync(path.join(__dirname, "../js/emojis.js"), "utf8");
const sourceKeys = [...source.matchAll(/\b([a-z]+):\s*"/g)].map((m) => m[1]);
const seen = new Set();
const duplicates = [];
for (const key of sourceKeys) {
  if (seen.has(key)) duplicates.push(key);
  seen.add(key);
}
assert.deepEqual(duplicates, [], "duplicate emoji keys in source");

const keys = Object.keys(EMOJI);
assert.ok(keys.length >= 150, `expected at least 150 emoji words, got ${keys.length}`);

for (const key of keys) {
  assert.match(key, /^[a-z]+$/, `bad emoji key: ${key}`);
  assert.equal(typeof EMOJI[key], "string", `${key} must map to a string`);
  assert.ok(EMOJI[key].trim().length > 0, `${key} has an empty emoji`);
  assert.match(EMOJI[key], /\p{Extended_Pictographic}/u, `${key} doesn't map to an emoji`);
}

const themedWords = categories.flatMap((category) =>
  [1, 2, 3].flatMap((level) => category.levels[level]),
);
const educationWords = education.flatMap((category) =>
  category.bands.flatMap((band) => band.words),
);
const familyWords = families.flatMap((category) =>
  category.bands.flatMap((band) => band.words),
);
const bank = new Set(
  [...coreWords, ...themedWords, ...educationWords, ...familyWords].map((word) =>
    word.toLowerCase(),
  ),
);
const mappedBankWords = keys.filter((key) => bank.has(key));
assert.ok(
  mappedBankWords.length >= 300,
  `expected at least 300 playable emoji words, got ${mappedBankWords.length}`,
);

for (const category of categories) {
  const words = [1, 2, 3].flatMap((level) => category.levels[level]);
  const withEmoji = words.filter((word) => EMOJI[word]);
  assert.ok(withEmoji.length >= 3, `${category.id} has too few emoji words`);
}

console.log(`✓ ${keys.length} emoji mappings, all valid pictographs`);
console.log(`✓ ${mappedBankWords.length} of the playable words have an emoji face`);
console.log(`✓ every themed category has emoji words`);
console.log(`✓ no duplicate emoji keys`);
