const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { translations } = require("../js/i18n.js");
const { readModularGameSource } = require("./lib-source.cjs");
const game = readModularGameSource();
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../css/style.css"), "utf8");
const arcade = fs.readFileSync(path.join(__dirname, "../css/arcade.css"), "utf8");

// ---------- meteor every ten clears ----------
assert.match(game, /const METEOR_EVERY = 10/, "the meteor should fire every 10 clears");
assert.match(game, /const METEOR_TARGET = 3/, "one meteor should clear at most three frozen words");
assert.match(game, /const METEOR_MAX_FLIGHT = 9000/, "a safety stop prevents an endless bounce");
assert.match(game, /const METEOR_SIZE = 46/);
assert.match(game, /state\.cleared % METEOR_EVERY === 0\) startMeteor\(cx, cy\)/, "the cleared word becomes the meteor at 10, 20, 30…");
assert.match(game, /function startMeteor\(cx, cy\)/, "the meteor needs a launch routine");
assert.match(game, /Math\.max\(fieldW, fieldH\) \* 1\.7/, "the meteor should fly at double the earlier speed");
assert.match(game, /const steps = Math\.min\(12/, "fast meteor movement needs substeps so it cannot tunnel through frozen words");
assert.match(game, /function updateMeteor\(dt\)/, "the meteor should move in the game frame");
assert.match(game, /updateMeteor\(dt\);/, "the game loop must animate the meteor");
assert.match(game, /if \(!state\.settled\.length\) return;/, "no meteor is needed when the bottom is already clear");
assert.match(game, /meteor\.cleared >= METEOR_TARGET \|\| !state\.settled\.length/, "the meteor stops at three words or an empty bottom");
assert.match(game, /target\.el\.remove\(\);\s*meteor\.cleared \+= 1;\s*meteor\.hitCooldown = METEOR_HIT_COOLDOWN;/, "only one frozen word is cleared per contact, then bouncing continues");
assert.match(game, /function finishMeteor\(\)/, "the meteor needs an impact routine");
assert.match(game, /function sweepMeteorSettled\(meteor\)/, "the meteor should sweep settled words on contact");
assert.match(game, /meteor\.cleared \+= 1/, "each touched frozen word should be counted");
assert.match(game, /state\.settled\.splice\(index, 1\)/, "only touched settled cards should leave the field");
assert.match(game, /callHook\("toast", count \? tr\("meteor\.clear", \{ count \}\) : tr\("meteor\.empty"\)\)/, "the sweep should report how many frozen words were touched");
assert.match(game, /(?:finalY|y) <= DANGER_Y && !state\.meteor/, "the meteor window should protect the pile until the sweep lands");
assert.match(game, /function cancelMeteor\(\)/, "pausing/ending/resetting must be able to cancel the meteor");
assert.match(game, /state\.phase = "over";[\s\S]{0,120}cancelMeteor\(\);/, "the meteor should stop when the round ends");
assert.match(game, /function resetGame\(\) \{[\s\S]*?cancelMeteor\(\);/, "a new round should cancel any leftover meteor");
assert.match(css, /\.meteor \{/, "the meteor needs a visual");
assert.match(css, /@keyframes meteorGlow/, "the meteor needs a glow animation");

// ---------- falling speed ----------
assert.match(game, /speed:\s*"piupiu\.speed"/, "the speed choice should persist");
assert.match(game, /const SPEED_LEVELS = \{ normal: 1, fast: 1\.6, turbo: 2\.3 \}/, "the three speeds should be clearly different");
assert.match(game, /const baseSpeed = fieldH \/ fallSeconds;/, "each word should remember its base falling speed");
assert.match(game, /const speed = baseSpeed \* \(SPEED_LEVELS\[state\.speed\] \|\| 1\)/, "new words should use the chosen speed");
assert.match(game, /saveSpeed\(state\.speed\)|setSpeed\(/, "the speed should be remembered");
assert.match(game, /function cycleSpeed\(\)/, "the gameplay speed control should cycle through the three speeds");
assert.match(game, /baseSpeed/, "falling words should remember their base speed");
assert.match(game, /function applyFallingSpeed\(previous, next\)/, "changing speed should rescale words already in flight");
assert.match(html, /id="speedBtn"/, "the game HUD needs a speed control");
assert.ok(
  html.indexOf('id="speedBtn"') < html.indexOf('id="startPanel"'),
  "the speed control belongs in the gameplay HUD, not the home panel",
);
assert.match(html, /id="speedLabel"/, "the speed control needs a readable label");
assert.ok(!html.includes('id="speedGroup"'), "speed belongs in the game interface, not the settings drawer");

for (const speed of ["normal", "fast", "turbo"]) {
  assert.ok(translations.en[`speed.${speed}`], `missing the ${speed} label`);
}
assert.match(html, /data-i18n-aria="speed\.title"/, "the speed control needs an accessible name");
assert.match(css, /\.speed-tool \{/, "the speed control needs styling");
assert.match(html, /class="speed-meter"[^>]*><i><\/i><i><\/i><i><\/i>/, "the speed control needs a three-bar meter");
assert.match(arcade, /\[data-speed="fast"\][\s\S]{0,80}--speed-color: #ff9f43/, "fast should change the meter colour");
assert.match(arcade, /\[data-speed="turbo"\][\s\S]{0,80}--speed-color: var\(--arc-coral\)/, "turbo should change the meter colour");
assert.match(arcade, /\.speed-tool \.speed-tool-label[\s\S]{0,100}display: block/, "the speed label should stay visible");
assert.match(arcade, /body\.mode-rain \.level-stat \{\s*display: none;/, "rain mode should free HUD space for the wider speed control");

for (const key of ["meteor.start", "meteor.clear", "meteor.empty", "speed.title", "speed.normal", "speed.fast", "speed.turbo", "speed.set", "speed.pillAria"]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

console.log("✓ every 10 clears turns the word into a meteor that clears one frozen word per hit");
console.log("✓ the meteor stops after three frozen words or when the bottom is clear");
console.log("✓ the gameplay speed control cycles normal / fast / turbo and persists");
console.log("✓ meteor and speed labels translated in zh / fr / en");
