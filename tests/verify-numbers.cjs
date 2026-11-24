const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const numbers = require("../js/numbers.js");
const { wordsFor, NUMBER_WORDS } = numbers;
const { translations } = require("../js/i18n.js");
const { readModularGameSource } = require("./lib-source.cjs");
const game = readModularGameSource();
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");

assert.ok(Array.isArray(numbers), "numbers bank must export an array");
assert.equal(numbers.length, 1, "expected one numbers category");

const category = numbers[0];
assert.equal(category.id, "numbers");
assert.equal(category.icon, "🔢");
assert.equal(category.nameKey, "cat.numbers");
assert.equal(category.group, "themes");
assert.equal(category.education, false);

for (const lang of ["zh", "fr", "en"]) {
  assert.ok(translations[lang][category.nameKey], `cat.numbers missing from ${lang}`);
}

const bandIds = category.bands.map((band) => band.id);
assert.deepEqual(
  bandIds,
  [
    "num1_10",
    "num11_20",
    "num21_30",
    "num31_40",
    "num41_50",
    "num51_60",
    "num61_70",
    "num71_80",
    "num81_90",
    "num91_100",
    "num1_50",
    "num1_100",
  ],
  "decade bands plus 1–50 and 1–100 reviews are required",
);

const bands = Object.fromEntries(category.bands.map((band) => [band.id, band]));
for (const band of category.bands) {
  assert.ok(band.labelKey, `${band.id} is missing a label`);
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][band.labelKey], `${band.labelKey} missing from ${lang}`);
  }
  assert.equal(new Set(band.words).size, band.words.length, `${band.id} repeats a word`);
  for (const word of band.words) {
    assert.match(word, /^[a-z]+(?:[ -][a-z]+)*$/, `${band.id} has a bad number word: ${word}`);
  }
}

assert.deepEqual(
  bands.num1_10.words,
  ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
  "1–10 must be the first ten counting words",
);
assert.equal(bands.num11_20.words[0], "eleven");
assert.equal(bands.num11_20.words.at(-1), "twenty");
assert.equal(bands.num21_30.words[0], "twenty-one");
assert.equal(bands.num21_30.words.at(-1), "thirty");
assert.equal(bands.num91_100.words[0], "ninety-one");
assert.equal(bands.num91_100.words.at(-1), "one hundred");
assert.equal(bands.num1_50.words.length, 50);
assert.equal(bands.num1_100.words.length, 100);

const allWords = category.bands
  .filter((band) => /^num\d+_\d+$/.test(band.id) && band.id !== "num1_50" && band.id !== "num1_100")
  .flatMap((band) => band.words);
assert.equal(allWords.length, 100, "decade bands must cover exactly 100 numbers");
assert.equal(new Set(allWords).size, 100, "decade bands must not overlap");
for (let n = 1; n <= 100; n += 1) {
  assert.equal(wordsFor(n), allWords[n - 1], `number ${n} should be in order`);
  assert.equal(NUMBER_WORDS[String(n)], wordsFor(n), `digit ${n} should map to its word`);
}

assert.equal(wordsFor(0), "");
assert.equal(wordsFor(101), "");
assert.equal(wordsFor(21), "twenty-one");
assert.equal(wordsFor(40), "forty");
assert.equal(wordsFor(100), "one hundred");

assert.match(game, /PIU_NUMBERS/, "game must read the number bank");
assert.match(game, /PIU_NUMBER_WORDS/, "game must read the digit-to-word map");
assert.match(game, /Object\.hasOwn\(map, token\) \? map\[token\] : token/, "spoken digits should become number words");
assert.match(game, /base\.replace\(\/-\/g, " "\)/, "hyphenated numbers should match spoken spaces");
assert.match(game, /base === "one hundred"/, "100 should accept “a hundred”");
assert.match(
  game,
  /normalized === key\.replace\(\/-\/g, " "\)/,
  "a spoken “twenty one” should match twenty-one before twenty",
);
assert.match(html, /js\/numbers\.js/, "index.html must load numbers.js");
assert.match(sw, /\.\/js\/numbers\.js/, "the service worker must precache numbers.js");

console.log("✓ numbers pack: 1–10, 11–20 … 91–100, plus 1–50 and 1–100 reviews");
console.log("✓ all 100 number words in order, with hyphenated tens");
console.log("✓ spoken/typed digits map back to number words");
console.log("✓ category and band labels translated in zh / fr / en");
