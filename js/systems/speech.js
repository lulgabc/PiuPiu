import {
  state,
  els,
  HOMOPHONES,
  PHRASE_REDUCTIONS,
  OPTIONAL_ARTICLES,
  FEMALE_VOICE,
  MALE_VOICE,
  CHILD_VOICE,
  NOVELTY_VOICE,
  SpeechRec,
  IS_IOS,
  tr,
  setText,
  normalizeSpeech,
} from "../core/state.js";
import { events } from "../core/events.js";
import { getVoice, setVoice, recordWordOutcome } from "../core/storage.js";
import { setAudioSession } from "./audio.js";

export { normalizeSpeech };

let helpVoice = null;
let helpPitch = 1;
let helpRate = 0.92;
let voiceCatalog = [];
let helpStartDelayTimer = 0;
let helpFallbackTimer = 0;
let helpMicRestartTimer = 0;
let micMeterStream = null;
let micMeterCtx = null;
let micMeterAnalyser = null;
let micMeterRaf = 0;
let micMeterStarting = false;
const formCache = new Map();

function getGlobal() {
  return typeof window !== "undefined" ? window : globalThis;
}

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function getSynth() {
  const g = getGlobal();
  return g && g.speechSynthesis ? g.speechSynthesis : null;
}

function getUtteranceCtor() {
  const g = getGlobal();
  return g && typeof g.SpeechSynthesisUtterance === "function"
    ? g.SpeechSynthesisUtterance
    : null;
}

function ui() {
  return state.uiHooks && typeof state.uiHooks === "object" ? state.uiHooks : {};
}

export function setSpeechUiBridge(hooks = {}) {
  state.uiHooks = Object.assign(state.uiHooks || {}, hooks);
  return state.uiHooks;
}

function notifyToast(message, type = "info") {
  ui().toast?.(message, type);
  events.emit("ui:toast", { message, type });
}

function notifyHeard(message, iconName) {
  ui().showHeard?.(message, iconName);
  events.emit("ui:heard", { message, iconName });
}

/* ------------------------------------------------------------------ */
/* matching                                                           */
/* ------------------------------------------------------------------ */

export function clearFormCache() {
  formCache.clear();
}

export function formsFor(word) {
  const base = String(word ?? "").toLowerCase();
  const cached = formCache.get(base);
  if (cached) return cached;
  const forms = new Set([base]);
  const add = (value) => {
    if (value) forms.add(value);
  };

  if (base.length >= 3) {
    add(`${base}s`);
    add(`${base}es`);
  }
  add(base.replace(/'/g, ""));
  add(base.replace(/\s+/g, ""));
  if (base.includes("-")) {
    add(base.replace(/-/g, " "));
    add(base.replace(/-/g, ""));
  }
  if (base === "one hundred") {
    add("a hundred");
    add("hundred");
  }
  if (base.length >= 3 && base.endsWith("y") && !/[aeiou]y$/.test(base)) {
    add(`${base.slice(0, -1)}ies`);
  }
  const homophones = Object.hasOwn(HOMOPHONES, base) ? HOMOPHONES[base] : [];
  for (const alias of homophones) forms.add(alias);
  if (base.includes(" ")) {
    const reductions = Object.hasOwn(PHRASE_REDUCTIONS, base) ? PHRASE_REDUCTIONS[base] : [];
    for (const alias of reductions) add(alias);
    const parts = base.split(" ");
    const trimmed = parts.filter((part) => !OPTIONAL_ARTICLES.has(part));
    if (trimmed.length >= 2 && trimmed.length < parts.length) add(trimmed.join(" "));
  }
  formCache.set(base, forms);
  return forms;
}

const POEM_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "for",
  "my", "your", "his", "her", "its", "our", "their", "is", "are", "was",
  "were", "be", "it", "i", "you", "we", "they", "he", "she", "me", "us",
  "them", "as", "with", "by", "from", "that", "this", "there", "here",
]);

