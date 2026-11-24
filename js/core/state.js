export const EFFECTS = ["explode", "crack", "fly", "drop", "spin"];
export const EFFECT_HUES = { explode: 42, crack: 330, fly: 190, drop: 265, spin: 150 };
export const GOLDEN_CHANCE = 0.045;
export const METEOR_EVERY = 10;
export const METEOR_TARGET = 3; // clear at most three frozen words per meteor
export const METEOR_MAX_FLIGHT = 9000; // safety stop if it keeps missing
export const METEOR_HIT_PAD = 12;
export const METEOR_HIT_COOLDOWN = 0.14;
export const METEOR_SIZE = 46;

// A few words trigger their own tiny sound-and-emoji surprise. These are
// deliberately rare targets, so children discover them over time.
export const WORD_EASTER_EGGS = {
  robot: ["robot", "🤖"],
  rocket: ["rocket", "🚀"],
  dragon: ["dragon", "🐲"],
  banana: ["boing", "🍌"],
  pizza: ["coin", "🍕"],
  ghost: ["ghost", "👻"],
  cat: ["cat", "🐱"],
  dog: ["dog", "🐶"],
  star: ["sparkle", "⭐"],
  magic: ["mystery", "🪄"],
  rainbow: ["sparkle", "🌈"],
  birthday: ["fanfare", "🎂"],
};

export const SURPRISES = [
  ["boing", "🪀"],
  ["squeak", "🐸"],
  ["slide", "🎺"],
  ["kazoo", "🎈"],
  ["bubble", "🍭"],
];

export const STORAGE_KEYS = Object.freeze({
  profiles: "piupiu.profiles",
  user: "piupiu.user",
  customPacks: "piupiu.customPacks",
  lang: "piupiu.lang",
  highScore: "piupiu.highscore",
  muted: "piupiu.muted",
  pack: "piupiu.pack",
  speed: "piupiu.speed",
  level: "piupiu.level",
  band: "piupiu.band",
  voice: "piupiu.voice",
  theme: "piupiu.theme",
  introSeen: "piupiu.introSeen",
  mode: "piupiu.mode",
  poetrySelected: "piupiu.poetry.selected",
  poetryDone: "piupiu.poetry.done",
  poetryImport: "piupiu.poetry.library.v1",
  srs: "piupiu.srs.v1",
  pets: "piupiu.pets.v1",
});

export const SPEED_LEVELS = { normal: 1, fast: 1.6, turbo: 2.3 };
export const SPEED_ORDER = ["normal", "fast", "turbo"];
export const THEMES = ["candy", "bubblegum", "cream", "daylight"];
export const THEME_COLORS = {
  candy: "#0a1024",
  bubblegum: "#120a24",
  cream: "#14140d",
  daylight: "#f7f4ec",
};
export const GAME_MODES = ["rain", "fill", "paint", "poem"];
export const POETRY_MAX_BYTES = 4 * 1024 * 1024;
export const PAD = 12;
export const DANGER_Y = 10;
export const GAME_FPS = 60;
export const ACCENT_HUES = [265, 190, 318, 42, 158, 225, 288, 12];

export const PET_FALLBACK = {
  id: "mochi",
  emoji: "👾",
  w: 60,
  h: 60,
  aspect: 0.9,
  speed: 56,
  hop: 155,
  pause: [0.8, 2.2],
  hopEvery: [2.2, 4.4],
  chatter: 0.16,
  shape: "round",
  body: "#f5a0bd",
  accent: "#ffdae8",
  pattern: "plain",
  say: "pet.say.mochi",
  image: "assets/monsters/mochi.webp",
  base: "assets/monsters/mochi-base.webp",
  eyeCount: 2,
  eyeLayout: "row",
  eyeX: 0.5,
  eyeY: 0.35,
  eyeSpread: 0.16,
  eyeGap: 0.14,
  mouthX: 0.5,
  mouthY: 0.52,
  mouthW: 0.24,
  mouthH: 0.1,
  ink: "#3a233e",
  voice: { wave: "sine", notes: [520, 780], dur: 0.07, step: 0.07, gain: 0.02, slide: 1.32 },
};

