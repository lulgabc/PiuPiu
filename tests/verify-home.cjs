const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const i18n = fs.readFileSync(path.join(root, "js/i18n.js"), "utf8");

// ---------- child-first home ----------
assert.match(html, /id="startPanel" class="panel start-panel"/);
assert.match(html, /class="start-mascot"/, "the home screen should have a mascot");
assert.match(html, /id="playSteps" class="play-steps"/, "the three visual play steps should exist");
assert.equal((html.match(/class="play-step"/g) || []).length, 3, "there should be exactly three play steps");
assert.match(html, /id="packBtn" class="pack-pill"/, "the word pack should be a compact pill");
assert.match(html, /id="packSummary"/, "the pack pill should summarise the current selection");
assert.match(html, /id="setupBtn" class="home-settings"/, "parents should have a compact settings entry");
assert.match(html, /id="installBtn" class="home-install/, "install should remain a compact home shortcut");
assert.match(html, /id="bestLine" class="best home-best"/, "the best score should be compact");

// ---------- settings drawer ----------
assert.match(html, /id="setupSheet"[^>]*role="dialog"/, "settings should be a dialog");
assert.match(html, /id="setupPackSection"/, "word packs belong in settings");
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
assert.match(game, /function maybeShowIntro\(/, "the first-run play-step animation should be wired");
assert.match(game, /renderVoiceOptions\(\);/, "voice labels should refresh with the language");

// ---------- quiet menu ----------
assert.match(css, /body\.phase-menu \.hud,/, "menu mode should hide the HUD");
assert.match(css, /body\.phase-menu \.reward-progress,/, "menu mode should hide the star beam");
assert.match(css, /body\.phase-menu \.controls \{/, "menu mode should hide the input footer");
assert.match(css, /body\.phase-menu #pauseBtn \{/, "menu mode should hide pause");
assert.match(css, /\.start-mascot \{/, "the mascot should be styled");
assert.match(css, /\.pack-pill \{/, "the pack pill should be styled");
assert.match(css, /\.setup-sheet \{/, "the settings drawer should be styled");

// ---------- short child-facing copy ----------
assert.equal(i18n.match(/"start\.step1": "落下来"/g)?.length, 1);
assert.equal(i18n.match(/"start\.step2": "大声读"/g)?.length, 1);
assert.equal(i18n.match(/"start\.step3": "爆炸"/g)?.length, 1);
assert.match(i18n, /"start\.best": "🏆 \{score\}"/);
for (const key of ["setup.title", "setup.done", "setup.parent", "setup.parentButton", "install.short"]) {
  const matches = i18n.match(new RegExp(`"${key.replace(/\./g, "\\.")}"`, "g")) || [];
  assert.equal(matches.length, 3, `${key} should be translated in zh / fr / en`);
}

console.log("✓ home screen leads with a mascot, three picture steps and one primary CTA");
console.log("✓ word packs, voice, install and parent notes are progressively disclosed");
console.log("✓ menu mode hides the HUD, star beam and input footer");
