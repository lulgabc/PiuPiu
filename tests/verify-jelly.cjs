const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const game = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../css/style.css"), "utf8");

// ---------- soft-body approximation ----------
assert.match(game, /function pulseJelly\(el, className, duration\)/, "impact wobble should be reusable");
assert.match(game, /function relaxSettledPile\(\)/, "the pile should relax when support disappears");
assert.match(game, /pulseJelly\(word\.el, "jelly-land", 580\)/, "a landing word should squash and rebound");
assert.match(game, /pulseJelly\(below\.el, "jelly-nudge", 460\)/, "neighbouring cards should jiggle on impact");
assert.match(game, /pulseJelly\(card\.el, "jelly-drop", 480\)/, "cards above a removed support should drop softly");
assert.match(game, /relaxSettledPile\(\);\n    \}/, "reward clears should relax the remaining pile");
assert.match(game, /playMeteorSweep\(meteor\.cleared\);\n    relaxSettledPile\(\);/, "meteor hits should relax the remaining pile");
assert.match(game, /relaxPile: relaxSettledPile/, "the pile relaxation should be debuggable");

assert.match(css, /\.word\.settled \{[\s\S]*?transform-origin: 50% 100%/, "jelly squash should pivot on the bottom edge");
assert.match(css, /\.word\.settled \{[\s\S]*?transition: transform 0\.3s cubic-bezier/, "support changes should animate down, not teleport");
for (const animation of ["jellyLand", "jellyNudge", "jellyDrop"]) {
  assert.match(css, new RegExp(`@keyframes ${animation}`), `${animation} keyframes are required`);
}
assert.match(css, /scale: 1\.12 0\.82/, "landing cards should squash visibly");
assert.match(css, /translate: 1\.2px 0/, "landing cards should sway slightly");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.word\.jelly-land/, "jelly motion should respect reduced motion");

console.log("✓ landing cards squash, wobble and nudge the cards below");
console.log("✓ removing support lets the pile fall back with a soft bounce");
console.log("✓ the jelly effect is CSS-driven and respects reduced motion");