function poemStem(token) {
  return token
    .replace(/'s$/, "")
    .replace(/'/g, "")
    .replace(/ies$/, "y")
    .replace(/es$/, "")
    .replace(/s$/, "");
}

function poemTokenEqual(a, b) {
  if (a === b) return true;
  if (a.replace(/'/g, "") === b.replace(/'/g, "")) return true;
  if (a.length > 2 && b.length > 2 && poemStem(a) === poemStem(b)) return true;
  return false;
}

export function poemOrderedMatches(needles, haystack) {
  let lineIndex = 0;
  let spokenIndex = 0;
  let matched = 0;
  while (lineIndex < needles.length && spokenIndex < haystack.length) {
    if (poemTokenEqual(needles[lineIndex], haystack[spokenIndex])) {
      matched += 1;
      lineIndex += 1;
      spokenIndex += 1;
      continue;
    }
    let skip = -1;
    const limit = Math.min(4, haystack.length - spokenIndex);
    for (let offset = 1; offset < limit; offset += 1) {
      if (poemTokenEqual(needles[lineIndex], haystack[spokenIndex + offset])) {
        skip = offset;
        break;
      }
    }
    if (skip > 0) spokenIndex += skip;
    else lineIndex += 1;
  }
  return matched;
}

export function poemMatchScore(lineTokens, rawSpokenTokens) {
  if (!lineTokens.length || !rawSpokenTokens.length) return { ok: false, value: 0 };
  // Collapse consecutive stuttered duplicates (e.g. "a a plane of of strangers")
  const spokenTokens = [];
  for (const tok of rawSpokenTokens) {
    if (!spokenTokens.length || !poemTokenEqual(spokenTokens[spokenTokens.length - 1], tok)) {
      spokenTokens.push(tok);
    }
  }
  const phrase = lineTokens.join(" ");
  const spokenPhrase = spokenTokens.join(" ");
  if (spokenPhrase === phrase || spokenPhrase.includes(phrase)) {
    return { ok: true, value: 2.2 };
  }
  if (lineTokens.length <= 3) {
    const all = lineTokens.every((token) =>
      spokenTokens.some((spoken) => poemTokenEqual(spoken, token)),
    );
    if (all && spokenTokens.length <= lineTokens.length + 1) {
      return { ok: true, value: 1.5 };
    }
    return { ok: false, value: 0 };
  }
  const matched = poemOrderedMatches(lineTokens, spokenTokens);
  const content = lineTokens.filter((token) => !POEM_STOP_WORDS.has(token));
  const contentMatched = content.length
    ? poemOrderedMatches(content, spokenTokens)
    : matched;
  const lineCoverage = matched / lineTokens.length;
  const spokenCoverage = matched / spokenTokens.length;
  const contentCoverage = content.length ? contentMatched / content.length : lineCoverage;
  const ok =
    lineCoverage >= 0.6 &&
    contentCoverage >= 0.65 &&
    (spokenCoverage >= 0.5 || spokenTokens.length <= lineTokens.length + 2);
  return {
    ok,
    value: lineCoverage * 0.6 + contentCoverage * 0.4 + (spokenCoverage >= 0.7 ? 0.2 : 0),
  };
}

export function findPoemMatch(normalized, spokenTokens) {
  const poem = state.poem;
  if (!poem || !poem.lines.length) return null;
  let best = null;
  let bestValue = 0;
  for (const line of poem.lines) {
    if (line.read) continue;
    const score = poemMatchScore(line.tokens, spokenTokens);
    if (!score.ok) continue;
    const value = score.value + (line.index === poem.current ? 0.08 : 0);
    if (value > bestValue) {
      best = line;
      bestValue = value;
    }
  }
  return best;
}

export function findMatch(text) {
  if (!text) return null;
  const normalized = normalizeSpeech(text);
  if (!normalized) return null;

  const tokens = normalized.split(" ").filter(Boolean);
  if (!tokens.length) return null;

  if (state.mode === "poem") return findPoemMatch(normalized, tokens);

  const candidates =
    state.mode === "rain"
      ? state.words.slice().sort((a, b) => b.y - a.y)
      : state.settled.slice().sort((a, b) => b.y - a.y);

  for (const word of candidates) {
    const key = word.word.toLowerCase();
    if (normalized === key || normalized === key.replace(/-/g, " ")) return word;
  }

  for (const word of candidates) {
    const key = word.word.toLowerCase();
    if (tokens.includes(key)) return word;
  }

  for (const word of candidates) {
    const key = word.word.toLowerCase();
    const forms = formsFor(word.word);

    if (forms.has(normalized)) return word;

    for (const token of tokens) {
      if (forms.has(token)) return word;
    }

    const keyTokens = key.split(" ");
    if (keyTokens.length >= 2) {
      for (let i = 0; i + keyTokens.length <= tokens.length; i++) {
        let phraseHit = true;
        for (let j = 0; j < keyTokens.length; j++) {
          if (tokens[i + j] !== keyTokens[j]) {
            phraseHit = false;
            break;
          }
        }
        if (phraseHit) return word;
      }
    }

    if (word.word.length >= 6) {
      for (let n = 2; n <= 3; n++) {
        for (let i = 0; i + n <= tokens.length; i++) {
          if (forms.has(tokens.slice(i, i + n).join(""))) return word;
        }
      }
    }
  }
  return null;
}

export function resolveSpeechHit(hit) {
  if (!hit) return;
  state.noSpeechStreak = 0;
  ui().onSpeechActive?.();
  if (state.mode === "poem") {
    const poemFn = state.modeHooks?.markPoemLine || state.uiHooks?.markPoemLine;
    if (typeof poemFn === "function") {
      poemFn(hit);
    } else {
      events.emit("poem:hit", { line: hit });
    }
    return;
  }
  const wordFn =
    state.uiHooks?.explodeWord ||
    state.fxHooks?.explodeWord ||
    state.modeHooks?.explodeWord;
  if (typeof wordFn === "function") {
    wordFn(hit);
  } else {
    events.emit("speech:wordHit", { word: hit });
  }
}

/* ------------------------------------------------------------------ */
/* word focus                                                         */
/* ------------------------------------------------------------------ */

export function lowestFallingWord() {
  const list = state.mode === "rain" ? state.words : state.settled;
  let lowest = null;
  for (const word of list) {
    if (!lowest || word.y > lowest.y) lowest = word;
  }
  return lowest;
}

export function clearFocus() {
  if (state.focusTimer) {
    clearTimeout(state.focusTimer);
    state.focusTimer = 0;
  }
  if (state.focusedWord) {
    if (state.focusedWord.el) state.focusedWord.el.classList.remove("focused");
    state.focusedWord = null;
    state.focusHold = false;
  }
  if (els.wordLayer) els.wordLayer.classList.remove("has-focus");
}

export function focusWord(word, hold = false) {
  if (!word || !word.el) return;
  clearFocus();
  state.focusedWord = word;
  state.focusHold = Boolean(hold);
  word.el.classList.add("focused");
  if (els.wordLayer) els.wordLayer.classList.add("has-focus");
  state.focusTimer = setTimeout(clearFocus, hold ? 12000 : 3000);
}

/* ------------------------------------------------------------------ */
/* help voice catalog & TTS                                           */
/* ------------------------------------------------------------------ */

function voiceValue(voice) {
  return `system:${voice.voiceURI || voice.name}`;
}

function scoreVoice(voice) {
  const name = voice.name || "";
  let score = 0;
  if (/premium|enhanced|neural|natural|siri/i.test(name)) score += 100;
  if (
    /samantha|ava|allison|aria|jenny|guy|michelle|emma|karen|moira|tessa|fiona|daniel|alex|google us english/i.test(
      name,
    )
  ) {
    score += 50;
  }
  if (voice.localService) score += 25;
  if (/^en[-_]US/i.test(voice.lang)) score += 15;
  else if (/^en[-_]GB/i.test(voice.lang)) score += 10;
  if (NOVELTY_VOICE.test(name)) score -= 200;
  if (CHILD_VOICE.test(name)) score += 8;
  return score;
}

function chooseVoice(choice) {
  const best = voiceCatalog[0] || null;
  if (typeof choice === "string" && choice.startsWith("system:")) {
    const found = voiceCatalog.find((voice) => voiceValue(voice) === choice);
    return { voice: found || best, pitch: 1, rate: 0.92 };
  }
  if (choice === "female") {
    const found = voiceCatalog.find((voice) => FEMALE_VOICE.test(voice.name));
    return { voice: found || best, pitch: found ? 1 : 1.05, rate: 0.93 };
  }
  if (choice === "male") {
    const found = voiceCatalog.find((voice) => MALE_VOICE.test(voice.name));
    return { voice: found || best, pitch: found ? 1 : 0.94, rate: 0.9 };
  }
  if (choice === "child") {
    const found = voiceCatalog.find((voice) => CHILD_VOICE.test(voice.name));
    if (found) return { voice: found, pitch: 1.04, rate: 0.96 };
    const female = voiceCatalog.find((voice) => FEMALE_VOICE.test(voice.name));
    return { voice: female || best, pitch: 1.22, rate: 0.95 };
  }
  return { voice: best, pitch: 1, rate: 0.92 };
}

export function applyVoiceChoice() {
  const picked = chooseVoice(state.voiceChoice);
  helpVoice = picked.voice || null;
  helpPitch = picked.pitch;
  helpRate = picked.rate;
}

export function getHelpVoiceState() {
  return {
    voice: helpVoice,
    pitch: helpPitch,
    rate: helpRate,
    catalog: voiceCatalog.slice(),
  };
}

export function loadVoiceChoice() {
  state.voiceChoice = getVoice("auto");
  applyVoiceChoice();
  return state.voiceChoice;
}

export function renderVoiceOptions() {
  if (els.voiceSelect && typeof document !== "undefined") {
    const select = els.voiceSelect;
    select.replaceChildren();

    const addOption = (value, labelKey) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = tr(labelKey);
      select.appendChild(option);
    };
    addOption("auto", "voice.auto");
    addOption("female", "voice.female");
    addOption("male", "voice.male");
    addOption("child", "voice.child");

    if (voiceCatalog.length) {
      const group = document.createElement("optgroup");
      group.label = tr("voice.systemGroup");
      for (const voice of voiceCatalog) {
        const option = document.createElement("option");
        option.value = voiceValue(voice);
        option.textContent = `${voice.name} · ${voice.lang}`;
        group.appendChild(option);
      }
      select.appendChild(group);
    }

    const exists = [...select.options].some((option) => option.value === state.voiceChoice);
    select.value = exists ? state.voiceChoice : "auto";
  }
  ui().renderVoiceOptions?.(voiceCatalog);
}

export function refreshVoiceCatalog() {
  const synth = getSynth();
  if (!synth) {
    if (els.setupVoiceSection) els.setupVoiceSection.classList.add("is-hidden");
    voiceCatalog = [];
    return;
  }
  if (els.setupVoiceSection) els.setupVoiceSection.classList.remove("is-hidden");
  try {
    voiceCatalog = (synth.getVoices() || [])
      .filter((voice) => /^en([-_]|$)/i.test(voice.lang) && !NOVELTY_VOICE.test(voice.name))
      .sort((a, b) => scoreVoice(b) - scoreVoice(a));
  } catch {
    voiceCatalog = [];
  }

  if (voiceCatalog.length && state.voiceChoice.startsWith("system:")) {
    const exists = voiceCatalog.some((voice) => voiceValue(voice) === state.voiceChoice);
    if (!exists) {
      state.voiceChoice = "auto";
      setVoice("auto");
    }
  }

  applyVoiceChoice();
  renderVoiceOptions();
}

export function previewVoice() {
  const synth = getSynth();
  const Utterance = getUtteranceCtor();
  if (!synth || !Utterance) return;
  applyVoiceChoice();
  const wasSpeaking = Boolean(synth.speaking || synth.pending);
  try {
    synth.cancel();
  } catch {}
  const utterance = new Utterance(tr("voice.sample"));
  utterance.lang = "en-US";
  utterance.rate = helpRate;
  utterance.pitch = helpPitch;
  utterance.volume = 1;
  if (helpVoice) utterance.voice = helpVoice;
  const startSpeak = () => {
    try {
      synth.speak(utterance);
    } catch {}
  };
  if (IS_IOS && wasSpeaking) setTimeout(startSpeak, 60);
  else startSpeak();
}

export function onVoiceChange(value) {
  const next = value !== undefined ? String(value) : els.voiceSelect ? els.voiceSelect.value : "";
  if (!next) return;
  state.voiceChoice = next;
  setVoice(state.voiceChoice);
  applyVoiceChoice();
  clearTimeout(state.voicePreviewTimer);
  state.voicePreviewTimer = setTimeout(previewVoice, 260);
}

export function stopHelpSpeech() {
  state.helpSpeakToken += 1;
  if (helpStartDelayTimer) {
    clearTimeout(helpStartDelayTimer);
    helpStartDelayTimer = 0;
  }
  if (helpFallbackTimer) {
    clearTimeout(helpFallbackTimer);
    helpFallbackTimer = 0;
  }
  if (helpMicRestartTimer) {
    clearTimeout(helpMicRestartTimer);
    helpMicRestartTimer = 0;
  }
  if (state.restartTimer) {
    clearTimeout(state.restartTimer);
    state.restartTimer = 0;
  }
  state.helpSpeaking = false;
  state.helpGuardUntil = 0;
  const synth = getSynth();
  if (synth) {
    try {
      synth.cancel();
    } catch {}
  }
}

export function speakHelp(target) {
  const synth = getSynth();
  const Utterance = getUtteranceCtor();
  const text = typeof target === "string" ? target : target && target.word;
  if (!text) return;
  if (state.phase === "playing" && state.mode !== "poem") {
    recordWordOutcome(state.userId || "_guest", text, "help");
  }
  if (!synth || !Utterance) {
    clearFocus();
    notifyToast(tr("help.unsupported"), "warn");
    return;
  }

  if (helpStartDelayTimer) {
    clearTimeout(helpStartDelayTimer);
    helpStartDelayTimer = 0;
  }
  if (helpFallbackTimer) {
    clearTimeout(helpFallbackTimer);
    helpFallbackTimer = 0;
  }
  if (helpMicRestartTimer) {
    clearTimeout(helpMicRestartTimer);
    helpMicRestartTimer = 0;
  }
  if (state.restartTimer) {
    clearTimeout(state.restartTimer);
    state.restartTimer = 0;
  }

  const token = ++state.helpSpeakToken;
  state.helpSpeaking = true;
  state.helpWord = text;

  applyVoiceChoice();
  const effectiveRate = Math.max(0.75, helpRate || 0.92);
  const speakTimeoutMs = Math.round(
    Math.max(5500, text.length * 110 + 1800) / effectiveRate,
  );
  const releaseMic = IS_IOS && state.micEnabled;
  const wasSpeaking = Boolean(synth.speaking || synth.pending);
  const delay = IS_IOS ? (releaseMic ? 150 : wasSpeaking ? 60 : 0) : 0;

  state.helpGuardUntil = nowMs() + delay + speakTimeoutMs + 600;

  try {
    synth.cancel();
  } catch {}

  if (state.micEnabled) stopSpeech();
  updateMicUI();

  const utterance = new Utterance(text);
  utterance.lang = "en-US";
  utterance.rate = helpRate;
  utterance.pitch = helpPitch;
  utterance.volume = 1;
  if (helpVoice) utterance.voice = helpVoice;

  let finished = false;
  const armFallback = (ms) => {
    if (helpFallbackTimer) clearTimeout(helpFallbackTimer);
    helpFallbackTimer = setTimeout(() => {
      helpFallbackTimer = 0;
      if (token === state.helpSpeakToken && state.helpSpeaking) {
        done(true);
      }
    }, ms);
  };

  const done = (timedOut = false) => {
    if (finished || token !== state.helpSpeakToken) return;
    finished = true;
    if (helpFallbackTimer) {
      clearTimeout(helpFallbackTimer);
      helpFallbackTimer = 0;
    }
    state.helpSpeaking = false;
    const tailMs = timedOut ? 150 : IS_IOS ? 320 : 250;
    state.helpGuardUntil = nowMs() + tailMs;

    if (
      state.mode !== "poem" &&
      !state.focusHold &&
      state.focusedWord &&
      state.focusedWord.word === state.helpWord
    ) {
      clearFocus();
    }
    updateMicUI();

    if (
      state.phase === "playing" &&
      state.micEnabled &&
      !state.listening &&
      !state.speechStarting
    ) {
      helpMicRestartTimer = setTimeout(() => {
        helpMicRestartTimer = 0;
        if (
          token === state.helpSpeakToken &&
          state.phase === "playing" &&
          state.micEnabled &&
          !state.listening &&
          !state.speechStarting &&
          !state.helpSpeaking
        ) {
          startSpeech();
        }
      }, tailMs);
    }
  };

  utterance.onstart = () => {
    if (token !== state.helpSpeakToken || finished) return;
    state.helpGuardUntil = nowMs() + speakTimeoutMs + 450;
    armFallback(speakTimeoutMs);
  };
  utterance.onend = () => done(false);
  utterance.onerror = () => done(false);

  const startSpeak = () => {
    helpStartDelayTimer = 0;
    if (token !== state.helpSpeakToken || finished) return;
    try {
      synth.speak(utterance);
    } catch {
      done(false);
      notifyToast(tr("help.unsupported"), "warn");
    }
  };

  // Pre-onstart safety ceiling in case utterance.onstart never fires on broken browsers
  armFallback(delay + Math.max(speakTimeoutMs, 6500));

  if (delay) helpStartDelayTimer = setTimeout(startSpeak, delay);
  else startSpeak();
}

export function triggerHelp() {
  if (state.phase !== "playing") return;
  if (state.mode === "poem") {
    if (typeof ui().triggerPoemHelp === "function") {
      ui().triggerPoemHelp();
      return;
    }
    const poem = state.poem;
    const line =
      (poem && poem.current >= 0 ? poem.lines[poem.current] : null) ||
      (poem && poem.lines.find((item) => !item.read));
    if (line) {
      const focusFn = state.modeHooks?.focusPoemLine || ui().focusPoemLine;
      if (typeof focusFn === "function") {
        focusFn(line.index, true);
      } else {
        events.emit("poem:help", { line });
        notifyHeard(tr("help.listen", { word: line.text }), "volume");
        speakHelp(line.text);
      }
    } else {
      notifyToast(tr("help.empty"), "warn");
    }
    return;
  }
  const word =
    state.mode === "rain"
      ? lowestFallingWord()
      : state.focusedWord || (state.settled && state.settled[0]) || lowestFallingWord();
  if (!word) {
    notifyToast(tr("help.empty"), "warn");
    return;
  }
  focusWord(word, true);
  notifyHeard(tr("help.listen", { word: word.word }), "volume");
  speakHelp(word);
}

export function setupHelp() {
  const synth = getSynth();
  if (!synth) {
    if (els.setupVoiceSection) els.setupVoiceSection.classList.add("is-hidden");
    return;
  }
  refreshVoiceCatalog();
  synth.onvoiceschanged = refreshVoiceCatalog;
}

/* ------------------------------------------------------------------ */
/* speech recognition                                                 */
/* ------------------------------------------------------------------ */

export function syncSpeechPhrases(force = false) {
  const recognition = state.speech;
  if (!recognition) return;
  if (state.speechPhrasesSupported === false) return;
  if (!("phrases" in recognition)) {
    state.speechPhrasesSupported = false;
    return;
  }
  const g = getGlobal();
  const Phrase = g ? g.SpeechRecognitionPhrase : null;
  if (typeof Phrase !== "function") {
    state.speechPhrasesSupported = false;
    return;
  }
  if (recognition.processLocally !== true) {
    state.speechPhrasesSupported = false;
    return;
  }
  if (state.listening && !force) {
    state.speechPhraseDirty = true;
    return;
  }

  const targets = new Map();
  for (const word of state.words) targets.set(word.word, 4);
  if (state.mode !== "rain") {
    for (const word of state.settled) targets.set(word.word, 4);
  }
  if (state.phase === "playing" && state.mode === "rain") {
    for (const word of state.bag.slice(-5)) {
      if (!targets.has(word)) targets.set(word, 2);
    }
  }
  if (state.mode === "poem" && state.poem) {
    for (const line of state.poem.lines.filter((item) => !item.read).slice(0, 4)) {
      targets.set(line.text, 4);
    }
  }
  const key = [...targets.keys()].join("\u0001");
  if (key === state.speechPhraseKey) return;
  state.speechPhraseKey = key;
  state.speechPhraseDirty = false;

  try {
    const phrases = [...targets].map(([target, boost]) => new Phrase(target, boost));
    try {
      recognition.phrases = phrases;
    } catch (assignError) {
      const current = recognition.phrases;
      if (current && typeof current.splice === "function") {
        current.splice(0, current.length, ...phrases);
      } else {
        throw assignError;
      }
    }
    state.speechPhrasesSupported = true;
  } catch (err) {
    state.speechPhrasesSupported = false;
    state.speechPhraseKey = "";
    state.speechPhraseError = err && err.message ? err.message : String(err);
  }
}

function stopMicMeter() {
  micMeterStarting = false;
  if (micMeterRaf && typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(micMeterRaf);
  }
  micMeterRaf = 0;
  if (micMeterStream) {
    try {
      for (const track of micMeterStream.getTracks()) track.stop();
    } catch {}
    micMeterStream = null;
  }
  if (micMeterCtx) {
    try {
      if (typeof micMeterCtx.close === "function") micMeterCtx.close();
    } catch {}
    micMeterCtx = null;
  }
  micMeterAnalyser = null;
  if (els.micBtn) {
    els.micBtn.style.setProperty("--mic-level", "0");
    els.micBtn.classList.remove("is-speaking");
    delete els.micBtn.dataset.speaking;
  }
}

function startMicMeter() {
  if (IS_IOS || micMeterStream || micMeterStarting) return;
  const g = getGlobal();
  const mediaDevices = g && g.navigator && g.navigator.mediaDevices;
  const AudioCtx = g && (g.AudioContext || g.webkitAudioContext);
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function" || !AudioCtx) return;

  micMeterStarting = true;
  Promise.resolve()
    .then(() => mediaDevices.getUserMedia({ audio: true }))
    .then((stream) => {
      micMeterStarting = false;
      if (!state.micEnabled || state.phase !== "playing") {
        try {
          for (const track of stream.getTracks()) track.stop();
        } catch {}
        return;
      }
      micMeterStream = stream;
      try {
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        if (source && typeof source.connect === "function") source.connect(analyser);
        micMeterCtx = ctx;
        micMeterAnalyser = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount || 128);
        const poll = () => {
          if (!micMeterAnalyser || !state.micEnabled || state.phase !== "playing") {
            stopMicMeter();
            return;
          }
          try {
            micMeterAnalyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) sum += data[i];
            const level = Math.min(1, sum / (data.length * 220));
            if (els.micBtn) {
              els.micBtn.style.setProperty("--mic-level", level.toFixed(2));
              const active = level > 0.12 || els.micBtn.dataset.speaking === "true";
              els.micBtn.classList.toggle("is-speaking", active);
            }
          } catch {}
          if (typeof requestAnimationFrame === "function") {
            micMeterRaf = requestAnimationFrame(poll);
          }
        };
        poll();
      } catch {
        stopMicMeter();
      }
    })
    .catch(() => {
      micMeterStarting = false;
    });
}

