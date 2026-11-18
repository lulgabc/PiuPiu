(() => {
  "use strict";

  const WORD_BANK = Array.isArray(window.PIU_WORDS) ? window.PIU_WORDS.slice() : [];
  const LEXICON = Array.isArray(window.PIU_LEXICON) ? window.PIU_LEXICON.slice() : [];
  const EDUCATION = Array.isArray(window.PIU_EDUCATION) ? window.PIU_EDUCATION.slice() : [];
  const FAMILIES = Array.isArray(window.PIU_FAMILIES) ? window.PIU_FAMILIES.slice() : [];
  const PHRASES = Array.isArray(window.PIU_PHRASES) ? window.PIU_PHRASES.slice() : [];
  const EMOJI =
    window.PIU_EMOJI && typeof window.PIU_EMOJI === "object" ? window.PIU_EMOJI : {};
  const EFFECTS = ["explode", "crack", "fly", "drop", "spin"];
  const EFFECT_HUES = { explode: 42, crack: 330, fly: 190, drop: 265, spin: 150 };
  const GOLDEN_CHANCE = 0.045;

  // A few words trigger their own tiny sound-and-emoji surprise. These are
  // deliberately rare targets, so children discover them over time.
  const WORD_EASTER_EGGS = {
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

  const SURPRISES = [
    ["boing", "🪀"],
    ["squeak", "🐸"],
    ["slide", "🎺"],
    ["kazoo", "🎈"],
    ["bubble", "🍭"],
  ];
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const TOUCH_DEVICE =
    window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
  const IS_IOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const AUDIO_BOOST = TOUCH_DEVICE || IS_IOS ? 1.8 : 1;
  const HS_KEY = "piupiu.highscore";
  const MUTE_KEY = "piupiu.muted";
  const PACK_KEY = "piupiu.pack";
  const LEVEL_KEY = "piupiu.level";
  const BAND_KEY = "piupiu.band";
  const VOICE_KEY = "piupiu.voice";
  const INTRO_KEY = "piupiu.introSeen";
  const PAD = 12;
  const DANGER_Y = 10;
  const GAME_FPS = 60;
  const ACCENT_HUES = [265, 190, 318, 42, 158, 225, 288, 12];

  // Pronunciation-spelling pairs the recognizer can confuse. They sound the
  // same, so accepting either spelling keeps the game fair.
  const HOMOPHONES = {
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
  const FEMALE_VOICE = /samantha|ava|allison|susan|karen|moira|tessa|fiona|aria|jenny|michelle|emma|olivia|zira|hazel|serena|kate|amy|libby|sonia|natasha|shelley|sandy|flo|siri|google us english|\bfemale\b/i;
  const MALE_VOICE = /alex|daniel|fred|guy|brian|david|mark|george|ryan|joe|tom|oliver|arthur|aaron|matthew|james|\bmale\b/i;
  const CHILD_VOICE = /child|kid|junior|eddy|young/i;
  const NOVELTY_VOICE = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|rocko|ralph|deranged|hysterical|bruce/i;

  // Common reductions the recognizer may return for phrase targets.
  const PHRASE_REDUCTIONS = {
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
  const OPTIONAL_ARTICLES = new Set(["a", "an", "the"]);

  const $ = (id) => document.getElementById(id);

  const i18n = window.PiuI18n;
  const tr = (key, vars) => (i18n && typeof i18n.t === "function" ? i18n.t(key, vars) : key);
  const locale = () => {
    const lang = i18n && typeof i18n.getLang === "function" ? i18n.getLang() : "zh";
    return lang === "fr" ? "fr-FR" : lang === "zh" ? "zh-CN" : "en-US";
  };
  const formatNumber = (value) => Number(value).toLocaleString(locale());

  const els = {
    field: $("field"),
    wordLayer: $("wordLayer"),
    fxLayer: $("fxLayer"),
    overlay: $("overlay"),
    startPanel: $("startPanel"),
    pausePanel: $("pausePanel"),
    overPanel: $("overPanel"),
    startBtn: $("startBtn"),
    resumeBtn: $("resumeBtn"),
    quitBtn: $("quitBtn"),
    restartBtn: $("restartBtn"),
    homeBtn: $("homeBtn"),
    pauseBtn: $("pauseBtn"),
    muteBtn: $("muteBtn"),
    micBtn: $("micBtn"),
    micLabel: $("micLabel"),
    typeForm: $("typeForm"),
    typeInput: $("typeInput"),
    categorySelect: $("categorySelect"),
    packBtn: $("packBtn"),
    packSummary: $("packSummary"),
    setupBtn: $("setupBtn"),
    setupSheet: $("setupSheet"),
    setupClose: $("setupClose"),
    setupDone: $("setupDone"),
    setupPackSection: $("setupPackSection"),
    setupVoiceSection: $("setupVoiceSection"),
    setupParentSection: $("setupParentSection"),
    playSteps: $("playSteps"),
    startMascot: $("startMascot"),
    secretNote: $("secretNote"),
    voiceToggle: $("voiceToggle"),
    voicePopover: $("voicePopover"),
    voiceClose: $("voiceClose"),
    voiceSelect: $("voiceSelect"),
    voicePreview: $("voicePreview"),
    diffGroup: $("diffGroup"),
    levelSelect: $("levelSelect"),
    packCount: $("packCount"),
    score: $("score"),
    correct: $("correct"),
    correctStat: $("correctStat"),
    rewardProgress: $("rewardProgress"),
    rewardTrack: $("rewardTrack"),
    rewardCount: $("rewardCount"),
    combo: $("combo"),
    comboStat: $("comboStat"),
    level: $("level"),
    pile: $("pile"),
    pileStat: $("pileStat"),
    pileFill: $("pileFill"),
    time: $("time"),
    heard: $("heard"),
    praise: $("praise"),
    toast: $("toast"),
    bestLine: $("bestLine"),
    speechNote: $("speechNote"),
    finalScore: $("finalScore"),
    finalCleared: $("finalCleared"),
    finalCombo: $("finalCombo"),
    finalTime: $("finalTime"),
    recordLine: $("recordLine"),
    missedList: $("missedList"),
  };

  const rewardNodes = [...document.querySelectorAll(".reward-node")];

  const state = {
    phase: "menu", // menu | playing | paused | over
    words: [],
    settled: [],
    bag: [],
    pool: [],
    categories: [],
    categoryId: "core",
    difficulty: 0,
    band: "all",
    voiceChoice: readString(VOICE_KEY, "auto"),
    voicePreviewTimer: 0,
    lastWord: "",
    score: 0,
    combo: 0,
    bestCombo: 0,
    cleared: 0,
    missed: 0,
    missedWords: [],
    newRecord: false,
    lastEffect: null,
    elapsed: 0,
    level: 1,
    spawnTimer: 0.8,
    lastFrame: 0,
    raf: 0,
    highScore: readNumber(HS_KEY, 0),
    muted: readString(MUTE_KEY, "0") === "1",
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
    speechPhrasesSupported: null,
    speechPhraseError: "",
    speechNoSpeech: false,
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
    rewardProgress: 0,
    rewardBarTimer: 0,
    rewardTickTimer: 0,
    lastFieldH: 0,
    lastFieldW: 0,
  };

  let effectBag = [];
  let helpVoice = null;
  let helpPitch = 1;
  let helpRate = 0.92;
  let voiceCatalog = [];

  /* ------------------------------------------------------------------ */
  /* utilities                                                           */
  /* ------------------------------------------------------------------ */

  function readNumber(key, fallback) {
    try {
      const n = Number(localStorage.getItem(key));
      return Number.isFinite(n) && n > 0 ? n : fallback;
    } catch {
      return fallback;
    }
  }

  function readString(key, fallback) {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  function hueFor(word) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    return ACCENT_HUES[hash % ACCENT_HUES.length];
  }

  function nextWord() {
    if (!state.bag.length) {
      const pool = state.pool.length ? state.pool : WORD_BANK;
      state.bag = shuffle(pool.slice());
    }
    let word = state.bag.pop();
    if (word === state.lastWord && state.bag.length) {
      const alt = state.bag.pop();
      state.bag.push(word);
      word = alt;
    }
    state.lastWord = word;
    return word;
  }

  function uniqueWords(words) {
    const seen = new Set();
    const result = [];
    for (const word of words) {
      const key = word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(word);
      }
    }
    return result;
  }

  function buildCategories() {
    const coreLevels = { 1: [], 2: [], 3: [] };
    for (const word of WORD_BANK) {
      const bucket = word.length <= 4 ? 1 : word.length <= 6 ? 2 : 3;
      coreLevels[bucket].push(word);
    }

    const categories = [
      {
        id: "core",
        icon: "✦",
        nameKey: "cat.core",
        education: false,
        group: "themes",
        levels: coreLevels,
      },
    ];

    for (const category of LEXICON) {
      if (!category || !category.id || !category.levels) continue;
      categories.push({ ...category, education: false, group: "themes" });
    }

    for (const category of EDUCATION) {
      if (!category || !category.id || !Array.isArray(category.bands)) continue;
      categories.push({ ...category, education: true, group: category.group || "education" });
    }

    for (const category of FAMILIES) {
      if (!category || !category.id || !Array.isArray(category.bands)) continue;
      categories.push({ ...category, education: true, group: category.group || "families" });
    }

    for (const category of PHRASES) {
      if (!category || !category.id || !Array.isArray(category.bands)) continue;
      categories.push({ ...category, education: true, group: category.group || "phrases" });
    }
    return categories;
  }

  function getSelectedCategory() {
    return state.categories.find((category) => category.id === state.categoryId) || state.categories[0];
  }

  function getSelectedPool() {
    const category = getSelectedCategory();
    if (!category) return WORD_BANK.slice();

    let words = [];
    if (Array.isArray(category.bands)) {
      const bands =
        state.band && state.band !== "all"
          ? category.bands.filter((band) => band.id === state.band)
          : category.bands;
      for (const band of bands) words = words.concat(band.words || []);
    } else {
      const levels = category.levels || {};
      if (state.difficulty > 0) {
        words = levels[state.difficulty] || [];
      } else {
        for (const level of [1, 2, 3]) words = words.concat(levels[level] || []);
      }
    }

    let pool = uniqueWords(words);
    if (!pool.length) {
      const fallback = Array.isArray(category.bands)
        ? category.bands.flatMap((band) => band.words || [])
        : [];
      pool = uniqueWords(fallback.length ? fallback : WORD_BANK);
    }
    return pool;
  }

  function renderCategoryOptions() {
    if (!els.categorySelect) return;
    const select = els.categorySelect;
    select.replaceChildren();

    const groups = [
      { key: "education", labelKey: "group.education" },
      { key: "families", labelKey: "group.families" },
      { key: "phrases", labelKey: "group.phrases" },
      { key: "themes", labelKey: "group.themes" },
    ];

    for (const group of groups) {
      const categories = state.categories.filter(
        (category) =>
          (category.group || (category.education ? "education" : "themes")) === group.key,
      );
      if (!categories.length) continue;

      const optgroup = document.createElement("optgroup");
      optgroup.label = tr(group.labelKey);
      for (const category of categories) {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = `${category.icon} ${tr(category.nameKey)}`;
        optgroup.appendChild(option);
      }
      select.appendChild(optgroup);
    }
    select.value = state.categoryId;
  }

  function renderLevelOptions(category) {
    if (!els.levelSelect) return;
    els.levelSelect.replaceChildren();
    if (!category || !Array.isArray(category.bands) || category.bands.length <= 1) return;

    const addOption = (value, labelKey) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = tr(labelKey);
      els.levelSelect.appendChild(option);
    };

    addOption("all", "band.all");
    for (const band of category.bands) addOption(band.id, band.labelKey);
  }

  function updatePackUI() {
    if (!els.categorySelect || !els.diffGroup || !els.levelSelect) return;
    const category = getSelectedCategory();
    const banded = Boolean(category && Array.isArray(category.bands));
    const showLevel = banded && category.bands.length > 1;

    els.categorySelect.value = state.categoryId;
    els.diffGroup.classList.toggle("is-hidden", banded);
    els.levelSelect.classList.toggle("is-hidden", !showLevel);

    const controls = els.categorySelect.closest(".pack-controls");
    if (controls) controls.classList.toggle("single", banded && !showLevel);

    if (banded) {
      const validBand =
        state.band === "all" || category.bands.some((band) => band.id === state.band);
      if (!validBand) state.band = "all";
      if (showLevel) {
        renderLevelOptions(category);
        els.levelSelect.value = state.band;
      }
    } else {
      renderLevelOptions(null);
    }

    els.diffGroup.querySelectorAll("[data-level]").forEach((button) => {
      const level = Number(button.dataset.level);
      const active = level === state.difficulty;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const count = getSelectedPool().length;
    const countKey = category && category.countKey ? category.countKey : "pack.count";
    setText(els.packCount, tr(countKey, { count: formatNumber(count) }));

    if (els.packSummary && category) {
      let modeKey = "difficulty.all";
      if (banded) {
        const band = category.bands.find((item) => item.id === state.band);
        modeKey = state.band !== "all" && band ? band.labelKey : "difficulty.all";
      } else if (state.difficulty > 0) {
        modeKey = `difficulty.${state.difficulty}`;
      }
      setText(els.packSummary, `${tr(category.nameKey)} · ${tr(modeKey)}`);
    }
  }

  function savePackSelection() {
    try {
      localStorage.setItem(PACK_KEY, state.categoryId);
      localStorage.setItem(LEVEL_KEY, String(state.difficulty));
      localStorage.setItem(BAND_KEY, state.band);
    } catch {}
  }

  function loadPackSelection() {
    state.categories = buildCategories();

    const savedCategory = readString(PACK_KEY, "core");
    state.categoryId = state.categories.some((category) => category.id === savedCategory)
      ? savedCategory
      : "core";

    const savedLevel = Number(readString(LEVEL_KEY, "0"));
    state.difficulty =
      Number.isInteger(savedLevel) && savedLevel >= 0 && savedLevel <= 3 ? savedLevel : 0;

    state.band = readString(BAND_KEY, "all") || "all";
    const category = getSelectedCategory();
    if (category && Array.isArray(category.bands)) {
      const validBand =
        state.band === "all" || category.bands.some((band) => band.id === state.band);
      if (!validBand) state.band = "all";
    }

    state.pool = getSelectedPool();
  }

  function onCategoryChange() {
    const next = els.categorySelect.value;
    const category = state.categories.find((item) => item.id === next);
    if (!category) return;
    state.categoryId = next;

    if (Array.isArray(category.bands)) {
      const validBand =
        state.band === "all" || category.bands.some((band) => band.id === state.band);
      if (!validBand) state.band = "all";
    }

    state.pool = getSelectedPool();
    savePackSelection();
    updatePackUI();
  }

  function onLevelChange() {
    const category = getSelectedCategory();
    if (!category || !Array.isArray(category.bands)) return;
    const next = els.levelSelect.value;
    if (next !== "all" && !category.bands.some((band) => band.id === next)) return;
    state.band = next;
    state.pool = getSelectedPool();
    savePackSelection();
    updatePackUI();
  }

  function onDifficultyClick(button) {
    const level = Number(button.dataset.level);
    if (!Number.isInteger(level) || level < 0 || level > 3) return;
    state.difficulty = level;
    state.pool = getSelectedPool();
    savePackSelection();
    updatePackUI();
  }

  function showPanel(panel) {
    els.overlay.classList.remove("hidden");
    for (const p of [els.startPanel, els.pausePanel, els.overPanel]) {
      p.classList.toggle("hidden", p !== panel);
    }
  }

  function hideOverlay() {
    els.overlay.classList.add("hidden");
  }

  /* ------------------------------------------------------------------ */
  /* audio                                                               */
  /* ------------------------------------------------------------------ */

  function audio() {
    if (state.muted) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!state.audioCtx) {
      state.audioCtx = new Ctx();
      const master = state.audioCtx.createGain();
      master.gain.value = 1;
      if (typeof state.audioCtx.createDynamicsCompressor === "function") {
        const compressor = state.audioCtx.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 24;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.22;
        master.connect(compressor).connect(state.audioCtx.destination);
      } else {
        master.connect(state.audioCtx.destination);
      }
      state.masterGain = master;
    }
    if (state.audioCtx.state === "suspended") state.audioCtx.resume().catch(() => {});
    return state.audioCtx;
  }

  function soundOut(ctx) {
    return state.masterGain || ctx.destination;
  }

  // Safari infers the iOS audio-session category from the APIs a page uses.
  // Declaring it explicitly keeps the microphone and the loudspeaker on the
  // same route instead of letting iOS fall back to the quiet receiver route.
  function setAudioSession(type) {
    if (!IS_IOS) return;
    const session = navigator.audioSession;
    if (!session) return;
    try {
      if (session.type !== type) session.type = type;
    } catch {}
  }

  function tone(freq, duration, type = "sine", volume = 0.04, delay = 0, slideTo = null) {
    const ctx = audio();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume * AUDIO_BOOST, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(soundOut(ctx));
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function noiseBurst(duration = 0.09, volume = 0.03, delay = 0) {
    const ctx = audio();
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 800;
    const gain = ctx.createGain();
    gain.gain.value = volume * AUDIO_BOOST;
    src.connect(filter).connect(gain).connect(soundOut(ctx));
    src.start(ctx.currentTime + delay);
  }

  function playPop() {
    noiseBurst(0.14, 0.035);
    tone(180, 0.18, "sine", 0.055, 0, 62);
    tone(920, 0.09, "triangle", 0.025, 0.01, 1500);
    tone(1560, 0.07, "sine", 0.012, 0.04, 2100);
  }

  function playMiss() {
    tone(140, 0.18, "sine", 0.05, 0, 72);
    tone(260, 0.12, "triangle", 0.018, 0.06, 180);
    noiseBurst(0.05, 0.018);
  }

  function whoosh(duration = 0.35, from = 300, to = 1800, volume = 0.03) {
    const ctx = audio();
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.1;
    const start = ctx.currentTime;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), start + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume * AUDIO_BOOST, start + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    src.connect(filter).connect(gain).connect(soundOut(ctx));
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  function playCrack() {
    noiseBurst(0.07, 0.03);
    tone(1180, 0.035, "square", 0.022);
    tone(520, 0.06, "square", 0.02, 0.05);
  }

  function playFly() {
    whoosh(0.38, 260, 2200, 0.035);
    tone(520, 0.28, "sine", 0.022, 0, 1240);
  }

  function playDrop() {
    tone(620, 0.3, "sine", 0.04, 0, 110);
    tone(170, 0.12, "triangle", 0.03, 0.24);
    whoosh(0.22, 800, 200, 0.02);
  }

  function playSpin() {
    tone(660, 0.09, "triangle", 0.028);
    tone(880, 0.09, "triangle", 0.028, 0.07);
    tone(1320, 0.12, "triangle", 0.03, 0.14);
    tone(1760, 0.16, "sine", 0.02, 0.22);
  }

  function playEffect(effect) {
    if (effect === "crack") playCrack();
    else if (effect === "fly") playFly();
    else if (effect === "drop") playDrop();
    else if (effect === "spin") playSpin();
    else playPop();
  }

  function playRewardClear() {
    whoosh(0.55, 160, 3200, 0.045);
    thump(0.02, 0.035);
    tone(523.25, 0.12, "triangle", 0.035, 0.02);
    tone(783.99, 0.13, "triangle", 0.035, 0.12);
    tone(1046.5, 0.16, "triangle", 0.032, 0.24);
    tone(1567.98, 0.3, "sine", 0.025, 0.38);
    sparkleNotes(0.46, 0.018);
    noiseBurst(0.22, 0.025, 0.12);
  }

  function playLevel() {
    sequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.03, 0.075);
    thump(0.01, 0.028);
  }

  function playOver() {
    tone(392, 0.18, "triangle", 0.04);
    tone(330, 0.2, "sawtooth", 0.018, 0.12, 270);
    tone(294, 0.22, "triangle", 0.04, 0.16);
    tone(196, 0.42, "sine", 0.05, 0.34, 140);
    noiseBurst(0.3, 0.015, 0.02);
  }

  function sequence(freqs, type = "triangle", volume = 0.03, step = 0.08, delay = 0) {
    freqs.forEach((freq, index) => {
      tone(freq, step * 1.6, type, volume, delay + index * step);
    });
  }

  function sparkleNotes(delay = 0, volume = 0.018) {
    sequence([1046.5, 1318.5, 1568, 2093], "sine", volume, 0.055, delay);
  }

  function thump(delay = 0, volume = 0.035) {
    tone(132, 0.13, "sine", volume, delay, 55);
    noiseBurst(0.045, volume * 0.45, delay);
  }

  function playStart() {
    sequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.028, 0.085);
    tone(1568, 0.22, "sine", 0.014, 0.28);
  }

  function playPause() {
    sequence([523.25, 440, 349.23], "triangle", 0.024, 0.075);
  }

  function playResume() {
    sequence([349.23, 440, 523.25, 659.25], "triangle", 0.024, 0.07);
  }

  function playBubble() {
    [380, 540, 760].forEach((freq, index) => {
      tone(freq, 0.09, "sine", 0.018, index * 0.045, freq * 1.45);
    });
  }

  function playBoing() {
    tone(170, 0.2, "sine", 0.04, 0, 680);
    tone(680, 0.16, "triangle", 0.018, 0.13, 210);
  }

  function playSqueak() {
    tone(880, 0.07, "square", 0.018, 0, 1500);
    tone(1250, 0.06, "square", 0.016, 0.08, 1900);
  }

  function playSlide() {
    tone(280, 0.38, "sine", 0.025, 0, 1500);
    tone(1500, 0.28, "sine", 0.018, 0.34, 320);
  }

  function playKazoo() {
    tone(310, 0.18, "sawtooth", 0.018, 0, 330);
    tone(330, 0.16, "sawtooth", 0.016, 0.18, 300);
    tone(300, 0.2, "sawtooth", 0.014, 0.36, 260);
  }

  function playRobot() {
    sequence([440, 660, 880, 660, 440], "square", 0.018, 0.055);
  }

  function playRocket() {
    whoosh(0.45, 180, 2600, 0.028);
    tone(240, 0.4, "sawtooth", 0.018, 0, 1200);
  }

  function playDragon() {
    noiseBurst(0.28, 0.02);
    tone(120, 0.35, "sawtooth", 0.025, 0, 55);
    tone(70, 0.3, "square", 0.018, 0.1, 45);
  }

  function playCoin() {
    tone(1046.5, 0.07, "square", 0.02);
    tone(1568, 0.18, "triangle", 0.025, 0.07);
  }

  function playGhost() {
    tone(500, 0.3, "sine", 0.02, 0, 180);
    tone(360, 0.32, "triangle", 0.016, 0.1, 120);
  }

  function playCat() {
    tone(640, 0.12, "triangle", 0.02, 0, 1100);
    tone(980, 0.18, "triangle", 0.018, 0.12, 560);
  }

  function playDog() {
    noiseBurst(0.04, 0.015);
    tone(190, 0.09, "square", 0.022);
    tone(145, 0.1, "square", 0.018, 0.12);
  }

  function playSparkle() {
    sparkleNotes(0, 0.018);
    tone(2637, 0.2, "sine", 0.012, 0.2);
  }

  function playMystery() {
    sequence([392, 466.16, 554.37, 659.25], "sine", 0.018, 0.09);
    tone(784, 0.3, "sine", 0.014, 0.36, 523.25);
  }

  function playFanfare() {
    sequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.03, 0.08);
    thump(0.02, 0.028);
  }

  function playGolden() {
    playFanfare();
    playCoin();
    sparkleNotes(0.22, 0.014);
  }

  function playCombo(combo) {
    const notes = combo >= 10 ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99];
    sequence(notes, "triangle", 0.026, 0.06);
    thump(0, 0.022);
  }

  function playSecret() {
    sequence([523.25, 659.25, 783.99, 1046.5, 1318.5, 1568], "sine", 0.022, 0.055);
    noiseBurst(0.18, 0.015, 0.1);
  }

  function playNamedSound(name) {
    if (name === "boing") playBoing();
    else if (name === "squeak") playSqueak();
    else if (name === "slide") playSlide();
    else if (name === "kazoo") playKazoo();
    else if (name === "bubble") playBubble();
    else if (name === "robot") playRobot();
    else if (name === "rocket") playRocket();
    else if (name === "dragon") playDragon();
    else if (name === "coin") playCoin();
    else if (name === "ghost") playGhost();
    else if (name === "cat") playCat();
    else if (name === "dog") playDog();
    else if (name === "sparkle") playSparkle();
    else if (name === "mystery") playMystery();
    else if (name === "fanfare") playFanfare();
    else if (name === "secret") playSecret();
  }

  function playWordEasterEgg(word, cx, cy) {
    const entry = WORD_EASTER_EGGS[word.toLowerCase()];
    if (!entry) return false;
    playNamedSound(entry[0]);
    spawnEmojiBurst({ emoji: entry[1] }, cx, cy);
    return true;
  }

  function maybeSurprise(cx, cy) {
    const now = performance.now();
    if (now - state.lastSurpriseAt < 7000) return false;
    if (Math.random() > 0.12) return false;
    state.lastSurpriseAt = now;
    const [sound, emoji] = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
    playNamedSound(sound);
    spawnEmojiBurst({ emoji }, cx, cy);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* game flow                                                           */
  /* ------------------------------------------------------------------ */

  function resetGame() {
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.lastSurpriseAt = 0;
    clearFocus();
    stopHelpSpeech();
    hideHeard();
    hidePraise();
    hideToast();
    for (const w of state.words) w.el.remove();
    for (const s of state.settled) s.el.remove();
    state.words = [];
    state.settled = [];
    state.bag = shuffle((state.pool.length ? state.pool : WORD_BANK).slice());
    state.lastWord = "";
    syncSpeechPhrases();
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.cleared = 0;
    state.missed = 0;
    state.missedWords = [];
    state.newRecord = false;
    state.lastEffect = null;
    state.elapsed = 0;
    state.level = 1;
    state.spawnTimer = 0.85;
    state.lastFrame = 0;
    state.lastHud = {};
    els.pileFill.style.height = "0%";
    els.wordLayer.replaceChildren();
    els.fxLayer.replaceChildren();
    els.field.classList.remove("danger", "shake");
    els.typeInput.value = "";
    els.typeInput.classList.remove("wrong");
    els.correctStat.classList.remove("reward");
    resetRewardProgress();
    updateHUD(true);
  }

  let setupOpener = null;
  let mascotTaps = 0;
  let mascotTapTimer = 0;

  function syncPhaseClass() {
    document.body.classList.remove("phase-menu", "phase-playing", "phase-paused", "phase-over");
    document.body.classList.add(`phase-${state.phase}`);
  }

  function openSetup(section = "pack") {
    if (!els.setupSheet) return;
    setupOpener = section === "parent" ? els.setupBtn : els.packBtn;
    els.setupSheet.classList.remove("is-hidden");
    els.setupSheet.setAttribute("aria-hidden", "false");
    const card = els.setupSheet.querySelector(".setup-card");
    const target = section === "parent" ? els.setupParentSection : els.setupPackSection;
    if (card) card.scrollTop = target ? Math.max(0, target.offsetTop - 12) : 0;
    window.setTimeout(() => {
      if (els.setupClose && !els.setupSheet.classList.contains("is-hidden")) {
        els.setupClose.focus({ preventScroll: true });
      }
    }, 0);
  }

  function closeSetup() {
    if (!els.setupSheet || els.setupSheet.classList.contains("is-hidden")) return;
    els.setupSheet.classList.add("is-hidden");
    els.setupSheet.setAttribute("aria-hidden", "true");
    if (setupOpener && document.contains(setupOpener) && !setupOpener.classList.contains("is-hidden")) {
      setupOpener.focus({ preventScroll: true });
    }
  }

  function maybeShowIntro() {
    if (!els.playSteps) return;
    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_KEY) === "1";
    } catch {}
    if (seen) return;
    els.playSteps.classList.add("is-intro");
    window.setTimeout(() => {
      els.playSteps.classList.remove("is-intro");
      try {
        localStorage.setItem(INTRO_KEY, "1");
      } catch {}
    }, 3200);
  }

  function setAmbientRunning(running) {
    if (window.PiuAmbient && typeof window.PiuAmbient.setRunning === "function") {
      window.PiuAmbient.setRunning(running);
    }
  }

  function startGame() {
    closeVoicePopover();
    closeSetup();
    audio();
    playStart();
    state.pool = getSelectedPool();
    resetGame();
    state.phase = "playing";
    syncPhaseClass();
    window.dispatchEvent(new CustomEvent("piupiu:roundstart"));
    hideOverlay();
    setAmbientRunning(true);
    els.pauseBtn.disabled = false;
    updatePauseButton();
    state.lastFrame = 0;
    state.raf = requestAnimationFrame(frame);
    if (state.micEnabled) startSpeech();
    updateMicUI();
    els.typeInput.blur();
    toast(tr("toast.start"));
  }

  function frame(timestamp) {
    if (state.phase !== "playing") return;
    if (state.lastFrame && timestamp - state.lastFrame < 1000 / GAME_FPS - 1) {
      state.raf = requestAnimationFrame(frame);
      return;
    }
    if (!state.lastFrame) state.lastFrame = timestamp;
    const dt = Math.min(0.05, Math.max(0, (timestamp - state.lastFrame) / 1000));
    state.lastFrame = timestamp;

    state.elapsed += dt;
    const nextLevel = 1 + Math.floor(state.elapsed / 40);
    if (nextLevel !== state.level) {
      state.level = nextLevel;
      onLevelUp();
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnWord();
      const base = Math.max(1.15, 2.35 - (state.level - 1) * 0.13);
      state.spawnTimer = base * (0.88 + Math.random() * 0.3);
    }

    const fieldH = els.field.clientHeight;
    for (const word of state.words.slice()) {
      if (state.phase !== "playing") break;
      updateWordFace(word, dt);
      moveWord(word, dt, fieldH);
    }

    if (state.phase !== "playing") return;
    updateHUD();
    state.raf = requestAnimationFrame(frame);
  }

  function onLevelUp() {
    playLevel();
    toast(tr("toast.levelUp", { level: state.level }));
  }

  function spawnWord() {
    if (state.phase !== "playing") return;
    if (state.words.length >= 9) return;
    const fieldW = els.field.clientWidth;
    const fieldH = els.field.clientHeight;
    if (!fieldW || !fieldH) return;

    const word = nextWord();
    const golden =
      state.cleared >= 3 &&
      !state.words.some((item) => item.golden) &&
      Math.random() < GOLDEN_CHANCE;
    const el = document.createElement("div");
    el.className = golden ? "word golden" : "word";
    el.style.setProperty("--hue", hueFor(word));
    const span = document.createElement("span");
    span.className = "word-text";
    span.textContent = word;
    el.appendChild(span);

    const emoji = EMOJI[word.toLowerCase()] || "";
    if (emoji) {
      const emojiFace = document.createElement("span");
      emojiFace.className = "word-emoji";
      emojiFace.setAttribute("aria-hidden", "true");
      emojiFace.textContent = emoji;
      el.appendChild(emojiFace);
    }

    if (golden) {
      const badge = document.createElement("span");
      badge.className = "golden-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = "★";
      el.appendChild(badge);
    }

    els.wordLayer.appendChild(el);

    let width = el.offsetWidth;
    let height = el.offsetHeight;
    const maxWordWidth = Math.max(80, fieldW - PAD * 2);
    if (width > maxWordWidth) {
      const currentSize = Number.parseFloat(getComputedStyle(el).fontSize) || 32;
      el.style.fontSize = `${Math.max(10, currentSize * (maxWordWidth / width))}px`;
      width = el.offsetWidth;
      height = el.offsetHeight;
    }

    const maxX = Math.max(PAD, fieldW - width - PAD);
    const x = PAD + Math.random() * Math.max(1, maxX - PAD);

    const fallSeconds = Math.max(3.3, 8.6 - (state.level - 1) * 0.5);
    const speed = fieldH / fallSeconds;
    const obj = {
      word,
      el,
      x,
      y: -height - 8,
      w: width,
      h: height,
      speed,
      emoji,
      golden,
      faceTimer: 1,
      showEmoji: false,
    };
    el.style.transform = `translate3d(${x}px, ${obj.y}px, 0)`;
    state.words.push(obj);
    syncSpeechPhrases();
  }

  function updateWordFace(word, dt) {
    if (!word.emoji) return;
    word.faceTimer -= dt;
    if (word.faceTimer > 0) return;
    word.faceTimer += 1;
    word.showEmoji = !word.showEmoji;
    word.el.classList.toggle("show-emoji", word.showEmoji);
  }

  function moveWord(word, dt, fieldH) {
    word.y += word.speed * dt;
    const bottom = word.y + word.h;
    let landing = fieldH - word.h - 3;
    let hit = false;

    for (const settled of state.settled) {
      const overlapsX =
        word.x + word.w - 2 > settled.x + 1 && word.x + 2 < settled.x + settled.w - 1;
      if (!overlapsX) continue;
      if (bottom >= settled.y && word.y < settled.y + settled.h) {
        const candidate = settled.y - word.h - 2;
        if (candidate < landing) landing = candidate;
        hit = true;
      }
    }

    if (hit || bottom >= landing) {
      settleWord(word, landing);
      return;
    }

    word.el.style.transform = `translate3d(${word.x}px, ${word.y}px, 0)`;
  }

  function settleWord(word, y) {
    const index = state.words.indexOf(word);
    if (index === -1) return;
    if (state.focusedWord === word) clearFocus();
    state.words.splice(index, 1);
    syncSpeechPhrases();

    const finalY = Math.max(0, y);
    word.y = finalY;
    word.showEmoji = false;
    word.golden = false;
    word.el.classList.remove("show-emoji", "golden");
    const goldenBadge = word.el.querySelector(".golden-badge");
    if (goldenBadge) goldenBadge.remove();
    word.el.classList.add("settled", "miss");
    word.el.style.transform = `translate3d(${word.x}px, ${finalY}px, 0)`;
    window.setTimeout(() => word.el.classList.remove("miss"), 340);

    state.settled.push({
      word: word.word,
      el: word.el,
      x: word.x,
      y: finalY,
      w: word.w,
      h: word.h,
    });

    state.combo = 0;
    state.missed += 1;
    state.missedWords.unshift(word.word);
    if (state.missedWords.length > 60) state.missedWords.length = 60;

    playMiss();
    shakeField();
    updateHUD(true);

    if (y <= DANGER_Y) endGame();
  }

  function shakeField() {
    els.field.classList.remove("shake");
    void els.field.offsetWidth;
    els.field.classList.add("shake");
    window.setTimeout(() => els.field.classList.remove("shake"), 340);
  }

  function endGame() {
    if (state.phase === "over") return;
    state.phase = "over";
    syncPhaseClass();
    stopHelpSpeech();
    clearFocus();
    stopSpeech();
    setAmbientRunning(false);
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    hidePraise();
    els.pauseBtn.disabled = true;
    updatePauseButton();

    const isRecord = state.score > state.highScore;
    state.newRecord = isRecord;
    if (isRecord) {
      state.highScore = state.score;
      try {
        localStorage.setItem(HS_KEY, String(state.highScore));
      } catch {}
    }

    renderOverPanel();
    renderBestLine();
    updateHUD(true);
    updateMicUI();
    showPanel(els.overPanel);
    playOver();
  }

  function pauseGame() {
    if (state.phase !== "playing") return;
    state.phase = "paused";
    syncPhaseClass();
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    stopHelpSpeech();
    clearFocus();
    stopSpeech();
    setAmbientRunning(false);
    playPause();
    updatePauseButton();
    updateMicUI();
    showPanel(els.pausePanel);
  }

  function resumeGame() {
    if (state.phase !== "paused") return;
    state.phase = "playing";
    syncPhaseClass();
    hideOverlay();
    setAmbientRunning(true);
    playResume();
    updatePauseButton();
    state.lastFrame = 0;
    state.raf = requestAnimationFrame(frame);
    if (state.micEnabled) startSpeech();
    updateMicUI();
    els.typeInput.blur();
  }

  function goHome() {
    state.phase = "menu";
    syncPhaseClass();
    stopSpeech();
    setAmbientRunning(false);
    resetGame();
    els.pauseBtn.disabled = true;
    updatePauseButton();
    renderBestLine();
    updateMicUI();
    showPanel(els.startPanel);
  }

  /* ------------------------------------------------------------------ */
  /* HUD                                                                 */
  /* ------------------------------------------------------------------ */

  function updateHUD(force = false) {
    setText(els.score, formatNumber(state.score));
    setText(els.correct, String(state.cleared));
    setText(els.combo, `×${state.combo}`);
    setText(els.level, String(state.level));
    setText(els.time, formatTime(state.elapsed));

    const fieldH = els.field.clientHeight || 1;
    let minY = fieldH;
    for (const s of state.settled) minY = Math.min(minY, s.y);
    const pilePct = state.settled.length ? Math.min(100, Math.round(((fieldH - minY) / fieldH) * 100)) : 0;
    setText(els.pile, `${pilePct}%`);

    if (force || state.lastHud.pilePct !== pilePct) {
      els.pileFill.style.height = `${pilePct}%`;
      state.lastHud.pilePct = pilePct;
    }

    const hot = state.combo >= 2;
    if (force || state.lastHud.hot !== hot) {
      els.comboStat.classList.toggle("hot", hot);
      state.lastHud.hot = hot;
    }

    const danger = pilePct >= 68;
    if (force || state.lastHud.danger !== danger) {
      els.pileStat.classList.toggle("danger", danger);
      els.field.classList.toggle("danger", danger);
      state.lastHud.danger = danger;
    }
  }

  function pulseCombo() {
    els.comboStat.classList.remove("pop");
    void els.comboStat.offsetWidth;
    els.comboStat.classList.add("pop");
    window.setTimeout(() => els.comboStat.classList.remove("pop"), 350);
  }

  /* ------------------------------------------------------------------ */
  /* localized dynamic UI                                                */
  /* ------------------------------------------------------------------ */

  function renderBestLine() {
    const score = formatNumber(state.highScore);
    const label = tr("start.bestLabel", { score });
    setText(els.bestLine, tr("start.best", { score }));
    els.bestLine.setAttribute("aria-label", label);
    els.bestLine.setAttribute("title", label);
  }

  function renderMissedList() {
    const uniqueMissed = [...new Set(state.missedWords)].slice(0, 18);
    els.missedList.replaceChildren();
    if (!uniqueMissed.length) {
      const chip = document.createElement("span");
      chip.className = "empty";
      chip.textContent = tr("over.emptyMissed");
      els.missedList.appendChild(chip);
      return;
    }
    for (const miss of uniqueMissed) {
      const chip = document.createElement("span");
      chip.textContent = miss;
      els.missedList.appendChild(chip);
    }
  }

  function renderOverPanel() {
    setText(els.finalScore, formatNumber(state.score));
    setText(els.finalCleared, String(state.cleared));
    setText(els.finalCombo, `×${state.bestCombo}`);
    setText(els.finalTime, formatTime(state.elapsed));
    renderMissedList();
    els.recordLine.classList.toggle("new", state.newRecord);
    els.recordLine.textContent = state.newRecord
      ? tr("over.record")
      : tr("over.best", { score: formatNumber(state.highScore) });
  }

  function updatePauseButton() {
    const paused = state.phase === "paused";
    els.pauseBtn.textContent = paused ? "▶" : "❚❚";
    els.pauseBtn.title = paused ? tr("pause.resumeTitle") : tr("pause.pauseTitle");
    els.pauseBtn.setAttribute("aria-label", paused ? tr("pause.resume") : tr("pause.pause"));
  }

  function setRewardProgress(value, options = {}) {
    if (!els.rewardProgress || !els.rewardTrack || !els.rewardCount) return;
    const { ready = false, tick = false } = options;
    const clamped = Math.max(0, Math.min(5, Math.round(value)));
    state.rewardProgress = clamped;
    els.rewardProgress.style.setProperty("--p", String(clamped / 5));
    els.rewardCount.textContent = `${clamped}/5`;
    els.rewardTrack.setAttribute("aria-valuenow", String(clamped));
    rewardNodes.forEach((node, index) => {
      node.classList.toggle("is-lit", index < clamped);
    });
    els.rewardProgress.classList.toggle("is-ready", Boolean(ready));

    if (tick) {
      window.clearTimeout(state.rewardTickTimer);
      els.rewardProgress.classList.remove("is-tick");
      void els.rewardProgress.offsetWidth;
      els.rewardProgress.classList.add("is-tick");
      state.rewardTickTimer = window.setTimeout(() => {
        els.rewardProgress.classList.remove("is-tick");
        state.rewardTickTimer = 0;
      }, 380);
    }
  }

  function resetRewardProgress() {
    window.clearTimeout(state.rewardBarTimer);
    window.clearTimeout(state.rewardTickTimer);
    state.rewardBarTimer = 0;
    state.rewardTickTimer = 0;
    if (els.rewardProgress) els.rewardProgress.classList.remove("is-tick");
    setRewardProgress(0);
  }

  function advanceRewardProgress() {
    const progress = state.cleared % 5;
    window.clearTimeout(state.rewardBarTimer);
    state.rewardBarTimer = 0;
    if (progress === 0) {
      setRewardProgress(5, { ready: true, tick: true });
      state.rewardBarTimer = window.setTimeout(() => {
        state.rewardBarTimer = 0;
        setRewardProgress(0);
      }, 900);
    } else {
      setRewardProgress(progress, { tick: true });
    }
  }

  function updateMuteUI() {
    els.muteBtn.textContent = state.muted ? "🔇" : "🔊";
    els.muteBtn.setAttribute("aria-pressed", String(state.muted));
    els.muteBtn.title = tr("mute.title");
    els.muteBtn.setAttribute("aria-label", state.muted ? tr("mute.on") : tr("mute.off"));
  }

  function updateSpeechNote() {
    if (!els.speechNote) return;
    const base = SpeechRec ? tr("speech.note.ok") : tr("speech.note.unsupported");
    els.speechNote.textContent = IS_IOS ? `${base} ${tr("speech.note.ios")}` : base;
  }

  function refreshLanguage() {
    updateHUD(true);
    updateMicUI();
    updatePauseButton();
    updateMuteUI();
    renderBestLine();
    renderCategoryOptions();
    updatePackUI();
    renderVoiceOptions();
    updateSpeechNote();
    if (state.phase === "over") renderOverPanel();
    hideHeard();
    hidePraise();
    hideToast();
  }

  /* ------------------------------------------------------------------ */
  /* matching & explosions                                               */
  /* ------------------------------------------------------------------ */

  function normalizeSpeech(text) {
    return text
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z' ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formsFor(word) {
    const base = word.toLowerCase();
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
    if (base.length >= 3 && base.endsWith("y") && !/[aeiou]y$/.test(base)) {
      add(`${base.slice(0, -1)}ies`);
    }
    for (const alias of HOMOPHONES[base] || []) forms.add(alias);
    if (base.includes(" ")) {
      for (const alias of PHRASE_REDUCTIONS[base] || []) add(alias);
      const parts = base.split(" ");
      const trimmed = parts.filter((part) => !OPTIONAL_ARTICLES.has(part));
      if (trimmed.length >= 2 && trimmed.length < parts.length) add(trimmed.join(" "));
    }
    return forms;
  }

  function findMatch(text) {
    if (!text) return null;
    const normalized = normalizeSpeech(text);
    if (!normalized) return null;

    const tokens = normalized.split(" ").filter(Boolean);
    if (!tokens.length) return null;

    const candidates = state.words.slice().sort((a, b) => b.y - a.y);

    // Prefer an exact spelling match before plural / homophone / split-compound
    // matching, so two similar targets are not confused with each other.
    for (const word of candidates) {
      const key = word.word.toLowerCase();
      if (tokens.includes(key) || normalized === key) return word;
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

  function nextEffect() {
    if (!effectBag.length) effectBag = shuffle(EFFECTS.slice());
    return effectBag.pop();
  }

  function cloneWordFace(word, rel) {
    const clone = word.el.cloneNode(true);
    clone.classList.add("fx-face");
    clone.style.left = `${rel.left}px`;
    clone.style.top = `${rel.top}px`;
    clone.style.width = `${rel.width}px`;
    clone.style.height = `${rel.height}px`;
    clone.style.transform = "none";
    clone.style.pointerEvents = "none";
    return clone;
  }

  function spawnSparks(cx, cy, hue, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 34 + Math.random() * 120;
      const spark = document.createElement("div");
      spark.className = "spark";
      spark.style.left = `${cx + (Math.random() - 0.5) * 18}px`;
      spark.style.top = `${cy + (Math.random() - 0.5) * 14}px`;
      spark.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
      spark.style.setProperty("--size", `${3 + Math.random() * 5}px`);
      spark.style.setProperty("--dur", `${0.5 + Math.random() * 0.45}s`);
      spark.style.setProperty("--hue", hue + (Math.random() * 50 - 25));
      addFx(spark);
    }
  }

  function spawnStars(cx, cy, hue, count) {
    for (let i = 0; i < count; i++) {
      const star = document.createElement("div");
      star.className = "fx-star";
      star.textContent = Math.random() > 0.5 ? "✦" : "✧";
      star.style.left = `${cx + (Math.random() - 0.5) * 24}px`;
      star.style.top = `${cy + (Math.random() - 0.5) * 20}px`;
      star.style.setProperty("--size", `${12 + Math.random() * 12}px`);
      star.style.setProperty("--hue", hue + (Math.random() * 60 - 30));
      star.style.setProperty("--dx", `${(Math.random() - 0.5) * 200}px`);
      star.style.setProperty("--dy", `${-30 - Math.random() * 150}px`);
      star.style.setProperty("--rot", `${(Math.random() - 0.5) * 280}deg`);
      addFx(star);
    }
  }

  function spawnStreaks(cx, cy, hue, count) {
    for (let i = 0; i < count; i++) {
      const streak = document.createElement("div");
      streak.className = "fx-streak";
      streak.style.left = `${cx + (Math.random() - 0.5) * 90}px`;
      streak.style.top = `${cy - 20 + (Math.random() - 0.5) * 20}px`;
      streak.style.setProperty("--hue", hue);
      addFx(streak);
    }
  }

  function createFlash(cx, cy, hue) {
    const flash = document.createElement("div");
    flash.className = "fx-flash";
    flash.style.setProperty("--x", `${cx}px`);
    flash.style.setProperty("--y", `${cy}px`);
    flash.style.setProperty("--hue", hue);
    addFx(flash);
  }

  function spawnEmojiBurst(word, cx, cy) {
    if (!word.emoji) return;
    const node = document.createElement("span");
    node.className = "fx-emoji";
    node.textContent = word.emoji;
    node.style.left = `${cx}px`;
    node.style.top = `${cy}px`;
    addFx(node);
  }

  function runEffect(effect, word, rel, wordHue, effectHue) {
    const cx = rel.left + rel.width / 2;
    const cy = rel.top + rel.height / 2;
    createFlash(cx, cy, effectHue);

    if (effect === "crack") {
      const left = cloneWordFace(word, rel);
      left.classList.add("fx-crack-left");
      left.style.setProperty("--fx-hue", effectHue);
      addFx(left);
      const right = cloneWordFace(word, rel);
      right.classList.add("fx-crack-right");
      right.style.setProperty("--fx-hue", effectHue);
      addFx(right);

      const bolt = document.createElement("span");
      bolt.className = "fx-bolt";
      bolt.textContent = "⚡";
      bolt.style.left = `${cx}px`;
      bolt.style.top = `${cy}px`;
      addFx(bolt);
      spawnSparks(cx, cy, effectHue, 10);
      spawnStars(cx, cy, effectHue, 6);
      spawnEmojiBurst(word, cx, cy);
      return;
    }

    if (effect === "fly") {
      const clone = cloneWordFace(word, rel);
      clone.classList.add("fx-fly");
      clone.style.setProperty("--fx-hue", effectHue);
      addFx(clone);
      spawnStreaks(cx, cy, effectHue, 4);
      spawnStars(cx, cy, effectHue, 8);
      spawnEmojiBurst(word, cx, cy);
      return;
    }

    if (effect === "drop") {
      const clone = cloneWordFace(word, rel);
      clone.classList.add("fx-drop");
      clone.style.setProperty("--fx-hue", effectHue);
      addFx(clone);
      spawnStreaks(cx, cy, effectHue, 7);
      spawnSparks(cx, cy, effectHue, 8);
      spawnEmojiBurst(word, cx, cy);
      return;
    }

    if (effect === "spin") {
      const clone = cloneWordFace(word, rel);
      clone.classList.add("fx-spin");
      clone.style.setProperty("--fx-hue", effectHue);
      addFx(clone);
      spawnStars(cx, cy, effectHue, 12);
      spawnEmojiBurst(word, cx, cy);
      return;
    }

    burst(word.el, rel, wordHue);
    spawnStars(cx, cy, effectHue, 6);
    spawnEmojiBurst(word, cx, cy);
  }

  function triggerRewardClear(rel) {
    const fieldH = els.field.clientHeight || 1;
    const cx = rel.left + rel.width / 2;
    const width = Math.max(rel.width + 36, 110);
    const left = cx - width / 2;
    const right = cx + width / 2;
    const top = Math.max(8, rel.top + rel.height / 2);

    const targets = state.settled.filter((settled) => {
      const sx = settled.x + settled.w / 2;
      const sy = settled.y + settled.h / 2;
      return sx >= left && sx <= right && sy >= top;
    });
    const targetSet = new Set(targets);

    for (const target of targets) {
      spawnStars(target.x + target.w / 2, target.y + target.h / 2, 48, 5);
      target.el.remove();
    }
    if (targets.length) {
      state.settled = state.settled.filter((settled) => !targetSet.has(settled));
    }

    const beam = document.createElement("div");
    beam.className = "reward-beam";
    beam.style.left = `${left}px`;
    beam.style.top = `${top}px`;
    beam.style.width = `${width}px`;
    beam.style.height = `${Math.max(60, fieldH - top)}px`;
    addFx(beam);

    spawnStars(cx, top + 24, 48, 18);
    createFlash(cx, top + 24, 48);

    const label = document.createElement("div");
    label.className = "reward-label";
    label.textContent =
      targets.length > 0
        ? tr("reward.clearCount", { count: targets.length })
        : tr("reward.clear");
    label.style.left = `${cx}px`;
    label.style.top = `${Math.min(fieldH - 26, top + 52)}px`;
    addFx(label);

    playRewardClear();
    els.correctStat.classList.remove("reward");
    void els.correctStat.offsetWidth;
    els.correctStat.classList.add("reward");
    window.setTimeout(() => els.correctStat.classList.remove("reward"), 1200);
    updateHUD(true);
  }

  function explodeWord(word) {
    const index = state.words.indexOf(word);
    if (index === -1) return;
    if (state.focusedWord === word) clearFocus();
    state.words.splice(index, 1);
    syncSpeechPhrases();

    const fRect = els.field.getBoundingClientRect();
    const wRect = word.el.getBoundingClientRect();
    const rel = {
      left: wRect.left - fRect.left,
      top: wRect.top - fRect.top,
      width: wRect.width,
      height: wRect.height,
    };
    const cx = rel.left + rel.width / 2;
    const cy = rel.top + rel.height / 2;
    const fieldH = els.field.clientHeight || 1;
    const heightRatio = Math.min(1, Math.max(0, (word.y + word.h / 2) / fieldH));

    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const golden = Boolean(word.golden);
    const basePoints = 10 + Math.round(heightRatio * 10);
    const multiplier = 1 + Math.min(state.combo - 1, 10) * 0.1;
    const points = Math.round(basePoints * multiplier) + (golden ? 25 : 0);
    state.score += points;
    state.cleared += 1;
    advanceRewardProgress();

    const effect = nextEffect();
    state.lastEffect = effect;
    const effectHue = EFFECT_HUES[effect] || hueFor(word.word);
    runEffect(effect, word, rel, hueFor(word.word), effectHue);
    word.el.remove();
    const sub = golden
      ? `🌟${state.combo >= 2 ? ` ×${state.combo}` : ""}`
      : state.combo >= 2
        ? `×${state.combo}`
        : "";
    showFloat(`+${points}`, sub, cx, cy, golden ? "hsl(48 100% 76%)" : `hsl(${effectHue} 100% 78%)`);
    playEffect(effect);
    if (golden) {
      playGolden();
      spawnStars(cx, cy, 48, 18);
      showPraise("easter.golden");
    } else {
      const special = playWordEasterEgg(word.word, cx, cy);
      if (!special) maybeSurprise(cx, cy);
      if (state.combo > 0 && state.combo % 5 === 0) {
        playCombo(state.combo);
        spawnStars(cx, cy, 48, 10);
      }
    }
    pulseCombo();
    updateHUD(true);
    showHeard(tr("heard.correct", { word: word.word }));
    if (!golden) showPraise();
    if (state.cleared % 5 === 0) triggerRewardClear(rel);
  }

  function burst(el, rel, hue) {
    const computed = getComputedStyle(el);
    const fontFamily = computed.fontFamily;
    const fontSize = computed.fontSize;
    const cx = rel.left + rel.width / 2;
    const cy = rel.top + rel.height / 2;

    const ring = document.createElement("div");
    ring.className = "ring";
    ring.style.left = `${cx}px`;
    ring.style.top = `${cy}px`;
    ring.style.setProperty("--hue", hue);
    addFx(ring);

    spawnSparks(cx, cy, hue, 18);

    const textEl = el.querySelector(".word-text");
    const node = textEl && textEl.firstChild;
    if (node && node.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      const letters = [];
      for (let i = 0; i < node.data.length; i++) {
        if (/\s/.test(node.data[i])) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        letters.push({ ch: node.data[i], x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      const fieldRect = els.field.getBoundingClientRect();
      for (const letter of letters) {
        const node2 = document.createElement("span");
        node2.className = "letter";
        node2.textContent = letter.ch;
        node2.style.left = `${letter.x - fieldRect.left}px`;
        node2.style.top = `${letter.y - fieldRect.top}px`;
        node2.style.fontFamily = fontFamily;
        node2.style.fontSize = fontSize;
        node2.style.setProperty("--hue", hue);
        node2.style.setProperty("--dx", `${(Math.random() - 0.5) * 190}px`);
        node2.style.setProperty("--dy", `${-40 - Math.random() * 130}px`);
        node2.style.setProperty("--rot", `${(Math.random() - 0.5) * 240}deg`);
        node2.style.setProperty("--delay", `${Math.random() * 0.04}s`);
        addFx(node2);
      }
    }
  }

  function addFx(node) {
    node.addEventListener("animationend", () => node.remove(), { once: true });
    els.fxLayer.appendChild(node);
  }

  function showFloat(text, sub, x, y, color) {
    const node = document.createElement("div");
    node.className = "float-score";
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    if (color) {
      node.style.color = color;
      node.style.textShadow = `0 0 18px ${color}`;
    }
    node.appendChild(document.createTextNode(text));
    if (sub) {
      const small = document.createElement("small");
      small.textContent = sub;
      node.appendChild(small);
    }
    addFx(node);
  }

  /* ------------------------------------------------------------------ */
  /* help: speak the lowest falling word                                 */
  /* ------------------------------------------------------------------ */

  function lowestFallingWord() {
    let lowest = null;
    for (const word of state.words) {
      if (!lowest || word.y > lowest.y) lowest = word;
    }
    return lowest;
  }

  function clearFocus() {
    if (state.focusTimer) {
      clearTimeout(state.focusTimer);
      state.focusTimer = 0;
    }
    if (state.focusedWord) {
      state.focusedWord.el.classList.remove("focused");
      state.focusedWord = null;
    }
    els.wordLayer.classList.remove("has-focus");
  }

  function focusWord(word) {
    clearFocus();
    state.focusedWord = word;
    word.el.classList.add("focused");
    els.wordLayer.classList.add("has-focus");
    state.focusTimer = window.setTimeout(clearFocus, 3000);
  }

  function voiceValue(voice) {
    return `system:${voice.voiceURI || voice.name}`;
  }

  function scoreVoice(voice) {
    const name = voice.name || "";
    let score = 0;
    if (/premium|enhanced|neural|natural|siri/i.test(name)) score += 100;
    if (/samantha|ava|allison|aria|jenny|guy|michelle|emma|karen|moira|tessa|fiona|daniel|alex|google us english/i.test(name)) score += 50;
    if (voice.localService) score += 25;
    if (/^en[-_]US/i.test(voice.lang)) score += 15;
    else if (/^en[-_]GB/i.test(voice.lang)) score += 10;
    if (NOVELTY_VOICE.test(name)) score -= 200;
    if (CHILD_VOICE.test(name)) score += 8;
    return score;
  }

  function chooseVoice(choice) {
    const best = voiceCatalog[0] || null;
    if (choice.startsWith("system:")) {
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

  function applyVoiceChoice() {
    const picked = chooseVoice(state.voiceChoice);
    helpVoice = picked.voice || null;
    helpPitch = picked.pitch;
    helpRate = picked.rate;
  }

  function renderVoiceOptions() {
    if (!els.voiceSelect) return;
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

  function refreshVoiceCatalog() {
    const synth = window.speechSynthesis;
    if (!synth) {
      if (els.setupVoiceSection) els.setupVoiceSection.classList.add("is-hidden");
      if (els.voiceToggle) els.voiceToggle.classList.add("is-hidden");
      closeVoicePopover();
      return;
    }
    if (els.setupVoiceSection) els.setupVoiceSection.classList.remove("is-hidden");
    if (els.voiceToggle) els.voiceToggle.classList.remove("is-hidden");
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
        try {
          localStorage.setItem(VOICE_KEY, "auto");
        } catch {}
      }
    }

    applyVoiceChoice();
    renderVoiceOptions();
  }

  function openVoicePopover() {
    if (!els.voicePopover || !els.voiceToggle) return;
    renderVoiceOptions();
    els.voicePopover.classList.remove("is-hidden");
    els.voiceToggle.setAttribute("aria-expanded", "true");

    const rect = els.voiceToggle.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const estimatedHeight = 170;
    let top = rect.bottom + 8;
    if (top + estimatedHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - estimatedHeight - 8);
    }
    els.voicePopover.style.width = `${width}px`;
    els.voicePopover.style.left = `${left}px`;
    els.voicePopover.style.top = `${top}px`;
    if (els.voiceSelect) els.voiceSelect.focus({ preventScroll: true });
  }

  function closeVoicePopover() {
    if (!els.voicePopover) return;
    els.voicePopover.classList.add("is-hidden");
    if (els.voiceToggle) els.voiceToggle.setAttribute("aria-expanded", "false");
  }

  function previewVoice() {
    const synth = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
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
    if (IS_IOS && wasSpeaking) window.setTimeout(startSpeak, 60);
    else startSpeak();
  }

  function onVoiceChange() {
    if (!els.voiceSelect) return;
    state.voiceChoice = els.voiceSelect.value;
    try {
      localStorage.setItem(VOICE_KEY, state.voiceChoice);
    } catch {}
    applyVoiceChoice();
    window.clearTimeout(state.voicePreviewTimer);
    state.voicePreviewTimer = window.setTimeout(previewVoice, 260);
  }

  function stopHelpSpeech() {
    state.helpSpeakToken += 1;
    state.helpSpeaking = false;
    state.helpGuardUntil = 0;
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  function speakHelp(word) {
    const synth = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
    if (!synth || !Utterance) {
      toast(tr("help.unsupported"), "warn");
      return;
    }

    const token = ++state.helpSpeakToken;
    state.helpSpeaking = true;
    state.helpWord = word.word;
    state.helpGuardUntil = 0;

    // iOS routes web audio through a quieter record/playback session while
    // SpeechRecognition owns the microphone. Release the mic for the hint so
    // the system voice comes back through the speaker at normal volume.
    const releaseMic = IS_IOS && state.micEnabled;
    const wasSpeaking = Boolean(synth.speaking || synth.pending);
    try {
      synth.cancel();
    } catch {}

    updateMicUI();
    if (releaseMic) {
      stopSpeech();
    } else if (state.micEnabled && !state.listening && !state.speechStarting) {
      startSpeech();
    }

    applyVoiceChoice();
    const utterance = new Utterance(word.word);
    utterance.lang = "en-US";
    utterance.rate = helpRate;
    utterance.pitch = helpPitch;
    utterance.volume = 1;
    if (helpVoice) utterance.voice = helpVoice;

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (token !== state.helpSpeakToken) return;
      state.helpSpeaking = false;
      state.helpGuardUntil = performance.now() + 200;
      updateMicUI();
      if (state.phase === "playing" && state.micEnabled && !state.listening && !state.speechStarting) {
        startSpeech();
      }
    };

    utterance.onend = done;
    utterance.onerror = done;

    const startSpeak = () => {
      if (token !== state.helpSpeakToken) return;
      try {
        synth.speak(utterance);
      } catch {
        done();
        toast(tr("help.unsupported"), "warn");
      }
    };

    // A short pause after cancel/abort avoids Safari silently swallowing the
    // next utterance; giving the audio route a moment also restores volume.
    const delay = IS_IOS ? (releaseMic ? 150 : wasSpeaking ? 60 : 0) : 0;
    if (delay) window.setTimeout(startSpeak, delay);
    else startSpeak();

    window.setTimeout(() => {
      if (token === state.helpSpeakToken && state.helpSpeaking) done();
    }, 4000);
  }

  function triggerHelp() {
    if (state.phase !== "playing") return;
    const word = lowestFallingWord();
    if (!word) {
      toast(tr("help.empty"), "warn");
      return;
    }
    focusWord(word);
    showHeard(tr("help.listen", { word: word.word }));
    speakHelp(word);
  }

  function setupHelp() {
    if (!window.speechSynthesis) {
      if (els.setupVoiceSection) els.setupVoiceSection.classList.add("is-hidden");
      if (els.voiceToggle) els.voiceToggle.classList.add("is-hidden");
      closeVoicePopover();
      return;
    }
    refreshVoiceCatalog();
    window.speechSynthesis.onvoiceschanged = refreshVoiceCatalog;
  }

  /* ------------------------------------------------------------------ */
  /* speech recognition                                                  */
  /* ------------------------------------------------------------------ */

  function syncSpeechPhrases() {
    const recognition = state.speech;
    if (!recognition) return;
    if (state.speechPhrasesSupported === false) return;
    if (!("phrases" in recognition)) {
      state.speechPhrasesSupported = false;
      return;
    }
    const Phrase = window.SpeechRecognitionPhrase;
    if (typeof Phrase !== "function") {
      state.speechPhrasesSupported = false;
      return;
    }
    // Chrome's cloud recognizer reports phrases-not-supported. Contextual
    // biasing is only safe when the recognizer is running on-device.
    if (recognition.processLocally !== true) {
      state.speechPhrasesSupported = false;
      return;
    }

    const targets = new Map();
    for (const word of state.words) targets.set(word.word, 4);
    // The bag's tail is what nextWord() will spawn next; bias upcoming targets
    // even if the browser only applies the phrase list when recognition starts.
    if (state.phase === "playing") {
      for (const word of state.bag.slice(-5)) {
        if (!targets.has(word)) targets.set(word, 2);
      }
    }
    const key = [...targets.keys()].join("\u0001");
    if (key === state.speechPhraseKey) return;
    state.speechPhraseKey = key;

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

  function setupSpeech() {
    if (!SpeechRec) return;
    try {
      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;
      state.speechPhrasesSupported =
        "phrases" in recognition &&
        typeof window.SpeechRecognitionPhrase === "function" &&
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
        syncSpeechPhrases();
        updateMicUI();
      };

      recognition.onaudiostart = () => {
        if (!state.speechMetrics.lastSpeechStart) {
          state.speechMetrics.lastSpeechStart = performance.now();
        }
      };

      recognition.onspeechstart = () => {
        state.speechMetrics.lastSpeechStart = performance.now();
        state.speechMetrics.firstInterim = null;
      };

      recognition.onspeechend = () => {
        updateMicUI();
      };

      recognition.onresult = (event) => {
        if (state.phase !== "playing") return;
        if (state.helpSpeaking) return;
        const now = performance.now();
        const guardHelpEcho = state.helpGuardUntil > now;
        const helpKey = guardHelpEcho ? normalizeSpeech(state.helpWord) : "";
        const metrics = state.speechMetrics;
        state.speechNoSpeech = false;
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
            if (guardHelpEcho && normalizeSpeech(transcript) === helpKey) continue;
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
          explodeWord(bestHit);
          return;
        }

        if (latest) {
          if (metrics.lastSpeechStart) metrics.lastResultLatency = Math.round(now - metrics.lastSpeechStart);
          showHeard(tr("heard.prefix", { text: latest }));
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
            !state.restartTimer
          ) {
            state.restartTimer = window.setTimeout(() => {
              state.restartTimer = 0;
              if (state.phase === "playing" && state.micEnabled && !state.listening && !state.helpSpeaking) {
                startSpeech();
              }
            }, 90);
          }
          return;
        }
        handleSpeechError(event.error);
      };

      recognition.onend = () => {
        state.listening = false;
        state.speechStarting = false;
        updateMicUI();
        if (state.phase === "playing" && state.micEnabled && !state.helpSpeaking && !state.restartTimer) {
          const delay = state.speechNoSpeech ? 260 : 90;
          state.speechNoSpeech = false;
          state.restartTimer = window.setTimeout(() => {
            state.restartTimer = 0;
            if (state.phase === "playing" && state.micEnabled && !state.listening && !state.helpSpeaking) {
              startSpeech();
            }
          }, delay);
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

  function startSpeech() {
    if (!state.speech || !state.micEnabled) return;
    if (state.listening || state.speechStarting) return;
    setAudioSession("play-and-record");
    syncSpeechPhrases();
    state.speechStarting = true;
    try {
      state.speech.start();
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
          state.restartTimer = window.setTimeout(() => {
            state.restartTimer = 0;
            if (state.phase === "playing" && state.micEnabled && !state.listening && !state.helpSpeaking) {
              startSpeech();
            }
          }, 140);
        }
      } else if (err) {
        console.warn("Could not start speech recognition:", err);
      }
    }
  }

  function stopSpeech() {
    if (state.restartTimer) {
      clearTimeout(state.restartTimer);
      state.restartTimer = 0;
    }
    state.speechStarting = false;
    state.speechStartRetries = 0;
    state.speechNoSpeech = false;
    if (state.speech) {
      try {
        state.speech.abort();
      } catch {}
    }
    state.listening = false;
    setAudioSession("playback");
    updateMicUI();
  }

  function handleSpeechError(code) {
    if (code === "no-speech") {
      state.speechNoSpeech = true;
      return;
    }
    if (code === "aborted") return;
    if (code === "not-allowed" || code === "service-not-allowed") {
      state.micEnabled = false;
      state.listening = false;
      state.speechError = true;
      updateMicUI();
      toast(tr("toast.micDenied"), "warn");
      return;
    }
    if (code === "audio-capture") {
      state.micEnabled = false;
      state.listening = false;
      state.speechError = true;
      updateMicUI();
      toast(tr("toast.noMic"), "warn");
      return;
    }
    if (code === "network") {
      state.speechNetworkErrors += 1;
      if (state.speechNetworkErrors >= 2) {
        state.micEnabled = false;
        state.speechError = true;
        stopSpeech();
        toast(tr("toast.speechOffline"), "warn");
      } else {
        toast(tr("toast.speechNetwork"), "warn");
      }
      return;
    }
    console.warn("Speech recognition error:", code);
  }

  function updateMicUI() {
    if (!SpeechRec) {
      els.micBtn.disabled = true;
      els.micBtn.classList.add("off");
      els.micBtn.classList.remove("listening", "error");
      els.micLabel.textContent = tr("mic.keyboard");
      els.micBtn.setAttribute("aria-pressed", "false");
      return;
    }

    const active = state.listening && state.phase === "playing";
    els.micBtn.classList.toggle("listening", active);
    els.micBtn.classList.toggle("off", !state.micEnabled);
    els.micBtn.classList.toggle("error", state.micEnabled && state.speechError);
    els.micBtn.setAttribute("aria-pressed", String(state.micEnabled));

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

  /* ------------------------------------------------------------------ */
  /* small UI feedback                                                   */
  /* ------------------------------------------------------------------ */

  function toast(message, type = "info") {
    setText(els.toast, message);
    els.toast.classList.toggle("warn", type === "warn");
    els.toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("show");
    }, 2400);
  }

  function hideToast() {
    clearTimeout(state.toastTimer);
    els.toast.classList.remove("show");
    setText(els.toast, "");
  }

  function showHeard(message) {
    setText(els.heard, message);
    els.heard.classList.add("show");
    clearTimeout(state.heardTimer);
    state.heardTimer = window.setTimeout(() => {
      els.heard.classList.remove("show");
    }, 1600);
  }

  function hideHeard() {
    clearTimeout(state.heardTimer);
    els.heard.classList.remove("show");
    setText(els.heard, "");
  }

  function showPraise(keyOverride) {
    if (!els.praise) return;
    const keys = ["praise.1", "praise.2", "praise.3", "praise.4"];
    const key = keyOverride || keys[Math.floor(Math.random() * keys.length)];
    const icon = keyOverride === "easter.golden" ? "🌟" : "⭐";
    setText(els.praise, `${icon} ${tr(key)}`);
    els.praise.classList.add("show");
    clearTimeout(state.praiseTimer);
    state.praiseTimer = window.setTimeout(() => {
      els.praise.classList.remove("show");
    }, 950);
  }

  function hidePraise() {
    clearTimeout(state.praiseTimer);
    els.praise.classList.remove("show");
    setText(els.praise, "");
  }

  function togglePause() {
    if (state.phase === "playing") pauseGame();
    else if (state.phase === "paused") resumeGame();
  }

  function handleTyped(event) {
    event.preventDefault();
    const value = els.typeInput.value.trim();
    if (!value) return;
    if (state.phase !== "playing") {
      const message =
        state.phase === "paused"
          ? tr("toast.continueFirst")
          : state.phase === "over"
            ? tr("toast.gameOverFirst")
            : tr("toast.startFirst");
      toast(message, "warn");
      return;
    }
    const hit = findMatch(value);
    if (hit) {
      els.typeInput.value = "";
      explodeWord(hit);
    } else {
      els.typeInput.classList.remove("wrong");
      void els.typeInput.offsetWidth;
      els.typeInput.classList.add("wrong");
      showHeard(tr("toast.notOnScreen", { word: value }));
      window.setTimeout(() => els.typeInput.classList.remove("wrong"), 320);
    }
  }

  function toggleMic() {
    if (!SpeechRec) {
      toast(tr("toast.unsupported"), "warn");
      return;
    }
    if (state.micEnabled) {
      state.micEnabled = false;
      state.speechError = false;
      stopSpeech();
      toast(tr("toast.speechOff"));
    } else {
      state.micEnabled = true;
      state.speechError = false;
      state.speechNetworkErrors = 0;
      updateMicUI();
      if (state.phase === "playing") startSpeech();
      toast(tr("toast.speechOn"));
    }
  }

  function toggleMute() {
    state.muted = !state.muted;
    try {
      localStorage.setItem(MUTE_KEY, state.muted ? "1" : "0");
    } catch {}
    updateMuteUI();
    if (!state.muted) tone(760, 0.09, "triangle", 0.03);
  }

  /* ------------------------------------------------------------------ */
  /* events                                                              */
  /* ------------------------------------------------------------------ */

  els.startBtn.addEventListener("click", startGame);
  els.restartBtn.addEventListener("click", startGame);
  els.resumeBtn.addEventListener("click", resumeGame);
  els.quitBtn.addEventListener("click", goHome);
  els.homeBtn.addEventListener("click", goHome);
  els.pauseBtn.addEventListener("click", togglePause);
  els.muteBtn.addEventListener("click", toggleMute);
  els.micBtn.addEventListener("click", toggleMic);
  els.typeForm.addEventListener("submit", handleTyped);
  els.categorySelect.addEventListener("change", onCategoryChange);
  els.levelSelect.addEventListener("change", onLevelChange);
  if (els.voiceSelect) els.voiceSelect.addEventListener("change", onVoiceChange);
  if (els.voicePreview) {
    els.voicePreview.addEventListener("click", () => {
      window.clearTimeout(state.voicePreviewTimer);
      state.voicePreviewTimer = 0;
      previewVoice();
    });
  }
  if (els.voiceToggle) {
    els.voiceToggle.addEventListener("click", () => {
      if (els.voicePopover.classList.contains("is-hidden")) openVoicePopover();
      else closeVoicePopover();
    });
  }
  if (els.voiceClose) els.voiceClose.addEventListener("click", closeVoicePopover);
  document.addEventListener("pointerdown", (event) => {
    if (!els.voicePopover || els.voicePopover.classList.contains("is-hidden")) return;
    const target = event.target;
    if (
      target &&
      typeof target.closest === "function" &&
      (target.closest("#voicePopover") || target.closest("#voiceToggle"))
    ) {
      return;
    }
    closeVoicePopover();
  });
  if (els.startMascot) {
    els.startMascot.addEventListener("pointerdown", () => {
      mascotTaps += 1;
      window.clearTimeout(mascotTapTimer);
      if (mascotTaps >= 5) {
        mascotTaps = 0;
        playSecret();
        els.startMascot.classList.add("is-secret");
        if (els.secretNote) {
          els.secretNote.classList.add("show");
          els.secretNote.setAttribute("aria-hidden", "false");
        }
        window.setTimeout(() => els.startMascot.classList.remove("is-secret"), 900);
        window.setTimeout(() => {
          if (els.secretNote) {
            els.secretNote.classList.remove("show");
            els.secretNote.setAttribute("aria-hidden", "true");
          }
        }, 2800);
      } else {
        mascotTapTimer = window.setTimeout(() => {
          mascotTaps = 0;
        }, 1200);
      }
    });
  }

  if (els.packBtn) els.packBtn.addEventListener("click", () => openSetup("pack"));
  if (els.setupBtn) els.setupBtn.addEventListener("click", () => openSetup("parent"));
  if (els.setupClose) els.setupClose.addEventListener("click", closeSetup);
  if (els.setupDone) els.setupDone.addEventListener("click", closeSetup);
  if (els.setupSheet) {
    els.setupSheet.addEventListener("click", (event) => {
      if (event.target === els.setupSheet) closeSetup();
    });
  }

  els.diffGroup.querySelectorAll("[data-level]").forEach((button) => {
    button.addEventListener("click", () => onDifficultyClick(button));
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    if (
      event.key === "Escape" &&
      els.setupSheet &&
      !els.setupSheet.classList.contains("is-hidden")
    ) {
      event.preventDefault();
      closeSetup();
      return;
    }
    if (
      event.key === "Escape" &&
      els.voicePopover &&
      !els.voicePopover.classList.contains("is-hidden")
    ) {
      event.preventDefault();
      closeVoicePopover();
      return;
    }
    if (event.key === "Escape" || (event.key.toLowerCase() === "p" && !typing)) {
      if (state.phase === "playing" || state.phase === "paused") {
        event.preventDefault();
        togglePause();
      }
      return;
    }

    const interactive =
      target && typeof target.closest === "function"
        ? target.closest("button, input, textarea, select, a, [contenteditable='true']")
        : null;
    if ((event.code === "Space" || event.key === " ") && state.phase === "playing" && !interactive) {
      event.preventDefault();
      triggerHelp();
      return;
    }

    if (
      event.key === "Enter" &&
      state.phase === "menu" &&
      !typing &&
      target.tagName !== "BUTTON" &&
      target.tagName !== "SELECT"
    ) {
      event.preventDefault();
      startGame();
    }
  });

  els.field.addEventListener("pointerdown", (event) => {
    if (state.phase !== "playing") return;
    if (event.button !== undefined && event.button !== 0) return;
    const target = event.target;
    if (
      target &&
      typeof target.closest === "function" &&
      target.closest("button, input, textarea, select, a, .overlay")
    ) {
      return;
    }
    triggerHelp();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.phase === "playing") pauseGame();
  });

  document.addEventListener("piupiu:langchange", refreshLanguage);

  window.addEventListener("beforeunload", () => {
    stopHelpSpeech();
    stopSpeech();
  });

  window.addEventListener("resize", () => {
    if (els.voicePopover && !els.voicePopover.classList.contains("is-hidden")) {
      openVoicePopover();
    }
  });

  window.addEventListener("resize", () => {
    const fieldW = els.field.clientWidth;
    const fieldH = els.field.clientHeight;
    if (!fieldW || !fieldH) return;

    if (state.lastFieldH && Math.abs(fieldH - state.lastFieldH) > 4) {
      const ratio = fieldH / state.lastFieldH;
      for (const s of state.settled) {
        s.y = Math.max(0, fieldH - (state.lastFieldH - s.y) * ratio);
        s.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
      }
      for (const w of state.words) {
        w.y = Math.min(w.y, fieldH - w.h);
        w.el.style.transform = `translate3d(${w.x}px, ${w.y}px, 0)`;
      }
    }
    for (const item of [...state.words, ...state.settled]) {
      if (item.x + item.w > fieldW - 4) {
        item.x = Math.max(PAD, fieldW - item.w - PAD);
        item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
      }
    }
    state.lastFieldW = fieldW;
    state.lastFieldH = fieldH;
    updateHUD(true);
  });

  /* ------------------------------------------------------------------ */
  /* init                                                                */
  /* ------------------------------------------------------------------ */

  function init() {
    syncPhaseClass();
    loadPackSelection();
    renderCategoryOptions();
    updatePackUI();
    renderBestLine();
    updateMuteUI();

    if (!WORD_BANK.length) {
      console.error("PiuPiu: word bank failed to load");
      toast(tr("toast.wordBank"), "warn");
      updateMicUI();
      updatePauseButton();
      return;
    }

    if (SpeechRec) {
      setupSpeech();
    } else {
      state.micEnabled = false;
    }
    updateSpeechNote();
    setupHelp();

    state.lastFieldW = els.field.clientWidth;
    state.lastFieldH = els.field.clientHeight;
    resetRewardProgress();
    updateHUD(true);
    updateMicUI();
    updatePauseButton();
    maybeShowIntro();
  }

  /* Debug helpers, available with ?debug=1 for automated checks. */
  if (new URLSearchParams(location.search).has("debug")) {
    window.__PIU__ = {
      state,
      startGame,
      pauseGame,
      resumeGame,
      endGame,
      spawnWord,
      settleWord,
      explodeWord,
      findMatch,
      goHome,
      refreshLanguage,
      triggerHelp,
      speakHelp,
      focusWord,
      clearFocus,
      lowestFallingWord,
      getSelectedPool,
      getPack: () => ({
        category: state.categoryId,
        difficulty: state.difficulty,
        band: state.band,
        count: state.pool.length,
        pool: state.pool.slice(),
      }),
      getCategories: () =>
        state.categories.map((category) => ({
          id: category.id,
          nameKey: category.nameKey,
          education: Boolean(category.education),
          group: category.group || (category.education ? "education" : "themes"),
          counts: category.levels
            ? {
                1: (category.levels[1] || []).length,
                2: (category.levels[2] || []).length,
                3: (category.levels[3] || []).length,
              }
            : null,
          bands: category.bands
            ? category.bands.map((band) => ({
                id: band.id,
                labelKey: band.labelKey,
                count: (band.words || []).length,
              }))
            : null,
        })),
      getSpeechStats: () => {
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
      },
      getFalling: () =>
        state.words.map((w) => ({
          word: w.word,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          emoji: w.emoji,
          showEmoji: w.showEmoji,
          golden: Boolean(w.golden),
        })),
      updateWordFace,
      getSettled: () =>
        state.settled.map((s) => ({ word: s.word, x: s.x, y: s.y, w: s.w, h: s.h })),
    };
  }

  init();
})();
