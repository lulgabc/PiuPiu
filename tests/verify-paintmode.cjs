const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { translations } = require("../js/i18n.js");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const paint = game.slice(
  game.indexOf("function buildPaintBoard()"),
  game.indexOf("function fillCardCenter"),
);
const explode = game.slice(
  game.indexOf("function explodeWord(word)"),
  game.indexOf("function burst(el, rel, hue)"),
);

// ---------- mode picker ----------
assert.match(html, /data-mode="paint"[^>]*aria-pressed="false"/, "the paintball mode should be selectable");
assert.match(html, /data-mode="paint"[\s\S]{0,140}data-i18n="mode\.paint"/, "the paintball mode needs a label");
assert.match(html, /id="paintLayer"[^>]*aria-hidden="true"/, "paint stains need their own background layer");
assert.match(game, /const GAME_MODES = \["rain", "fill", "paint"\]/, "there should be three game modes");
assert.match(game, /GAME_MODES\.includes\(MODE_PARAM\)/, "the url mode should resolve through the shared list");
assert.match(game, /state\.mode === "paint"\) buildPaintBoard\(\)/, "starting a paint round should build the board");
assert.match(game, /"toast\.paintStart"/, "paint mode should have a start hint");

// ---------- full-screen scatter ----------
assert.match(game, /function buildPaintBoard\(/, "paint mode needs a board builder");
assert.match(game, /const area = Math\.max\(1, fieldW \* fieldH\)/, "the board should size itself to the whole field");
assert.match(game, /Math\.round\(area \/ 7200\)/, "word count should follow the field area");
assert.match(game, /const margins = \[8, 6, 4, 2\]/, "cards should pack with a safe collision margin");
assert.match(paint, /Math\.random\(\) \* spanX/, "x positions should be random rather than column-based");
assert.match(paint, /Math\.random\(\) \* spanY/, "y positions should be random rather than row-based");
assert.doesNotMatch(paint, /usedRows/, "paint cards must not use the neat fill rows");
assert.match(paint, /const rotation = Math\.random\(\) \* 10 - 5/, "each card should get a small random tilt");
assert.match(paint, /translate3d\(\$\{card\.x\}px, \$\{card\.y\}px, 0\) rotate/, "rotation should ride in the same transform as the position");
assert.match(paint, /boundW: Math\.ceil/, "placement should use the rotated card bounds");
assert.match(paint, /if \(!spot\) \{\s*card\.el\.remove\(\)/, "cards that cannot fit should be dropped instead of overlapping");
assert.match(paint, /state\.paintTotal = state\.settled\.length/, "the round should remember its target count");
assert.doesNotMatch(paint, /attachSettledBody/, "paint cards should stay still instead of becoming physics bodies");
assert.match(game, /if \(state\.mode !== "paint"\) \{\s*for \(const settled of state\.settled\)/, "the pet should not climb the paint collage");

// ---------- cards and colours ----------
assert.match(paint, /el\.className = "word settled fill-word paint-word"/, "paint cards should reuse the candy card base");
assert.match(paint, /el\.setAttribute\("role", "button"\)/, "paint cards should be announced as buttons");
assert.match(paint, /el\.tabIndex = 0/, "paint cards should be keyboard reachable");
assert.match(paint, /--fill-hue/, "every paint card should carry its own hue");
assert.match(css, /\.paint-layer \{[\s\S]{0,120}z-index: 2/, "paint stains should sit behind the words");
assert.match(css, /\.word\.paint-word \{/, "paint cards need their own style hook");
assert.match(css, /body\.mode-paint \.reward-progress,[\s\S]{0,120}body\.mode-paint \.speed-tool/, "paint mode should hide rain-only controls");
assert.match(css, /body\.mode-paint \.pet-layer \{[\s\S]{0,80}z-index: 2/, "the pet should stay behind paint words");

// ---------- paintball hit ----------
assert.match(explode, /const paint = state\.mode === "paint"/, "explosions should branch into the paintball path");
assert.match(explode, /launchPaintball\(rel, effectHue, rel\.width, rel\.height\)/, "a correct word should launch a paintball");
assert.match(game, /function launchPaintball\(/, "the paintball flight needs its own routine");
assert.match(game, /pet\.ground \+ pet\.hopY - pet\.h \* 0\.72/, "the ball should launch from the pet");
assert.match(game, /ball\.addEventListener\("animationend", impact/, "the ball should splat when its flight ends");
assert.match(game, /function createPaintSplat\(/, "a hit needs a paint splat routine");
assert.match(game, /class: "paint-splat"/, "the splat needs a dedicated SVG element");
assert.match(game, /class: "paint-lump"/, "the splat should have irregular satellite blobs");
assert.match(game, /class: "paint-drip"/, "the splat should have paint drips");
assert.match(game, /class: "paint-drop"/, "the splat should throw small paint droplets");
assert.match(game, /const layer = els\.paintLayer \|\| els\.wordLayer/, "the stain should use the paint layer with a safe fallback");
assert.match(game, /layer\.appendChild\(svg\)/, "the stain should persist");
assert.match(game, /class: "paint-tendril"/, "the splat should have long ink arms");
assert.match(game, /function paintBlobPath\(/, "the main ink blob should use an irregular path");
assert.match(game, /function paintSmoothClosedPath\(/, "the splat outline should be smoothly curved");
assert.match(game, /function paintTendrilPath\(/, "ink arms should be tapered and curved");
assert.match(game, /function paintDripPath\(/, "drips should be tapered");
assert.match(game, /linearGradient/, "the ink should use a shaded gradient");
assert.match(game, /roll > 0\.84\) scale \*= 1\.55/, "some splats should be dramatically larger");
assert.match(game, /roll < 0\.16\) scale \*= 0\.55/, "some splats should be much smaller");
assert.match(game, /mainR \* \(3\.8 \+ Math\.random\(\) \* 1\.3\)/, "the spray extent should be exaggerated");
assert.match(game, /mainR \* \(1\.15 \+ Math\.pow\(Math\.random\(\), 1\.5\) \* 3\.2\)/, "droplets should fly far from the core");
assert.match(game, /14 \+ Math\.floor\(Math\.random\(\) \* 16\)/, "splats should include a wide droplet spray");
assert.match(game, /10 \+ Math\.floor\(Math\.random\(\) \* 14\)/, "splats should include fine mist specks");
assert.match(game, /Math\.atan2\(ty, tx\)/, "the splatter should follow the ball direction");
assert.match(game, /playPaintShot\(\)/, "the launch should have a paintball sound");
assert.match(game, /playPaintSplat\(\)/, "the impact should have a splat sound");
for (const name of ["paintballFly", "paintSplatIn", "paintLumpIn", "paintDripIn", "paintDropIn"]) {
  assert.match(css, new RegExp(`@keyframes ${name}`), `missing paint animation: ${name}`);
}
assert.match(css, /\.paintball \{/, "the paintball needs a visible projectile");
assert.match(css, /\.paint-splat \{/, "the splat needs styling");
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]{0,240}\.paint-splat/, "reduced motion should calm the paint effects");

// ---------- speech, help and typing ----------
assert.match(game, /state\.mode === "rain"\s*\? state\.words\.slice\(\)\.sort/, "matching should search the paint board");
assert.match(game, /state\.mode === "rain" \? state\.words : state\.settled/, "help should read the paint board");
assert.match(game, /if \(state\.mode !== "rain"\) \{\s*for \(const word of state\.settled\) targets\.set/, "speech bias should include paint cards");
assert.match(game, /state\.phase !== "playing" \|\| state\.mode === "rain"\) return;/, "paint cards should be tappable for help");
assert.match(game, /speakFillWord\(card\)/, "a tap should speak the paint word");
assert.match(game, /focusWord\(card, true\);\s*showHeard\(tr\("help\.listen"/, "a paint tap should highlight and speak the word");
assert.match(game, /setMode,/, "QA should be able to switch to paint mode");

// ---------- completion and score ----------
assert.match(game, /function completePaintRound\(/, "paint mode needs a completion routine");
assert.match(game, /const par = Math\.max\(10, state\.paintTotal \* 2\.6\)/, "speed should be judged against the paint target count");
assert.match(game, /state\.paintBonus = Math\.max\(0, Math\.round\(\(par - state\.elapsed\) \* 8\)\)/, "faster paint rounds should earn a larger bonus");
assert.match(game, /state\.score \+= state\.paintBonus/, "the paint bonus belongs in the final score");
assert.match(explode, /else if \(paint && state\.settled\.length === 0\) \{\s*completePaintRound\(\)/, "the paint round should finish when every word is splatted");
assert.match(game, /const board = fill \|\| paint/, "HUD progress should treat both board modes alike");
assert.match(game, /paint \? "paint\.overEyebrow"/, "the result eyebrow should match paint mode");
assert.match(game, /paint \? "paint\.again"/, "the replay button should match paint mode");

// ---------- translations and debug ----------
for (const key of [
  "mode.paint",
  "mode.paintStep1",
  "mode.paintStep3",
  "hud.hits",
  "hud.paint",
  "gauge.paint",
  "toast.paintStart",
  "paint.overEyebrow",
  "paint.overTitle",
  "paint.overTagline",
  "paint.clearedLabel",
  "paint.timeLabel",
  "paint.bonus",
  "paint.allClear",
  "paint.again",
]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}
assert.match(game, /getPaint: \(\) =>/, "debug should expose paint progress");

console.log("✓ the home screen offers a third paintball mode");
console.log("✓ a random tilted collage fills the whole field without overlaps");
console.log("✓ every paint word can be tapped, spoken and matched");
console.log("✓ correct words launch a ball and leave a persistent ink splat");
console.log("✓ the round ends when every word is splatted and scores a speed bonus");
console.log("✓ HUD, result copy, pet footing, translations and debug all follow paint mode");