export function setupSpeech() {
  if (!SpeechRec) return;
  try {
    const recognition = new SpeechRec();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 5;
    const g = getGlobal();
    state.speechPhrasesSupported =
      "phrases" in recognition &&
      typeof (g && g.SpeechRecognitionPhrase) === "function" &&
      recognition.processLocally === true
        ? null
        : false;

    recognition.onstart = () => {
      state.listening = true;
      state.speechStarting = false;
      state.speechError = false;
      state.speechNoSpeech = false;
      state.speechStartRetries = 0;
      state.speechMetrics.sessions += 1;
      syncSpeechPhrases(true);
      startMicMeter();
      updateMicUI();
    };

    recognition.onaudiostart = () => {
      if (!state.speechMetrics.lastSpeechStart) {
        state.speechMetrics.lastSpeechStart = nowMs();
      }
    };

    recognition.onspeechstart = () => {
      state.noSpeechStreak = 0;
      state.speechMetrics.lastSpeechStart = nowMs();
      state.speechMetrics.firstInterim = null;
      if (els.micBtn) {
        els.micBtn.classList.add("is-speaking");
        els.micBtn.dataset.speaking = "true";
      }
      ui().onSpeechActive?.();
    };

    recognition.onspeechend = () => {
      if (els.micBtn) {
        delete els.micBtn.dataset.speaking;
        els.micBtn.classList.remove("is-speaking");
      }
      updateMicUI();
    };

    recognition.onresult = (event) => {
      if (state.phase !== "playing") return;
      const now = nowMs();
      if (state.helpSpeaking || now < state.helpGuardUntil) return;
      const metrics = state.speechMetrics;
      state.speechNoSpeech = false;
      state.noSpeechStreak = 0;
      ui().onSpeechActive?.();
      metrics.results += 1;
      if (metrics.lastSpeechStart && metrics.firstInterim === null) {
        metrics.firstInterim = Math.round(now - metrics.lastSpeechStart);
      }

      let latest = "";
      let latestConfidence = -1;
      let bestHit = null;
      let bestHitConfidence = -1;
      let bestHitRank = Infinity;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        if (result.isFinal) metrics.finals += 1;
        for (let j = 0; j < result.length; j++) {
          const alt = result[j];
          if (!alt) continue;
          const transcript = (alt.transcript || "").trim();
          if (!transcript) continue;
          const confidence = Number.isFinite(alt.confidence) ? alt.confidence : 0;
          if (confidence > latestConfidence) {
            latest = transcript;
            latestConfidence = confidence;
          }
          const hit = findMatch(transcript);
          if (
            hit &&
            (bestHit === null ||
              confidence > bestHitConfidence ||
              (confidence === bestHitConfidence && j < bestHitRank))
          ) {
            bestHit = hit;
            bestHitConfidence = confidence;
            bestHitRank = j;
          }
        }
      }

      if (bestHit) {
        metrics.matches += 1;
        if (metrics.lastSpeechStart) {
          const latency = Math.round(now - metrics.lastSpeechStart);
          metrics.lastMatchLatency = latency;
          metrics.samples.push(latency);
          if (metrics.samples.length > 50) metrics.samples.shift();
        }
        resolveSpeechHit(bestHit);
        return;
      }

      if (latest) {
        if (state.mode === "poem") {
          state.modeHooks?.highlightPoemInterim?.(latest);
        }
        if (metrics.lastSpeechStart) {
          metrics.lastResultLatency = Math.round(now - metrics.lastSpeechStart);
        }
        notifyHeard(tr("heard.prefix", { text: latest }), "mic");
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "phrases-not-supported") {
        state.speechPhrasesSupported = false;
        state.speechPhraseKey = "";
        state.speechPhraseError = "phrases-not-supported";
        try {
          recognition.phrases = [];
        } catch {}
        if (
          !state.listening &&
          state.phase === "playing" &&
          state.micEnabled &&
          !state.helpSpeaking &&
          !state.restartTimer &&
          !helpMicRestartTimer
        ) {
          const guardWait = Math.max(0, Math.ceil((state.helpGuardUntil || 0) - nowMs()));
          state.restartTimer = setTimeout(() => {
            state.restartTimer = 0;
            if (
              state.phase === "playing" &&
              state.micEnabled &&
              !state.listening &&
              !state.helpSpeaking
            ) {
              startSpeech();
            }
          }, Math.max(90, guardWait));
        }
        return;
      }
      handleSpeechError(event.error);
    };

    recognition.onend = () => {
      state.listening = false;
      state.speechStarting = false;
      updateMicUI();
      if (
        state.phase === "playing" &&
        state.micEnabled &&
        !state.helpSpeaking &&
        !state.restartTimer &&
        !helpMicRestartTimer
      ) {
        const delay = state.speechNoSpeech ? 260 : 90;
        const guardWait = Math.max(0, Math.ceil((state.helpGuardUntil || 0) - nowMs()));
        state.speechNoSpeech = false;
        state.restartTimer = setTimeout(() => {
          state.restartTimer = 0;
          if (
            state.phase === "playing" &&
            state.micEnabled &&
            !state.listening &&
            !state.helpSpeaking
          ) {
            startSpeech();
          }
        }, Math.max(delay, guardWait));
      }
    };

    state.speech = recognition;
    syncSpeechPhrases();
  } catch (err) {
    console.warn("Speech recognition unavailable:", err);
    state.micEnabled = false;
    state.speech = null;
  }
}

