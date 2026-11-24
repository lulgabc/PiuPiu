const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("css/style.css");
const { readModularGameSource } = require("./lib-source.cjs");
const game = readModularGameSource();
const custom = read("js/custom-packs.js");
const { translations } = require("../js/i18n.js");

// ---------- a tiny localStorage for the parser/store tests ----------
const memory = new Map();
global.localStorage = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    memory.set(key, String(value));
  },
  removeItem(key) {
    memory.delete(key);
  },
};
const packs = require("../js/custom-packs.js");

// ---------- article parsing ----------
const article = packs.parseText(
  "The quick brown fox jumps over the lazy dog. The dog sleeps. A brown fox listens.",
);
assert.equal(article.mode, "prose", "a prose article should use prose parsing");
assert.ok(article.words.includes("fox"), "article words should be extracted");
assert.ok(article.words.includes("brown"), "article adjectives should be kept");
assert.ok(!article.words.includes("the"), "common function words should be skipped in prose");
assert.ok(!article.words.includes("over"), "prepositions should be skipped in prose");
assert.equal(article.words[0], "brown", "prose words should be frequency ordered");

// ---------- list parsing ----------
const list = packs.parseText("Animals:\napple\nbanana\ngive up\nwell-known\ndon't\napple");
assert.equal(list.mode, "list", "one-word lines should use list parsing");
assert.deepEqual(
  list.words,
  ["apple", "banana", "give up", "well-known", "don't"],
  "list order and phrases should be preserved without headings or duplicates",
);
const markdown = packs.parseText("# Animals\ncat\ndog\nhorse\nbird");
assert.deepEqual(
  markdown.words,
  ["cat", "dog", "horse", "bird"],
  "markdown headings should not become words",
);
const comma = packs.parseText("cat, dog; horse | bird");
assert.deepEqual(comma.words, ["cat", "dog", "horse", "bird"], "comma/semicolon/pipe lists should split");
const spaced = packs.parseText("apple banana orange pear");
assert.equal(spaced.mode, "prose", "a short single-line article should not become one phrase");
assert.deepEqual(spaced.words, ["apple", "banana", "orange", "pear"], "space-separated words should parse");
const single = packs.parseText("apple");
assert.deepEqual(single.words, ["apple"], "a single word file should parse");

// ---------- normalisation and limits ----------
assert.deepEqual(
  packs.normalizeWords(["Apple", "apple", "don’t", "give_up", "", "  tea  "]),
  ["apple", "don't", "give up", "tea"],
  "words should be normalised and deduplicated",
);
assert.equal(packs.normalizeWords(["a", "I"]).length, 0, "one-letter tokens should be ignored");
const letters = "abcdefghijklmnopqrstuvwxyz";
const huge = Array.from({ length: 750 }, (_, index) => {
  let n = index;
  let suffix = "";
  do {
    suffix = letters[n % 26] + suffix;
    n = Math.floor(n / 26);
  } while (n > 0);
  return `w${suffix}`;
});
const truncated = packs.parseText(huge.join("\n"));
assert.equal(truncated.words.length, packs.MAX_WORDS, "packs must be capped");
assert.equal(truncated.truncated, true, "overlong files should be marked truncated");
const empty = packs.parseText("12345 !!! ,,,, 你好");
assert.equal(empty.words.length, 0, "files without English words should parse empty");

// ---------- create / list / delete ----------
memory.clear();
assert.deepEqual(packs.load(), [], "empty storage should load no packs");
const created = packs.create("  My   Pack  ", ["apple", "banana", "cherry", "grape"]);
assert.ok(created.pack, "a valid pack should be created");
assert.equal(created.pack.name, "My Pack", "pack names should be cleaned");
assert.equal(created.pack.words.length, 4, "pack words should be stored");
assert.equal(packs.load().length, 1, "created packs should persist");
const duplicate = packs.create("My Pack", ["one", "two", "three", "four"]);
assert.equal(duplicate.pack.name, "My Pack 2", "duplicate names should be suffixed");
assert.equal(packs.remove(created.pack.id), true, "packs should be removable");
assert.equal(packs.load().length, 1, "removing one pack should keep the other");
assert.equal(packs.remove("missing"), false, "removing a missing pack should report false");

