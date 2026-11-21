const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { translations } = require("../js/i18n.js");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const css = read("css/arcade.css");
const game = read("js/game.js");
const sw = read("sw.js");
const pkg = JSON.parse(read("package.json"));

// ---------- skin entry ----------
assert.ok(
  html.indexOf("css/style.css") < html.indexOf("css/arcade.css"),
  "the arcade skin should load after the base stylesheet",
);
assert.match(html, /css\/arcade\.css\?v=[\d.]+/, "the page should load the arcade skin");
assert.ok(sw.indexOf("./css/arcade.css") >= 0, "the arcade skin should be in the offline precache");
assert.equal(html.includes("css/storybook.css"), false, "the retired storybook skin should not load");

// ---------- home hierarchy ----------
assert.match(html, /class="story-hero"/, "the home hero should group the mascot and title");
assert.match(html, /id="gameTitle" data-i18n="start\.heroTitle"/, "the hero should carry the game promise");
assert.match(html, /class="home-pet"[^>]*assets\/monsters\/kitty\.webp/, "the hero should show a monster mascot");
assert.match(html, /class="mode-option-copy"/, "each mode should keep its short hint copy");
for (const mode of ["rain", "fill", "paint"]) {
  assert.match(html, new RegExp(`data-i18n="mode\\.${mode}Hint"`), `${mode} should have a short hint`);
}
assert.match(css, /\.play-steps \{\s*display: none;/, "the old three-step strip should be hidden");
assert.match(css, /\.mode-switch \{[\s\S]{0,140}grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/, "modes should sit in one arcade row");
assert.match(css, /\.mode-option-copy small \{\s*display: none;/, "the arcade mode row should stay compact");
assert.match(css, /\.start-panel::before \{\s*display: none;/, "the paper tape should be retired");
assert.match(css, /body\.phase-menu \.overlay \{\s*background: transparent;/, "the menu should sit directly on the dark field");
assert.match(css, /\.start-cta::after \{[\s\S]{0,100}content: "▶"/, "the primary action should get a play arrow");
assert.match(css, /\.story-pills \{/, "pack and player should share a quiet secondary row");

// ---------- game HUD ----------
const header = html.slice(html.indexOf('<header class="topbar">'), html.indexOf("</header>"));
assert.match(header, /id="rewardProgress"/, "the progress dots should live inside the top HUD strip");
assert.match(header, /id="pauseBtn"/, "pause should stay in the HUD");
assert.match(header, /id="setupBtn"[^>]*setup-tool/, "parents should reach settings from the quiet top-right gear");
assert.match(css, /\.correct-stat,[\s\S]{0,80}\.pile-stat,[\s\S]{0,80}\.time-stat \{\s*display: none;/, "the HUD should drop duplicate stats");
assert.match(css, /\.reward-node \{[\s\S]{0,160}border: 0;[\s\S]{0,120}background: #263252;/, "the reward bar should become neon dots");
assert.match(css, /\.reward-node\.is-lit \{[\s\S]{0,120}background: var\(--arc-accent\)/, "lit dots should use the active arcade accent");
assert.match(css, /\.word \{[\s\S]{0,160}border: 1px solid hsl\(var\(--card-hue\)/, "words should become neon-outlined cards");
assert.match(css, /\.field \{[\s\S]{0,260}#0b1228/, "the game board should be a dark focus field");
assert.match(css, /body\.phase-paused \.topbar,[\s\S]{0,220}body\.phase-over \.controls/, "pause/result should hide duplicate chrome");
assert.match(css, /body\.phase-playing \.setup-tool/, "the parent gear should leave the play HUD");
assert.match(css, /\.start-panel\.hidden \{[\s\S]{0,80}display: none !important/, "pause/result must be able to replace the arcade start cover");
assert.match(css, /body\.phase-menu \.danger-line/, "the menu should not show the gameplay danger line");

// ---------- pack picker ----------
assert.match(html, /id="packTabs" class="pack-tabs" role="tablist"/, "the pack picker needs tab chips");
for (const group of ["themes", "education", "phrases", "custom"]) {
  assert.match(html, new RegExp(`data-pack-group="${group}"`), `missing pack tab: ${group}`);
}
assert.match(html, /id="packCategoryGrid" class="pack-category-grid" role="listbox"/, "categories should be a cartridge grid");
assert.match(html, /id="categorySelect"[^>]*is-hidden/, "the old native category select should be visually retired");
assert.match(html, /id="packGroupEmpty"/, "an empty pack group needs a short message");
assert.match(css, /\.pack-tab\.is-active \{/, "tab chips need an active state");
assert.match(css, /\.pack-category-grid \{[\s\S]{0,140}repeat\(2, minmax\(0, 1fr\)\)/, "categories should use a two-column cartridge grid");
assert.match(css, /\.pack-category\.is-active \{[\s\S]{0,180}background: color-mix\(in srgb, var\(--arc-accent\) 10%, transparent\)/, "the chosen cartridge should glow with the active accent");
assert.equal(css.includes('content: "★"'), false, "paper star stamps should be retired");
assert.match(css, /\.custom-pack-section \{/, "custom packs should keep their own section");

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
assert.match(game, /els\.packTabs\.addEventListener\("click"/, "tab chips should switch groups");
assert.match(game, /els\.packCategoryGrid\.addEventListener\("click"/, "cartridge cards should select a pack");
assert.match(game, /dataset\.customPick/, "custom pack rows should be selectable");
assert.match(game, /data-custom-pick/, "the custom pick handler should be wired");
assert.match(game, /state\.packGroup = packGroupForCategory/, "the picker should open the selected pack's chip");

// ---------- arcade components ----------
for (const marker of [
  "--arc-bg:",
  "--arc-mint:",
  "--arc-coral:",
  "--arc-lemon:",
  "--arc-lav:",
  ".topbar {",
  ".diff-btn.is-active {",
  ".primary-btn {",
  ".ghost-btn {",
  ".pack-card,",
  ".theme-choice {",
  ".avatar-choice {",
  "@keyframes arcadeFloat",
]) {
  assert.ok(css.includes(marker), `missing arcade style: ${marker}`);
}
assert.match(css, /html\[data-theme="bubblegum"\]/, "the violet arcade tint is required");
assert.match(css, /html\[data-theme="cream"\]/, "the lemon arcade tint is required");
assert.match(css, /--arc-bg: #120a24/, "the violet arcade needs a dark field");
assert.match(css, /--arc-bg: #0c1414/, "the lemon arcade needs a dark field");
assert.match(css, /\.theme-choice\.is-active \{[\s\S]{0,180}border-color: var\(--arc-accent\)/, "the active theme card should glow");
assert.match(css, /\.theme-swatch-candy \{\s*background: #0a1024;/, "theme swatches should preview the dark fields");
assert.match(css, /\.setup-section \{[\s\S]{0,100}background: rgba\(255, 255, 255, 0\.035\)/, "parent settings should use a dark card");
assert.match(css, /\.word\.focused \{[\s\S]{0,100}outline: 2px solid var\(--arc-accent\)/, "the focused word should glow with the active accent");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, "reduced motion should calm the mascot float");

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
assert.equal(translations.zh["start.heroTitle"], "读出来，消掉它");
assert.equal(translations.zh["theme.candy"], "薄荷街机");
assert.equal(translations.zh["theme.bubblegum"], "紫罗兰街机");
assert.equal(translations.zh["theme.cream"], "柠檬街机");
assert.equal(pkg.version, "2.30.0");
assert.equal(sw.includes(`const VERSION = "${pkg.version}"`), true);

console.log("✓ the arcade skin loads after the base CSS and is offline-safe");
console.log("✓ home is a dark arcade cover with a pet, three modes and one giant play button");
console.log("✓ the game HUD is one capsule with neon dots and glowing word cards");
console.log("✓ the pack picker uses chip tabs and a two-column cartridge grid");
console.log("✓ pause, result, player, settings, board and install reuse the arcade components");
