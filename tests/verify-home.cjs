const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const arcade = fs.readFileSync(path.join(root, "css/arcade.css"), "utf8");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const i18n = fs.readFileSync(path.join(root, "js/i18n.js"), "utf8");

// ---------- child-first home ----------
assert.match(html, /id="startPanel" class="panel start-panel"/);
assert.match(html, /class="start-mascot"/, "the home screen should have a mascot");
assert.match(html, /class="story-hero"/, "the home should group the mascot and question into an arcade hero");
assert.match(html, /class="home-pet"[^>]*assets\/monsters\/kitty\.webp/, "the hero should show a monster mascot");
assert.match(html, /id="gameTitle" data-i18n="start\.heroTitle"/, "the hero should ask what to play");
assert.match(html, /class="mode-option-copy"/, "each mode should carry a short hint");
for (const mode of ["rain", "fill", "paint"]) {
  assert.match(html, new RegExp(`data-i18n="mode\\.${mode}Hint"`), `${mode} needs a short hint`);
}
assert.match(arcade, /\.play-steps \{\s*display: none;/, "the old step strip should be visually retired");
assert.match(html, /id="packBtn" class="pack-pill"/, "the word pack should be a compact pill");
assert.match(html, /id="packSummary"/, "the pack pill should summarise the current selection");
assert.match(html, /id="setupBtn"[^>]*class="[^"]*home-settings/, "parents should have a compact settings entry");
assert.match(html, /id="installBtn" class="home-install/, "install should remain a compact home shortcut");
assert.match(html, /id="bestLine" class="best home-best"/, "the best score should be compact");

// ---------- settings drawer ----------
assert.match(html, /id="setupSheet"[^>]*role="dialog"/, "settings should be a dialog");
assert.match(html, /id="packSheet"[^>]*role="dialog"/, "word packs need their own picker dialog");
assert.match(html, /id="packPreviewIcon"/, "the picker should preview the chosen pack");
assert.match(html, /id="packDone"/, "the picker needs a done control");
assert.ok(!html.includes('id="setupPackSection"'), "the parent sheet should no longer mix in word packs");
assert.match(html, /id="setupVoiceSection"/, "voice selection belongs in settings");
assert.match(html, /id="setupParentSection"/, "parent notes belong in settings");
assert.match(html, /id="setupClose"/, "the settings drawer needs a close control");
assert.match(html, /id="setupDone"/, "the settings drawer needs a done control");
assert.match(html, /id="voiceSelect"/, "voice selection should still exist");
assert.match(html, /id="voicePreview"/, "voice preview should still exist");
assert.doesNotMatch(html, /id="voicePopover"/, "the old voice popover should be gone");
assert.match(game, /function syncPhaseClass\(/, "the page should track game phase");
assert.match(game, /function openSetup\(/, "settings should open from the home shortcuts");
assert.match(game, /function closeSetup\(/, "settings should close cleanly");
assert.match(arcade, /\.mode-switch \{[\s\S]{0,140}grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/, "modes should share one arcade row");
assert.match(arcade, /\.mode-option\.is-active \{[\s\S]{0,180}box-shadow: 0 0 18px/, "the selected mode should glow");
assert.match(arcade, /\.story-hero \{/, "the arcade hero needs its own layout");
assert.match(arcade, /\.story-pills \{/, "pack and player should share a quiet meta row");
assert.match(game, /renderVoiceOptions\(\);/, "voice labels should refresh with the language");

// ---------- quiet menu ----------
assert.match(css, /body\.phase-menu \.hud,/, "menu mode should hide the HUD");
assert.match(css, /body\.phase-menu \.reward-progress,/, "menu mode should hide the star beam");
assert.match(css, /body\.phase-menu \.controls,/, "menu mode should hide the input footer");
assert.match(css, /body\.phase-menu #pauseBtn \{/, "menu mode should hide pause");
assert.match(css, /\.start-mascot \{/, "the mascot should be styled");
assert.match(css, /\.pack-pill \{/, "the pack pill should be styled");
assert.match(html, /id="speedBtn"/, "the falling-speed control belongs in the gameplay HUD");
assert.ok(
  html.indexOf('id="speedBtn"') < html.indexOf('id="startPanel"'),
  "the speed control must sit outside the home panel",
);
assert.match(css, /\.speed-tool \{/, "the speed control should be styled");
assert.ok(!html.includes('class="key-hint"'), "home buttons should not carry decorative arrows");
assert.ok(!html.includes('pack-pill-chevron'), "the pack button should not carry an arrow");
assert.ok(!html.includes('player-pill-chevron'), "the player button should not carry an arrow");
assert.match(arcade, /\.correct-stat,[\s\S]{0,80}\.pile-stat,[\s\S]{0,80}\.time-stat \{\s*display: none;/, "the HUD should drop duplicate stats");
assert.match(arcade, /\.stat-label \{[\s\S]{0,120}font-size: 7px/, "the HUD should use quiet uppercase labels");
assert.match(arcade, /\.score-stat strong \{[\s\S]{0,100}font-size: 22px/, "the score should dominate the HUD");
assert.match(arcade, /@media \(max-width: 360px\)[\s\S]{0,700}\.stat-label \{\s*display: none;/, "phones should keep the HUD on one line");
assert.match(arcade, /body\.phase-playing \.lang-select \{\s*display: none;/, "language should leave the play HUD");
assert.match(css, /\.setup-sheet \{/, "the parent drawer should be styled");
assert.match(css, /\.pack-sheet \{/, "the word picker should be styled");
assert.match(css, /\.pack-preview \{/, "the chosen pack should have a visual preview");

// ---------- short child-facing copy ----------
assert.equal(i18n.match(/"start\.step1": "落下来"/g)?.length, 1);
assert.equal(i18n.match(/"start\.step2": "大声读"/g)?.length, 1);
assert.equal(i18n.match(/"start\.step3": "爆炸"/g)?.length, 1);
assert.match(i18n, /"start\.best": "\{score\}"/);
for (const key of ["setup.title", "setup.done", "setup.parent", "setup.parentButton", "install.short"]) {
  const matches = i18n.match(new RegExp(`"${key.replace(/\./g, "\\.")}"`, "g")) || [];
  assert.equal(matches.length, 3, `${key} should be translated in zh / fr / en`);
}

console.log("✓ home screen leads with an arcade hero, three modes and one giant play button");
console.log("✓ word packs, voice, install and parent notes are progressively disclosed");
console.log("✓ menu mode hides the HUD, neon dots and input footer");