// Pronunciation-spelling pairs the recognizer can confuse. They sound the
// same, so accepting either spelling keeps the game fair.
export const HOMOPHONES = {
  bee: ["be"],
  break: ["brake"],
  buy: ["by", "bye"],
  choose: ["chews"],
  deer: ["dear"],
  flour: ["flower"],
  flower: ["flour"],
  fur: ["fir"],
  hair: ["hare"],
  hear: ["here"],
  heel: ["heal"],
  know: ["no"],
  meat: ["meet"],
  meet: ["meat"],
  morning: ["mourning"],
  night: ["knight"],
  peace: ["piece"],
  plane: ["plain"],
  pray: ["prey"],
  rain: ["reign"],
  read: ["red"],
  ring: ["wring"],
  road: ["rode"],
  roll: ["role"],
  sail: ["sale"],
  see: ["sea"],
  sell: ["cell"],
  son: ["sun"],
  stair: ["stare"],
  stare: ["stair"],
  steal: ["steel"],
  sun: ["son"],
  tail: ["tale"],
  toe: ["tow"],
  waist: ["waste"],
  wait: ["weight"],
  war: ["wore"],
  wave: ["waive"],
  week: ["weak"],
  weather: ["whether"],
  wood: ["would"],
  write: ["right"],
};

// Help-voice heuristics. System voice names differ across macOS, Windows,
// Chrome and Edge; prefer known natural voices and avoid novelty voices.
export const FEMALE_VOICE =
  /samantha|ava|allison|susan|karen|moira|tessa|fiona|aria|jenny|michelle|emma|olivia|zira|hazel|serena|kate|amy|libby|sonia|natasha|shelley|sandy|flo|siri|google us english|\bfemale\b/i;
export const MALE_VOICE =
  /alex|daniel|fred|guy|brian|david|mark|george|ryan|joe|tom|oliver|arthur|aaron|matthew|james|\bmale\b/i;
export const CHILD_VOICE = /child|kid|junior|eddy|young/i;
export const NOVELTY_VOICE =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|rocko|ralph|deranged|hysterical|bruce/i;

// Common reductions the recognizer may return for phrase targets.
export const PHRASE_REDUCTIONS = {
  "going to": ["gonna"],
  "want to": ["wanna"],
  "got to": ["gotta"],
  "have to": ["hafta", "haffta"],
  "has to": ["hasta"],
  "have got to": ["gotta"],
  "have got": ["got"],
  "used to": ["usta"],
  "kind of": ["kinda"],
  "sort of": ["sorta"],
  "out of": ["outta"],
  "a lot of": ["a lotta", "alotta"],
  "let me": ["lemme"],
  "give me": ["gimme"],
  "there is": ["there's"],
  "that is": ["that's"],
};

export const OPTIONAL_ARTICLES = new Set(["a", "an", "the"]);

export const UI_ICON_NS = "http://www.w3.org/2000/svg";

export const CATEGORY_ICON_IDS = {
  core: "spark",
  numbers: "numbers",
  food: "food",
  fruits: "apple",
  vegetables: "carrot",
  drinks: "cup",
  animals: "paw",
  body: "person",
  family: "users",
  clothes: "shirt",
  home: "house",
  school: "gradcap",
  jobs: "briefcase",
  sports: "ball",
  music: "music",
  travel: "plane",
  transport: "bus",
  nature: "leaf",
  weather: "sun",
  technology: "laptop",
  emotions: "heart",
  places: "pin",
  dolch: "backpack",
  fry: "alphabet",
  dale: "book",
  bnc: "puzzle",
  phave: "link",
  phrase: "speech",
};

export const POETRY_CATEGORY_FALLBACK = [
  { id: "family", name: "Family and Friends", hue: 12, icon: "users" },
  { id: "feelings", name: "Feelings", hue: 300, icon: "heart" },
  { id: "animals", name: "Animals and Nature", hue: 140, icon: "paw" },
  { id: "cities", name: "Cities and Travel", hue: 205, icon: "bus" },
  { id: "fun", name: "Fun and Games", hue: 45, icon: "ball" },
  { id: "science", name: "Science and Art", hue: 185, icon: "palette" },
  { id: "body", name: "Body and Health", hue: 340, icon: "person" },
  { id: "learning", name: "A World of Learning", hue: 265, icon: "book" },
];

export const POETRY_ICON_NAMES = new Set([
  "users",
  "heart",
  "paw",
  "bus",
  "ball",
  "palette",
  "person",
  "book",
  "spark",
  "star",
  "leaf",
  "sun",
  "music",
  "plane",
  "house",
  "puzzle",
]);