export function startSpeech() {
  if (!state.speech || !state.micEnabled) return;
  if (state.listening || state.speechStarting) return;
  if (state.helpSpeaking) return;
  if (nowMs() < (state.helpGuardUntil || 0)) {
    if (
      state.phase === "playing" &&
      state.micEnabled &&
      !state.listening &&
      !state.speechStarting &&
      !state.restartTimer &&
      !helpMicRestartTimer
    ) {
      state.restartTimer = setTimeout(() => {
        state.restartTimer = 0;
        startSpeech();
      }, Math.max(10, Math.ceil(state.helpGuardUntil - nowMs())));
    }
    return;
  }
  setAudioSession("play-and-record");
  syncSpeechPhrases(true);
  state.speechStarting = true;
  try {
    state.speech.start();
    updateMicUI();
  } catch (err) {
    state.speechStarting = false;
    if (err && err.name === "NotAllowedError") {
      handleSpeechError("not-allowed");
    } else if (err && err.name === "InvalidStateError") {
      if (
        state.speechStartRetries < 3 &&
        state.phase === "playing" &&
        state.micEnabled &&
        !state.helpSpeaking &&
        !state.restartTimer
      ) {
        state.speechStartRetries += 1;
        state.restartTimer = setTimeout(() => {
          state.restartTimer = 0;
          if (
            state.phase === "playing" &&
            state.micEnabled &&
            !state.listening &&
            !state.helpSpeaking
          ) {
            startSpeech();
          }
        }, 140);
      }
    } else if (err) {
      console.warn("Could not start speech recognition:", err);
    }
  }
}

