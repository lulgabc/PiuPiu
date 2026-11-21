const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const game = read("js/game.js");
const css = read("css/poetry.css");
const arcade = read("css/arcade.css");
const sw = read("sw.js");
const pkg = JSON.parse(read("package.json"));
const { translations } = require(path.join(root, "js/i18n.js"));
const gitignore = read(".gitignore");

// ---------- complete authorized library ----------
const sandbox = { window: {} };
vm.runInNewContext(read("js/poetry.js"), sandbox);
const library = sandbox.window.PiuPoetry;
assert.ok(library && Array.isArray(library.categories) && Array.isArray(library.poems), "poetry library is missing");
assert.equal(library.categories.length, 8, "the library needs all eight categories");
assert.equal(library.poems.length, 153, "the complete library should contain 153 poems");
assert.equal(library.demo, false, "the complete library should not be marked as a demo");
assert.equal(library.authorized, true, "the complete library should record its authorization");
assert.match(library.source, /A World Full of Poems/, "the book source should be recorded");
assert.match(library.rights, /permission/i, "the permission note should be recorded");
const expectedCounts = { family: 20, feelings: 19, animals: 19, cities: 18, fun: 19, science: 20, body: 20, learning: 18 };
for (const [category, expected] of Object.entries(expectedCounts)) {
  const actual = library.poems.filter((poem) => poem.category === category).length;
  assert.equal(actual, expected, `${category} should contain ${expected} poems`);
}
const poemIds = new Set();
let lineCount = 0;
for (const poem of library.poems) {
  assert.ok(poem.id && poem.title && poem.author, "poems need id, title and author");
  assert.equal(poemIds.has(poem.id), false, `duplicate poem id: ${poem.id}`);
  poemIds.add(poem.id);
  assert.ok(Array.isArray(poem.lines) && poem.lines.length >= 3, `${poem.title} needs lines`);
  assert.ok(poem.lines.every((line) => typeof line === "string" && line.trim()), `${poem.title} has an empty line`);
  assert.ok(Array.isArray(poem.stanzaStarts) && poem.stanzaStarts[0] === 0, `${poem.title} needs stanza starts`);
  assert.ok(library.categories.some((category) => category.id === poem.category), `${poem.title} has an unknown category`);
  lineCount += poem.lines.length;
}
assert.equal(lineCount, 2034, "the library should contain 2034 poetry lines");
assert.equal(library.poems.find((poem) => poem.title === "New Baby").lines.length, 13, "New Baby should be complete");
assert.equal(library.poems.find((poem) => poem.title === "The Crocodile").author, "Lewis Carroll", "The Crocodile should be present");
assert.equal(library.poems.find((poem) => poem.title === "Greetings").lines.length, 16, "Greetings should be complete");

