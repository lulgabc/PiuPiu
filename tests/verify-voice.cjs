const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const game = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const i18n = fs.readFileSync(path.join(root, "js/i18n.js"), "utf8");

// ---------- picker markup ----------
assert.match(html, /id="voiceToggle"/, "the help-voice button should be in the pack header");
assert.match(html, /id="voicePopover"/, "the help voice picker should have its own popover");
assert.match(html, /id="voiceSelect"/, "the help voice select should exist");
assert.match(html, /id="voicePreview"/, "the help voice preview button should exist");
assert.match(html, /aria-controls="voicePopover"/, "the toggle should describe its popover");
assert.match(html, /aria-expanded="false"/, "the toggle should start collapsed");

// ---------- voice catalogue ----------
assert.match(game, /const VOICE_KEY = "piupiu\.voice"/, "the voice choice should persist");
assert.match(game, /let voiceCatalog = \[\]/, "system voices should be cached");
assert.match(game, /function refreshVoiceCatalog\(/, "system voices should be loaded dynamically");
assert.match(game, /onvoiceschanged = refreshVoiceCatalog/, "late system voices should be picked up");
assert.match(game, /\/\^en\(\[-_\]\|\$\)\/i\.test\(voice\.lang\)/, "only English system voices should be listed");
assert.match(game, /localService/, "local voices should be preferred");
assert.match(game, /premium\|enhanced\|neural\|natural\|siri/i, "high-quality voices should rank first");
assert.match(game, /NOVELTY_VOICE/, "novelty voices should be filtered out");
for (const novelty of ["albert", "zarvox", "bells", "whisper"]) {
  assert.ok(game.includes(novelty), `novelty voice should be excluded: ${novelty}`);
}
assert.match(game, /scoreVoice\(b\) - scoreVoice\(a\)/, "the catalogue should be sorted by naturalness");

// ---------- categories ----------
assert.match(game, /"voice\.auto"/, "the automatic choice should be offered");
assert.match(game, /"voice\.female"/, "a female choice should be offered");
assert.match(game, /"voice\.male"/, "a male choice should be offered");
assert.match(game, /"voice\.child"/, "a child choice should be offered");
assert.match(game, /CHILD_VOICE/, "the child choice should look for real child voices");
assert.match(game, /child\|kid\|junior\|eddy\|young/i, "known child voices should be detected");
assert.match(game, /pitch: 1\.22/, "the child fallback should use a gentle pitch lift");
assert.match(game, /pitch: 1\.04/, "real child voices should not be over-pitched");

// ---------- speech integration ----------
assert.match(game, /function applyVoiceChoice\(/, "the chosen voice should be applied to help speech");
assert.match(game, /applyVoiceChoice\(\);\s*\n\s*const utterance = new Utterance\(word\.word\)/, "help speech should use the chosen voice");
assert.match(game, /utterance\.rate = helpRate/, "help speech should use the chosen rate");
assert.match(game, /utterance\.pitch = helpPitch/, "help speech should use the chosen pitch");
assert.match(game, /if \(helpVoice\) utterance\.voice = helpVoice/, "the selected system voice should be attached");
assert.match(game, /function previewVoice\(/, "the picker should preview the current voice");
assert.match(game, /"voice\.sample"/, "preview should speak a localized sample");
assert.match(game, /localStorage\.setItem\(VOICE_KEY, state\.voiceChoice\)/, "voice changes should be remembered");

// ---------- popover behaviour ----------
assert.match(game, /aria-expanded", "true"/, "opening should update aria-expanded");
assert.match(game, /closest\("#voicePopover"\)/, "clicks inside the popover should not dismiss it");
assert.match(game, /event\.key === "Escape"/, "Escape should dismiss the picker");
assert.match(game, /preventScroll: true/, "focus should not scroll the picker out of view");
assert.match(game, /openVoicePopover\(\)/, "the popover should be positioned when opened");

// ---------- translations ----------
for (const key of [
  "voice.title",
  "voice.short",
  "voice.auto",
  "voice.female",
  "voice.male",
  "voice.child",
  "voice.systemGroup",
  "voice.preview",
  "voice.aria",
  "voice.close",
  "voice.sample",
]) {
  const matches = i18n.match(new RegExp(`"${key.replace(/\./g, "\\.")}"`, "g")) || [];
  assert.equal(matches.length, 3, `${key} should be translated in zh / fr / en`);
}

console.log("✓ help voice picker offers auto / female / male / child and usable English system voices");
console.log("✓ natural voices are preferred, novelty voices are excluded");
console.log("✓ preview, persistence and help-speech integration are wired");