export const FILL_HUES = [338, 12, 28, 46, 63, 155, 172, 192, 212, 268, 292, 318];
export const FILL_EFFECTS = [
  "pulse",
  "bounce",
  "wobble",
  "flash",
  "glow",
  "hueShift",
  "rainbow",
  "shimmer",
  "sparkle",
  "confetti",
  "emoji",
  "ring",
];
export const FILL_EFFECT_CLASSES = [
  "fill-pulse",
  "fill-bounce",
  "fill-wobble",
  "fill-flash",
  "fill-glow",
  "fill-rainbow",
  "fill-shimmer",
];

const hasWindow = typeof window !== "undefined";
const hasNavigator = typeof navigator !== "undefined";
const hasMatchMedia = hasWindow && typeof window.matchMedia === "function";

export const SpeechRec = hasWindow
  ? window.SpeechRecognition || window.webkitSpeechRecognition || null
  : null;

export const TOUCH_DEVICE = Boolean(
  (hasMatchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    (hasNavigator && navigator.maxTouchPoints > 1),
);

export const IS_IOS = Boolean(
  hasNavigator &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent || "") ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)),
);

export const AUDIO_BOOST = TOUCH_DEVICE || IS_IOS ? 1.8 : 1;

export const REDUCED_MOTION = Boolean(
  hasMatchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);

