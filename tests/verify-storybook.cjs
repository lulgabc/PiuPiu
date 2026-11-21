const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { translations } = require("../js/i18n.js");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("css/storybook.css");
const game = read("js/game.js");
const sw = read("sw.js");
const pkg = JSON.parse(read("package.json"));

// ---------- skin entry ----------
assert.ok(
  html.indexOf("css/style.css") < html.indexOf("css/storybook.css"),
  "the storybook skin should load after the base stylesheet",
);
assert.match(html, /css\/storybook\.css\?v=[\d.]+/, "the page should load the storybook skin");
assert.ok(
  sw.indexOf("./css/storybook.css") >= 0,
  "the storybook skin should be in the offline precache",
);

// ---------- home hierarchy ----------
assert.match(html, /class="story-hero"/, "the home hero should group the mascot and title");
assert.match(html, /id="gameTitle" data-i18n="start\.heroTitle"/, "the hero should ask what to play");
assert.match(html, /class="mode-option-copy"/, "each mode ticket should have a short hint");
for (const mode of ["rain", "fill", "paint"]) {
  assert.match(html, new RegExp(`data-i18n="mode\\.${mode}Hint"`), `${mode} should have a short hint`);
}
assert.match(css, /\.play-steps \{\s*display: none;/, "the old three-step strip should be hidden");
assert.match(css, /\.mode-switch \{[\s\S]{0,100}grid-template-columns: 1fr/, "modes should become stacked tickets");
assert.match(css, /\.story-pills \{/, "pack and player should share a quiet secondary row");
assert.match(css, /body\.phase-menu \.overlay \{[\s\S]{0,100}var\(--sb-paper\)/, "the menu should use a paper veil, not a dark modal");

// ---------- game HUD ----------
const header = html.slice(html.indexOf('<header class="topbar">'), html.indexOf("</header>"));
assert.match(header, /id="rewardProgress"/, "the star progress should live inside the top HUD strip");
assert.match(header, /id="pauseBtn"/, "pause should stay in the HUD");
assert.match(header, /id="setupBtn"[^>]*setup-tool/, "parents should reach settings from the quiet top-right gear");
assert.match(css, /\.correct-stat,[\s\S]{0,80}\.pile-stat,[\s\S]{0,80}\.time-stat \{\s*display: none;/, "the HUD should drop duplicate stats");
assert.match(css, /\.reward-node \{[\s\S]{0,180}border: 1\.5px solid var\(--sb-ink\)/, "the reward bar should become paper stars");
assert.match(css, /\.word \{[\s\S]{0,240}border: 2px solid var\(--sb-ink\)/, "words should become inked paper stickers");
assert.match(css, /#field \{[\s\S]{0,500}var\(--sb-paper-2\)/, "the game board should be paper");
assert.match(css, /body\.phase-paused \.topbar,[\s\S]{0,220}body\.phase-over \.controls/, "pause/result should hide duplicate chrome");
assert.match(css, /body\.phase-playing \.setup-tool/, "the parent gear should leave the play HUD");

// ---------- pack folders ----------
assert.match(html, /id="packTabs" class="pack-tabs" role="tablist"/, "the pack picker needs folder tabs");
for (const group of ["themes", "education", "phrases", "custom"]) {
  assert.match(html, new RegExp(`data-pack-group="${group}"`), `missing pack tab: ${group}`);
}
assert.match(html, /id="packCategoryGrid" class="pack-category-grid" role="listbox"/, "categories should be a card grid");
assert.match(html, /id="categorySelect"[^>]*is-hidden/, "the old native category select should be visually retired");
assert.match(html, /id="packGroupEmpty"/, "an empty pack group needs a short message");
assert.match(css, /\.pack-tab\.is-active \{/, "folder tabs need an active state");
assert.match(css, /\.pack-category-grid \{[\s\S]{0,120}repeat\(2, minmax\(0, 1fr\)\)/, "categories should use a two-column paper grid");
assert.match(css, /\.pack-category\.is-active::after \{[\s\S]{0,120}content: "★"/, "the chosen pack should get a star stamp");
assert.match(css, /\.custom-pack-section \{[\s\S]{0,140}border-top: 0/, "the custom folder should connect to its tab");

const tabs = [
  "function renderPackTabs",
  "function renderPackCategoryGrid",
  "function setPackGroup",
  "function selectPackCategory",
  "const PACK_GROUPS =",
  "function packGroupForCategory",
  "function categoryTotalCount",
];
for (const marker of tabs) assert.ok(game.includes(marker), `missing ${marker}`);
assert.match(game, /els\.packTabs\.addEventListener\("click"/, "folder tabs should switch groups");
assert.match(game, /els\.packCategoryGrid\.addEventListener\("click"/, "category cards should select a pack");
assert.match(game, /dataset\.customPick/, "custom pack rows should be selectable");
assert.match(game, /data-custom-pick/, "the custom pick handler should be wired");
assert.match(game, /state\.packGroup = packGroupForCategory/, "the picker should open the selected pack's folder");

// ---------- paper components ----------
for (const marker of [
  "--sb-paper:",
  "--sb-ink:",
  "--sb-accent:",
  ".topbar {",
  ".panel::before {",
  ".diff-btn.is-active {",
  ".primary-btn {",
  ".ghost-btn {",
  ".pack-card,",
  ".theme-choice {",
  ".avatar-choice {",
  "@keyframes stampPop",
]) {
  assert.ok(css.includes(marker), `missing storybook style: ${marker}`);
}
assert.match(css, /html\[data-theme="bubblegum"\]/, "the blueberry paper tint is required");
assert.match(css, /html\[data-theme="cream"\]/, "the mint paper tint is required");
assert.match(css, /--sb-accent-soft: #ffe5dc/, "the strawberry active tint is required");
assert.match(css, /--sb-accent-soft: #ece4fa/, "the blueberry active tint is required");
assert.match(css, /--sb-accent-soft: #dff0e6/, "the mint active tint is required");
assert.match(css, /\.theme-choice\.is-active \{[\s\S]{0,80}background: var\(--sb-accent-soft\)/, "the active theme card should follow the paper tint");
assert.match(css, /\.setup-section \{[\s\S]{0,80}padding: 12px 13px 13px/, "parent setting labels need paper margins");
assert.match(css, /@media \(max-width: 560px\)/, "phones need compact storybook spacing");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, "reduced motion should calm the stamp animation");

// ---------- copy and themes ----------
for (const key of [
  "start.heroTitle",
  "mode.rainHint",
  "mode.fillHint",
  "mode.paintHint",
  "pack.tabsAria",
  "pack.groupThemes",
  "pack.groupEducation",
  "pack.groupPhrases",
  "pack.groupCustom",
  "pack.countShort",
  "pack.emptyGroup",
  "custom.pickAria",
]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}
assert.equal(translations.zh["theme.candy"], "草莓纸");
assert.equal(translations.zh["theme.bubblegum"], "蓝莓纸");
assert.equal(translations.zh["theme.cream"], "薄荷纸");
assert.equal(pkg.version, "2.29.1");
assert.equal(sw.includes(`const VERSION = "${pkg.version}"`), true);

console.log("✓ the storybook skin loads after the base CSS and is offline-safe");
console.log("✓ home is a paper cover with three mode tickets and one primary action");
console.log("✓ the game HUD is one paper strip with paper-sticker words");
console.log("✓ the pack picker uses folder tabs and a two-column category grid");
console.log("✓ pause, result, player, settings, board and install reuse the paper components");