export function stopSpeech() {
  stopMicMeter();
  if (state.restartTimer) {
    clearTimeout(state.restartTimer);
    state.restartTimer = 0;
  }
  state.speechStarting = false;
  state.speechStartRetries = 0;
  state.speechNoSpeech = false;
  state.noSpeechStreak = 0;
  if (state.speech) {
    try {
      state.speech.abort();
    } catch {}
  }
  state.listening = false;
  setAudioSession("playback");
  updateMicUI();
}

export function handleSpeechError(code) {
  if (code === "no-speech") {
    state.speechNoSpeech = true;
    state.noSpeechStreak = (state.noSpeechStreak || 0) + 1;
    events.emit("speech:noSpeech", { streak: state.noSpeechStreak });
    ui().onNoSpeech?.(state.noSpeechStreak);
    return;
  }
  if (code === "aborted") return;
  if (code === "not-allowed" || code === "service-not-allowed") {
    state.micEnabled = false;
    state.listening = false;
    state.speechError = true;
    updateMicUI();
    notifyToast(tr("toast.micDenied"), "warn");
    return;
  }
  if (code === "audio-capture") {
    state.micEnabled = false;
    state.listening = false;
    state.speechError = true;
    updateMicUI();
    notifyToast(tr("toast.noMic"), "warn");
    return;
  }
  if (code === "network") {
    state.speechNetworkErrors += 1;
    if (state.speechNetworkErrors >= 2) {
      state.micEnabled = false;
      state.speechError = true;
      stopSpeech();
      notifyToast(tr("toast.speechOffline"), "warn");
    } else {
      notifyToast(tr("toast.speechNetwork"), "warn");
    }
    return;
  }
  console.warn("Speech recognition error:", code);
}

