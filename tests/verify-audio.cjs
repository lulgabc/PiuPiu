const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const { readModularGameSource } = require("./lib-source.cjs");
const game = readModularGameSource();
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const i18n = fs.readFileSync(path.join(root, "js/i18n.js"), "utf8");

// ---------- shared audio bus ----------
assert.match(game, /createDynamicsCompressor/, "the sound bus should use a compressor");
assert.match(game, /state\.masterGain/, "all sounds should share a master gain");
assert.match(game, /function soundOut\(ctx\)/, "audio nodes should connect through the master bus");
assert.match(game, /master\.gain\.value = 1/, "the master volume should be at full scale");
assert.match(game, /const AUDIO_BOOST = TOUCH_DEVICE \|\| IS_IOS \? 1\.8 : 1/, "touch devices should get a louder effect bus");
assert.match(game, /volume \* AUDIO_BOOST/, "tone/noise gains should use the mobile boost");
assert.match(game, /nav\.audioSession/, "iOS audio-session intent should be declared");
assert.match(game, /setAudioSession\("play-and-record"\)/, "recognition should request speaker playback");
assert.match(game, /setAudioSession\("playback"\)/, "releasing the microphone should restore media volume");

// ---------- cartoon / playful palette ----------
for (const fn of [
  "playStart",
  "playPause",
  "playResume",
  "playBubble",
  "playBoing",
  "playSqueak",
  "playSlide",
  "playKazoo",
  "playRobot",
  "playRocket",
  "playDragon",
  "playCoin",
  "playGhost",
  "playCat",
  "playDog",
  "playSparkle",
  "playMystery",
  "playFanfare",
  "playGolden",
  "playCombo",
  "playSecret",
]) {
  assert.match(game, new RegExp(`function ${fn}\\(`), `missing sound: ${fn}`);
}
assert.match(game, /function playNamedSound\(/, "named sound dispatch should exist");
assert.match(game, /function sequence\(/, "melodic sequences should be reusable");
assert.match(game, /function sparkleNotes\(/, "sparkles should be reusable");

// ---------- golden words ----------
assert.match(game, /const GOLDEN_CHANCE = 0\.045/);
assert.match(game, /el\.className = golden \? "word golden" : "word"/);
assert.match(game, /golden-badge/);
assert.match(game, /word\.golden = false/);
assert.match(game, /const points = Math\.round\(basePoints \* multiplier\) \+ \(golden \? 25 : 0\)/);
assert.match(game, /playGolden\(\)/);
assert.match(game, /callHook\("showPraise", "easter\.golden"\)/);
assert.match(css, /\.word\.golden:not\(\.settled\):not\(\.miss\)/);
assert.match(css, /\.golden-badge \{/);
assert.match(css, /@keyframes goldenTwinkle/);

// ---------- word eggs and random surprises ----------
for (const word of ["robot", "rocket", "dragon", "banana", "pizza", "ghost", "cat", "dog", "star", "magic", "rainbow", "birthday"]) {
  assert.match(game, new RegExp(`${word}: \\[`), `missing word easter egg: ${word}`);
}
assert.match(game, /const SURPRISES = \[/, "random surprise palette should exist");
assert.match(game, /function maybeSurprise\(/, "random surprises should be gated");
assert.match(game, /now - state\.lastSurpriseAt < 7000/, "surprises need a cooldown");
assert.match(game, /function playWordEasterEgg\(/, "word eggs should be wired");
assert.match(game, /state\.combo % 5 === 0/, "combo milestones should sound");

// ---------- secret mascot ----------
assert.match(html, /id="startMascot"/);
assert.match(html, /id="secretNote"/);
assert.match(html, /aria-live="polite"/);
assert.match(game, /mascotTaps >= 5/, "five taps should reveal the secret");
assert.match(game, /playSecret\(\)/, "the secret should have its own sound");
assert.match(css, /\.secret-note\.show/);
assert.match(css, /\.start-mascot\.is-secret/);

// ---------- translations ----------
for (const key of ["easter.golden", "easter.secret"]) {
  const matches = i18n.match(new RegExp(`"${key.replace(/\./g, "\\.")}"`, "g")) || [];
  assert.equal(matches.length, 3, `${key} should be translated in zh / fr / en`);
}

console.log("✓ a compressed Web Audio bus now powers a larger cartoon sound palette");
console.log("✓ start / pause / resume / level / reward and combo moments have distinct sounds");
console.log("✓ golden words, word-specific sounds, random surprises and a mascot secret are wired");
