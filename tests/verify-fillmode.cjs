const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { translations } = require("../js/i18n.js");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");

// ---------- mode picker ----------
assert.match(html, /id="modeSwitch"[^>]*role="group"[^>]*data-i18n-aria="mode\.aria"/, "the home screen needs an accessible mode picker");
assert.match(html, /data-mode="rain"[^>]*aria-pressed="true"/, "word rain should be the default selected mode");
assert.match(html, /data-mode="fill"[^>]*aria-pressed="false"/, "the fill mode should be selectable");
assert.match(html, /data-i18n="mode\.rain"/, "the rain mode label should be translated");
assert.match(html, /data-i18n="mode\.fill"/, "the fill mode label should be translated");
assert.match(html, /id="stepLabel1"/, "the three illustrated steps should be mode-aware");
assert.match(html, /id="fillBonusLine"/, "the result panel needs a speed-bonus line");
assert.match(html, /id="overClearedLabel"/, "the result labels should be mode-aware");

// ---------- mode state and flow ----------
assert.match(game, /const MODE_KEY = "piupiu\.mode"/, "the chosen mode should be remembered");
assert.match(game, /const GAME_MODES = \["rain", "fill"\]/, "there should be exactly two game modes");
assert.match(game, /const INITIAL_MODE =/, "the mode should be resolved at startup");
assert.match(game, /mode: INITIAL_MODE/, "state should carry the selected mode");
assert.match(game, /function updateModeUI\(/, "mode changes need a UI sync");
assert.match(game, /function setMode\(mode\)/, "the mode picker needs a setter");
assert.match(game, /localStorage\.setItem\(MODE_KEY, mode\)/, "mode choice should persist");
assert.match(game, /state\.mode === "fill"\) buildFillBoard\(\)/, "starting a fill round should build the wall");
assert.match(game, /toast\(tr\(state\.mode === "fill" \? "toast\.fillStart" : "toast\.start"\)\)/, "each mode should have its own start hint");

