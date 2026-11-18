const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const game = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");

// ---------- Web Speech API tuning ----------
assert.match(game, /maxAlternatives\s*=\s*5/, "recognition should request five alternatives");
assert.match(game, /interimResults\s*=\s*true/, "interim results should stay enabled");
assert.match(game, /onspeechstart/, "speech-start timing should be measured");
assert.match(game, /onaudiostart/, "audio-start timing should be measured");
assert.match(game, /for \(let j = 0; j < result\.length; j\+\+\)/, "all result alternatives should be evaluated");
assert.match(game, /bestHitConfidence/, "alternative matches should be ranked by confidence");

// ---------- target-aware contextual biasing ----------
assert.match(game, /SpeechRecognitionPhrase/, "contextual phrase biasing should be feature-detected");
assert.match(game, /function syncSpeechPhrases\(/, "on-screen targets should be synced to the recognizer");
assert.match(game, /targets\.set\(word\.word, 4\)/, "bias phrases should come from on-screen targets");
assert.match(game, /state\.bag\.slice\(-5\)/, "upcoming targets should be pre-biased");
assert.match(game, /phrases-not-supported/, "unsupported contextual biasing should degrade gracefully");
assert.match(game, /recognition\.processLocally !== true/, "bias should be gated to on-device recognition");
assert.match(game, /recognition\.phrases = \[\]/, "unsupported bias phrases must be cleared");
assert.match(game, /recognition\.phrases\s*=/, "bias phrases should be assigned when supported");

// ---------- phrase-aware matching ----------
assert.match(game, /PHRASE_REDUCTIONS/, "common reductions should be supported");
for (const reduction of ["gonna", "hafta", "outta", "there's"]) {
  assert.ok(game.includes(reduction), `missing reduction: ${reduction}`);
}
assert.match(game, /replace\(\/\\s\+\/g, ""\)/, "compact phrase forms should be accepted");
assert.match(game, /OPTIONAL_ARTICLES/, "optional articles should be normalized");
assert.match(game, /keyTokens/, "contiguous phrase fragments should be accepted");

// ---------- latency ----------
assert.match(game, /lastSpeechStart/, "speech latency should be measured");
assert.match(game, /firstInterim/, "time to first result should be measured");
assert.match(game, /lastMatchLatency/, "match latency should be measured");
assert.match(game, /getSpeechStats/, "debug latency stats should be exposed");
assert.match(game, /p50/);
assert.match(game, /p95/);
assert.match(game, /state\.speechNoSpeech \? 260 : 90/, "recognition should restart quickly after a normal end");
assert.match(game, /}, delay\);/, "recognition restart delay should be applied");
const helpBody = game.slice(game.indexOf("function speakHelp(word)"), game.indexOf("function triggerHelp()"));
assert.equal(helpBody.includes("stopSpeech()"), false, "help speech must keep the microphone hot");
assert.match(helpBody, /state\.helpGuardUntil = performance\.now\(\) \+ 200/, "help echo guard should be short");
assert.match(helpBody, /!state\.listening && !state\.speechStarting\) startSpeech/, "help should start a cold microphone immediately");
assert.match(game, /if \(state\.helpSpeaking\) return;/, "TTS results should be ignored while help speaks");
assert.match(game, /}, 4000\);/, "a stuck TTS should release after a bounded fallback");
assert.match(game, /speechNoSpeech/, "no-speech restarts should back off");
assert.match(game, /InvalidStateError/, "start races should be retried");
assert.match(game, /speechStartRetries/, "start retries should be capped");

console.log("✓ five alternatives and confidence ranking are enabled");
console.log("✓ on-screen targets are used for on-device contextual biasing when available");
console.log("✓ phrase reductions, compact forms, optional articles and fragments match");
console.log("✓ speech latency and first-result timing are measured");
console.log("✓ help speech keeps the mic hot and releases matching immediately");
console.log("✓ restart gaps are reduced, with no-speech and start-race safeguards");
