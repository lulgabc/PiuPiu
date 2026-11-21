const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const arcade = fs.readFileSync(path.join(root, "css/arcade.css"), "utf8");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const { translations } = require(path.join(root, "js/i18n.js"));

assert.match(html, /<html lang="zh-CN" data-theme="candy">/, "candy should be the default skin");
assert.match(html, /localStorage\.getItem\("piupiu\.theme"\)/, "the saved skin should apply before first paint");
assert.match(html, /data-theme-choice="candy"/, "the parent panel needs a candy choice");
assert.match(html, /data-theme-choice="bubblegum"/, "the parent panel needs a bubblegum choice");
assert.match(html, /data-theme-choice="cream"/, "the parent panel needs a cream choice");
assert.match(html, /id="themeGroup"[^>]*role="radiogroup"/, "skins should be a radio group");
assert.equal((html.match(/data-theme-choice=/g) || []).length, 3, "there should be exactly three skins");

for (const theme of ["candy", "bubblegum", "cream"]) {
  assert.match(css, new RegExp(`html\\[data-theme="${theme}"\\]`), `${theme} needs its own theme variables`);
}
assert.match(css, /--theme-page:/, "skins should recolor the page");
assert.match(css, /--theme-card:/, "skins should recolor cards and panels");
assert.match(css, /--theme-field:/, "skins should recolor the game field");
assert.match(css, /--theme-cta:/, "skins should recolor the primary action");
assert.match(css, /html\[data-theme\] \.word \{/, "skins should restyle falling words");
assert.match(css, /html\[data-theme\] \.panel \{/, "skins should restyle dialogs");
assert.match(css, /html\[data-theme\] \.setup-card/, "skins should restyle the parent sheet");
for (const theme of ["candy", "bubblegum", "cream"]) {
  assert.match(
    arcade,
    new RegExp(`html\\[data-theme="${theme}"\\] \\{[\\s\\S]{0,260}--arc-bg:`),
    `${theme} needs a dark arcade field`,
  );
  assert.match(
    arcade,
    new RegExp(`html\\[data-theme="${theme}"\\] \\{[\\s\\S]{0,260}--arc-accent:`),
    `${theme} needs its neon accent`,
  );
}
assert.match(arcade, /--arc-bg: #0a1024/, "mint arcade should use the deep navy field");
assert.match(arcade, /--arc-bg: #120a24/, "violet arcade should use the violet field");
assert.match(arcade, /--arc-bg: #0c1414/, "lemon arcade should use the green-black field");
assert.equal(translations.zh["theme.candy"], "薄荷街机");
assert.equal(translations.zh["theme.bubblegum"], "紫罗兰街机");
assert.equal(translations.zh["theme.cream"], "柠檬街机");
assert.match(css, /html\[data-theme\]\.is-touch \.word:not\(\.settled\)/, "touch word cards should keep the themed surface");

assert.match(game, /const THEME_KEY = "piupiu\.theme"/, "the skin choice should persist");
assert.match(game, /const THEMES = \["candy", "bubblegum", "cream"\]/, "three skins are required");
assert.match(game, /function applyTheme\(key\)/, "skin changes should apply live");
assert.match(game, /document\.documentElement\.dataset\.theme = theme/, "skin changes should update the root theme");
assert.match(game, /localStorage\.setItem\(THEME_KEY, key\)/, "the skin choice should be remembered");
assert.match(game, /data-theme-choice/, "skin buttons should be wired");
assert.match(game, /theme-choice/, "the skin selector should be visual");

for (const key of ["theme.title", "theme.candy", "theme.bubblegum", "theme.cream", "theme.set"]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

console.log("✓ three dark arcade tints share one neon component layer");
console.log("✓ the parent panel can switch skins live and remembers the choice");
console.log("✓ home, HUD, field, words and dialogs all respond to the arcade tint");
console.log("✓ skin labels are translated in zh / fr / en");