export function updateMicUI() {
  if (!SpeechRec) {
    if (els.micBtn) {
      els.micBtn.disabled = true;
      els.micBtn.classList.add("off");
      els.micBtn.classList.remove("listening", "error");
      els.micBtn.setAttribute("aria-pressed", "false");
    }
    if (els.micLabel) els.micLabel.textContent = tr("mic.keyboard");
    ui().updateMicUI?.();
    events.emit("speech:micChanged", {
      micEnabled: state.micEnabled,
      listening: state.listening,
      error: state.speechError,
      helpSpeaking: state.helpSpeaking,
    });
    return;
  }

  const active = (state.listening || state.speechStarting) && state.phase === "playing";
  if (els.micBtn) {
    els.micBtn.classList.toggle("listening", active);
    els.micBtn.classList.toggle("off", !state.micEnabled);
    els.micBtn.classList.toggle("error", state.micEnabled && state.speechError);
    els.micBtn.setAttribute("aria-pressed", String(state.micEnabled));
  }

  if (els.micLabel) {
    if (!state.micEnabled) {
      els.micLabel.textContent = state.speechError ? tr("mic.error") : tr("mic.off");
    } else if (state.helpSpeaking) {
      els.micLabel.textContent = tr("mic.help");
    } else if (state.phase === "paused") {
      els.micLabel.textContent = tr("mic.paused");
    } else if (active) {
      els.micLabel.textContent = tr("mic.listening");
    } else if (state.phase === "playing") {
      els.micLabel.textContent = tr("mic.connecting");
    } else {
      els.micLabel.textContent = tr("mic.ready");
    }
  }

  ui().updateMicUI?.();
  events.emit("speech:micChanged", {
    micEnabled: state.micEnabled,
    listening: state.listening,
    error: state.speechError,
    helpSpeaking: state.helpSpeaking,
  });
}

