const assert = require("node:assert/strict");
const words = require("../js/words.js");

const BANNED = new Set(
  `the and an of to in on at for with from by is are was were be been being am do does did have has had will would can could shall should may might must not no yes he she it they we you i me my your his her its our their this that these those a as or but if so than then there here when where why how who whom which what all any both each few more most other some such only own same too very just up down out off over under again once ever never always often sometimes also into onto upon across around before after above below between during through about against among within without`.split(
    /\s+/,
  ),
);

assert.equal(words.length, 500, "word bank must contain exactly 500 words");
assert.equal(new Set(words).size, 500, "word bank must not contain duplicates");

for (const word of words) {
  assert.match(word, /^[a-z]+$/, `bad word format: ${word}`);
  assert.ok(word.length >= 3, `word too short: ${word}`);
  assert.ok(!BANNED.has(word), `function word leaked into bank: ${word}`);
}

const required = [
  // nouns
  "apple",
  "kitchen",
  "bicycle",
  "mountain",
  "shoulder",
  "family",
  "hospital",
  "chocolate",
  // verbs
  "accept",
  "build",
  "choose",
  "explode",
  "listen",
  "remember",
  "understand",
  "write",
];
for (const word of required) {
  assert.ok(words.includes(word), `missing expected word: ${word}`);
}

console.log(`✓ ${words.length} unique lowercase words`);
console.log("✓ no function words (the / and / an / of / to / is …)");
console.log("✓ nouns and verbs present");