export function readNumber(key, fallback) {
  try {
    const ls = typeof globalThis !== "undefined" ? globalThis.localStorage : null;
    if (!ls || typeof ls.getItem !== "function") return fallback;
    const n = Number(ls.getItem(key));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

export function readString(key, fallback) {
  try {
    const ls = typeof globalThis !== "undefined" ? globalThis.localStorage : null;
    if (!ls || typeof ls.getItem !== "function") return fallback;
    return ls.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

const MODE_PARAM =
  typeof location !== "undefined" &&
  typeof location.search === "string" &&
  typeof URLSearchParams !== "undefined"
    ? new URLSearchParams(location.search).get("mode")
    : null;

export const INITIAL_MODE = GAME_MODES.includes(MODE_PARAM)
  ? MODE_PARAM
  : GAME_MODES.includes(readString(STORAGE_KEYS.mode, "rain"))
    ? readString(STORAGE_KEYS.mode, "rain")
    : "rain";

export function $(id, doc = typeof document !== "undefined" ? document : null) {
  return doc && typeof doc.getElementById === "function" ? doc.getElementById(id) : null;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function tr(key, vars) {
  const i18n = typeof globalThis !== "undefined" ? globalThis.PiuI18n : null;
  return i18n && typeof i18n.t === "function" ? i18n.t(key, vars) : key;
}

export function locale() {
  const i18n = typeof globalThis !== "undefined" ? globalThis.PiuI18n : null;
  const lang = i18n && typeof i18n.getLang === "function" ? i18n.getLang() : "zh";
  return lang === "fr" ? "fr-FR" : lang === "zh" ? "zh-CN" : "en-US";
}

export function formatNumber(value) {
  return Number(value).toLocaleString(locale());
}

export function normalizeSpeech(text, numberWords = null) {
  const map =
    numberWords ||
    (typeof globalThis !== "undefined" &&
      globalThis.PIU_NUMBER_WORDS &&
      typeof globalThis.PIU_NUMBER_WORDS === "object" &&
      globalThis.PIU_NUMBER_WORDS) ||
    {};
  return String(text ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z' 0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (Object.hasOwn(map, token) ? map[token] : token))
    .join(" ");
}

export function iconSvg(name, className = "ui-icon") {
  if (typeof document === "undefined" || typeof document.createElementNS !== "function") {
    return null;
  }
  const svg = document.createElementNS(UI_ICON_NS, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const use = document.createElementNS(UI_ICON_NS, "use");
  use.setAttribute("href", `#ui-${name}`);
  svg.appendChild(use);
  return svg;
}

export function setText(el, text) {
  if (!el) return;
  if (el.textContent !== text) el.textContent = text;
}

export function setIcon(el, name, className = "ui-icon") {
  if (!el) return;
  const svg = iconSvg(name, className);
  if (svg && typeof el.replaceChildren === "function") el.replaceChildren(svg);
}

export function setUseIcon(svg, name) {
  if (!svg || typeof svg.querySelector !== "function") return;
  const use = svg.querySelector("use");
  if (use) use.setAttribute("href", `#ui-${name}`);
}

export function setStarValue(el, value) {
  if (!el || typeof document === "undefined") return;
  const svg = iconSvg("star", "ui-icon ui-icon-star");
  if (!svg || typeof el.replaceChildren !== "function") return;
  el.replaceChildren(svg, document.createTextNode(formatNumber(value)));
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function hueFor(word) {
  const str = String(word ?? "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return ACCENT_HUES[hash % ACCENT_HUES.length];
}

export function uniqueWords(words) {
  const seen = new Set();
  const result = [];
  for (const word of words) {
    const key = String(word).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(word);
    }
  }
  return result;
}

export const els = {};
export const rewardNodes = [];

const EL_IDS = [
  "field",
  "paintLayer",
  "wordLayer",
  "fxLayer",
  "petLayer",
  "overlay",
  "startPanel",
  "pausePanel",
  "overPanel",
  "startBtn",
  "resumeBtn",
  "quitBtn",
  "restartBtn",
  "homeBtn",
  "pauseBtn",
  "muteBtn",
  "micBtn",
  "micLabel",
  "micTip",
  "typeForm",
  "typeInput",
  "packBtn",
  "packSummary",
  "packSheet",
  "packClose",
  "packDone",
  "packSearch",
  "packWordPreview",
  "customPackSection",
  "customPackQuota",
  "customPackName",
  "customPackFile",
  "customPackChoose",
  "customPackCreate",
  "customPackFileInfo",
  "customPackStatus",
  "customPackList",
  "customPackEmpty",
  "packTabs",
  "packCategoryGrid",
  "packGroupEmpty",
  "packPreviewIcon",
  "packPreviewName",
  "packPreviewMeta",
  "poetryBtn",
  "poetrySummary",
  "poetrySheet",
  "poetryClose",
  "poetryPreviewIcon",
  "poetryPreviewTitle",
  "poetryPreviewMeta",
  "poetryPreviewCount",
  "poetrySearch",
  "poetryShuffle",
  "poetryTabs",
  "poetryList",
  "poetryEmpty",
  "poetryImport",
  "poetryFile",
  "poetryStatus",
  "poetryNote",
  "poetryDone",
  "poemStage",
  "poemMotif",
  "poemCategoryIcon",
  "poemCategoryName",
  "poemProgress",
  "poemListen",
  "poemListenAll",
  "poemTitle",
  "poemAuthor",
  "poemLines",
  "poemSpineFill",
  "poemCombo",
  "poemResult",
  "poemResultCategory",
  "poemResultTitle",
  "poemResultAuthor",
  "overPoetryBtn",
  "overNextPoemBtn",
  "practiceMissedBtn",
  "setupBtn",
  "setupSheet",
  "setupClose",
  "setupDone",
  "setupThemeSection",
  "setupVoiceSection",
  "setupParentSection",
  "setupAdvanced",
  "backupExportBtn",
  "backupImportBtn",
  "backupFile",
  "backupStatus",
  "themeGroup",
  "modeSwitch",
  "startMascot",
  "secretNote",
  "voiceSelect",
  "voicePreview",
  "diffGroup",
  "levelSelect",
  "speedBtn",
  "speedLabel",
  "packCount",
  "score",
  "correct",
  "correctLabel",
  "correctStat",
  "rewardProgress",
  "rewardTrack",
  "rewardCount",
  "combo",
  "comboStat",
  "level",
  "levelLabel",
  "pile",
  "pileLabel",
  "pileStat",
  "pileFill",
  "gaugeLabel",
  "time",
  "heard",
  "praise",
  "toast",
  "bestLine",
  "bestLineValue",
  "homePlayerChips",
  "petCollectionBtn",
  "petCollectionCount",
  "petSheet",
  "petClose",
  "petDone",
  "petGrid",
  "petCount",
  "petDetailPreview",
  "playerBtn",
  "playerAvatar",
  "playerName",
  "playerTotal",
  "playerSheet",
  "playerClose",
  "playerDone",
  "playerForm",
  "playerFormTitle",
  "playerList",
  "playerNameInput",
  "playerSubmit",
  "playerSubmitLabel",
  "playerError",
  "avatarPicker",
  "avatarEditNote",
  "avatarEditText",
  "avatarEditCancel",
  "guestRenameBanner",
  "guestRenameForm",
  "guestRenameInput",
  "guestRenameSave",
  "boardBtn",
  "boardSheet",
  "boardClose",
  "boardDone",
  "boardList",
  "boardEmpty",
  "sessionTotal",
  "overBoardBtn",
  "speechNote",
  "finalScore",
  "finalCleared",
  "finalCombo",
  "finalTime",
  "overEyebrow",
  "overEyebrowIcon",
  "overTitle",
  "overTagline",
  "overScoreLabel",
  "overClearedLabel",
  "overComboLabel",
  "overTimeLabel",
  "fillBonusLine",
  "missedTitle",
  "recordLine",
  "missedList",
];

export function initEls(doc = typeof document !== "undefined" ? document : null) {
  rewardNodes.length = 0;
  for (const key of Object.keys(els)) {
    delete els[key];
  }
  if (!doc) {
    return { els, rewardNodes };
  }
  for (const id of EL_IDS) {
    els[id] = $(id, doc);
  }
  const hasQsa = typeof doc.querySelectorAll === "function";
  els.playStepItems = hasQsa ? [...doc.querySelectorAll("#playSteps .play-step")] : [];
  els.modeOptions = hasQsa ? [...doc.querySelectorAll("#modeSwitch [data-mode]")] : [];
  if (hasQsa) {
    rewardNodes.push(...doc.querySelectorAll(".reward-node"));
  }
  return { els, rewardNodes };
}

export const state = {
  phase: "menu", // menu | playing | paused | over
  words: [],
  settled: [],
  bag: [],
  pool: [],
  categories: [],
  customPacks: [],
  customPackFile: null,
  customPackReading: false,
  customNotice: null,
  packGroup: "themes",
  categoryId: "core",
  difficulty: 0,
  band: "all",
  profiles: [],
  userId: "",
  pendingLegacyBest: 0,
  roundRecorded: false,
  voiceChoice: readString(STORAGE_KEYS.voice, "auto"),
  theme: readString(STORAGE_KEYS.theme, "candy"),
  speed: readString(STORAGE_KEYS.speed, "normal"),
  voicePreviewTimer: 0,
  lastWord: "",
  mode: INITIAL_MODE,
  fillTotal: 0,
  fillBonus: 0,
  fillFinishing: false,
  fillFxTimer: 0,
  paintTotal: 0,
  paintBonus: 0,
  paintFinishing: false,
  poem: null,
  poetry: {
    library: null,
    loaded: false,
    imported: false,
    categoryId: "family",
    selectedId: "",
    completed: new Set(),
    status: "",
    statusKind: "",
  },
  score: 0,
  combo: 0,
  bestCombo: 0,
  cleared: 0,
  missed: 0,
  missedWords: [],
  practiceWords: [],
  newRecord: false,
  lastEffect: null,
  elapsed: 0,
  level: 1,
  spawnTimer: 0.8,
  lastFrame: 0,
  raf: 0,
  highScore: readNumber(STORAGE_KEYS.highScore, 0),
  muted: readString(STORAGE_KEYS.muted, "0") === "1",
  audioCtx: null,
  masterGain: null,
  lastSurpriseAt: 0,
  micEnabled: Boolean(SpeechRec),
  speech: null,
  listening: false,
  speechStarting: false,
  speechError: false,
  speechNetworkErrors: 0,
  speechPhraseKey: "",
  speechPhraseDirty: false,
  speechPhrasesSupported: null,
  speechPhraseError: "",
  speechNoSpeech: false,
  noSpeechStreak: 0,
  speechStartRetries: 0,
  speechMetrics: {
    sessions: 0,
    results: 0,
    finals: 0,
    matches: 0,
    firstInterim: null,
    lastResultLatency: null,
    lastMatchLatency: null,
    lastSpeechStart: 0,
    samples: [],
  },
  restartTimer: 0,
  heardTimer: 0,
  praiseTimer: 0,
  focusTimer: 0,
  focusedWord: null,
  helpSpeaking: false,
  helpSpeakToken: 0,
  helpWord: "",
  helpGuardUntil: 0,
  toastTimer: 0,
  lastHud: {},
  meteor: null,
  physics: null,
  paintSplats: [],
  rewardProgress: 0,
  rewardBarTimer: 0,
  rewardTickTimer: 0,
  lastFieldH: 0,
  lastFieldW: 0,
  pets: [],
  pet: null,
  lastPetId: "",
  lastAccessory: "",
  pointer: null,
  petPalette: null,
  lastPetStep: 0,
  lastPetLand: 0,
  lastPetPurr: 0,
};