// ---------- public data path and extractor ----------
assert.ok(fs.existsSync(path.join(root, "tools/extract-poems.py")), "the extraction tool should be present");
assert.match(read("tools/extract-poems.py"), /PyMuPDF|import fitz/, "the extractor should use PyMuPDF");
assert.match(read("tools/extract-poems.py"), /CATEGORY_META/, "the extractor should classify poems by the book categories");
assert.match(read("tools/extract-poems.py"), /JS_OUT|js\/poetry\.js/, "the extractor should write the public data file");
assert.equal(game.includes("data/poetry.local.json"), false, "the game should not depend on a private local JSON file");
assert.match(sw, /"\.\/js\/poetry\.js\?v=/ , "the full library should be precached for offline use");

// ---------- entry points and markup ----------
assert.match(html, /data-mode="poem"/, "home needs the poetry mode card");
assert.match(html, /data-i18n="mode\.poem"/, "the poetry mode card needs a label");
assert.match(html, /id="poemStage"/, "the poem stage is missing");
assert.match(html, /id="poetrySheet"/, "the poetry library sheet is missing");
assert.match(html, /id="poetryList"/, "the poetry library needs a poem list");
assert.match(html, /id="poetryImport"/, "the poetry library needs an import control");
assert.match(html, /id="poetryFile"[^>]*type="file"/, "the import control needs a file input");
assert.match(html, /id="poemLines"/, "the poem needs a line container");
assert.match(html, /id="poemProgress"/, "the poem needs a progress readout");
assert.match(html, /id="poemListen"/, "the poem needs a listen control");
assert.match(html, /id="poemResult"/, "the result needs a poem card");
assert.match(html, /id="overPoetryBtn"/, "the result should return to the poetry library");
assert.match(html, /css\/poetry\.css\?v=[\d.]+/, "the poetry stylesheet should load");
assert.match(html, /js\/poetry\.js\?v=[\d.]+/, "the demo poetry library should load");
assert.ok(
  html.indexOf("css/arcade.css") < html.indexOf("css/poetry.css"),
  "the poetry layer should load after the arcade skin",
);
assert.ok(
  html.indexOf("js/poetry.js") < html.indexOf("js/game.js"),
  "the poetry data should load before the game",
);

// ---------- game wiring ----------
assert.match(game, /const GAME_MODES = \["rain", "fill", "paint", "poem"\]/, "there should be four game modes");
assert.match(game, /buildPoemRound\(\)/, "poetry mode needs a round builder");
assert.match(game, /function buildPoemRound\(/, "the round builder should exist");
assert.match(game, /function findPoemMatch\(/, "poetry speech matching needs its own resolver");
assert.match(game, /function poemMatchScore\(/, "poetry lines need a fuzzy match score");
assert.match(game, /function poemOrderedMatches\(/, "poetry matching should tolerate extra words");
assert.match(game, /skip > 0\) spokenIndex \+= skip/, "poetry matching should skip a repeated spoken word");
assert.match(game, /function poemStem\(/, "poetry matching should normalize plurals and possessives");
assert.match(game, /function markPoemLine\(/, "correct poem lines should be marked");
assert.match(game, /function updatePoemProgress\(/, "poem progress should update");
assert.match(game, /function focusPoemLine\(/, "tapping a line should focus and speak it");
assert.match(game, /function loadPoetryLibrary\(/, "the library loader is missing");
assert.match(game, /function importPoetryFile\(/, "the library importer is missing");
assert.match(game, /function renderPoetryLibrary\(/, "the library UI renderer is missing");
assert.match(game, /markPoetryCompleted\(poem\.poem\.id\)/, "completed poems should be remembered");
assert.match(game, /state\.score \+= 10 \+ Math\.min\(10, Math\.max\(0, state\.combo - 1\)\)/, "each line should award points");
assert.match(game, /state\.mode === "poem"\) return findPoemMatch/, "speech matching should branch into poems");
assert.match(game, /resolveSpeechHit\(bestHit\)/, "speech results should route to the poem line handler");
assert.match(game, /body\.classList\.toggle\("mode-poem", poem\)/, "the page should track poem mode");
assert.match(game, /toast\.poemStart/, "poem mode needs a start hint");

// ---------- styles ----------
assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, "poems add a 2×2 mode grid on phones");
assert.match(css, /@media \(min-width: 700px\)[\s\S]{0,180}repeat\(4, minmax\(0, 1fr\)\)/, "desktop should use four mode cards");
assert.match(css, /\.poem-stage \{/, "the poem stage needs a layout");
assert.match(css, /\.poem-line\.is-current/, "the current line needs a highlight");
assert.match(css, /\.poem-line\.is-read/, "read lines need a colour change");
assert.match(css, /\.poem-line\.is-read \.poem-line-mark/, "read lines need a check mark");
assert.match(css, /\.poetry-item\.is-active/, "the selected poem needs a card state");
assert.match(css, /\.poetry-sheet\.is-hidden/, "the library sheet needs a hidden state");
assert.match(css, /\.poetry-card \{[\s\S]{0,140}display: flex/, "the library card should pin its action row");
assert.match(css, /body\.mode-poem \.pet-squeak/, "the pet bubble should stay out of the poem page");
assert.match(css, /@media \(min-width: 700px\)[\s\S]{0,300}\.poem-head/, "desktop poems should keep a readable column");
assert.match(css, /@media \(max-width: 360px\)/, "small phones need a compact poem layout");
assert.match(css, /body\.mode-poem \.speed-tool/, "poem mode should hide the speed tool");
assert.match(css, /body\.mode-poem \.reward-progress/, "poem mode should hide the star bar");

// ---------- translations ----------
for (const key of [
  "mode.poem",
  "mode.poemHint",
  "toast.poemStart",
  "hud.lines",
  "poem.libraryTitle",
  "poem.select",
  "poem.libraryNote",
  "poem.fullNote",
  "poem.import",
  "poem.importSuccess",
  "poem.importError",
  "poem.hint",
  "poem.listen",
  "poem.overEyebrow",
  "poem.overTitle",
  "poem.overLine",
  "poem.again",
  "poem.anonymous",
  "poem.category.family",
  "poem.category.feelings",
  "poem.category.animals",
  "poem.category.cities",
  "poem.category.fun",
  "poem.category.science",
  "poem.category.body",
  "poem.category.learning",
]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

assert.equal(pkg.version, "2.32.0");
assert.equal(sw.includes(`const VERSION = "${pkg.version}"`), true);
assert.ok(sw.includes("./css/poetry.css") && sw.includes("./js/poetry.js"), "poetry assets should be offline-safe");

console.log("✓ all 153 authorized poems are bundled with eight categories and 2034 lines");
console.log("✓ home has a fourth poetry mode, library sheet and poem stage");
console.log("✓ every line is matched, marked and counted; completion opens the poem result");
console.log("✓ the poetry layer follows the category colour and stays readable on phones");
console.log("✓ library import, progress storage, authorization credit and translations are wired");