const tooFew = packs.create("Tiny", ["apple", "banana"]);
assert.equal(tooFew.error, "too-few", "packs below the minimum should be rejected");
memory.clear();
for (let i = 0; i < packs.MAX_PACKS; i += 1) {
  const result = packs.create(`Pack ${i}`, ["apple", "banana", "cherry", "grape"]);
  assert.ok(result.pack, `pack ${i} should fit`);
}
assert.equal(
  packs.create("Overflow", ["apple", "banana", "cherry", "grape"]).error,
  "too-many",
  "the pack limit should be enforced",
);

// ---------- corrupt / unavailable storage ----------
memory.set("piupiu.customPacks", "{not valid json");
assert.deepEqual(packs.load(), [], "corrupt storage should be ignored");
const originalSet = global.localStorage.setItem;
global.localStorage.setItem = () => {
  throw new Error("quota");
};
assert.equal(
  packs.create("Quota", ["apple", "banana", "cherry", "grape"]).error,
  "storage",
  "write failures should be reported",
);
global.localStorage.setItem = originalSet;

// ---------- page integration ----------
assert.match(html, /id="customPackSection"/, "the pack sheet needs a custom pack section");
assert.match(html, /id="customPackFile"[^>]*type="file"/, "the custom pack needs a file input");
assert.match(html, /accept="[^"]*\.txt[^"]*"/, "the file input should accept plain text");
assert.match(html, /id="customPackChoose"/, "the custom pack needs a choose button");
assert.match(html, /id="customPackCreate"/, "the custom pack needs a create button");
assert.match(html, /id="customPackList"/, "created packs should be listed");
assert.match(html, /id="customPackEmpty"/, "the empty state should be visible");
assert.match(html, /js\/custom-packs\.js\?v=[\d.]+/, "the custom pack module should be loaded");
assert.match(game, /const CustomPacks =/, "game code should read the custom pack module");
assert.match(game, /group: "custom"/, "custom packs should be a category group");
assert.match(game, /id: `custom:\$\{pack\.id\}`/, "custom packs should become categories");
assert.match(game, /function createCustomPackFromFile/, "file import should have its own action");
assert.match(game, /FileReader|file\.text\(/, "files should be read locally");
assert.match(game, /CustomPacks\.parseText/, "uploaded text should be parsed automatically");
assert.match(game, /CustomPacks\.create/, "parsed words should be saved as a pack");
assert.match(game, /CustomPacks\.remove/, "packs should be deletable");
assert.match(game, /armOrConfirmDelete|custom\.confirmDelete/, "deletion should use 2-step inline confirmation");
assert.match(game, /refreshCustomPackCategories/, "the picker should refresh after create/delete");
assert.match(game, /state\.categoryId = "core"/, "deleting the active pack should fall back safely");
assert.match(game, /MAX_FILE_BYTES/, "uploads should have a size limit");
assert.match(game, /function isSupportedCustomFile/, "uploads should reject non-text files");
assert.match(game, /custom\.fileType/, "non-text files should get a clear error");
assert.match(game, /customPackReading/, "the UI should block duplicate imports while reading");
assert.doesNotMatch(custom, /fetch\(|XMLHttpRequest|FormData|navigator\.sendBeacon/, "custom packs must stay local");
assert.match(css, /\.custom-pack-section/, "the custom pack section needs styling");
assert.match(css, /\.custom-pack-item/, "custom pack rows need styling");
assert.match(css, /\.custom-pack-delete/, "the delete control needs styling");

// ---------- translations ----------
for (const key of [
  "group.custom",
  "custom.title",
  "custom.hint",
  "custom.nameLabel",
  "custom.namePlaceholder",
  "custom.choose",
  "custom.create",
  "custom.empty",
  "custom.quota",
  "custom.fileChosen",
  "custom.fileType",
  "custom.fileTooLarge",
  "custom.readError",
  "custom.noWords",
  "custom.tooFew",
  "custom.tooMany",
  "custom.storage",
  "custom.success",
  "custom.successTruncated",
  "custom.deleted",
  "custom.deleteConfirm",
  "custom.delete",
  "custom.deleteAria",
  "custom.current",
  "custom.wordCount",
  "custom.reading",
  "custom.selectFirst",
  "custom.defaultName",
  "custom.unsupported",
]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

console.log("✓ articles and plain word lists are parsed into clean packs");
console.log("✓ custom packs are persisted, named uniquely, capped and deletable");
console.log("✓ the picker lists custom packs and falls back safely after deletion");
console.log("✓ uploads stay local, reject oversized files and support list stats");