export function toggleMic() {
  if (!SpeechRec) {
    notifyToast(tr("toast.unsupported"), "warn");
    return;
  }
  if (state.micEnabled) {
    state.micEnabled = false;
    state.speechError = false;
    stopSpeech();
    notifyToast(tr("toast.speechOff"));
  } else {
    state.micEnabled = true;
    state.speechError = false;
    state.speechNetworkErrors = 0;
    updateMicUI();
    if (state.phase === "playing") startSpeech();
    notifyToast(tr("toast.speechOn"));
  }
}

export function updateSpeechNote() {
  if (!els.speechNote) return;
  const base = SpeechRec ? tr("speech.note.ok") : tr("speech.note.unsupported");
  setText(els.speechNote, IS_IOS ? `${base} ${tr("speech.note.ios")}` : base);
}

export function getSpeechStats() {
  const rawSamples = state.speechMetrics.samples.slice();
  const sorted = rawSamples.slice().sort((a, b) => a - b);
  const percentile = (p) =>
    sorted.length
      ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
      : null;
  return {
    ...state.speechMetrics,
    samples: rawSamples.slice(-10),
    p50: percentile(0.5),
    p95: percentile(0.95),
    phraseBias: state.speechPhrasesSupported,
    phraseError: state.speechPhraseError,
  };
}

function handleSpeechSync(detail) {
  syncSpeechPhrases(Boolean(detail && detail.force));
}

(state.speechHooks ||= {}).clearFocus = clearFocus;
state.speechHooks.syncSpeechPhrases = syncSpeechPhrases;
events.on("speech:sync", handleSpeechSync);