// ---------- the wall ----------
assert.match(game, /function buildFillBoard\(/, "fill mode needs a board builder");
assert.match(game, /function drawFillWords\(/, "the board should draw random words from the active pack");
assert.match(game, /const columns = fieldW < 430 \? 2 : 3/, "the wall should use two columns on phones and three on wider screens");
assert.match(game, /const cardH = Math\.round\(baseFont \* 1\.7\) \+ 10/, "the wall should size cards by the responsive font");
assert.match(game, /state\.fillTotal = placed/, "the round should remember how many words it started with");
assert.match(game, /state\.settled\.push\(settled\)/, "wall words should become physics targets");
assert.match(game, /attachSettledBody\(settled\)/, "every wall word should be a Matter.js body");
assert.match(game, /y < pad\) break/, "the wall should stop before overflowing the field");

// ---------- mode-aware gameplay ----------
assert.match(game, /if \(state\.mode === "rain"\) \{[\s\S]{0,600}spawnWord\(\)/, "falling words should only spawn in rain mode");
assert.match(game, /state\.mode === "rain" && checkPileDanger\(\)/, "fill mode must not end from pile height");
assert.match(game, /state\.mode === "fill"\s*\? state\.settled\.slice\(\)\.sort/, "matching should read the wall in fill mode");
assert.match(game, /state\.mode === "fill" \? state\.settled : state\.words/, "help should focus the lowest wall word");
assert.match(game, /if \(state\.mode === "fill"\) \{\s*for \(const word of state\.settled\) targets\.set/, "speech bias should include wall words");
assert.match(game, /const settledIndex = activeIndex === -1 \? state\.settled\.indexOf\(word\) : -1/, "explosions should accept wall bodies");
assert.match(game, /removeSettledBody\(word\);[\s\S]{0,120}wakePhysicsPile\(\)/, "clearing a wall body should wake the remaining pile");
assert.match(game, /else if \(state\.settled\.length === 0\) \{\s*completeFillRound\(\)/, "the round should finish when the wall is empty");
assert.match(game, /state\.mode === "rain"\) advanceRewardProgress\(\)/, "fill mode should not trigger the sweeping reward");
assert.match(game, /if \(state\.mode === "rain"\) \{[\s\S]{0,160}startMeteor\(/, "fill mode should not spawn the meteor");

// ---------- speed score ----------
assert.match(game, /function completeFillRound\(/, "fill mode needs a completion routine");
assert.match(game, /const par = Math\.max\(12, state\.fillTotal \* 3\.2\)/, "speed should be judged against the number of words");
assert.match(game, /state\.fillBonus = Math\.max\(0, Math\.round\(\(par - state\.elapsed\) \* 8\)\)/, "faster finishes should earn a larger bonus");
assert.match(game, /state\.score \+= state\.fillBonus/, "the speed bonus belongs in the final score");
assert.match(game, /addProfilePoints\(state\.fillBonus\)/, "the bonus should count toward the player total");
assert.match(game, /fill\.bonus/, "the result panel should explain the speed bonus");

// ---------- HUD and result copy ----------
assert.match(game, /const fill = state\.mode === "fill"/, "HUD values should branch by mode");
assert.match(game, /fill \? String\(state\.settled\.length\) : String\(state\.level\)/, "fill mode should show remaining words instead of a level");
assert.match(game, /state\.cleared \/ state\.fillTotal/, "fill progress should be based on cleared words");
assert.match(game, /setText\(els\.stepIcon1, fill \? "🧩" : "🌧️"\)/, "the first step icon should follow the mode");
assert.match(game, /setText\(els\.correctLabel, tr\(fill \? "hud\.cleared" : "hud\.correct"\)\)/, "the correct stat should read cleared in fill mode");
assert.match(game, /setText\(els\.levelLabel, tr\(fill \? "hud\.remaining" : "hud\.level"\)\)/, "the level label should become remaining in fill mode");
assert.match(game, /setText\(els\.overTitle, tr\(fill \? "fill\.overTitle" : "over\.title"\)\)/, "the result title should match the mode");
assert.match(game, /fill \? "fill\.again" : "over\.cta"/, "the replay button should match the mode");

// ---------- styles ----------
assert.match(css, /\.mode-switch \{/, "the mode picker needs styling");
assert.match(css, /\.mode-option\.is-active \{/, "the selected mode should be obvious");
assert.match(css, /\.word\.fill-word \{/, "wall cards need their own style");
assert.match(css, /body\.mode-fill \.reward-progress,[\s\S]{0,120}body\.mode-fill \.speed-tool/, "fill mode should hide irrelevant rain controls");
assert.match(css, /body\.mode-fill \.danger-line/, "fill mode should hide the danger line");
assert.match(css, /\.fill-bonus \{/, "the speed bonus needs styling");
assert.match(css, /@media \(max-width: 400px\) and \(max-height: 620px\)/, "very short phones should keep the start panel usable");

// ---------- translations and debug ----------
for (const key of [
  "mode.aria",
  "mode.rain",
  "mode.fill",
  "mode.fillStep1",
  "mode.fillStep3",
  "hud.remaining",
  "hud.cleared",
  "hud.progress",
  "gauge.progress",
  "toast.fillStart",
  "fill.overEyebrow",
  "fill.overTitle",
  "fill.overTagline",
  "fill.clearedLabel",
  "fill.timeLabel",
  "fill.bonus",
  "fill.allClear",
  "fill.again",
]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}
assert.match(game, /getMode: \(\) => state\.mode/, "debug should expose the mode");
assert.match(game, /setMode,/, "debug should allow QA to switch modes");
assert.match(game, /getFill: \(\) =>/, "debug should expose wall progress");

console.log("✓ the home screen offers word rain and a fill-the-screen mode");
console.log("✓ fill mode randomly fills the field with a mode-sized word wall");
console.log("✓ every wall word is a Matter.js body; clears collapse the remaining pile");
console.log("✓ the round ends only when all words are gone and scores a speed bonus");
console.log("✓ HUD, result copy, speech bias, help and effects all follow the mode");
