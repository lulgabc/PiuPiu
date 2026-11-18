const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { translations } = require("../js/i18n.js");
const game = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../css/style.css"), "utf8");

// ---------- meteor every ten clears ----------
assert.match(game, /const METEOR_EVERY = 10/, "the meteor should fire every 10 clears");
assert.match(game, /const METEOR_ROUNDS = 2/, "the meteor should circle the four edges twice");
assert.match(game, /const METEOR_MAX_HITS = 40/, "a safety cap prevents an endless bounce");
assert.match(game, /const METEOR_SIZE = 46/);
assert.match(game, /state\.cleared % METEOR_EVERY === 0\) startMeteor\(cx, cy\)/, "the cleared word becomes the meteor at 10, 20, 30…");
assert.match(game, /function startMeteor\(cx, cy\)/, "the meteor needs a launch routine");
assert.match(game, /Math\.max\(fieldW, fieldH\) \* 1\.7/, "the meteor should fly at double the earlier speed");
assert.match(game, /const steps = Math\.min\(12/, "fast meteor movement needs substeps so it cannot tunnel through frozen words");
assert.match(game, /function updateMeteor\(dt\)/, "the meteor should move in the game frame");
assert.match(game, /updateMeteor\(dt\);/, "the game loop must animate the meteor");
assert.match(game, /meteor\.edgeHits\[side\] \+= 1/, "each edge hit should be counted");
assert.match(game, /every\(\(count\) => count >= METEOR_ROUNDS\)/, "the meteor should stop after every edge is hit twice");
assert.match(game, /function finishMeteor\(\)/, "the meteor needs an impact routine");
assert.match(game, /function sweepMeteorSettled\(meteor\)/, "the meteor should sweep settled words on contact");
assert.match(game, /meteor\.cleared \+= 1/, "each touched frozen word should be counted");
assert.match(game, /state\.settled\.splice\(index, 1\)/, "only touched settled cards should leave the field");
assert.match(game, /toast\(count \? tr\("meteor\.clear", \{ count \}\) : tr\("meteor\.empty"\)\)/, "the sweep should report how many frozen words were touched");
assert.match(game, /y <= DANGER_Y && !state\.meteor/, "the meteor window should protect the pile until the sweep lands");
assert.match(game, /function cancelMeteor\(\)/, "pausing/ending/resetting must be able to cancel the meteor");
assert.match(game, /state\.phase = "over";\s*syncPhaseClass\(\);\s*cancelMeteor\(\);/, "the meteor should stop when the round ends");
assert.match(game, /function resetGame\(\) \{[\s\S]*?cancelMeteor\(\);/, "a new round should cancel any leftover meteor");
assert.match(css, /\.meteor \{/, "the meteor needs a visual");
assert.match(css, /@keyframes meteorGlow/, "the meteor needs a glow animation");

// ---------- falling speed ----------
assert.match(game, /const SPEED_KEY = "piupiu\.speed"/, "the speed choice should persist");
assert.match(game, /const SPEED_LEVELS = \{ normal: 1, fast: 1\.3, turbo: 1\.65 \}/, "three speed levels are required");
assert.match(game, /\(fieldH \/ fallSeconds\) \* \(SPEED_LEVELS\[state\.speed\] \|\| 1\)/, "new words should use the chosen speed");
assert.match(game, /localStorage\.setItem\(SPEED_KEY, key\)/, "the speed should be remembered");
assert.match(game, /function cycleSpeed\(\)/, "the start-screen speed pill should cycle through the three speeds");
assert.match(html, /id="speedBtn"/, "the start screen needs a speed pill");
assert.match(html, /id="speedLabel"/, "the speed pill needs a readable label");
assert.ok(!html.includes('id="speedGroup"'), "speed belongs in the game interface, not the settings drawer");
assert.ok(
  html.indexOf('id="speedBtn"') < html.indexOf('id="setupSheet"'),
  "the speed control must sit on the start screen",
);
for (const speed of ["normal", "fast", "turbo"]) {
  assert.ok(translations.en[`speed.${speed}`], `missing the ${speed} label`);
}
assert.match(html, /data-i18n-aria="speed\.title"/, "the speed pill needs an accessible name");
assert.match(css, /\.speed-pill \{/, "the speed pill needs styling");

for (const key of ["meteor.start", "meteor.clear", "meteor.empty", "speed.title", "speed.normal", "speed.fast", "speed.turbo", "speed.set", "speed.pillAria"]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

console.log("✓ every 10 clears turns the word into a meteor that hits all four edges twice");
console.log("✓ the meteor clears only the frozen words it touches");
console.log("✓ the speed pill on the start screen cycles normal / fast / turbo and persists");
console.log("✓ meteor and speed labels translated in zh / fr / en");
