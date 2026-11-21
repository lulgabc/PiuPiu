const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { translations } = require("../js/i18n.js");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const arcade = fs.readFileSync(path.join(root, "css/arcade.css"), "utf8");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");

// ---------- markup ----------
for (const id of ["rewardProgress", "rewardTrack", "rewardCount"]) {
  assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
}
assert.equal(
  (html.match(/class="reward-node"/g) || []).length,
  5,
  "the reward bar needs five neon dots",
);
assert.match(html, /role="progressbar"/, "reward bar needs progressbar semantics");
assert.match(html, /aria-valuemin="0"/, "reward bar needs aria-valuemin");
assert.match(html, /aria-valuemax="5"/, "reward bar needs aria-valuemax");
assert.match(html, /id="rewardTrack"[^>]*aria-valuenow="0"/, "reward bar should start at 0");
assert.ok(
  html.indexOf('id="rewardProgress"') < html.indexOf('<main id="field"'),
  "reward bar should sit above the game field",
);

// ---------- styles ----------
for (const marker of [
  ".reward-progress {",
  ".reward-progress-fill",
  ".reward-node.is-lit",
  ".reward-progress.is-ready",
  ".reward-progress.is-tick",
  "@keyframes rewardSweep",
  "@keyframes rewardTrackTick",
]) {
  assert.ok(css.includes(marker), `missing style: ${marker}`);
}
assert.match(css, /@media \(max-width: 520px\)[\s\S]*?reward-progress/, "missing mobile bar styles");
assert.match(css, /prefers-reduced-motion[\s\S]*?reward-progress/, "missing reduced-motion bar styles");
assert.match(arcade, /html\[data-theme\] \.reward-node \{[\s\S]{0,180}border: 0;[\s\S]{0,160}background: #263252;/, "the arcade bar should use neon dots");
assert.match(arcade, /html\[data-theme\] \.reward-node\.is-lit \{[\s\S]{0,120}background: var\(--arc-accent\)/, "lit dots should use the active arcade accent");
assert.match(arcade, /html\[data-theme\] \.reward-progress-label,[\s\S]{0,140}display: none;/, "the arcade HUD should hide the bar label");
const header = html.slice(html.indexOf('<header class="topbar">'), html.indexOf("</header>"));
assert.match(header, /id="rewardProgress"/, "the neon dot strip should live in the top HUD");

// ---------- logic ----------
for (const fn of ["setRewardProgress", "resetRewardProgress", "advanceRewardProgress"]) {
  assert.match(game, new RegExp(`function ${fn}\\(`), `missing ${fn}()`);
}
assert.match(game, /state\.cleared % 5/, "bar should derive its cycle from the correct count");
assert.match(game, /advanceRewardProgress\(\);/, "correct answers should advance the bar");
assert.match(game, /rewardProgress\.style\.setProperty\("--p"/, "bar should update the fill variable");
assert.match(game, /is-ready/, "bar should expose a ready state");
assert.match(game, /is-tick/, "bar should pulse on each correct answer");
assert.match(game, /resetRewardProgress\(\);/, "game reset should clear the bar");

// ---------- translations ----------
for (const key of ["reward.progressLabel", "reward.progressAria"]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.equal(typeof translations[lang][key], "string", `${lang}.${key} must be translated`);
    assert.ok(translations[lang][key].trim(), `${lang}.${key} is empty`);
  }
}

console.log("✓ reward bar with five nodes and progressbar semantics is present");
console.log("✓ fill, node lights, tick pulse and ready glow are styled");
console.log("✓ correct answers advance the bar; reset clears it");
console.log("✓ mobile and reduced-motion styles are included");
console.log("✓ labels are translated in zh / fr / en");
