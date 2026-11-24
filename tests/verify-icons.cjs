const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("css/arcade.css");
const { readModularGameSource } = require("./lib-source.cjs");
const game = readModularGameSource();
const i18n = read("js/i18n.js");

// ---------- inline SVG sprite ----------
assert.match(html, /id="ui-sprite"/, "the page needs one inline SVG sprite");
for (const icon of [
  "spark",
  "rain",
  "grid",
  "palette",
  "play",
  "pause",
  "bolt",
  "volume",
  "volume-off",
  "settings",
  "close",
  "trophy",
  "medal",
  "star",
  "install",
  "board",
  "file",
  "moon",
  "mic",
  "numbers",
  "alphabet",
  "book",
  "puzzle",
  "link",
  "speech",
  "food",
  "apple",
  "carrot",
  "cup",
  "paw",
  "person",
  "users",
  "shirt",
  "house",
  "backpack",
  "briefcase",
  "ball",
  "music",
  "plane",
  "bus",
  "leaf",
  "sun",
  "laptop",
  "heart",
  "pin",
]) {
  assert.match(html, new RegExp(`id="ui-${icon}"`), `missing SVG symbol: ${icon}`);
}

// ---------- static icon slots ----------
for (const icon of ["spark", "volume", "settings", "pause"]) {
  assert.match(html, new RegExp(`<use href="#ui-${icon}">`), `missing static icon use: ${icon}`);
}
assert.equal((html.match(/class="reward-node"/g) || []).length, 5, "progress dots should be empty decorative spans");
assert.match(html, /id="playerTotal"/, "the player total should keep a text target for values");
assert.match(html, /id="bestLineValue"/, "the best score should own a value span");
assert.match(html, /id="overEyebrowIcon"/, "the result eyebrow should own an SVG icon");
const staticUses = [...html.matchAll(/<use href="#ui-([a-z-]+)"/g)].map((match) => match[1]);
for (const name of staticUses) {
  assert.match(html, new RegExp(`id="ui-${name}"`), `static icon ${name} has no symbol`);
}
const categoryBlock = game.slice(game.indexOf("const CATEGORY_ICON_IDS ="), game.indexOf("};", game.indexOf("const CATEGORY_ICON_IDS =")));
for (const match of categoryBlock.matchAll(/:\s*"([a-z-]+)"/g)) {
  assert.match(html, new RegExp(`id="ui-${match[1]}"`), `category icon ${match[1]} has no symbol`);
}
const withoutAvatar = html.replace(/<span id="playerAvatar"[\s\S]*?<\/span>/, "");
assert.equal(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF]/u.test(withoutAvatar), false, "interface HTML should not keep emoji icons");
assert.match(html, /class="ui-icon"[^>]*><use href="#ui-trophy">/, "the board title should use an SVG trophy");
assert.match(html, /class="ui-icon"[^>]*><use href="#ui-install">/, "the install badge should use an SVG phone");
assert.match(html, /class="ui-icon"[^>]*><use href="#ui-medal">/, "the result board link should use an SVG medal");

// ---------- dynamic icons ----------
for (const marker of [
  "function iconSvg(",
  "function setIcon(",
  "function setStarValue(",
  "function categoryIcon(",
  "const CATEGORY_ICON_IDS =",
]) {
  assert.ok(game.includes(marker), `missing icon helper: ${marker}`);
}
assert.match(game, /setIcon\(els\.pauseBtn, paused \? "play" : "pause"\)/, "pause should swap SVG icons");
assert.match(game, /setIcon\(els\.muteBtn, state\.muted \? "volume-off" : "volume"\)/, "mute should swap SVG icons");
assert.match(game, /setIcon\(els\.packPreviewIcon, categoryIcon\(category\)\)/, "the pack preview should use an SVG category icon");
assert.match(game, /icon\.appendChild\(iconSvg\(categoryIcon\(category\)\)\)/, "category cards should use SVG icons");
assert.match(game, /setStarValue\(total, profile\.total\)/, "point totals should use the SVG star");
assert.match(game, /iconSvg\("medal"\)/, "top ranks should use the SVG medal");
assert.match(game, /iconSvg\("pencil"\)/, "the profile editor should use an SVG pencil");
assert.match(game, /iconSvg\("close"\)/, "delete controls should use an SVG close");
assert.match(game, /els\.recordLine\.appendChild\(iconSvg\("trophy"\)\)/, "a new record should use the SVG trophy");

// ---------- styling ----------
assert.match(css, /\.ui-icon \{[\s\S]{0,220}stroke: currentColor/, "icons should take their colour from text");
assert.match(css, /\.brand-mark \.ui-icon \{[\s\S]{0,100}width: 14px/, "the brand spark needs a 14px size");
assert.match(css, /\.mode-art \{[\s\S]{0,160}height: 72px/, "mode art needs a readable mini-screen height");
assert.match(css, /\.mode-art-svg \{[\s\S]{0,100}width: 100%/, "mode art should fill its screen");
assert.match(css, /\.pack-category-icon \.ui-icon \{[\s\S]{0,100}width: 19px/, "category icons need a 19px size");
assert.match(css, /\.player-pill-total \.ui-icon,[\s\S]{0,160}width: 10px/, "point stars need a 10px size");
assert.match(css, /\.board-rank\.rank-1 \{ color: var\(--arc-lemon\)/, "the first rank should be lemon");

// ---------- decorative copy is no longer emoji ----------
for (const key of [
  "start.best",
  "pause.eyebrow",
  "over.eyebrow",
  "fill.overEyebrow",
  "paint.overEyebrow",
  "over.record",
  "heard.correct",
  "help.hint",
  "help.listen",
]) {
  const block = i18n.slice(i18n.indexOf(`"${key}"`), i18n.indexOf("\n", i18n.indexOf(`"${key}"`)));
  assert.equal(/[\u{1F000}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF]/u.test(block), false, `${key} should not start with an emoji icon`);
}

console.log("✓ one inline SVG sprite replaces the interface emoji");
console.log("✓ buttons, modes, categories, points, ranks and result icons use SVG");
console.log("✓ icon sizes and colours follow the arcade theme");
console.log("✓ decorative interface copy no longer carries emoji glyphs");
