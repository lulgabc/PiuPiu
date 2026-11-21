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
assert.match(game, /const GAME_MODES = \["rain", "fill", "paint"\]/, "there should be exactly three game modes");
assert.match(game, /const INITIAL_MODE =/, "the mode should be resolved at startup");
assert.match(game, /mode: INITIAL_MODE/, "state should carry the selected mode");
assert.match(game, /function updateModeUI\(/, "mode changes need a UI sync");
assert.match(game, /function setMode\(mode\)/, "the mode picker needs a setter");
assert.match(game, /localStorage\.setItem\(MODE_KEY, mode\)/, "mode choice should persist");
assert.match(game, /state\.mode === "fill"\) buildFillBoard\(\)/, "starting a fill round should build the wall");
assert.match(game, /"toast\.paintStart"/, "paint mode should have its own start hint");
assert.match(game, /"toast\.fillStart"/, "fill mode should have its own start hint");
assert.match(game, /"toast\.start"/, "rain mode should have its own start hint");

// ---------- the wall ----------
assert.match(game, /function buildFillBoard\(/, "fill mode needs a board builder");
assert.match(game, /function drawFillWords\(/, "the board should draw random words from the active pack");
assert.match(game, /return shuffle\(pool\.slice\(\)\)\.slice\(0, Math\.max\(1, count\)\)/, "small custom packs should not repeat a word on the board");
assert.match(game, /const availableW = fieldW - pad \* 2/, "the wall should measure the usable field width");
assert.match(game, /let width = el\.offsetWidth/, "card width should come from the word itself");
assert.match(game, /while \(width > availableW && font > 13\)/, "long words should shrink to fit instead of using equal columns");
assert.match(game, /el\.style\.minWidth = "56px"/, "short words should keep a comfortable touch target");
assert.doesNotMatch(game, /el\.style\.width = `\$\{cellW\}px`/, "fill cards must not be forced to one equal width");
assert.match(game, /const cardH = Math\.round\(baseFont \* 1\.7\) \+ 10/, "the wall should keep one readable row height");
assert.match(game, /state\.fillTotal = used\.size/, "the round should remember how many words it started with");
assert.match(game, /state\.settled\.push\(card\)/, "wall words should become physics targets");
assert.match(game, /attachSettledBody\(card\)/, "every wall word should be a Matter.js body");
assert.match(game, /const usedRows = rows\.slice\(0, maxRows\)/, "the wall should drop rows that would overflow the field");

// ---------- independent colours ----------
assert.match(game, /const FILL_HUES = \[/, "fill cards should use a curated candy hue set");
assert.match(game, /Math\.floor\(Math\.random\(\) \* 10 - 5\)/, "each card should jitter its hue so neighbours differ");
assert.match(game, /el\.style\.setProperty\("--fill-hue", String\(hue\)\)/, "every card should carry its own hue");
assert.match(css, /html\[data-theme\] \.word\.fill-word \{[\s\S]{0,260}hsl\(var\(--fill-hue/, "fill cards should colour their border, background and ink from the hue");
assert.match(css, /html\[data-theme="bubblegum"\] \.word\.fill-word/, "the dark theme needs its own fill-card palette");
assert.match(css, /html\[data-theme="cream"\] \.word\.fill-word/, "the cream theme needs its own fill-card palette");

// ---------- click to hear ----------
assert.match(game, /function speakFillWord\(card\)/, "clicking a word should have a dedicated hint action");
assert.match(game, /els\.wordLayer\.addEventListener\("click"/, "the wall should listen for word taps");
assert.match(game, /event\.target\.closest\("\.fill-word"\)/, "taps should resolve to a fill word");
assert.match(game, /focusWord\(card, true\);\s*showHeard\(tr\("help\.listen"/, "a tap should highlight the word and show the listening hint");
assert.match(game, /speakHelp\(card\)/, "a tap should speak the word with the help voice");
assert.match(game, /el\.setAttribute\("role", "button"\)/, "fill cards should be announced as buttons");
assert.match(game, /el\.tabIndex = 0/, "fill cards should be reachable from the keyboard");
assert.match(css, /\.word\.fill-word \{[\s\S]{0,220}pointer-events: auto/, "fill cards must accept pointer events");
assert.match(css, /\.word\.fill-word:focus-visible/, "keyboard focus should be visible");

// ---------- random block effects ----------
const fxBlock = game.match(/const FILL_EFFECTS = \[([\s\S]*?)\];/);
assert.ok(fxBlock, "the fill mode should define a random effect list");
const fxNames = [...fxBlock[1].matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);
assert.ok(fxNames.length >= 10, "at least ten block effects should be available");
for (const name of ["pulse", "bounce", "wobble", "flash", "glow", "hueShift", "rainbow", "shimmer", "sparkle", "confetti", "emoji", "ring"]) {
  assert.ok(fxNames.includes(name), `missing block effect: ${name}`);
}
assert.match(game, /function updateFillEffects\(dt\)/, "effects should be scheduled inside the game loop");
assert.match(game, /function applyFillEffect\(card\)/, "each random effect needs an applier");
assert.match(game, /state\.fillFxTimer = 0\.65 \+ Math\.random\(\) \* 0\.85/, "effects should fire on a lively random cadence");
assert.match(game, /if \(state\.mode === "fill"\) updateFillEffects\(dt\)/, "the game loop should only run fill effects in fill mode");
assert.match(css, /\.fill-shine \{/, "cards need a shine sweep layer");
const keyframes = [...css.matchAll(/@keyframes (fill[A-Za-z]+)/g)].map((m) => m[1]);
assert.ok(keyframes.length >= 7, "the stylesheet should define the fill-card animation set");
for (const name of ["fillPulse", "fillBounce", "fillWobble", "fillFlash", "fillGlow", "fillRainbow", "fillShineSweep"]) {
  assert.ok(keyframes.includes(name), `missing keyframes: ${name}`);
}

// ---------- mode-aware gameplay ----------
assert.match(game, /if \(state\.mode === "rain"\) \{[\s\S]{0,600}spawnWord\(\)/, "falling words should only spawn in rain mode");
assert.match(game, /state\.mode === "rain" && checkPileDanger\(\)/, "fill mode must not end from pile height");
assert.match(game, /state\.mode === "rain"\s*\? state\.words\.slice\(\)\.sort/, "matching should read the board in fill and paint modes");
assert.match(game, /state\.mode === "rain" \? state\.words : state\.settled/, "help should focus the lowest board word");
assert.match(game, /if \(state\.mode !== "rain"\) \{\s*for \(const word of state\.settled\) targets\.set/, "speech bias should include board words");
assert.match(game, /const settledIndex = activeIndex === -1 \? state\.settled\.indexOf\(word\) : -1/, "explosions should accept wall bodies");
assert.match(game, /removeSettledBody\(word\);[\s\S]{0,120}wakePhysicsPile\(\)/, "clearing a wall body should wake the remaining pile");
assert.match(game, /else if \(state\.mode === "fill" && state\.settled\.length === 0\) \{\s*completeFillRound\(\)/, "the fill round should finish when the wall is empty");
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
assert.match(game, /board \? String\(state\.settled\.length\) : String\(state\.level\)/, "board modes should show remaining words instead of a level");
assert.match(game, /const total = fill \? state\.fillTotal : state\.paintTotal/, "board progress should use the active mode total");
assert.match(game, /setText\(els\.stepIcon1, paint \? "🎨" : fill \? "🧩" : "🌧️"\)/, "the first step icon should follow the mode");
assert.match(game, /setText\(els\.correctLabel, tr\(paint \? "hud\.hits" : fill \? "hud\.cleared" : "hud\.correct"\)\)/, "the correct stat should read hits or cleared in board modes");
assert.match(game, /setText\(els\.levelLabel, tr\(fill \|\| paint \? "hud\.remaining" : "hud\.level"\)\)/, "the level label should become remaining in board modes");
assert.match(game, /tr\(paint \? "paint\.overTitle" : fill \? "fill\.overTitle" : "over\.title"\)/, "the result title should match the mode");
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
console.log("✓ card widths follow each word and every card gets its own candy hue");
console.log("✓ tapping or focusing a card highlights it and speaks the word");
console.log("✓ twelve random micro-effects keep the wall alive");
console.log("✓ every wall word is a Matter.js body; clears collapse the remaining pile");
console.log("✓ the round ends only when all words are gone and scores a speed bonus");
console.log("✓ HUD, result copy, speech bias, help and effects all follow the mode");
