const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const i18n = require("../js/i18n.js");

const { translations, supported } = i18n;
const base = Object.keys(translations.zh).sort();

assert.deepEqual(supported, ["zh", "fr", "en"], "expected zh / fr / en");
assert.equal(base.length > 60, true, "translation table looks too small");

for (const lang of supported) {
  const table = translations[lang];
  assert.ok(table, `missing translation table: ${lang}`);
  assert.deepEqual(
    Object.keys(table).sort(),
    base,
    `key mismatch between zh and ${lang}`,
  );
  for (const key of base) {
    assert.equal(typeof table[key], "string", `${lang}.${key} must be a string`);
    assert.ok(table[key].trim().length > 0, `${lang}.${key} is empty`);
  }
}

const placeholders = (value) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

for (const key of base) {
  const expected = placeholders(translations.zh[key]);
  for (const lang of ["fr", "en"]) {
    assert.equal(
      placeholders(translations[lang][key]),
      expected,
      `${lang}.${key} has different interpolation placeholders`,
    );
  }
}

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const game = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");

const htmlKeys = [
  ...html.matchAll(/data-i18n(?:-placeholder|-title|-aria)?="([^"]+)"/g),
].map((m) => m[1]);
const gameKeys = [...game.matchAll(/\btr\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
const used = new Set([...htmlKeys, ...gameKeys]);
const missing = [...used].filter((key) => !(key in translations.zh));

assert.deepEqual(missing, [], "UI references keys missing from translations");
assert.equal(
  html.includes('id="langSelect"') && html.includes('<option value="fr"'),
  true,
  "language selector is missing",
);

assert.equal(i18n.getLang(), "zh", "Node default should stay zh");
assert.equal(i18n.t("start.best", { score: "1,234" }), "1,234");
assert.equal(i18n.setLang("fr"), "fr");
assert.equal(i18n.t("hud.score"), "Score");
assert.equal(i18n.setLang("de"), "fr", "unsupported language should be ignored");

console.log(`✓ ${base.length} translation keys in zh / fr / en`);
console.log("✓ all HTML and game.js keys are translated");
console.log("✓ interpolation placeholders match across languages");
console.log("✓ language selector and fallback behaviour present");
