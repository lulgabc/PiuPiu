(() => {
  "use strict";

  const WORD_BANK = Array.isArray(window.PIU_WORDS) ? window.PIU_WORDS.slice() : [];
  const LEXICON = Array.isArray(window.PIU_LEXICON) ? window.PIU_LEXICON.slice() : [];
  const EDUCATION = Array.isArray(window.PIU_EDUCATION) ? window.PIU_EDUCATION.slice() : [];
  const FAMILIES = Array.isArray(window.PIU_FAMILIES) ? window.PIU_FAMILIES.slice() : [];
  const PHRASES = Array.isArray(window.PIU_PHRASES) ? window.PIU_PHRASES.slice() : [];
  const NUMBERS = Array.isArray(window.PIU_NUMBERS) ? window.PIU_NUMBERS.slice() : [];
  const NUMBER_WORDS =
    window.PIU_NUMBER_WORDS && typeof window.PIU_NUMBER_WORDS === "object"
      ? window.PIU_NUMBER_WORDS
      : {};
  const Profiles = window.PiuProfiles && typeof window.PiuProfiles === "object" ? window.PiuProfiles : null;
  const Pets = window.PiuPets && typeof window.PiuPets === "object" ? window.PiuPets : null;
  const CustomPacks =
    window.PiuCustomPacks && typeof window.PiuCustomPacks === "object" ? window.PiuCustomPacks : null;
  const Physics = window.Matter && window.Matter.Engine ? window.Matter : null;
  const EMOJI =
    window.PIU_EMOJI && typeof window.PIU_EMOJI === "object" ? window.PIU_EMOJI : {};
  const EFFECTS = ["explode", "crack", "fly", "drop", "spin"];
  const EFFECT_HUES = { explode: 42, crack: 330, fly: 190, drop: 265, spin: 150 };
  const GOLDEN_CHANCE = 0.045;
  const METEOR_EVERY = 10;
  const METEOR_TARGET = 3; // clear at most three frozen words per meteor
  const METEOR_MAX_FLIGHT = 9000; // safety stop if it keeps missing
  const METEOR_HIT_PAD = 12;
  const METEOR_HIT_COOLDOWN = 0.14;
  const METEOR_SIZE = 46;

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
  const SPEED_KEY = "piupiu.speed";
  const SPEED_LEVELS = { normal: 1, fast: 1.6, turbo: 2.3 };
  const SPEED_ORDER = ["normal", "fast", "turbo"];
  const LEVEL_KEY = "piupiu.level";
  const BAND_KEY = "piupiu.band";
  const VOICE_KEY = "piupiu.voice";
  const THEME_KEY = "piupiu.theme";
  const THEMES = ["candy", "bubblegum", "cream"];
  const THEME_COLORS = { candy: "#0a1024", bubblegum: "#120a24", cream: "#0c1414" };
  const INTRO_KEY = "piupiu.introSeen";
  const MODE_KEY = "piupiu.mode";
  const GAME_MODES = ["rain", "fill", "paint"];
  const MODE_PARAM = new URLSearchParams(location.search).get("mode");
  const INITIAL_MODE = GAME_MODES.includes(MODE_PARAM)
    ? MODE_PARAM
    : GAME_MODES.includes(readString(MODE_KEY, "rain"))
      ? readString(MODE_KEY, "rain")
      : "rain";
  const PAD = 12;
  const DANGER_Y = 10;
  const GAME_FPS = 60;
  const ACCENT_HUES = [265, 190, 318, 42, 158, 225, 288, 12];
  const PET_FALLBACK = {
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
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    paintLayer: $("paintLayer"),
    wordLayer: $("wordLayer"),
    fxLayer: $("fxLayer"),
    petLayer: $("petLayer"),
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
    packSheet: $("packSheet"),
    packClose: $("packClose"),
    packDone: $("packDone"),
    customPackSection: $("customPackSection"),
    customPackQuota: $("customPackQuota"),
    customPackName: $("customPackName"),
    customPackFile: $("customPackFile"),
    customPackChoose: $("customPackChoose"),
    customPackCreate: $("customPackCreate"),
    customPackFileInfo: $("customPackFileInfo"),
    customPackStatus: $("customPackStatus"),
    customPackList: $("customPackList"),
    customPackEmpty: $("customPackEmpty"),
    packTabs: $("packTabs"),
    packCategoryGrid: $("packCategoryGrid"),
    packGroupEmpty: $("packGroupEmpty"),
    packPreviewIcon: $("packPreviewIcon"),
    packPreviewName: $("packPreviewName"),
    packPreviewMeta: $("packPreviewMeta"),
    setupBtn: $("setupBtn"),
    setupSheet: $("setupSheet"),
    setupClose: $("setupClose"),
    setupDone: $("setupDone"),
    setupThemeSection: $("setupThemeSection"),
    setupVoiceSection: $("setupVoiceSection"),
    setupParentSection: $("setupParentSection"),
    themeGroup: $("themeGroup"),
    playSteps: $("playSteps"),
    playStepItems: [...document.querySelectorAll("#playSteps .play-step")],
    stepIcon1: $("stepIcon1"),
    stepLabel1: $("stepLabel1"),
    stepLabel2: $("stepLabel2"),
    stepLabel3: $("stepLabel3"),
    modeSwitch: $("modeSwitch"),
    modeOptions: [...document.querySelectorAll("#modeSwitch [data-mode]")],
    startMascot: $("startMascot"),
    secretNote: $("secretNote"),
    voiceToggle: $("voiceToggle"),
    voicePopover: $("voicePopover"),
    voiceClose: $("voiceClose"),
    voiceSelect: $("voiceSelect"),
    voicePreview: $("voicePreview"),
    diffGroup: $("diffGroup"),
    levelSelect: $("levelSelect"),
    speedBtn: $("speedBtn"),
    speedLabel: $("speedLabel"),
    packCount: $("packCount"),
    score: $("score"),
    correct: $("correct"),
    correctLabel: $("correctLabel"),
    correctStat: $("correctStat"),
    rewardProgress: $("rewardProgress"),
    rewardTrack: $("rewardTrack"),
    rewardCount: $("rewardCount"),
    combo: $("combo"),
    comboStat: $("comboStat"),
    level: $("level"),
    levelLabel: $("levelLabel"),
    pile: $("pile"),
    pileLabel: $("pileLabel"),
    pileStat: $("pileStat"),
    pileFill: $("pileFill"),
    gaugeLabel: $("gaugeLabel"),
    time: $("time"),
    heard: $("heard"),
    praise: $("praise"),
    toast: $("toast"),
    bestLine: $("bestLine"),
    bestLineValue: $("bestLineValue"),
    playerBtn: $("playerBtn"),
    playerAvatar: $("playerAvatar"),
    playerName: $("playerName"),
    playerTotal: $("playerTotal"),
    playerSheet: $("playerSheet"),
    playerClose: $("playerClose"),
    playerDone: $("playerDone"),
    playerForm: $("playerForm"),
    playerFormTitle: $("playerFormTitle"),
    playerList: $("playerList"),
    playerNameInput: $("playerNameInput"),
    playerSubmit: $("playerSubmit"),
    playerSubmitLabel: $("playerSubmitLabel"),
    playerError: $("playerError"),
    avatarPicker: $("avatarPicker"),
    avatarEditNote: $("avatarEditNote"),
    avatarEditText: $("avatarEditText"),
    avatarEditCancel: $("avatarEditCancel"),
    boardBtn: $("boardBtn"),
    boardSheet: $("boardSheet"),
    boardClose: $("boardClose"),
    boardDone: $("boardDone"),
    boardList: $("boardList"),
    boardEmpty: $("boardEmpty"),
    sessionTotal: $("sessionTotal"),
    overBoardBtn: $("overBoardBtn"),
    speechNote: $("speechNote"),
    finalScore: $("finalScore"),
    finalCleared: $("finalCleared"),
    finalCombo: $("finalCombo"),
    finalTime: $("finalTime"),
    overEyebrow: $("overEyebrow"),
    overEyebrowIcon: $("overEyebrowIcon"),
    overTitle: $("overTitle"),
    overTagline: $("overTagline"),
    overScoreLabel: $("overScoreLabel"),
    overClearedLabel: $("overClearedLabel"),
    overComboLabel: $("overComboLabel"),
    overTimeLabel: $("overTimeLabel"),
    fillBonusLine: $("fillBonusLine"),
    missedTitle: $("missedTitle"),
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
    voiceChoice: readString(VOICE_KEY, "auto"),
    theme: readString(THEME_KEY, "candy"),
    speed: readString(SPEED_KEY, "normal"),
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
    speechPhraseDirty: false,
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
    meteor: null,
    physics: null,
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
    if (!el) return;
    if (el.textContent !== text) el.textContent = text;
  }

  const UI_ICON_NS = "http://www.w3.org/2000/svg";

  function iconSvg(name, className = "ui-icon") {
    const svg = document.createElementNS(UI_ICON_NS, "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const use = document.createElementNS(UI_ICON_NS, "use");
    use.setAttribute("href", `#ui-${name}`);
    svg.appendChild(use);
    return svg;
  }

  function setIcon(el, name, className = "ui-icon") {
    if (!el) return;
    el.replaceChildren(iconSvg(name, className));
  }

  function setUseIcon(svg, name) {
    if (!svg) return;
    const use = svg.querySelector("use");
    if (use) use.setAttribute("href", `#ui-${name}`);
  }

  function setStarValue(el, value) {
    if (!el) return;
    el.replaceChildren(
      iconSvg("star", "ui-icon ui-icon-star"),
      document.createTextNode(formatNumber(value)),
    );
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

    for (const category of NUMBERS) {
      if (!category || !category.id || !Array.isArray(category.bands)) continue;
      categories.push({ ...category, education: false, group: category.group || "themes" });
    }

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

    for (const pack of Array.isArray(state.customPacks) ? state.customPacks : []) {
      if (!pack || !pack.id || !Array.isArray(pack.words) || !pack.words.length) continue;
      const levels = { 1: [], 2: [], 3: [] };
      for (const word of pack.words) {
        const bucket = word.length <= 4 ? 1 : word.length <= 6 ? 2 : 3;
        levels[bucket].push(word);
      }
      categories.push({
        id: `custom:${pack.id}`,
        icon: "📄",
        name: pack.name,
        custom: true,
        packId: pack.id,
        group: "custom",
        levels,
        countKey: "custom.wordCount",
      });
    }
    return categories;
  }

  const CATEGORY_ICON_IDS = {
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

  function categoryIcon(category) {
    if (!category) return "spark";
    if (category.custom || category.packId) return "file";
    return CATEGORY_ICON_IDS[category.id] || "spark";
  }

  function categoryName(category) {
    if (!category) return "";
    return category.name || tr(category.nameKey || "");
  }

  const PACK_GROUPS = [
    { id: "themes", labelKey: "pack.groupThemes" },
    { id: "education", labelKey: "pack.groupEducation" },
    { id: "phrases", labelKey: "pack.groupPhrases" },
    { id: "custom", labelKey: "pack.groupCustom" },
  ];

  function packGroupForCategory(category) {
    if (!category) return "themes";
    if (category.custom || category.group === "custom") return "custom";
    if (category.group === "phrases") return "phrases";
    if (category.group === "education" || category.group === "families") return "education";
    return "themes";
  }

  function categoryTotalCount(category) {
    if (!category) return 0;
    if (Array.isArray(category.bands)) {
      return category.bands.reduce((sum, band) => sum + (band.words || []).length, 0);
    }
    if (category.levels) {
      return [1, 2, 3].reduce((sum, level) => sum + (category.levels[level] || []).length, 0);
    }
    return 0;
  }

  function renderPackTabs() {
    if (!els.packTabs) return;
    if (!PACK_GROUPS.some((group) => group.id === state.packGroup)) {
      state.packGroup = "themes";
    }
    if (state.packGroup === "custom" && !CustomPacks) state.packGroup = "themes";
    els.packTabs.querySelectorAll("[data-pack-group]").forEach((tab) => {
      const active = tab.dataset.packGroup === state.packGroup;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }

  function renderPackCategoryGrid() {
    if (!els.packCategoryGrid) return;
    const custom = state.packGroup === "custom" && CustomPacks;
    els.packCategoryGrid.classList.toggle("is-hidden", Boolean(custom));
    if (els.customPackSection) {
      els.customPackSection.classList.toggle("is-hidden", !custom);
    }
    if (custom) {
      els.packCategoryGrid.replaceChildren();
      if (els.packGroupEmpty) els.packGroupEmpty.classList.add("is-hidden");
      renderCustomPackList();
      return;
    }

    const categories = state.categories.filter(
      (category) => packGroupForCategory(category) === state.packGroup,
    );
    els.packCategoryGrid.replaceChildren();
    if (els.packGroupEmpty) {
      els.packGroupEmpty.classList.toggle("is-hidden", categories.length > 0);
    }
    for (const category of categories) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pack-category";
      button.dataset.categoryId = category.id;
      button.setAttribute("role", "option");
      const active = category.id === state.categoryId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));

      const icon = document.createElement("span");
      icon.className = "pack-category-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.appendChild(iconSvg(categoryIcon(category)));
      const copy = document.createElement("span");
      copy.className = "pack-category-copy";
      const name = document.createElement("b");
      name.textContent = categoryName(category);
      const meta = document.createElement("small");
      meta.textContent = tr("pack.countShort", {
        count: formatNumber(categoryTotalCount(category)),
      });
      copy.appendChild(name);
      copy.appendChild(meta);
      button.appendChild(icon);
      button.appendChild(copy);
      els.packCategoryGrid.appendChild(button);
    }
  }

  function setPackGroup(group) {
    if (!PACK_GROUPS.some((item) => item.id === group)) return;
    if (group === "custom" && !CustomPacks) return;
    state.packGroup = group;
    renderPackTabs();
    renderPackCategoryGrid();
  }

  function selectPackCategory(next) {
    const category = state.categories.find((item) => item.id === next);
    if (!category) return;
    state.categoryId = next;
    state.packGroup = packGroupForCategory(category);

    if (Array.isArray(category.bands)) {
      const validBand =
        state.band === "all" || category.bands.some((band) => band.id === state.band);
      if (!validBand) state.band = "all";
    } else {
      state.band = "all";
    }
    if (
      category.levels &&
      state.difficulty > 0 &&
      !(category.levels[state.difficulty] || []).length
    ) {
      state.difficulty = 0;
    }

    if (els.categorySelect) els.categorySelect.value = next;
    state.pool = getSelectedPool();
    savePackSelection();
    updatePackUI();
    renderPackTabs();
    renderPackCategoryGrid();
    renderCustomPackList();
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
        : category.levels
          ? [1, 2, 3].flatMap((level) => category.levels[level] || [])
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
      { key: "custom", labelKey: "group.custom" },
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
        option.textContent = `${category.icon} ${categoryName(category)}`;
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

    const controls = els.diffGroup.closest(".pack-controls");
    if (controls) controls.classList.toggle("single", banded);

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
      const available = level === 0 || !category || !category.levels || (category.levels[level] || []).length > 0;
      button.disabled = !available;
    });
    if (
      category &&
      category.levels &&
      state.difficulty > 0 &&
      !(category.levels[state.difficulty] || []).length
    ) {
      state.difficulty = 0;
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

    let modeKey = "difficulty.all";
    if (banded) {
      const band = category.bands.find((item) => item.id === state.band);
      modeKey = state.band !== "all" && band ? band.labelKey : "difficulty.all";
    } else if (state.difficulty > 0) {
      modeKey = `difficulty.${state.difficulty}`;
    }

    if (category) {
      setIcon(els.packPreviewIcon, categoryIcon(category));
      setText(els.packPreviewName, categoryName(category));
      setText(els.packPreviewMeta, tr(modeKey));
      setText(els.packSummary, `${categoryName(category)} · ${tr(modeKey)}`);
    }
  }

  function formatFileSize(bytes) {
    const kb = Math.max(1, Math.round(Number(bytes) / 1024));
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  function isSupportedCustomFile(file) {
    if (!file) return false;
    const name = String(file.name || "").toLowerCase();
    if (/\.(txt|text|md|csv)$/.test(name)) return true;
    return /^text\//.test(String(file.type || "").toLowerCase());
  }

  function fileBaseName(name) {
    const base = String(name || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return CustomPacks ? CustomPacks.sanitizeName(base) : base.slice(0, 30);
  }

  function renderCustomNotice() {
    if (!els.customPackStatus) return;
    const notice = state.customNotice;
    if (!notice) {
      setText(els.customPackStatus, "");
      els.customPackStatus.className = "custom-pack-status";
      return;
    }
    setText(els.customPackStatus, tr(notice.key, notice.vars));
    els.customPackStatus.className = `custom-pack-status is-${notice.type || "info"}`;
  }

  function setCustomNotice(key, vars = {}, type = "info") {
    state.customNotice = key ? { key, vars, type } : null;
    renderCustomNotice();
  }

  function renderCustomPackList() {
    if (!els.customPackList) return;
    const packs = Array.isArray(state.customPacks) ? state.customPacks : [];
    const current = getSelectedCategory();
    const currentPackId = current && current.custom ? current.packId : "";
    els.customPackList.replaceChildren();
    for (const pack of packs) {
      const item = document.createElement("li");
      item.className = "custom-pack-item";
      item.dataset.customPackId = pack.id;

      const pick = document.createElement("button");
      pick.type = "button";
      pick.className = "custom-pack-pick";
      pick.dataset.customPick = pack.id;
      pick.setAttribute("aria-pressed", String(pack.id === currentPackId));
      pick.setAttribute("aria-label", tr("custom.pickAria", { name: pack.name }));
      const text = document.createElement("span");
      text.className = "custom-pack-item-text";
      const name = document.createElement("strong");
      name.textContent = pack.name;
      const meta = document.createElement("span");
      meta.textContent = tr("custom.wordCount", { count: formatNumber(pack.words.length) });
      text.appendChild(name);
      text.appendChild(meta);
      if (pack.id === currentPackId) {
        const badge = document.createElement("em");
        badge.className = "custom-pack-current";
        badge.textContent = tr("custom.current");
        text.appendChild(badge);
      }
      pick.appendChild(text);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "custom-pack-delete";
      remove.dataset.customDelete = pack.id;
      remove.replaceChildren(iconSvg("close"));
      remove.title = tr("custom.delete");
      remove.setAttribute("aria-label", tr("custom.deleteAria", { name: pack.name }));
      item.appendChild(pick);
      item.appendChild(remove);
      els.customPackList.appendChild(item);
    }
    els.customPackList.classList.toggle("is-hidden", packs.length === 0);
    if (els.customPackEmpty) {
      els.customPackEmpty.classList.toggle("is-hidden", packs.length > 0);
    }
  }

  function updateCustomPackUI() {
    if (!els.customPackSection) return;
    const packs = Array.isArray(state.customPacks) ? state.customPacks : [];
    const maxPacks = CustomPacks ? CustomPacks.MAX_PACKS : 12;
    if (els.customPackQuota) {
      setText(els.customPackQuota, tr("custom.quota", { count: packs.length, max: maxPacks }));
    }
    if (els.customPackFileInfo) {
      const file = state.customPackFile;
      setText(
        els.customPackFileInfo,
        file ? tr("custom.fileChosen", { name: file.name, size: formatFileSize(file.size) }) : "",
      );
    }
    if (els.customPackChoose) {
      els.customPackChoose.disabled = state.customPackReading || !CustomPacks;
    }
    if (els.customPackCreate) {
      const fileTooLarge =
        state.customPackFile &&
        CustomPacks &&
        state.customPackFile.size > CustomPacks.MAX_FILE_BYTES;
      const fileUnsupported =
        state.customPackFile && !isSupportedCustomFile(state.customPackFile);
      els.customPackCreate.disabled =
        state.customPackReading ||
        !CustomPacks ||
        !state.customPackFile ||
        fileTooLarge ||
        fileUnsupported ||
        packs.length >= maxPacks;
    }
    renderCustomNotice();
  }

  function refreshCustomPackCategories(preferredId) {
    if (!CustomPacks) return;
    state.customPacks = CustomPacks.load();
    state.categories = buildCategories();
    const preferred = preferredId && state.categories.some((category) => category.id === preferredId)
      ? preferredId
      : null;
    const current = state.categories.some((category) => category.id === state.categoryId)
      ? state.categoryId
      : "core";
    state.categoryId = preferred || current;
    const category = getSelectedCategory();
    if (category && Array.isArray(category.bands)) {
      const validBand =
        state.band === "all" || category.bands.some((band) => band.id === state.band);
      if (!validBand) state.band = "all";
    } else {
      state.band = "all";
    }
    if (
      category &&
      category.levels &&
      state.difficulty > 0 &&
      !(category.levels[state.difficulty] || []).length
    ) {
      state.difficulty = 0;
    }
    if (preferredId) {
      state.packGroup = packGroupForCategory(category);
    }
    state.pool = getSelectedPool();
    savePackSelection();
    renderCategoryOptions();
    updatePackUI();
    renderPackTabs();
    renderPackCategoryGrid();
    renderCustomPackList();
    updateCustomPackUI();
  }

  function onCustomFileChange() {
    if (!els.customPackFile) return;
    state.customPackFile =
      els.customPackFile.files && els.customPackFile.files[0]
        ? els.customPackFile.files[0]
        : null;
    if (
      state.customPackFile &&
      isSupportedCustomFile(state.customPackFile) &&
      els.customPackName &&
      !els.customPackName.value.trim()
    ) {
      els.customPackName.value = fileBaseName(state.customPackFile.name);
    }
    if (state.customPackFile && !isSupportedCustomFile(state.customPackFile)) {
      setCustomNotice("custom.fileType", {}, "error");
    } else if (
      state.customPackFile &&
      CustomPacks &&
      state.customPackFile.size > CustomPacks.MAX_FILE_BYTES
    ) {
      setCustomNotice(
        "custom.fileTooLarge",
        { mb: Math.round(CustomPacks.MAX_FILE_BYTES / (1024 * 1024)) },
        "error",
      );
    } else {
      setCustomNotice(null);
    }
    updateCustomPackUI();
  }

  function createCustomPackFromFile() {
    if (!CustomPacks) {
      setCustomNotice("custom.unsupported", {}, "error");
      return;
    }
    const file = state.customPackFile;
    if (!file) {
      setCustomNotice("custom.selectFirst", {}, "warn");
      return;
    }
    if (!isSupportedCustomFile(file)) {
      setCustomNotice("custom.fileType", {}, "error");
      return;
    }
    if (state.customPackReading) return;
    if (file.size > CustomPacks.MAX_FILE_BYTES) {
      setCustomNotice(
        "custom.fileTooLarge",
        { mb: Math.round(CustomPacks.MAX_FILE_BYTES / (1024 * 1024)) },
        "error",
      );
      return;
    }
    if (typeof window.FileReader !== "function") {
      setCustomNotice("custom.unsupported", {}, "error");
      return;
    }

    state.customPackReading = true;
    setCustomNotice("custom.reading", {}, "info");
    updateCustomPackUI();

    const finishError = (key, vars = {}) => {
      state.customPackReading = false;
      setCustomNotice(key, vars, "error");
      updateCustomPackUI();
    };

    const reader = new window.FileReader();
    reader.onerror = () => finishError("custom.readError");
    reader.onload = () => {
      try {
        const parsed = CustomPacks.parseText(
          typeof reader.result === "string" ? reader.result : "",
        );
        if (!parsed.words.length) {
          finishError("custom.noWords");
          return;
        }
        if (parsed.words.length < CustomPacks.MIN_WORDS) {
          finishError("custom.tooFew", { min: CustomPacks.MIN_WORDS });
          return;
        }
        const typed = els.customPackName ? els.customPackName.value.trim() : "";
        const name =
          CustomPacks.sanitizeName(typed) ||
          fileBaseName(file.name) ||
          tr("custom.defaultName");
        const result = CustomPacks.create(name, parsed.words);
        if (result.error) {
          if (result.error === "too-many") {
            finishError("custom.tooMany", { max: CustomPacks.MAX_PACKS });
          } else if (result.error === "too-few") {
            finishError("custom.tooFew", { min: CustomPacks.MIN_WORDS });
          } else if (result.error === "storage") {
            finishError("custom.storage");
          } else {
            finishError("custom.noWords");
          }
          return;
        }

        state.customPackReading = false;
        state.difficulty = 0;
        state.band = "all";
        refreshCustomPackCategories(`custom:${result.pack.id}`);
        setCustomNotice(
          parsed.truncated ? "custom.successTruncated" : "custom.success",
          {
            name: result.pack.name,
            count: formatNumber(result.pack.words.length),
          },
          "success",
        );
        if (els.customPackName) els.customPackName.value = "";
        state.customPackFile = null;
        if (els.customPackFile) els.customPackFile.value = "";
        updateCustomPackUI();
      } catch {
        finishError("custom.readError");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function onCustomPackListClick(event) {
    if (!CustomPacks) return;
    const target = event.target;
    const pick =
      target && typeof target.closest === "function"
        ? target.closest("[data-custom-pick]")
        : null;
    if (pick) {
      selectPackCategory(`custom:${pick.dataset.customPick}`);
      return;
    }
    const button =
      target && typeof target.closest === "function"
        ? target.closest("[data-custom-delete]")
        : null;
    if (!button) return;
    const id = button.dataset.customDelete;
    const pack = (state.customPacks || []).find((item) => item.id === id);
    if (!pack) return;
    const confirmed =
      typeof window.confirm !== "function" ||
      window.confirm(tr("custom.deleteConfirm", { name: pack.name }));
    if (!confirmed) return;
    if (!CustomPacks.remove(id)) {
      setCustomNotice("custom.storage", {}, "error");
      return;
    }
    const current = getSelectedCategory();
    if (current && current.custom && current.packId === id) {
      state.categoryId = "core";
      state.difficulty = 0;
      state.band = "all";
      state.packGroup = "themes";
    }
    refreshCustomPackCategories();
    setCustomNotice("custom.deleted", { name: pack.name }, "success");
  }

  function applyTheme(key) {
    const theme = THEMES.includes(key) ? key : "candy";
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.candy);
    refreshPetPalette();
    if (els.themeGroup) {
      els.themeGroup.querySelectorAll("[data-theme-choice]").forEach((button) => {
        const active = button.dataset.themeChoice === theme;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-checked", String(active));
      });
    }
  }

  function setTheme(key) {
    if (!THEMES.includes(key)) return state.theme;
    try {
      localStorage.setItem(THEME_KEY, key);
    } catch {}
    applyTheme(key);
    toast(tr("theme.set", { theme: tr(`theme.${key}`) }));
    return state.theme;
  }

  function updateThemeUI() {
    if (!els.themeGroup) return;
    els.themeGroup.querySelectorAll("[data-theme-choice]").forEach((button) => {
      const active = button.dataset.themeChoice === state.theme;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-checked", String(active));
    });
  }

  function updateSpeedUI() {
    if (!els.speedBtn) return;
    const key = SPEED_LEVELS[state.speed] ? state.speed : "normal";
    els.speedBtn.dataset.speed = key;
    setText(els.speedLabel, tr(`speed.${key}`));
    const label = tr("speed.pillAria", { speed: tr(`speed.${key}`) });
    els.speedBtn.setAttribute("aria-label", label);
    els.speedBtn.setAttribute("title", label);
  }

  const STICKER_HUES = [8, 38, 152, 190, 265, 318];
  const STICKER_SHAPES = [
    "24px 9px 21px 11px / 10px 23px 9px 24px",
    "10px 23px 9px 24px / 24px 10px 22px 9px",
    "22px 11px 25px 8px / 9px 24px 11px 23px",
    "9px 25px 11px 22px / 23px 9px 24px 10px",
  ];

  function scatterPlaySteps() {
    if (!els.playStepItems.length) return;
    const hues = shuffle(STICKER_HUES.slice());
    const slots = [0, 34, 68];
    els.playStepItems.forEach((step, index) => {
      const x = slots[index] + (Math.random() * 2.4 - 1.2);
      step.style.setProperty("--x", `${x.toFixed(2)}%`);
      step.style.setProperty("--y", `${(2 + Math.random() * 22).toFixed(1)}px`);
      step.style.setProperty("--rot", `${(Math.random() * 18 - 9).toFixed(1)}deg`);
      step.style.setProperty("--tape-rot", `${(Math.random() * 12 - 6).toFixed(1)}deg`);
      step.style.setProperty("--sticker-hue", String(hues[index % hues.length]));
      step.style.setProperty(
        "--shape",
        STICKER_SHAPES[Math.floor(Math.random() * STICKER_SHAPES.length)],
      );
    });
  }

  function updateModeUI() {
    const fill = state.mode === "fill";
    const paint = state.mode === "paint";
    document.body.classList.toggle("mode-fill", fill);
    document.body.classList.toggle("mode-paint", paint);
    document.body.classList.toggle("mode-rain", state.mode === "rain");
    for (const button of els.modeOptions) {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    setIcon(els.stepIcon1, paint ? "palette" : fill ? "grid" : "rain");
    setText(els.stepLabel1, tr(paint ? "mode.paintStep1" : fill ? "mode.fillStep1" : "start.step1"));
    setText(els.stepLabel2, tr("start.step2"));
    setText(els.stepLabel3, tr(paint ? "mode.paintStep3" : fill ? "mode.fillStep3" : "start.step3"));
    setText(els.correctLabel, tr(paint ? "hud.hits" : fill ? "hud.cleared" : "hud.correct"));
    setText(els.levelLabel, tr(fill || paint ? "hud.remaining" : "hud.level"));
    setText(els.pileLabel, tr(paint ? "hud.paint" : fill ? "hud.progress" : "hud.pile"));
    setText(els.gaugeLabel, tr(paint ? "gauge.paint" : fill ? "gauge.progress" : "gauge.label"));
  }

  function setMode(mode) {
    if (!GAME_MODES.includes(mode) || mode === state.mode) {
      updateModeUI();
      return state.mode;
    }
    state.mode = mode;
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {}
    updateModeUI();
    scatterPlaySteps();
    updateHUD(true);
    if (state.phase === "over") renderOverPanel();
    return state.mode;
  }

  function applyFallingSpeed(previous, next) {
    const oldMultiplier = SPEED_LEVELS[previous] || 1;
    const newMultiplier = SPEED_LEVELS[next] || 1;
    if (oldMultiplier === newMultiplier) return;
    for (const word of state.words) {
      const base = word.baseSpeed || word.speed / oldMultiplier;
      word.speed = base * newMultiplier;
    }
  }

  function cycleSpeed() {
    const previous = state.speed;
    const index = SPEED_ORDER.indexOf(state.speed);
    state.speed = SPEED_ORDER[(index + 1) % SPEED_ORDER.length] || "normal";
    try {
      localStorage.setItem(SPEED_KEY, state.speed);
    } catch {}
    applyFallingSpeed(previous, state.speed);
    updateSpeedUI();
    toast(tr("speed.set", { speed: tr(`speed.${state.speed}`) }));
  }

  function savePackSelection() {
    try {
      localStorage.setItem(PACK_KEY, state.categoryId);
      localStorage.setItem(LEVEL_KEY, String(state.difficulty));
      localStorage.setItem(BAND_KEY, state.band);
    } catch {}
  }

  function loadPackSelection() {
    state.customPacks = CustomPacks ? CustomPacks.load() : [];
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
    if (
      category &&
      category.levels &&
      state.difficulty > 0 &&
      !(category.levels[state.difficulty] || []).length
    ) {
      state.difficulty = 0;
    }

    state.pool = getSelectedPool();
  }

  function onCategoryChange() {
    if (els.categorySelect) selectPackCategory(els.categorySelect.value);
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
    if (button.disabled) return;
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

  function playPetVoice(id) {
    const def = Pets && typeof Pets.byId === "function" ? Pets.byId(id) : null;
    const voice = def && def.voice;
    if (!voice || !Array.isArray(voice.notes) || !voice.notes.length) {
      playSqueak();
      return;
    }
    const wave = voice.wave || "sine";
    const gain = Number.isFinite(voice.gain) ? voice.gain : 0.02;
    const dur = Number.isFinite(voice.dur) ? voice.dur : 0.08;
    const step = Number.isFinite(voice.step) ? voice.step : 0.07;
    const slide = Number.isFinite(voice.slide) ? voice.slide : 1;
    voice.notes.forEach((frequency, index) => {
      const note = Math.max(60, Math.min(2200, frequency));
      tone(note, dur, wave, gain, index * step, Math.max(60, Math.round(note * slide)));
    });
    if (voice.noise) noiseBurst(voice.noise, gain * 0.5);
  }

  function playPetStep() {
    const now = performance.now();
    if (now - (state.lastPetStep || 0) < 190) return;
    state.lastPetStep = now;
    tone(155, 0.045, "triangle", 0.006, 0, 105);
  }

  function playPetLand() {
    const now = performance.now();
    if (now - (state.lastPetLand || 0) < 220) return;
    state.lastPetLand = now;
    tone(92, 0.075, "sine", 0.016, 0, 56);
    noiseBurst(0.028, 0.004);
  }

  function playPetPurr() {
    const now = performance.now();
    if (now - (state.lastPetPurr || 0) < 900) return;
    state.lastPetPurr = now;
    tone(86, 0.3, "sine", 0.018, 0, 72);
    tone(72, 0.34, "sine", 0.014, 0.2, 62);
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

  function playMeteorLaunch() {
    whoosh(0.5, 180, 2400, 0.05);
    tone(220, 0.3, "sawtooth", 0.02, 0, 880);
    noiseBurst(0.12, 0.02);
  }

  function playMeteorHit(bounces) {
    tone(420 + bounces * 70, 0.075, "square", 0.022);
    noiseBurst(0.03, 0.01);
  }

  function playMeteorSweep(count) {
    tone(660 + Math.min(count, 8) * 70, 0.075, "triangle", 0.026);
    noiseBurst(0.035, 0.012);
  }

  function playMeteorFinish() {
    whoosh(0.45, 2200, 280, 0.03);
    thump(0.01, 0.05);
    sequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.032, 0.065);
    sparkleNotes(0.22, 0.02);
    noiseBurst(0.32, 0.028, 0.04);
  }

  function playPaintShot() {
    whoosh(0.2, 700, 2600, 0.038);
    tone(280, 0.14, "triangle", 0.03, 0, 760);
    noiseBurst(0.04, 0.012);
  }

  function playPaintSplat() {
    noiseBurst(0.2, 0.05);
    thump(0.012, 0.045);
    tone(620, 0.07, "square", 0.018, 0.01, 220);
    tone(180, 0.22, "sine", 0.03, 0.02, 70);
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
    cancelMeteor();
    destroyPhysics();
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
    state.fillTotal = 0;
    state.fillBonus = 0;
    state.fillFinishing = false;
    state.fillFxTimer = 0;
    state.paintTotal = 0;
    state.paintBonus = 0;
    state.paintFinishing = false;
    syncSpeechPhrases();
    state.score = 0;
    state.roundRecorded = true;
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
    if (els.paintLayer) els.paintLayer.replaceChildren();
    els.field.classList.remove("danger", "shake");
    state.pointer = null;
    els.typeInput.value = "";
    els.typeInput.classList.remove("wrong");
    els.correctStat.classList.remove("reward");
    resetRewardProgress();
    clearPets();
    updateHUD(true);
  }

  let setupOpener = null;
  let mascotTaps = 0;
  let mascotTapTimer = 0;

  function syncPhaseClass() {
    document.body.classList.remove("phase-menu", "phase-playing", "phase-paused", "phase-over");
    document.body.classList.add(`phase-${state.phase}`);
  }

  function openSetup() {
    if (!els.setupSheet) return;
    setupOpener = els.setupBtn;
    els.setupSheet.classList.remove("is-hidden");
    els.setupSheet.setAttribute("aria-hidden", "false");
    const card = els.setupSheet.querySelector(".setup-card");
    if (card) card.scrollTop = 0;
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

  let packOpener = null;

  function openPack() {
    if (!els.packSheet) return;
    packOpener = els.packBtn;
    state.customNotice = null;
    state.packGroup = packGroupForCategory(getSelectedCategory());
    if (CustomPacks) {
      refreshCustomPackCategories();
    } else {
      renderCategoryOptions();
      updatePackUI();
      renderPackTabs();
      renderPackCategoryGrid();
    }
    els.packSheet.classList.remove("is-hidden");
    els.packSheet.setAttribute("aria-hidden", "false");
    window.setTimeout(() => {
      if (els.packClose && !els.packSheet.classList.contains("is-hidden")) {
        els.packClose.focus({ preventScroll: true });
      }
    }, 0);
  }

  function closePack() {
    if (!els.packSheet || els.packSheet.classList.contains("is-hidden")) return;
    els.packSheet.classList.add("is-hidden");
    els.packSheet.setAttribute("aria-hidden", "true");
    if (packOpener && document.contains(packOpener) && !packOpener.classList.contains("is-hidden")) {
      packOpener.focus({ preventScroll: true });
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
    if (Profiles && !currentProfile()) {
      toast(tr("player.need"), "warn");
      openPlayerSheet();
      return;
    }
    closeVoicePopover();
    closeSetup();
    audio();
    playStart();
    state.pool = getSelectedPool();
    resetGame();
    resetPets();
    state.phase = "playing";
    syncPhaseClass();
    window.dispatchEvent(new CustomEvent("piupiu:roundstart"));
    hideOverlay();
    if (state.mode === "fill") buildFillBoard();
    else if (state.mode === "paint") buildPaintBoard();
    setAmbientRunning(true);
    els.pauseBtn.disabled = false;
    updatePauseButton();
    state.lastFrame = 0;
    state.raf = requestAnimationFrame(frame);
    if (state.micEnabled) startSpeech();
    updateMicUI();
    els.typeInput.blur();
    toast(
      tr(
        state.mode === "paint"
          ? "toast.paintStart"
          : state.mode === "fill"
            ? "toast.fillStart"
            : "toast.start",
      ),
    );
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
    if (state.mode === "rain") {
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
    }

    if (state.phase !== "playing") return;
    if (state.physics && state.settled.length) {
      Physics.Engine.update(state.physics.engine, 1000 / 60);
      syncPhysicsPile();
      if (state.mode === "rain" && checkPileDanger()) return;
    }
    if (state.phase !== "playing") return;
    if (state.mode === "fill") updateFillEffects(dt);
    updateMeteor(dt);
    if (state.phase !== "playing") return;
    updatePets(dt);
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
    const baseSpeed = fieldH / fallSeconds;
    const speed = baseSpeed * (SPEED_LEVELS[state.speed] || 1);
    const obj = {
      word,
      el,
      x,
      y: -height - 8,
      w: width,
      h: height,
      baseSpeed,
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

  /* ------------------------------------------------------------------ */
  /* fill-the-screen mode                                                */
  /* ------------------------------------------------------------------ */

  function drawFillWords(count) {
    const source = uniqueWords((state.pool.length ? state.pool : WORD_BANK).slice());
    const short = source.filter((word) => word.length <= 14);
    const pool = short.length >= Math.min(count, 8) ? short : source;
    if (!pool.length) return [];
    return shuffle(pool.slice()).slice(0, Math.max(1, count));
  }

  const FILL_HUES = [338, 12, 28, 46, 63, 155, 172, 192, 212, 268, 292, 318];
  const FILL_EFFECTS = [
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
  const FILL_EFFECT_CLASSES = [
    "fill-pulse",
    "fill-bounce",
    "fill-wobble",
    "fill-flash",
    "fill-glow",
    "fill-rainbow",
    "fill-shimmer",
  ];

  function buildFillBoard() {
    if (state.mode !== "fill" || !els.field) return;
    const fieldW = els.field.clientWidth;
    const fieldH = els.field.clientHeight;
    if (!fieldW || !fieldH) return;
    destroyPhysics();
    const pad = 10;
    const gapX = 8;
    const gapY = 5;
    const baseFont = fieldW < 360 ? 21 : fieldW < 430 ? 23 : 25;
    const cardH = Math.round(baseFont * 1.7) + 10;
    const availableW = fieldW - pad * 2;
    const maxRows = Math.max(3, Math.floor((fieldH - pad * 2 + gapY) / (cardH + gapY)));
    const maxCards = Math.min(36, Math.max(16, maxRows * 3 + 2));
    const words = drawFillWords(maxCards);
    if (!words.length) return;

    let hueBag = shuffle(FILL_HUES.slice());
    let hueIndex = 0;
    const cards = [];
    for (const word of words) {
      if (cards.length >= maxCards) break;
      const el = document.createElement("div");
      el.className = "word settled fill-word";
      el.style.height = `${cardH}px`;
      el.style.fontSize = `${baseFont}px`;
      el.style.minWidth = "56px";
      const hue = (hueBag[hueIndex % hueBag.length] + Math.floor(Math.random() * 10 - 5) + 360) % 360;
      hueIndex += 1;
      if (hueIndex % hueBag.length === 0) hueBag = shuffle(FILL_HUES.slice());
      el.style.setProperty("--fill-hue", String(hue));
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", word);
      el.tabIndex = 0;
      const span = document.createElement("span");
      span.className = "word-text";
      span.textContent = word;
      const shine = document.createElement("span");
      shine.className = "fill-shine";
      shine.setAttribute("aria-hidden", "true");
      el.appendChild(span);
      el.appendChild(shine);
      els.wordLayer.appendChild(el);

      let font = baseFont;
      let width = el.offsetWidth;
      while (width > availableW && font > 13) {
        font -= 1;
        el.style.fontSize = `${font}px`;
        width = el.offsetWidth;
      }
      if (width > availableW) {
        el.remove();
        continue;
      }
      cards.push({
        word,
        el,
        x: 0,
        y: 0,
        w: width,
        h: cardH,
        hue,
        emoji: EMOJI[word.toLowerCase()] || "",
        golden: false,
      });
    }
    if (!cards.length) return;

    const rows = [];
    let row = [];
    let rowWidth = 0;
    for (const card of cards) {
      const nextWidth = row.length ? rowWidth + gapX + card.w : card.w;
      if (row.length && nextWidth > availableW) {
        rows.push({ cards: row, width: rowWidth });
        row = [];
        rowWidth = 0;
      }
      row.push(card);
      rowWidth = row.length === 1 ? card.w : rowWidth + gapX + card.w;
    }
    if (row.length) rows.push({ cards: row, width: rowWidth });

    const usedRows = rows.slice(0, maxRows);
    const used = new Set();
    for (const rowData of usedRows) {
      for (const card of rowData.cards) used.add(card);
    }
    for (const card of cards) {
      if (!used.has(card)) card.el.remove();
    }

    const startY = fieldH - pad - cardH;
    usedRows.forEach((rowData, rowIndex) => {
      const y = startY - rowIndex * (cardH + gapY);
      let x = Math.max(pad, Math.round((fieldW - rowData.width) / 2));
      for (const card of rowData.cards) {
        card.x = x;
        card.y = y;
        state.settled.push(card);
        attachSettledBody(card);
        x += card.w + gapX;
      }
    });

    state.fillTotal = used.size;
    state.cleared = 0;
    state.fillBonus = 0;
    state.fillFxTimer = 0.6;
    syncSpeechPhrases();
    updateHUD(true);
  }

  /* ------------------------------------------------------------------ */
  /* paintball mode: a scattered full-screen word board                  */
  /* ------------------------------------------------------------------ */

  function buildPaintBoard() {
    if (state.mode !== "paint" || !els.field) return;
    const fieldW = els.field.clientWidth;
    const fieldH = els.field.clientHeight;
    if (!fieldW || !fieldH) return;
    destroyPhysics();

    const padLeft = 12;
    const padTop = 12;
    const padBottom = 16;
    const padRight = 34;
    const availableW = fieldW - padLeft - padRight;
    const baseFont = fieldW < 360 ? 17 : fieldW < 430 ? 18 : 20;
    const cardH = Math.round(baseFont * 1.9) + 6;
    const area = Math.max(1, fieldW * fieldH);
    const target = Math.min(46, Math.max(18, Math.round(area / 7200)));
    const candidates = drawFillWords(Math.min(62, target + 16));
    if (!candidates.length) return;

    let hueBag = shuffle(FILL_HUES.slice());
    let hueIndex = 0;
    const cards = [];
    for (const word of candidates) {
      const el = document.createElement("div");
      el.className = "word settled fill-word paint-word";
      el.style.height = `${cardH}px`;
      el.style.fontSize = `${baseFont}px`;
      el.style.minWidth = "52px";
      const hue = (hueBag[hueIndex % hueBag.length] + Math.floor(Math.random() * 10 - 5) + 360) % 360;
      hueIndex += 1;
      if (hueIndex % hueBag.length === 0) hueBag = shuffle(FILL_HUES.slice());
      const rotation = Math.random() * 10 - 5;
      el.style.setProperty("--fill-hue", String(hue));
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", word);
      el.tabIndex = 0;
      const span = document.createElement("span");
      span.className = "word-text";
      span.textContent = word;
      const shine = document.createElement("span");
      shine.className = "fill-shine";
      shine.setAttribute("aria-hidden", "true");
      el.appendChild(span);
      el.appendChild(shine);
      els.wordLayer.appendChild(el);

      let font = baseFont;
      let width = el.offsetWidth;
      while (width > availableW - 8 && font > 12) {
        font -= 1;
        el.style.fontSize = `${font}px`;
        width = el.offsetWidth;
      }
      if (width > availableW) {
        el.remove();
        continue;
      }
      const height = el.offsetHeight || cardH;
      const radians = Math.abs((rotation * Math.PI) / 180);
      cards.push({
        word,
        el,
        x: 0,
        y: 0,
        w: width,
        h: height,
        rot: rotation,
        boundW: Math.ceil(width * Math.cos(radians) + height * Math.sin(radians)),
        boundH: Math.ceil(width * Math.sin(radians) + height * Math.cos(radians)),
        hue,
        emoji: EMOJI[word.toLowerCase()] || "",
        golden: false,
      });
    }
    if (!cards.length) return;

    // Pack the biggest cards first, then let small words settle into the
    // leftover gaps. Positions are random rather than row-based, so the board
    // reads as a messy collage instead of a tidy wall.
    cards.sort((a, b) => b.w * b.h - a.w * a.h);
    const placed = [];
    const margins = [8, 6, 4, 2];
    const minX = padLeft;
    const maxX = fieldW - padRight;
    const minY = padTop;
    const maxY = fieldH - padBottom;
    for (const card of cards) {
      if (placed.length >= target) {
        card.el.remove();
        continue;
      }
      let spot = null;
      for (const margin of margins) {
        const spanX = Math.max(0, maxX - minX - card.boundW);
        const spanY = Math.max(0, maxY - minY - card.boundH);
        for (let attempt = 0; attempt < 640; attempt += 1) {
          const bx = minX + Math.random() * spanX;
          const by = minY + Math.random() * spanY;
          let clear = true;
          for (const other of placed) {
            if (
              bx < other.bx + other.boundW + margin &&
              bx + card.boundW + margin > other.bx &&
              by < other.by + other.boundH + margin &&
              by + card.boundH + margin > other.by
            ) {
              clear = false;
              break;
            }
          }
          if (clear) {
            spot = { bx, by };
            break;
          }
        }
        if (spot) break;
      }
      if (!spot) {
        card.el.remove();
        continue;
      }
      card.bx = spot.bx;
      card.by = spot.by;
      card.x = Math.round(spot.bx + (card.boundW - card.w) / 2);
      card.y = Math.round(spot.by + (card.boundH - card.h) / 2);
      card.el.style.transform = `translate3d(${card.x}px, ${card.y}px, 0) rotate(${card.rot.toFixed(2)}deg)`;
      placed.push(card);
      state.settled.push(card);
    }

    // A tiny or extremely narrow field can reject every packed card. Keep one
    // readable target instead of starting an empty, unwinnable round.
    if (!state.settled.length) {
      const word = candidates[0];
      if (!word) return;
      const el = document.createElement("div");
      el.className = "word settled fill-word paint-word";
      el.style.height = "34px";
      el.style.fontSize = "14px";
      el.style.minWidth = "52px";
      el.style.setProperty("--fill-hue", String(hueFor(word)));
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", word);
      el.tabIndex = 0;
      const span = document.createElement("span");
      span.className = "word-text";
      span.textContent = word;
      el.appendChild(span);
      els.wordLayer.appendChild(el);
      const w = el.offsetWidth;
      const h = el.offsetHeight || 34;
      const x = Math.max(0, Math.round((fieldW - w) / 2));
      const y = Math.max(0, Math.round((fieldH - h) / 2));
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      state.settled.push({
        word,
        el,
        x,
        y,
        w,
        h,
        hue: hueFor(word),
        emoji: EMOJI[word.toLowerCase()] || "",
        golden: false,
      });
    }
    state.paintTotal = state.settled.length;
    state.cleared = 0;
    state.paintBonus = 0;
    state.paintFinishing = false;
    syncSpeechPhrases();
    updateHUD(true);
  }

  function fillCardCenter(card) {
    const fRect = els.field.getBoundingClientRect();
    const r = card.el.getBoundingClientRect();
    return {
      x: r.left - fRect.left + r.width / 2,
      y: r.top - fRect.top + r.height / 2,
    };
  }

  function clearFillEffectClasses(el) {
    for (const name of FILL_EFFECT_CLASSES) el.classList.remove(name);
  }

  function playFillClass(card, cls, ms) {
    const el = card.el;
    clearFillEffectClasses(el);
    void el.offsetWidth;
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
  }

  function applyFillEffect(card) {
    if (!card || !card.el || !card.el.isConnected) return;
    const calm = REDUCED_MOTION;
    const pool = calm
      ? ["flash", "glow", "hueShift", "shimmer", "sparkle", "confetti", "emoji", "ring"]
      : FILL_EFFECTS;
    const effect = pool[Math.floor(Math.random() * pool.length)];
    const { x: cx, y: cy } = fillCardCenter(card);
    const hue = card.hue;

    if (effect === "pulse") return playFillClass(card, "fill-pulse", 620);
    if (effect === "bounce") return playFillClass(card, "fill-bounce", 720);
    if (effect === "wobble") return playFillClass(card, "fill-wobble", 760);
    if (effect === "flash") return playFillClass(card, "fill-flash", 640);
    if (effect === "glow") return playFillClass(card, "fill-glow", 1250);
    if (effect === "rainbow") return playFillClass(card, "fill-rainbow", 1250);
    if (effect === "shimmer") return playFillClass(card, "fill-shimmer", 950);
    if (effect === "hueShift") {
      const next = (hue + 70 + Math.random() * 120) % 360;
      card.hue = next;
      card.el.style.setProperty("--fill-hue", String(Math.round(next)));
      return playFillClass(card, "fill-flash", 480);
    }
    if (effect === "sparkle") {
      createFlash(cx, cy, hue);
      spawnStars(cx, cy, hue, 8);
      return;
    }
    if (effect === "confetti") {
      spawnSparks(cx, cy, hue, 18);
      spawnStars(cx, cy, hue, 4);
      return;
    }
    if (effect === "emoji") {
      const emoji = ["✨", "💖", "🌟", "🎉", "🍬", "🫧", "⭐"][Math.floor(Math.random() * 7)];
      spawnEmojiBurst({ emoji }, cx, cy);
      createFlash(cx, cy, hue);
      return;
    }
    if (effect === "ring") {
      const ring = document.createElement("div");
      ring.className = "ring";
      ring.style.left = `${cx}px`;
      ring.style.top = `${cy}px`;
      ring.style.setProperty("--hue", hue);
      addFx(ring);
    }
  }

  function updateFillEffects(dt) {
    if (state.mode !== "fill" || state.phase !== "playing") return;
    state.fillFxTimer -= dt;
    if (state.fillFxTimer > 0) return;
    state.fillFxTimer = 0.65 + Math.random() * 0.85;
    if (!state.settled.length) return;
    applyFillEffect(state.settled[Math.floor(Math.random() * state.settled.length)]);
  }

  function speakFillWord(card) {
    if (state.phase !== "playing" || state.mode === "rain" || !card) return;
    focusWord(card, true);
    showHeard(tr("help.listen", { word: card.word }), "volume");
    speakHelp(card);
  }

  /* ------------------------------------------------------------------ */
  /* soft pile physics                                                   */
  /* ------------------------------------------------------------------ */

  function ensurePhysics() {
    if (!Physics || !els.field) return null;
    const fieldW = els.field.clientWidth;
    const fieldH = els.field.clientHeight;
    if (!fieldW || !fieldH) return null;
    if (!state.physics) {
      const engine = Physics.Engine.create({ enableSleeping: true });
      engine.gravity.y = 1;
      engine.positionIterations = 10;
      engine.velocityIterations = 8;
      engine.constraintIterations = 2;
      state.physics = { engine, walls: [] };
      rebuildPhysicsWalls(fieldW, fieldH);
    }
    return state.physics;
  }

  function rebuildPhysicsWalls(fieldW, fieldH) {
    const physics = state.physics;
    if (!physics) return;
    for (const wall of physics.walls) Physics.Composite.remove(physics.engine.world, wall);
    const options = { isStatic: true, friction: 0.9, restitution: 0 };
    physics.walls = [
      Physics.Bodies.rectangle(fieldW / 2, fieldH + 40, fieldW + 200, 80, options),
      Physics.Bodies.rectangle(-40, fieldH / 2, 80, fieldH * 2, options),
      Physics.Bodies.rectangle(fieldW + 40, fieldH / 2, 80, fieldH * 2, options),
    ];
    for (const wall of physics.walls) Physics.Composite.add(physics.engine.world, wall);
  }

  function destroyPhysics() {
    if (state.physics && Physics) {
      Physics.Composite.clear(state.physics.engine.world, false);
      Physics.Engine.clear(state.physics.engine);
    }
    state.physics = null;
  }

  function wakePhysicsPile() {
    if (!state.physics || !Physics || !Physics.Sleeping) return;
    for (const settled of state.settled) {
      if (settled.body) Physics.Sleeping.set(settled.body, false);
    }
  }

  function attachSettledBody(settled) {
    const physics = ensurePhysics();
    if (!physics) return;
    settled.baseW = settled.w;
    settled.baseH = settled.h;
    const body = Physics.Bodies.rectangle(
      settled.x + settled.w / 2,
      settled.y + settled.h / 2,
      settled.w,
      settled.h,
      {
        restitution: 0.01,
        friction: 0.7,
        frictionStatic: 1.1,
        frictionAir: 0.015,
        density: 0.0012,
        slop: 0.04,
        chamfer: { radius: Math.min(6, settled.h / 6) },
      },
    );
    Physics.Composite.add(physics.engine.world, body);
    settled.body = body;
    wakePhysicsPile();
    syncSettledCard(settled);
  }

  function syncSettledCard(settled) {
    const body = settled.body;
    if (!body) return;
    const baseW = settled.baseW || settled.w;
    const baseH = settled.baseH || settled.h;
    settled.x = body.bounds.min.x;
    settled.y = body.bounds.min.y;
    settled.w = body.bounds.max.x - body.bounds.min.x;
    settled.h = body.bounds.max.y - body.bounds.min.y;
    const left = body.position.x - baseW / 2;
    const top = body.position.y - baseH / 2;
    settled.el.style.transform = `translate3d(${left}px, ${top}px, 0) rotate(${body.angle}rad)`;
    settled.el.style.zIndex =
      settled === state.focusedWord ? "2000" : String(Math.max(1, 1000 - Math.round(body.position.y)));
  }

  function syncPhysicsPile() {
    if (!state.physics) return;
    for (const settled of state.settled) syncSettledCard(settled);
  }

  function removeSettledBody(settled) {
    if (state.physics && settled.body) {
      Physics.Composite.remove(state.physics.engine.world, settled.body);
    }
    settled.body = null;
  }

  /* ------------------------------------------------------------------ */
  /* pet companion: behavior brain + canvas sticker puppet              */
  /* ------------------------------------------------------------------ */

  const PET_GRAVITY = 560;
  const PET_SCALE = 1.5;
  const PET_BODY_VARIANT = "bean";
  const PET_DPR = Math.min(2, window.devicePixelRatio || 1);
  const PET_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  const PET_MOVING = ["wander", "climb", "nuzzle", "chase", "startle"];
  const PET_SPEED_FACTOR = {
    wander: 1,
    climb: 1.06,
    nuzzle: 1.5,
    chase: 1.7,
    startle: 1.9,
    nervous: 0.45,
  };

  function randomPetDef() {
    const def = Pets && typeof Pets.random === "function" ? Pets.random(state.lastPetId) : PET_FALLBACK;
    state.lastPetId = def.id;
    return def;
  }

  function petDef(id) {
    const def = Pets && typeof Pets.byId === "function" ? Pets.byId(id) : null;
    return def || PET_FALLBACK;
  }

  function withAlpha(color, alpha) {
    if (typeof color !== "string") return `rgba(255,255,255,${alpha})`;
    if (color[0] !== "#") return color;
    const hex = color.slice(1);
    const value = hex.length === 3
      ? hex.split("").map((part) => part + part).join("")
      : hex;
    const n = parseInt(value, 16);
    if (!Number.isFinite(n)) return color;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function petPalette() {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    const theme = root.dataset.theme || "candy";
    return {
      theme,
      dark: theme === "bubblegum",
      card: read("--theme-card", "#fffdf8"),
      border: read("--theme-border", "#fffdf8"),
      active: read("--theme-active", "#ff6fae"),
      ink: read("--theme-card-ink", "#4d2b50"),
    };
  }

  function refreshPetPalette() {
    state.petPalette = petPalette();
    for (const pet of state.pets) {
      if (pet.renderer) pet.renderer.refreshTheme(state.petPalette);
    }
  }

  function canvasRoundRect(ctx, x, y, w, h, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function drawPetBodyPattern(ctx, def, w, h) {
    const accent = withAlpha(def.accent, 0.4);
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    ctx.lineCap = "round";
    ctx.lineWidth = 2;

    if (def.pattern === "stripes") {
      for (let i = 0; i < 3; i += 1) {
        const y = -h * 0.24 + i * h * 0.2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.48, y);
        ctx.quadraticCurveTo(-w * 0.38, y - h * 0.05, -w * 0.27, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w * 0.48, y);
        ctx.quadraticCurveTo(w * 0.38, y - h * 0.05, w * 0.27, y);
        ctx.stroke();
      }
    } else if (def.pattern === "spots") {
      const spots = [
        [-0.38, 0.18], [0.37, -0.2], [0.4, 0.24], [-0.34, -0.28], [0.28, 0.36],
      ];
      for (const [x, y] of spots) {
        ctx.beginPath();
        ctx.arc(x * w, y * h, w * 0.045, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (def.pattern === "belly") {
      ctx.beginPath();
      ctx.ellipse(0, h * 0.37, w * 0.24, h * 0.17, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.52)";
      ctx.fill();
      ctx.strokeStyle = withAlpha(def.accent, 0.22);
      ctx.stroke();
    } else if (def.pattern === "tuxedo") {
      ctx.fillStyle = "rgba(44,55,78,0.16)";
      ctx.beginPath();
      ctx.moveTo(-w * 0.48, h * 0.08);
      ctx.quadraticCurveTo(-w * 0.3, h * 0.28, -w * 0.35, h * 0.5);
      ctx.lineTo(-w * 0.5, h * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w * 0.48, h * 0.08);
      ctx.quadraticCurveTo(w * 0.3, h * 0.28, w * 0.35, h * 0.5);
      ctx.lineTo(w * 0.5, h * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (def.pattern === "shell") {
      ctx.strokeStyle = withAlpha(def.accent, 0.34);
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, h * 0.2, w * (0.18 + i * 0.11), Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      }
    } else if (def.pattern === "sparkle") {
      const stars = [[-0.34, -0.28, 0.055], [0.35, 0.18, 0.04], [0.26, -0.34, 0.032]];
      ctx.fillStyle = withAlpha(def.accent, 0.55);
      for (const [x, y, r] of stars) {
        const cx = x * w;
        const cy = y * h;
        const radius = r * w;
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx + radius * 0.36, cy - radius * 0.36);
        ctx.lineTo(cx + radius, cy);
        ctx.lineTo(cx + radius * 0.36, cy + radius * 0.36);
        ctx.lineTo(cx, cy + radius);
        ctx.lineTo(cx - radius * 0.36, cy + radius * 0.36);
        ctx.lineTo(cx - radius, cy);
        ctx.lineTo(cx - radius * 0.36, cy - radius * 0.36);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function petBodyPath(ctx, def, w, h) {
    // A soft, slightly asymmetric bean instead of a perfect circle.
    ctx.beginPath();
    ctx.moveTo(-w * 0.08, -h * 0.5);
    ctx.bezierCurveTo(w * 0.27, -h * 0.54, w * 0.5, -h * 0.25, w * 0.48, h * 0.03);
    ctx.bezierCurveTo(w * 0.46, h * 0.33, w * 0.27, h * 0.5, -w * 0.02, h * 0.5);
    ctx.bezierCurveTo(-w * 0.33, h * 0.5, -w * 0.51, h * 0.3, -w * 0.48, h * 0.02);
    ctx.bezierCurveTo(-w * 0.45, -h * 0.29, -w * 0.28, -h * 0.5, -w * 0.08, -h * 0.5);
    ctx.closePath();
  }

  function petCutBodyPath(ctx, def, w, h) {
    // A softly scalloped, lopsided die-cut. The irregular edge is what makes
    // it read as a peeled sticker instead of a normal rounded badge.
    const points = [];
    const count = 12;
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
      const wobble = 1 + (i % 2 === 0 ? 0.085 : -0.065) + Math.sin(i * 1.7) * 0.025;
      points.push({
        x: Math.cos(angle) * w * 0.5 * wobble - w * 0.018,
        y: Math.sin(angle) * h * 0.5 * wobble + h * 0.012,
      });
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < count; i += 1) {
      const p0 = points[(i - 1 + count) % count];
      const p1 = points[i];
      const p2 = points[(i + 1) % count];
      const p3 = points[(i + 2) % count];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
    }
    ctx.closePath();
  }

  function makePetHead(def, palette, dpr) {
    const w = def.w;
    const h = def.h;
    const pad = PET_BODY_VARIANT === "cut" ? 16 : 6;
    const head = document.createElement("canvas");
    head.width = Math.max(1, Math.round((w + pad * 2) * dpr));
    head.height = Math.max(1, Math.round((h + pad * 2) * dpr));
    head.pad = pad;
    const ctx = head.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(pad + w / 2, pad + h / 2);

    const cut = PET_BODY_VARIANT === "cut";
    if (cut) ctx.rotate(-0.07);
    if (cut) {
      // The white backing is offset from the coloured sticker, so the cut edge
      // reads as a real die-cut rather than a normal border.
      ctx.save();
      ctx.translate(w * 0.035, -h * 0.03);
      ctx.scale(1.055, 1.055);
      petCutBodyPath(ctx, def, w, h);
      ctx.shadowColor = "rgba(64, 34, 72, 0.2)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#fffdf8";
      ctx.fill();
      ctx.restore();
      petCutBodyPath(ctx, def, w, h);
    } else {
      petBodyPath(ctx, def, w, h);
    }

    ctx.save();
    if (!cut) {
      ctx.shadowColor = "rgba(64, 34, 72, 0.18)";
      ctx.shadowBlur = 7;
      ctx.shadowOffsetY = 4;
    }
    ctx.fillStyle = def.body || palette.card;
    ctx.fill();
    ctx.restore();

    ctx.lineJoin = "round";
    if (palette.dark) {
      ctx.lineWidth = cut ? 8 : 6;
      ctx.strokeStyle = "#241239";
      ctx.stroke();
    }
    ctx.lineWidth = cut ? 5 : palette.dark ? 3 : 3.5;
    ctx.strokeStyle = palette.border;
    ctx.stroke();
    ctx.lineWidth = cut ? 1.6 : 1.2;
    ctx.strokeStyle = withAlpha(def.accent, cut ? 0.48 : 0.38);
    ctx.stroke();

    // Body shading and species markings live inside the sticker silhouette.
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(0, h * 0.4, w * 0.42, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.04)";
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, h * 0.3, w * 0.26, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fill();
    drawPetBodyPattern(ctx, def, w, h);
    ctx.restore();

    // A small sticker gloss keeps the badge from looking like a flat circle.
    ctx.beginPath();
    ctx.ellipse(-w * 0.2, -h * 0.28, w * 0.2, h * 0.11, -0.38, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fill();

    let font = Math.round(h * 0.72);
    ctx.font = `${font}px ${PET_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const measured = ctx.measureText(def.emoji);
    const maxWidth = w * 0.9;
    if (measured.width > maxWidth) {
      font = Math.max(12, Math.floor((font * maxWidth) / measured.width));
      ctx.font = `${font}px ${PET_FONT}`;
    }
    ctx.fillText(def.emoji, 0, h * 0.02);

    // Very soft cheeks, mostly visible on lighter species.
    ctx.fillStyle = withAlpha(def.accent, 0.16);
    ctx.beginPath();
    ctx.ellipse(-w * 0.27, h * 0.2, w * 0.09, h * 0.055, -0.2, 0, Math.PI * 2);
    ctx.ellipse(w * 0.27, h * 0.2, w * 0.09, h * 0.055, 0.2, 0, Math.PI * 2);
    ctx.fill();

    if (cut) {
      ctx.save();
      ctx.translate(w * 0.42, -h * 0.04);
      ctx.rotate(-0.42);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.24, 0);
      ctx.lineTo(0, h * 0.24);
      ctx.closePath();
      ctx.fillStyle = "#ffe7f2";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#f2b9d2";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.05);
      ctx.lineTo(w * 0.15, h * 0.05);
      ctx.strokeStyle = "rgba(210,120,160,0.55)";
      ctx.stroke();
      ctx.restore();
    }

    return head;
  }

  function drawPetTail(ctx, def, motion, cx, badgeCenterY) {
    if (!def.tail || def.tail === "none") return;
    const baseX = cx - def.w * 0.26;
    const baseY = badgeCenterY + def.h * 0.28;
    const sway = Math.sin(motion.tailPhase) * (def.tail === "tiny" ? 0.12 : 0.32);
    const length = def.w * (def.tail === "tiny" ? 0.25 : def.tail === "thin" ? 0.65 : 0.6);
    const tipX = baseX - length * (0.78 + sway * 0.12);
    const tipY = baseY - length * (0.72 + Math.sin(sway) * 0.12) - def.h * 0.04;
    const ctrl1X = baseX - length * 0.38;
    const ctrl1Y = baseY + length * 0.26;
    const ctrl2X = baseX - length * 0.92;
    const ctrl2Y = baseY - length * 0.3;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = def.accent;
    ctx.fillStyle = def.accent;

    const tailPath = () => {
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.bezierCurveTo(ctrl1X, ctrl1Y, ctrl2X, ctrl2Y, tipX, tipY);
    };

    if (def.tail === "fluffy") {
      ctx.lineWidth = Math.max(5, def.w * 0.14);
      tailPath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tipX, tipY, def.w * 0.085, 0, Math.PI * 2);
      ctx.fill();
    } else if (def.tail === "round") {
      ctx.lineWidth = Math.max(2.4, def.w * 0.05);
      tailPath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tipX, tipY, def.w * 0.11, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = def.tail === "thin" ? Math.max(2, def.w * 0.045) : Math.max(3, def.w * 0.055);
      tailPath();
      ctx.stroke();
      if (def.tail === "tuft") {
        const tufts = [
          [tipX - def.w * 0.03, tipY - def.h * 0.04],
          [tipX + def.w * 0.015, tipY - def.h * 0.015],
          [tipX + def.w * 0.045, tipY + def.h * 0.025],
        ];
        for (const [tx, ty] of tufts) {
          ctx.beginPath();
          ctx.arc(tx, ty, def.w * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (def.tail === "tiny") {
        ctx.beginPath();
        ctx.arc(tipX, tipY, Math.max(1.5, def.w * 0.025), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawPetFoot(ctx, x, y, w, h, shape, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    if (shape === "webbed") {
      ctx.moveTo(-w / 2, h * 0.2);
      ctx.quadraticCurveTo(-w * 0.46, -h * 0.5, 0, -h * 0.55);
      ctx.quadraticCurveTo(w * 0.46, -h * 0.5, w / 2, h * 0.2);
      ctx.quadraticCurveTo(0, h * 0.55, -w / 2, h * 0.2);
      ctx.closePath();
    } else if (shape === "long") {
      ctx.ellipse(0, 0, w * 0.5, h * 0.38, 0, 0, Math.PI * 2);
    } else if (shape === "flipper") {
      ctx.ellipse(0, 0, w * 0.4, h * 0.5, 0.3, 0, Math.PI * 2);
    } else if (shape === "stub") {
      ctx.ellipse(0, 0, w * 0.42, h * 0.3, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(0, 0, w * 0.46, h * 0.4, 0, 0, Math.PI * 2);
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
  }

  function drawPetPaw(ctx, x, y, w, h, shape, fill, stroke) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    if (shape === "point") {
      ctx.moveTo(-w * 0.5, h * 0.2);
      ctx.quadraticCurveTo(-w * 0.2, -h * 0.8, w * 0.55, -h * 0.1);
      ctx.quadraticCurveTo(w * 0.3, h * 0.6, -w * 0.5, h * 0.2);
      ctx.closePath();
    } else if (shape === "flipper" || shape === "wing") {
      ctx.ellipse(0, 0, w * 0.34, h * 0.62, shape === "wing" ? -0.25 : 0.2, 0, Math.PI * 2);
    } else if (shape === "webbed") {
      ctx.ellipse(0, 0, w * 0.46, h * 0.4, 0, 0, Math.PI * 2);
    } else {
      ctx.ellipse(0, 0, w * 0.44, h * 0.42, -0.15, 0, Math.PI * 2);
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = stroke;
    ctx.stroke();
    ctx.restore();
  }

  function drawPetStar(ctx, x, y, radius, fill) {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? radius : radius * 0.44;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawPetAccessoryBack(ctx, pet, def, motion, cx, badgeCenterY) {
    const acc = pet.accessory;
    if (!acc || acc.id !== "backpack") return;
    const x = cx + def.w * 0.46;
    const y = badgeCenterY + def.h * 0.03;
    const bw = def.w * 0.3;
    const bh = def.h * 0.38;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.08 + Math.sin(motion.tailPhase * 0.5) * 0.02);
    ctx.beginPath();
    canvasRoundRect(ctx, -bw / 2, -bh / 2, bw, bh, bw * 0.24);
    ctx.fillStyle = acc.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = acc.shade;
    ctx.stroke();
    ctx.beginPath();
    canvasRoundRect(ctx, -bw * 0.32, -bh * 0.42, bw * 0.64, bh * 0.28, bw * 0.15);
    ctx.fillStyle = acc.shade;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPetAccessoryFront(ctx, pet, def, motion, cx, badgeCenterY) {
    const acc = pet.accessory;
    if (!acc) return;
    if (acc.id === "scarf") {
      const y = badgeCenterY + def.h * 0.3;
      const bw = def.w * 0.72;
      ctx.save();
      ctx.translate(cx, y);
      ctx.beginPath();
      canvasRoundRect(ctx, -bw / 2, -def.h * 0.055, bw, def.h * 0.13, def.h * 0.06);
      ctx.fillStyle = acc.color;
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = acc.shade;
      ctx.stroke();
      ctx.save();
      ctx.translate(def.w * 0.25, def.h * 0.04);
      ctx.rotate(0.18 + Math.sin(motion.tailPhase * 0.6) * 0.04);
      ctx.beginPath();
      canvasRoundRect(ctx, -def.w * 0.055, 0, def.w * 0.11, def.h * 0.26, def.w * 0.04);
      ctx.fillStyle = acc.color;
      ctx.fill();
      ctx.strokeStyle = acc.shade;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, def.h * 0.28, def.w * 0.075, 0, Math.PI * 2);
      ctx.fillStyle = acc.color;
      ctx.fill();
      ctx.strokeStyle = acc.shade;
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    } else if (acc.id === "bow") {
      const x = cx + def.w * 0.34;
      const y = badgeCenterY - def.h * 0.29;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.25);
      ctx.fillStyle = acc.color;
      ctx.strokeStyle = acc.shade;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-def.w * 0.07, 0, def.w * 0.09, def.h * 0.065, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(def.w * 0.07, 0, def.w * 0.09, def.h * 0.065, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, def.w * 0.045, 0, Math.PI * 2);
      ctx.fillStyle = acc.shade;
      ctx.fill();
      ctx.restore();
    } else if (acc.id === "star") {
      ctx.save();
      ctx.translate(cx - def.w * 0.35, badgeCenterY - def.h * 0.24);
      ctx.rotate(-0.12 + Math.sin(motion.tailPhase * 0.5) * 0.04);
      drawPetStar(ctx, 0, 0, def.w * 0.12, acc.color);
      ctx.lineWidth = 1;
      ctx.strokeStyle = acc.shade;
      ctx.stroke();
      ctx.restore();
    } else if (acc.id === "backpack") {
      const x = cx + def.w * 0.18;
      const y = badgeCenterY + def.h * 0.24;
      ctx.save();
      ctx.strokeStyle = acc.shade;
      ctx.lineWidth = Math.max(2, def.w * 0.045);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx + def.w * 0.34, badgeCenterY - def.h * 0.28);
      ctx.quadraticCurveTo(x, badgeCenterY, x + def.w * 0.08, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + def.w * 0.08, y, def.w * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = acc.color;
      ctx.fill();
      ctx.strokeStyle = acc.shade;
      ctx.stroke();
      ctx.restore();
    }
  }

  function createMonsterRenderer(pet, def, dpr) {
    const canvas = pet.canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const image = new Image();
    const base = new Image();
    let imageReady = false;
    let patches = null;
    let ready = false;
    let elapsed = 0;
    let dust = [];
    let nextBlink = 2.2 + Math.random() * 3.8;
    let blinkAt = null;
    let nextMouth = 3.2 + Math.random() * 4.5;
    let mouthAt = null;
    let current = "Idle";
    const phase = Math.random() * Math.PI * 2;
    const ink = def.ink || "#3a233e";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    function eyeBand() {
      const layout = def.eyeLayout || "row";
      const count = def.eyeCount || 2;
      const eyeX = def.eyeX == null ? 0.5 : def.eyeX;
      const eyeY = def.eyeY == null ? 0.34 : def.eyeY;
      const spread = def.eyeSpread == null ? 0.16 : def.eyeSpread;
      if (layout === "column") {
        const gap = def.eyeGap == null ? 0.14 : def.eyeGap;
        return { x: eyeX, y: eyeY, rx: 0.2, ry: 0.11 + ((count - 1) * gap) / 2 + 0.12 };
      }
      if (count === 1) return { x: eyeX, y: eyeY, rx: 0.17, ry: 0.16 };
      return { x: eyeX, y: eyeY, rx: spread + 0.14, ry: 0.15 };
    }

    function mouthBand() {
      return {
        x: def.mouthX == null ? 0.5 : def.mouthX,
        y: def.mouthY == null ? 0.57 : def.mouthY,
        rx: (def.mouthW == null ? 0.28 : def.mouthW) + 0.05,
        ry: (def.mouthH == null ? 0.13 : def.mouthH) + 0.05,
      };
    }

    function makeBandPatch(source, band) {
      if (!source.width || !source.height) return null;
      const iw = source.width;
      const ih = source.height;
      const rx = Math.max(2, band.rx * iw);
      const ry = Math.max(2, band.ry * ih);
      const w = Math.ceil(rx * 2);
      const h = Math.ceil(ry * 2);
      const cx = band.x * iw;
      const cy = band.y * ih;
      const patch = document.createElement("canvas");
      patch.width = w;
      patch.height = h;
      const px = patch.getContext("2d");
      if (!px) return null;
      px.drawImage(source, w / 2 - cx, h / 2 - cy);
      px.globalCompositeOperation = "destination-in";
      px.save();
      px.translate(w / 2, h / 2);
      px.scale(w / 2, h / 2);
      const mask = px.createRadialGradient(0, 0, 0, 0, 0, 1);
      mask.addColorStop(0, "rgba(0,0,0,1)");
      mask.addColorStop(0.8, "rgba(0,0,0,1)");
      mask.addColorStop(1, "rgba(0,0,0,0)");
      px.beginPath();
      px.arc(0, 0, 1, 0, Math.PI * 2);
      px.fillStyle = mask;
      px.fill();
      px.restore();
      return { canvas: patch, x: cx - w / 2, y: cy - h / 2, w, h };
    }

    function buildPatches() {
      if (!imageReady) return;
      if (base.width && base.height) {
        const eye = makeBandPatch(base, eyeBand());
        const mouthBase = makeBandPatch(base, mouthBand());
        const mouthFace = makeBandPatch(image, mouthBand());
        patches = eye && mouthBase && mouthFace ? { eye, mouthBase, mouthFace } : null;
      }
      ready = true;
    }

    function spawnDust(x, y, count = 2) {
      for (let i = 0; i < count; i += 1) {
        if (dust.length > 10) dust.shift();
        dust.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 2,
          vx: (Math.random() - 0.5) * 18,
          vy: -10 - Math.random() * 14,
          life: 0.34 + Math.random() * 0.2,
          size: 1.2 + Math.random() * 2,
        });
      }
    }

    function closedEyes(fitW, fitH, ox, oy) {
      const count = def.eyeCount || 2;
      const layout = def.eyeLayout || "row";
      const eyeX = def.eyeX == null ? 0.5 : def.eyeX;
      const eyeY = def.eyeY == null ? 0.34 : def.eyeY;
      const spread = def.eyeSpread == null ? 0.16 : def.eyeSpread;
      const gap = def.eyeGap == null ? 0.14 : def.eyeGap;
      const points = [];
      if (layout === "column") {
        for (let i = 0; i < count; i += 1) {
          points.push({ x: eyeX, y: eyeY + (i - (count - 1) / 2) * gap });
        }
      } else if (count <= 1) {
        points.push({ x: eyeX, y: eyeY });
      } else {
        const step = spread / ((count - 1) / 2);
        for (let i = 0; i < count; i += 1) {
          points.push({ x: eyeX + (i - (count - 1) / 2) * step, y: eyeY });
        }
      }
      ctx.save();
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.5, fitW * 0.009);
      ctx.lineCap = "round";
      for (const point of points) {
        const cx = ox + point.x * fitW;
        const cy = oy + point.y * fitH;
        const half = fitW * (count === 1 ? 0.075 : 0.045);
        const drop = fitH * 0.018;
        ctx.beginPath();
        ctx.moveTo(cx - half, cy);
        ctx.quadraticCurveTo(cx, cy + drop, cx + half, cy);
        ctx.stroke();
      }
      ctx.restore();
    }

    function draw(dt) {
      const w = pet.drawW;
      const h = pet.drawH;
      const calm = REDUCED_MOTION;
      elapsed += dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (dust.length) {
        for (const puff of dust) {
          const alpha = Math.max(0, puff.life / 0.5) * 0.2;
          ctx.beginPath();
          ctx.arc(puff.x, puff.y, puff.size + (0.5 - puff.life) * 4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(120, 88, 108, ${alpha})`;
          ctx.fill();
        }
      }

      if (!ready) return;
      const iw = image.width;
      const ih = image.height;
      const fitH = h;
      const fitW = fitH * (iw / ih);
      const ox = (w - fitW) / 2;
      const oy = h - fitH;
      const b = pet.brain || {};
      const t = elapsed + phase;
      const energy = b.action === "cheer" || b.action === "nuzzle" ? 1 : b.moving ? 0.45 : 0;
      let sx = 1 + (calm ? 0.008 : 0.032 + 0.018 * energy) * Math.sin(t * 2.1);
      let sy = 1 - (calm ? 0.006 : 0.026 + 0.016 * energy) * Math.sin(t * 2.1 + 0.7);
      let shear = (calm ? 0.006 : 0.045 + 0.026 * energy) * Math.sin(t * 1.5 + phase * 0.4);
      let rot = (calm ? 0.004 : 0.02 + 0.012 * energy) * Math.sin(t * 1.1 + phase);
      let bob = calm ? 0 : Math.sin(t * 2) * 2.2;
      if (b.action === "nap") {
        sx = 1 + 0.008 * Math.sin(t * 1.1);
        sy = 1 + 0.012 * Math.sin(t * 1.1 + 1.2);
        shear = 0.004 * Math.sin(t * 0.9);
        rot = 0.004 * Math.sin(t * 0.8);
        bob = 0;
      }

      ctx.save();
      ctx.translate(w / 2, h + bob);
      ctx.rotate(rot);
      ctx.scale(sx, sy);
      ctx.transform(1, 0, shear, 1, 0, 0);
      ctx.translate(-w / 2, -h);
      ctx.drawImage(image, ox, oy, fitW, fitH);

      if (patches) {
        let blink = false;
        if (b.action === "nap") {
          blink = true;
        } else if (blinkAt != null) {
          if (elapsed - blinkAt < 0.18) blink = true;
          else blinkAt = null;
        } else if (elapsed > nextBlink) {
          blinkAt = elapsed;
          nextBlink = elapsed + 2.5 + Math.random() * 4;
          blink = true;
        }
        if (blink) {
          const p = patches.eye;
          const sx2 = fitW / iw;
          const sy2 = fitH / ih;
          ctx.drawImage(p.canvas, ox + p.x * sx2, oy + p.y * sy2, p.w * sx2, p.h * sy2);
          closedEyes(fitW, fitH, ox, oy);
        }

        let open = 0;
        if (b.action === "cheer" || b.action === "nuzzle" || pet.squeakTimer > 0) open = 1;
        else if (b.action === "chase") open = 0.55;
        if (!calm && elapsed > nextMouth) {
          mouthAt = elapsed;
          nextMouth = elapsed + 4 + Math.random() * 5;
        }
        if (mouthAt != null) {
          const age = elapsed - mouthAt;
          if (age >= 0.5) mouthAt = null;
          else open = Math.max(open, Math.sin((age / 0.5) * Math.PI));
        }
        if (b.action === "nap") open = 0;
        if (open > 0.02) {
          const mb = patches.mouthBase;
          const mf = patches.mouthFace;
          const sx2 = fitW / iw;
          const sy2 = fitH / ih;
          const dx = ox + mb.x * sx2;
          const dy = oy + mb.y * sy2;
          const dw = mb.w * sx2;
          const dh = mb.h * sy2;
          ctx.drawImage(mb.canvas, dx, dy, dw, dh);
          const scaleY = 1 + 0.2 * open;
          ctx.drawImage(mf.canvas, dx, dy + dh / 2 - (dh * scaleY) / 2, dw, dh * scaleY);
        }
      }
      ctx.restore();

      if (dust.length) {
        for (const puff of dust) {
          puff.x += puff.vx * dt;
          puff.y += puff.vy * dt;
          puff.vy += 30 * dt;
          puff.life -= dt;
        }
        dust = dust.filter((puff) => puff.life > 0);
      }

      if (b.action === "nap") current = "Sleep";
      else if (b.action === "cheer" || b.action === "nuzzle") current = "Happy";
      else if (pet.hopY < -2) current = "Jump";
      else if (b.moving) current = "Walk";
      else current = "Idle";
    }

    image.onload = () => {
      imageReady = true;
      buildPatches();
      draw(0);
    };
    base.onload = buildPatches;
    image.onerror = () => {
      pet.renderer = createPetRenderer(pet, def, dpr);
    };
    base.onerror = () => {
      patches = null;
      if (imageReady) ready = true;
    };
    image.src = def.image;
    base.src = def.base;

    return {
      draw,
      spawnDust,
      refreshTheme() {},
      getAction: () => current,
      kind: "monster",
      isMonster: true,
    };
  }

  function createPetRenderer(pet, def, dpr) {
    const canvas = pet.canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    let palette = state.petPalette || petPalette();
    let head = makePetHead(def, palette, dpr);
    if (!head) return null;
    let dust = [];

    function refreshTheme(next) {
      palette = next || petPalette();
      head = makePetHead(def, palette, dpr);
    }

    function spawnDust(x, y, count = 2) {
      for (let i = 0; i < count; i += 1) {
        if (dust.length > 10) dust.shift();
        dust.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 2,
          vx: (Math.random() - 0.5) * 16,
          vy: -8 - Math.random() * 12,
          life: 0.32 + Math.random() * 0.2,
          size: 1.2 + Math.random() * 2,
        });
      }
    }

    function draw(dt) {
      const p = pet;
      const m = p.motion;
      const w = p.drawW;
      const h = p.drawH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const footY = h - 3;
      const badgeBottom = footY - def.h * 0.17;
      const badgeCenterY = badgeBottom - def.h / 2;

      // Contact dust lives behind the feet.
      for (const puff of dust) {
        const alpha = Math.max(0, puff.life / 0.5) * 0.22;
        ctx.beginPath();
        ctx.arc(puff.x, puff.y, puff.size + (0.5 - puff.life) * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 88, 108, ${alpha})`;
        ctx.fill();
      }

      drawPetTail(ctx, def, m, cx, badgeCenterY);

      const footW = Math.max(9, def.w * 0.22);
      const footH = Math.max(6, def.h * 0.14);
      const liftL = m.footL;
      const liftR = m.footR;
      ctx.save();
      ctx.strokeStyle = def.accent;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2, def.w * 0.055);
      ctx.beginPath();
      ctx.moveTo(cx - def.w * 0.12, badgeBottom - 1);
      ctx.lineTo(cx - def.w * 0.17, footY - 6 - liftL);
      ctx.moveTo(cx + def.w * 0.12, badgeBottom - 1);
      ctx.lineTo(cx + def.w * 0.17, footY - 6 - liftR);
      ctx.stroke();
      ctx.restore();
      drawPetFoot(ctx, cx - def.w * 0.17, footY - 4 - liftL, footW, footH, def.foot, def.accent, palette.card);
      drawPetFoot(ctx, cx + def.w * 0.17, footY - 4 - liftR, footW, footH, def.foot, def.accent, palette.card);
      drawPetAccessoryBack(ctx, pet, def, m, cx, badgeCenterY);

      if (head) {
        const napDrop = m.action === "nap" ? def.h * 0.1 : 0;
        ctx.save();
        ctx.translate(cx + m.lookX * 1.6, badgeCenterY + m.bob + napDrop);
        ctx.rotate(m.tilt + m.spin);
        ctx.scale(m.squashX, m.squashY);
        const pad = head.pad || 0;
        ctx.drawImage(
          head,
          0,
          0,
          head.width,
          head.height,
          -def.w / 2 - pad,
          -def.h / 2 - pad,
          def.w + pad * 2,
          def.h + pad * 2,
        );
        ctx.restore();
      }

      drawPetAccessoryFront(ctx, pet, def, m, cx, badgeCenterY);

      const pawW = Math.max(9, def.w * 0.27);
      const pawH = Math.max(8, def.h * 0.2);
      const pawY = badgeCenterY + def.h * 0.27;
      ctx.save();
      ctx.strokeStyle = def.accent;
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(2, def.w * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx - def.w * 0.3, badgeCenterY + def.h * 0.14);
      ctx.lineTo(cx - def.w * 0.32, pawY - m.pawL);
      ctx.moveTo(cx + def.w * 0.3, badgeCenterY + def.h * 0.14);
      ctx.lineTo(cx + def.w * 0.32, pawY - m.pawR);
      ctx.stroke();
      ctx.restore();
      drawPetPaw(
        ctx,
        cx - def.w * 0.32,
        pawY - m.pawL,
        pawW,
        pawH,
        def.paw,
        def.accent,
        palette.card,
      );
      drawPetPaw(
        ctx,
        cx + def.w * 0.32,
        pawY - m.pawR,
        pawW,
        pawH,
        def.paw,
        def.accent,
        palette.card,
      );

      // Dust drifts above the feet after a step or landing.
      if (dust.length) {
        for (const puff of dust) {
          puff.x += puff.vx * dt;
          puff.y += puff.vy * dt;
          puff.vy += 32 * dt;
          puff.life -= dt;
        }
        dust = dust.filter((puff) => puff.life > 0);
      }
    }

    return { draw, refreshTheme, spawnDust };
  }

  function createPetElement(def, w, h, drawW, drawH) {
    const el = document.createElement("div");
    el.className = "pet";
    el.dataset.pet = def.id;
    el.dataset.shape = def.shape || "round";
    el.style.setProperty("--pet-w", `${w}px`);
    el.style.setProperty("--pet-h", `${h}px`);

    const shadow = document.createElement("span");
    shadow.className = "pet-shadow";

    const canvas = document.createElement("canvas");
    canvas.className = "pet-canvas";
    canvas.width = Math.max(1, Math.round(drawW * PET_DPR));
    canvas.height = Math.max(1, Math.round(drawH * PET_DPR));
    canvas.style.width = `${drawW}px`;
    canvas.style.height = `${drawH}px`;

    const bubble = document.createElement("span");
    bubble.className = "pet-squeak";
    bubble.dataset.i18n = def.say;
    bubble.textContent = tr(def.say);

    el.append(shadow, canvas, bubble);
    return { el, canvas };
  }

  function petPickTarget(p, fieldW, bias = 0) {
    const min = p.drawW / 2 + 8;
    const max = Math.max(min + 24, fieldW - p.drawW / 2 - 10);
    let lo = min;
    let hi = max;
    if (!bias && state.settled.length > 1 && Math.random() < 0.72) {
      let pileLeft = Infinity;
      let pileRight = -Infinity;
      for (const settled of state.settled) {
        pileLeft = Math.min(pileLeft, settled.x);
        pileRight = Math.max(pileRight, settled.x + settled.w);
      }
      if (pileRight - pileLeft > 40) {
        lo = Math.max(min, pileLeft + 8);
        hi = Math.min(max, pileRight - 8);
        if (hi - lo < 36) {
          lo = min;
          hi = max;
        }
      }
    }
    let next = lo + Math.random() * (hi - lo);
    if (!bias && Math.abs(next - p.x) < 46) {
      const away = p.x < fieldW / 2 ? 1 : -1;
      next = p.x + away * (64 + Math.random() * 86);
    } else if (bias) {
      next = p.x + bias * (58 + Math.random() * 76);
    }
    return Math.min(max, Math.max(min, next));
  }

  function petGroundAt(x) {
    const fieldH = els.field.clientHeight || 480;
    let ground = fieldH - Math.max(10, Math.round(fieldH * 0.02));
    for (const settled of state.settled) {
      if (x >= settled.x - 4 && x <= settled.x + settled.w + 4 && settled.y < ground) {
        ground = Math.max(64, settled.y - 5);
      }
    }
    return Math.max(64, ground);
  }

  function paintCardTop(card) {
    return Math.max(64, card.y + 3);
  }

  function paintPetOverlap(p, card) {
    const centerX = card.x + card.w / 2;
    const halfW = (p.drawW || p.w || 70) * 0.46;
    const height = (p.h || 80) * 1.02;
    const left = centerX - halfW;
    const right = centerX + halfW;
    const top = card.y - height;
    const bottom = card.y - 2;
    let overlap = 0;
    for (const other of state.settled) {
      if (other === card) continue;
      const ox = Math.min(right, other.x + other.w) - Math.max(left, other.x);
      const oy = Math.min(bottom, other.y + other.h) - Math.max(top, other.y);
      if (ox > 0 && oy > 0) overlap += ox * oy;
    }
    return overlap;
  }

  function paintPickCard(p, exclude) {
    const cards = state.settled.filter(
      (card) => card && card.el && card.el.isConnected && card !== exclude,
    );
    if (!cards.length) return null;
    const visible = cards.filter((card) => card.y >= (p.h || 80) + 10);
    const roomy = visible.filter((card) => card.w >= 62);
    let pool = roomy.length ? roomy : visible.length ? visible : cards;
    const far = pool.filter((card) => Math.abs(card.x + card.w / 2 - p.x) > 52);
    if (far.length) pool = far;
    // Prefer a card with free paper above it, so the pet does not cover a
    // neighbouring word while it rests.
    const scored = pool.map((card) => ({ card, overlap: paintPetOverlap(p, card) }));
    const least = Math.min(...scored.map((item) => item.overlap));
    const clear = scored.filter((item) => item.overlap <= least + 420);
    return clear[Math.floor(Math.random() * clear.length)].card;
  }

  function paintStartJump(p, card) {
    const st = p.paint;
    const fieldW = els.field.clientWidth || 360;
    const minX = p.drawW / 2 + 2;
    const maxX = Math.max(minX, fieldW - p.drawW / 2 - 2);
    const jitter = (Math.random() - 0.5) * Math.min(16, card.w * 0.24);
    const toX = Math.max(minX, Math.min(maxX, card.x + card.w / 2 + jitter));
    const toY = paintCardTop(card);
    const distance = Math.hypot(toX - p.x, toY - p.ground);
    st.card = card;
    st.target = card;
    st.phase = "jump";
    st.fromX = p.x;
    st.fromY = p.ground;
    st.toX = toX;
    st.toY = toY;
    st.t = 0;
    st.duration = REDUCED_MOTION ? 0.3 : Math.max(0.32, Math.min(0.64, 0.28 + distance / 1300));
    st.hop = REDUCED_MOTION ? 24 : 34 + Math.min(76, distance * 0.16);
    // Keep the peak of the arc inside the field even when jumping to a high card.
    const headroom = Math.max(10, Math.min(p.ground, toY) - p.h - 10);
    st.hop = Math.min(st.hop, headroom);
    p.brain.action = "climb";
    p.brain.time = 0;
    p.brain.duration = st.duration;
    p.brain.mood = "excited";
    p.brain.lookTarget = { x: toX, y: toY };
    p.dir = toX >= p.x ? 1 : -1;
  }

  function paintDropToFloor(p) {
    const fieldH = els.field.clientHeight || 480;
    const floorY = fieldH - Math.max(10, Math.round(fieldH * 0.02));
    const st = p.paint;
    st.card = null;
    st.target = null;
    st.phase = "jump";
    st.fromX = p.x;
    st.fromY = p.ground;
    st.toX = p.x;
    st.toY = floorY;
    st.t = 0;
    st.duration = 0.34;
    st.hop = REDUCED_MOTION ? 14 : 22;
    p.brain.action = "climb";
    p.brain.time = 0;
    p.brain.duration = st.duration;
    p.brain.lookTarget = null;
  }

  function updatePaintPet(p, dt) {
    const st = p.paint;
    if (!st) return;
    const fieldH = els.field.clientHeight || 480;
    const floorY = fieldH - Math.max(10, Math.round(fieldH * 0.02));

    if (st.phase === "jump") {
      if (st.target && !state.settled.includes(st.target)) {
        const next = paintPickCard(p, st.card);
        if (next) {
          paintStartJump(p, next);
          return;
        }
        st.target = null;
        st.fromX = p.x;
        st.fromY = p.ground;
        st.toX = p.x;
        st.toY = floorY;
        st.t = 0;
        st.duration = 0.3;
        st.hop = REDUCED_MOTION ? 12 : 20;
      }

      st.t += dt / Math.max(0.01, st.duration);
      const t = Math.min(1, st.t);
      const ease = t * t * (3 - 2 * t);
      p.x = st.fromX + (st.toX - st.fromX) * ease;
      p.ground = st.fromY + (st.toY - st.fromY) * ease;
      p.hopY = -Math.sin(Math.PI * t) * st.hop;
      p.brain.moving = true;
      p.brain.time += dt;
      p.brain.lookTarget = { x: st.toX, y: st.toY };

      if (t >= 1) {
        p.hopY = 0;
        p.x = st.toX;
        p.ground = st.toY;
        st.card = st.target;
        st.target = null;
        st.phase = "rest";
        st.timer = 0.32 + Math.random() * 0.5;
        p.brain.action = "observe";
        p.brain.time = 0;
        p.brain.duration = st.timer;
        p.brain.mood = "happy";
        p.brain.moving = false;
        p.brain.lookTarget = null;
        p.landTimer = 0.18;
        p.el.classList.remove("landed");
        p.el.classList.add("landed");
        if (!REDUCED_MOTION) {
          if (p.renderer) p.renderer.spawnDust(p.drawW / 2, p.h - 4, 3);
          playPetLand();
        }
      }
      return;
    }

    st.timer -= dt;
    p.hopY = 0;
    p.brain.moving = false;
    p.brain.time += dt;

    if (st.card && !state.settled.includes(st.card)) {
      st.card = null;
      st.timer = 0;
    }

    if (st.card) {
      const fieldW = els.field.clientWidth || 360;
      const minX = p.drawW / 2 + 2;
      const maxX = Math.max(minX, fieldW - p.drawW / 2 - 2);
      const targetX = Math.max(minX, Math.min(maxX, st.card.x + st.card.w / 2));
      p.x += (targetX - p.x) * Math.min(1, dt * 7);
      p.ground += (paintCardTop(st.card) - p.ground) * Math.min(1, dt * 10);
      p.brain.action = "observe";
      p.brain.lookTarget =
        state.pointer && performance.now() - state.pointer.at < 2600
          ? { x: state.pointer.x, y: state.pointer.y }
          : null;
    } else {
      p.ground += (floorY - p.ground) * Math.min(1, dt * 8);
      p.brain.action = "observe";
      p.brain.lookTarget = null;
    }

    if (st.timer > 0) return;
    const next = paintPickCard(p, st.card);
    if (next) paintStartJump(p, next);
    else if (st.card) st.timer = 0.45;
    else paintDropToFloor(p);
  }

  function petApply(p) {
    if (!p || !p.el) return;
    const fieldW = els.field.clientWidth || 360;
    const minX = p.drawW / 2 + 2;
    const maxX = Math.max(minX, fieldW - p.drawW / 2 - 2);
    p.x = Math.min(maxX, Math.max(minX, p.x));
    const left = Math.round(p.x - p.w / 2);
    const top = Math.round(p.ground - p.h);
    p.el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    p.el.style.setProperty("--pet-face", p.dir > 0 ? "-1" : "1");
    p.el.style.setProperty("--pet-hop", `${p.hopY.toFixed(1)}px`);
    const lift = Math.min(1, Math.abs(p.hopY) / Math.max(40, p.def.hop));
    p.el.style.setProperty("--pet-shadow-scale", (1 - lift * 0.42).toFixed(2));
    p.el.style.setProperty("--pet-shadow-alpha", (0.86 - lift * 0.4).toFixed(2));
  }

  function clearPets() {
    if (els.petLayer) els.petLayer.replaceChildren();
    state.pets = [];
    state.pet = null;
  }

  function petContext(p) {
    const fieldW = els.field.clientWidth || 360;
    const fieldH = els.field.clientHeight || 480;
    let pileTop = fieldH;
    for (const settled of state.settled) pileTop = Math.min(pileTop, settled.y);
    const danger = state.settled.length ? Math.max(0, Math.min(1, 1 - pileTop / fieldH)) : 0;
    let nearest = null;
    let best = Infinity;
    for (const word of state.words) {
      const cx = word.x + word.w / 2;
      const cy = word.y + word.h / 2;
      const dx = cx - p.x;
      const dy = cy - (p.ground - p.h / 2);
      const distance = dx * dx + dy * dy * 0.55;
      if (distance < best) {
        best = distance;
        nearest = word;
      }
    }
    const pointer = state.pointer && performance.now() - state.pointer.at < 3200 ? state.pointer : null;
    return { fieldW, fieldH, pileTop, danger, nearest, pointer, meteor: state.meteor };
  }

  function petStartAction(p, action, ctx) {
    const b = p.brain;
    b.action = action;
    b.time = 0;
    b.duration = 1.4 + Math.random() * 1.4;
    b.moving = false;
    b.lookTarget = null;
    b.recent.unshift(action);
    if (b.recent.length > 4) b.recent.pop();

    if (action === "wander") {
      b.targetX = petPickTarget(p, ctx.fieldW);
      b.duration = 1.8 + Math.random() * 2.2;
      b.energy = Math.max(0, b.energy - 0.03);
    } else if (action === "observe") {
      b.targetX = p.x;
      b.lookTarget = ctx.pointer
        ? { x: ctx.pointer.x, y: ctx.pointer.y }
        : ctx.nearest
          ? { x: ctx.nearest.x + ctx.nearest.w / 2, y: ctx.nearest.y + ctx.nearest.h / 2 }
          : { x: p.x + p.dir * 90, y: ctx.fieldH * 0.42 };
      b.duration = 1.1 + Math.random() * 1.2;
      b.mood = "curious";
    } else if (action === "climb") {
      b.targetX = petPickTarget(p, ctx.fieldW);
      b.duration = 2.2 + Math.random() * 1.6;
      b.energy = Math.max(0, b.energy - 0.02);
    } else if (action === "sit") {
      b.targetX = p.x;
      b.duration = 2.2 + Math.random() * 2;
      b.energy = Math.min(1, b.energy + 0.16);
      b.mood = "calm";
    } else if (action === "groom") {
      b.targetX = p.x;
      b.duration = 1.6 + Math.random() * 1.2;
      b.energy = Math.min(1, b.energy + 0.1);
      b.mood = "calm";
    } else if (action === "nap") {
      b.targetX = p.x;
      b.duration = 4 + Math.random() * 3;
      b.energy = Math.min(1, b.energy + 0.4);
      b.mood = "sleepy";
    } else if (action === "nuzzle") {
      b.targetX = ctx.pointer ? ctx.pointer.x : p.x;
      b.duration = 1.1;
      b.energy = Math.max(0, b.energy - 0.02);
      b.mood = "happy";
    } else if (action === "nervous") {
      b.targetX = p.x;
      b.duration = 1.5;
      b.mood = "nervous";
    } else if (action === "chase") {
      b.targetX = ctx.meteor ? ctx.meteor.x + ctx.meteor.size / 2 : p.x;
      b.duration = 0.55;
      b.energy = Math.max(0, b.energy - 0.03);
      b.mood = "excited";
    }
  }

  function petChooseAction(p, ctx) {
    const b = p.brain;
    const candidates = [
      ["wander", 0.45],
      ["observe", 0.34 + (ctx.nearest ? 0.18 : 0) + (ctx.pointer ? 0.2 : 0)],
      ["climb", state.settled.length > 2 && ctx.danger < 0.58 ? 0.55 : 0],
      ["sit", b.energy < 0.36 ? 0.85 : 0.06],
      ["groom", b.energy < 0.58 ? 0.26 : 0.04],
      ["nap", b.energy < 0.18 && b.idle > 6 ? 1.05 : 0],
      ["nuzzle", ctx.pointer ? 0.45 + b.sociability * 0.35 : 0],
      ["nervous", ctx.danger > 0.52 ? 0.9 + ctx.danger : 0],
      ["chase", ctx.meteor ? 1.3 : 0],
    ];
    let best = "wander";
    let bestScore = -Infinity;
    for (const [action, base] of candidates) {
      if (!base) continue;
      const recent = b.recent.indexOf(action);
      const penalty = recent === 0 ? 0.55 : recent === 1 ? 0.22 : 0;
      const score = base + Math.random() * 0.2 - penalty;
      if (score > bestScore) {
        bestScore = score;
        best = action;
      }
    }
    petStartAction(p, best, ctx);
  }

  function petThink(p, dt) {
    const b = p.brain;
    b.time += dt;
    b.idle += dt;
    b.thinkTimer -= dt;
    if (b.thinkTimer > 0) return;
    b.thinkTimer = 0.18 + Math.random() * 0.12;

    const ctx = petContext(p);

    if (b.action === "startle" || b.action === "cheer") {
      if (b.time < b.duration) return;
    } else if (ctx.danger > 0.72 && b.action !== "nervous") {
      petStartAction(p, "nervous", ctx);
      return;
    } else if (ctx.meteor && b.action !== "chase") {
      petStartAction(p, "chase", ctx);
      return;
    } else if (b.action === "wander" && Math.abs(b.targetX - p.x) < 4) {
      b.time = b.duration;
    } else if (b.time < b.duration) {
      if (b.action === "observe") {
        if (ctx.pointer) b.lookTarget = { x: ctx.pointer.x, y: ctx.pointer.y };
        else if (ctx.nearest) b.lookTarget = { x: ctx.nearest.x + ctx.nearest.w / 2, y: ctx.nearest.y + ctx.nearest.h / 2 };
      }
      return;
    }

    petChooseAction(p, ctx);
  }

  function petUpdateMotion(p, dt, moving) {
    const m = p.motion;
    const b = p.brain;
    const nap = b.action === "nap";
    m.action = b.action;
    m.breathPhase += dt * (nap ? 1.2 : 2.3);
    m.breath = Math.sin(m.breathPhase) * (nap ? 0.012 : 0.018);
    m.tailPhase += dt * (nap ? 1.1 : 3.1);

    if (moving) {
      m.gaitPhase += dt * (7.5 + p.def.speed * 0.055);
      m.gait = Math.sin(m.gaitPhase);
    } else {
      m.gait *= Math.exp(-dt * 9);
    }
    const stepSign = Math.sign(m.gait);
    if (moving && stepSign !== m.lastStepSign && Math.abs(m.gait) > 0.55) {
      m.lastStepSign = stepSign;
      if (!REDUCED_MOTION) {
        if (p.renderer) p.renderer.spawnDust(p.drawW / 2 + stepSign * p.def.w * 0.2, p.h - 5, 1);
        playPetStep();
      }
    }

    let lookX = 0;
    let lookY = 0;
    if (b.lookTarget) {
      lookX = Math.max(-1, Math.min(1, (b.lookTarget.x - p.x) / (p.def.w * 2.2)));
      lookY = Math.max(-1, Math.min(1, (b.lookTarget.y - (p.ground - p.def.h)) / (p.def.h * 2.4)));
    } else if (b.action === "nervous") {
      lookY = -0.4;
    }
    if (
      (b.action === "observe" || b.action === "nuzzle" || b.action === "nervous" || b.action === "chase") &&
      b.lookTarget &&
      Math.abs(b.lookTarget.x - p.x) > 8
    ) {
      p.dir = b.lookTarget.x > p.x ? 1 : -1;
    }
    m.lookX += (lookX - m.lookX) * Math.min(1, dt * 5);
    m.lookY += (lookY - m.lookY) * Math.min(1, dt * 5);

    let sx = 1 + m.breath;
    let sy = 1 - m.breath;
    if (p.landTimer > 0) {
      const q = p.landTimer / 0.18;
      sx += 0.12 * q;
      sy -= 0.14 * q;
    }
    if (b.action === "cheer") {
      const q = Math.sin(Math.min(1, b.time / Math.max(0.01, b.duration)) * Math.PI);
      sy += q * 0.08;
      sx -= q * 0.04;
    }
    if (nap) sy *= 0.94;
    if (b.action === "sit") {
      sy *= 0.97;
      sx *= 1.01;
    }
    if (b.action === "nervous") {
      sy *= 0.93;
      sx *= 1.03;
    }
    if (b.action === "startle") {
      sy *= 0.95;
      sx *= 1.04;
    }
    m.squashX = sx;
    m.squashY = sy;
    m.tilt = m.lookX * 0.09 + p.dir * 0.014 + (b.action === "nervous" ? 0.04 : 0);
    m.bob = -Math.abs(m.gait) * 1.9
      + (nap ? p.def.h * 0.08 : 0)
      + (b.action === "sit" ? p.def.h * 0.02 : 0)
      + (b.action === "nervous" ? p.def.h * 0.03 : 0)
      + Math.sin(m.breathPhase) * 0.35;
    m.footL = Math.max(0, Math.sin(m.gaitPhase)) * (moving ? 3 : 0);
    m.footR = Math.max(0, Math.sin(m.gaitPhase + Math.PI)) * (moving ? 3 : 0);

    let pawL = 0;
    let pawR = 0;
    if (moving) {
      pawL = Math.max(0, Math.sin(m.gaitPhase + Math.PI)) * 2.2;
      pawR = Math.max(0, Math.sin(m.gaitPhase)) * 2.2;
    }
    if (b.action === "cheer") {
      const q = Math.sin(Math.min(1, b.time / Math.max(0.01, b.duration)) * Math.PI);
      pawL = q * p.def.h * 0.38;
      pawR = q * p.def.h * 0.38;
    } else if (b.action === "groom") {
      pawR = p.def.h * 0.22;
    } else if (b.action === "nuzzle") {
      pawL = 2.5;
      pawR = 2.5;
    } else if (b.action === "sit") {
      pawL = 2.2;
      pawR = 2.2;
    } else if (b.action === "nervous" || b.action === "startle") {
      pawL = 1.6;
      pawR = 1.6;
    }
    m.pawL = pawL;
    m.pawR = pawR;

    if (b.action === "cheer" && !REDUCED_MOTION) {
      const progress = Math.min(1, b.time / Math.max(0.01, b.duration));
      m.spin = Math.sin(progress * Math.PI * 2) * 0.32;
    } else {
      m.spin *= Math.exp(-dt * 12);
    }
  }

  function updatePet(p, dt) {
    if (!p || !p.el) return;
    const fieldW = els.field.clientWidth;
    const fieldH = els.field.clientHeight;
    if (!fieldW || !fieldH) return;

    if (p.squeakCooldown > 0) p.squeakCooldown = Math.max(0, p.squeakCooldown - dt);
    if (p.startleCooldown > 0) p.startleCooldown = Math.max(0, p.startleCooldown - dt);
    if (p.squeakTimer > 0) {
      p.squeakTimer -= dt;
      if (p.squeakTimer <= 0) p.el.classList.remove("squeaking");
    }
    if (p.landTimer > 0) {
      p.landTimer = Math.max(0, p.landTimer - dt);
      if (p.landTimer <= 0) p.el.classList.remove("landed");
    }

    if (state.mode === "paint") {
      updatePaintPet(p, dt);
      petUpdateMotion(p, dt, p.brain.moving);
      petApply(p);
      if (p.renderer) p.renderer.draw(dt);
      return;
    }

    petThink(p, dt);

    const action = p.brain.action;
    const movingAction = PET_MOVING.includes(action);
    let moving = false;
    if (movingAction) {
      const dx = p.brain.targetX - p.x;
      if (Math.abs(dx) > 2.5) {
        p.dir = dx > 0 ? 1 : -1;
        const speed = p.def.speed * (PET_SPEED_FACTOR[action] || 1) * (REDUCED_MOTION ? 0.55 : 1);
        p.x += p.dir * speed * dt;
        moving = true;
        p.brain.energy = Math.max(0, p.brain.energy - dt * 0.012);
        p.brain.idle = Math.max(0, p.brain.idle - dt * 2);
      } else if (action === "wander" || action === "nuzzle") {
        p.brain.time = p.brain.duration;
      }
    }
    p.brain.moving = moving;

    const ground = petGroundAt(p.x);
    if (ground < p.ground - 5 && p.hopY === 0 && p.hopV === 0) {
      p.hopV = -Math.min(p.def.hop, Math.abs(ground - p.ground) * 3.4 + 70);
    }
    const ease = Math.min(1, dt * (ground < p.ground ? 18 : 10));
    p.ground += (ground - p.ground) * ease;

    const canIdleHop = action === "wander" || action === "climb" || action === "observe";
    p.nextHop -= dt;
    if (p.nextHop <= 0) {
      if (canIdleHop && p.hopY === 0 && !REDUCED_MOTION && Math.random() < 0.55) {
        p.hopV = -(p.def.hop * 0.55 + Math.random() * 30);
      }
      const [hopMin, hopMax] = p.def.hopEvery;
      p.nextHop = hopMin + Math.random() * (hopMax - hopMin);
    }

    if (p.hopY < 0 || p.hopV < 0) {
      p.hopV += PET_GRAVITY * dt;
      p.hopY += p.hopV * dt;
      if (p.hopY >= 0) {
        p.hopY = 0;
        p.hopV = 0;
        p.landTimer = 0.18;
        p.el.classList.remove("landed");
        p.el.classList.add("landed");
        if (!REDUCED_MOTION) {
          if (p.renderer) p.renderer.spawnDust(p.drawW / 2, p.h - 4, 3);
          playPetLand();
        }
      }
    }

    petUpdateMotion(p, dt, moving);
    petApply(p);
    if (p.renderer) p.renderer.draw(dt);
  }

  function updatePets(dt) {
    for (const pet of state.pets) updatePet(pet, dt);
    state.pet = state.pets[0] || null;
  }

  function resetPets(forcedDef) {
    clearPets();
    if (!els.petLayer) return;
    state.petPalette = petPalette();
    const def = forcedDef || randomPetDef();
    state.lastPetId = def.id;
    const w = Math.round(def.w * PET_SCALE);
    const h = Math.round(def.h * PET_SCALE);
    const drawW = Math.round(w * 1.38);
    const drawH = h;
    const { el, canvas } = createPetElement(def, w, h, drawW, drawH);
    els.petLayer.appendChild(el);
    const accessory = null;
    const fieldW = els.field.clientWidth || 360;
    const fieldH = els.field.clientHeight || 480;
    const minX = drawW / 2 + 2;
    const maxX = Math.max(minX, fieldW - drawW / 2 - 2);
    const x = Math.min(maxX, Math.max(minX, fieldW * (0.26 + Math.random() * 0.48)));
    const pet = {
      id: def.id,
      def,
      accessory,
      el,
      canvas,
      renderer: null,
      w,
      h,
      drawW,
      drawH,
      x,
      dir: Math.random() < 0.5 ? -1 : 1,
      ground: Math.max(64, fieldH - 10),
      hopY: 0,
      hopV: 0,
      squeakCooldown: 0,
      startleCooldown: 0,
      squeakTimer: 0,
      landTimer: 0,
      nextHop: 2 + Math.random() * 3,
      brain: {
        action: "observe",
        time: 0,
        duration: 1.2,
        thinkTimer: 0,
        targetX: x,
        lookTarget: { x: fieldW / 2, y: fieldH * 0.4 },
        recent: [],
        energy: 0.62 + Math.random() * 0.34,
        sociability: 0.35 + Math.random() * 0.55,
        idle: 0,
        mood: "curious",
        moving: false,
      },
      motion: {
        action: "observe",
        breathPhase: Math.random() * Math.PI * 2,
        breath: 0,
        gaitPhase: Math.random() * Math.PI * 2,
        gait: 0,
        lastStepSign: 0,
        tailPhase: Math.random() * Math.PI * 2,
        lookX: 0,
        lookY: 0,
        tilt: 0,
        spin: 0,
        bob: 0,
        squashX: 1,
        squashY: 1,
        footL: 0,
        footR: 0,
        pawL: 0,
        pawR: 0,
      },
    };
    pet.paint = {
      card: null,
      target: null,
      phase: "rest",
      timer: 0.55 + Math.random() * 0.55,
      fromX: pet.x,
      fromY: pet.ground,
      toX: pet.x,
      toY: pet.ground,
      t: 0,
      duration: 0.4,
      hop: 0,
    };
    pet.renderer = createMonsterRenderer(pet, def, PET_DPR);
    if (!pet.renderer) {
      pet.renderer = createPetRenderer(pet, def, PET_DPR);
    }
    if (!pet.renderer) {
      const body = document.createElement("span");
      body.className = "pet-body";
      body.textContent = def.emoji;
      el.appendChild(body);
      canvas.remove();
    }
    state.pets = [pet];
    state.pet = pet;
    petApply(pet);
    introducePet(pet);
  }

  function introducePet(pet) {
    const bubble = pet.el && pet.el.querySelector(".pet-squeak");
    if (!bubble) return;
    bubble.textContent = tr(`pet.name.${pet.id}`);
    pet.el.classList.add("squeaking");
    window.setTimeout(() => {
      if (!pet.el || !pet.el.isConnected) return;
      pet.el.classList.remove("squeaking");
      bubble.textContent = tr(pet.def.say);
    }, 2200);
  }

  function petSqueak(pet, force = false) {
    if (!pet || !pet.el || state.phase !== "playing") return;
    const p = pet;
    if (!force && p.squeakCooldown > 0) return;
    p.squeakCooldown = 1.8 + Math.random() * 2.2;
    p.squeakTimer = 1.15;
    p.el.classList.remove("squeaking");
    void p.el.offsetWidth;
    p.el.classList.add("squeaking");
    playPetVoice(p.id);
  }

  function petHop(p, power) {
    if (!p || p.hopY < 0 || REDUCED_MOTION) return;
    p.hopV = -Math.max(40, power);
  }

  function petStartle(x) {
    if (state.phase !== "playing") return;
    let closest = null;
    let closestDistance = Infinity;
    for (const p of state.pets) {
      const dx = p.x - x;
      if (Math.abs(dx) > 190) continue;
      p.brain.action = "startle";
      p.brain.time = 0;
      p.brain.duration = 0.9;
      p.brain.targetX = petPickTarget(p, els.field.clientWidth || 360, dx >= 0 ? 1 : -1);
      if (p.startleCooldown > 0) continue;
      p.startleCooldown = 1.3 + Math.random() * 1.2;
      p.brain.mood = "scared";
      p.brain.energy = Math.max(0, p.brain.energy - 0.04);
      p.brain.idle = 0;
      petHop(p, p.def.hop * 0.68);
      if (Math.abs(dx) < closestDistance) {
        closest = p;
        closestDistance = Math.abs(dx);
      }
    }
    if (closest && closest.squeakCooldown <= 0) petSqueak(closest);
  }

  function petCheer() {
    if (state.phase !== "playing") return;
    const milestone = state.combo > 0 && state.combo % 5 === 0;
    let cheerPet = null;
    for (const p of state.pets) {
      if (!milestone && Math.random() > 0.38) continue;
      if (p.brain.action === "startle") continue;
      p.brain.action = "cheer";
      p.brain.time = 0;
      p.brain.duration = 0.95;
      p.brain.lookTarget = null;
      p.brain.mood = "happy";
      p.brain.energy = Math.min(1, p.brain.energy + 0.04);
      p.brain.idle = 0;
      petHop(p, p.def.hop * (milestone ? 0.95 : 0.62));
      if (milestone && !cheerPet) cheerPet = p;
    }
    if (cheerPet && cheerPet.squeakCooldown <= 0) petSqueak(cheerPet, true);
  }

  function petNuzzle(x) {
    if (state.phase !== "playing") return;
    for (const p of state.pets) {
      if (p.brain.action === "startle" || p.brain.action === "cheer") continue;
      p.brain.action = "nuzzle";
      p.brain.time = 0;
      p.brain.duration = 1.15;
      p.brain.targetX = Math.min(
        (els.field.clientWidth || 360) - p.drawW / 2 - 2,
        Math.max(p.drawW / 2 + 2, x),
      );
      p.brain.lookTarget = { x, y: p.ground - p.h * 0.4 };
      p.brain.mood = "happy";
      p.brain.idle = 0;
      petHop(p, p.def.hop * 0.38);
    }
  }

  function petMeteorStart() {
    if (state.phase !== "playing") return;
    for (const p of state.pets) {
      p.brain.action = "chase";
      p.brain.time = 0;
      p.brain.duration = 0.6;
      p.brain.targetX = state.meteor
        ? Math.max(p.drawW / 2 + 2, Math.min((els.field.clientWidth || 360) - p.drawW / 2 - 2, state.meteor.x + state.meteor.size / 2))
        : p.x;
      p.brain.lookTarget = state.meteor
        ? { x: state.meteor.x + state.meteor.size / 2, y: state.meteor.y + state.meteor.size / 2 }
        : null;
      p.brain.mood = "excited";
    }
  }

  function petMeteorFinish() {
    if (state.phase !== "playing") return;
    for (const p of state.pets) {
      p.brain.action = "cheer";
      p.brain.time = 0;
      p.brain.duration = 0.9;
      p.brain.lookTarget = null;
      p.brain.mood = "happy";
      petHop(p, p.def.hop * 0.8);
    }
  }

  function petInfo(pet) {
    return {
      id: pet.id,
      accessory: pet.accessory ? pet.accessory.id : null,
      renderer: pet.renderer && pet.renderer.kind ? pet.renderer.kind : "canvas",
      spriteAction: pet.renderer && pet.renderer.getAction ? pet.renderer.getAction() : null,
      x: Math.round(pet.x),
      y: Math.round(pet.ground + pet.hopY - pet.h),
      ground: Math.round(pet.ground),
      dir: pet.dir,
      hop: Math.round(pet.hopY),
      action: pet.brain.action,
      mood: pet.brain.mood,
      moving: Boolean(pet.brain.moving),
      squeaking: Boolean(pet.el && pet.el.classList.contains("squeaking")),
      paintCard: pet.paint && pet.paint.card ? pet.paint.card.word : null,
      paintPhase: pet.paint ? pet.paint.phase : null,
    };
  }

  function checkPileDanger() {
    if (state.phase !== "playing" || state.meteor) return false;
    if (state.settled.some((settled) => settled.y <= DANGER_Y)) {
      endGame();
      return true;
    }
    return false;
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

    const settled = {
      word: word.word,
      el: word.el,
      x: word.x,
      y: finalY,
      w: word.w,
      h: word.h,
    };
    state.settled.push(settled);
    attachSettledBody(settled);

    state.combo = 0;
    state.missed += 1;
    state.missedWords.unshift(word.word);
    if (state.missedWords.length > 60) state.missedWords.length = 60;

    playMiss();
    shakeField();
    updateHUD(true);
    petStartle(word.x + word.w / 2);

    if (y <= DANGER_Y && !state.meteor) endGame();
  }

  function shakeField() {
    els.field.classList.remove("shake");
    void els.field.offsetWidth;
    els.field.classList.add("shake");
    window.setTimeout(() => els.field.classList.remove("shake"), 340);
  }

  function completeFillRound() {
    if (state.mode !== "fill" || state.fillFinishing) return;
    if (state.phase !== "playing" && state.phase !== "paused") return;
    state.fillFinishing = true;
    const par = Math.max(12, state.fillTotal * 3.2);
    state.fillBonus = Math.max(0, Math.round((par - state.elapsed) * 8));
    if (state.fillBonus > 0) {
      state.score += state.fillBonus;
      addProfilePoints(state.fillBonus);
    }
    updateHUD(true);
    window.setTimeout(() => {
      if (!state.fillFinishing) return;
      state.fillFinishing = false;
      if (state.phase === "playing" || state.phase === "paused") endGame();
    }, 720);
  }

  function completePaintRound() {
    if (state.mode !== "paint" || state.paintFinishing) return;
    if (state.phase !== "playing" && state.phase !== "paused") return;
    state.paintFinishing = true;
    const par = Math.max(10, state.paintTotal * 2.6);
    state.paintBonus = Math.max(0, Math.round((par - state.elapsed) * 8));
    if (state.paintBonus > 0) {
      state.score += state.paintBonus;
      addProfilePoints(state.paintBonus);
    }
    updateHUD(true);
    window.setTimeout(() => {
      if (!state.paintFinishing) return;
      state.paintFinishing = false;
      if (state.phase === "playing" || state.phase === "paused") endGame();
    }, 900);
  }

  function endGame() {
    if (state.phase === "over") return;
    state.phase = "over";
    syncPhaseClass();
    cancelMeteor();
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

    finishProfileRound();
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
    const wasRound = state.phase === "playing" || state.phase === "paused";
    if (wasRound) finishProfileRound();
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
    const fill = state.mode === "fill";
    const paint = state.mode === "paint";
    const board = fill || paint;
    setText(els.score, formatNumber(state.score));
    setText(els.correct, String(state.cleared));
    setText(els.combo, `×${state.combo}`);
    setText(els.level, board ? String(state.settled.length) : String(state.level));
    setText(els.time, formatTime(state.elapsed));

    let progress = 0;
    if (board) {
      const total = fill ? state.fillTotal : state.paintTotal;
      progress = total
        ? Math.min(100, Math.round((state.cleared / total) * 100))
        : 0;
    } else {
      const fieldH = els.field.clientHeight || 1;
      let minY = fieldH;
      for (const s of state.settled) minY = Math.min(minY, s.y);
      progress = state.settled.length
        ? Math.min(100, Math.round(((fieldH - minY) / fieldH) * 100))
        : 0;
    }
    setText(els.pile, `${progress}%`);

    if (force || state.lastHud.pilePct !== progress) {
      els.pileFill.style.height = `${progress}%`;
      state.lastHud.pilePct = progress;
    }

    const hot = state.combo >= 2;
    if (force || state.lastHud.hot !== hot) {
      els.comboStat.classList.toggle("hot", hot);
      state.lastHud.hot = hot;
    }

    const danger = !board && progress >= 68;
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

  /* ------------------------------------------------------------------ */
  /* players & cumulative scores                                         */
  /* ------------------------------------------------------------------ */

  let selectedAvatar = Profiles ? Profiles.AVATARS[0] : "🦊";
  let editingProfileId = "";
  let playerSheetOpener = null;
  let boardOpener = null;

  function currentProfile() {
    return Profiles ? Profiles.find(state.profiles, state.userId) : null;
  }

  function mirrorHighScore(value) {
    try {
      localStorage.setItem(HS_KEY, String(value));
    } catch {}
  }

  function renderAvatarPicker() {
    if (!els.avatarPicker || !Profiles) return;
    els.avatarPicker.replaceChildren();
    for (const avatar of Profiles.AVATARS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = avatar === selectedAvatar ? "avatar-choice is-selected" : "avatar-choice";
      button.dataset.avatar = avatar;
      button.textContent = avatar;
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(avatar === selectedAvatar));
      button.setAttribute("aria-label", avatar);
      els.avatarPicker.appendChild(button);
    }
  }

  function renderPlayerList() {
    if (!els.playerList || !Profiles) return;
    els.playerList.replaceChildren();
    for (const profile of Profiles.rank(state.profiles)) {
      const row = document.createElement("div");
      row.className = profile.id === state.userId ? "player-option is-current" : "player-option";

      const main = document.createElement("button");
      main.type = "button";
      main.className = "player-option-main";
      main.dataset.selectPlayer = profile.id;

      const avatar = document.createElement("span");
      avatar.className = "player-option-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = profile.avatar;

      const text = document.createElement("span");
      text.className = "player-option-text";
      const name = document.createElement("span");
      name.className = "player-option-name";
      name.textContent = profile.name;
      const meta = document.createElement("span");
      meta.className = "player-option-meta";
      meta.textContent = `${tr("board.best", { score: formatNumber(profile.best) })} · ${tr("board.correct", { count: formatNumber(profile.correct) })}`;
      text.append(name, meta);

      const total = document.createElement("span");
      total.className = "player-option-total";
      setStarValue(total, profile.total);

      main.append(avatar, text, total);
      if (profile.id === state.userId) {
        const badge = document.createElement("span");
        badge.className = "player-option-current";
        badge.textContent = tr("player.current");
        main.appendChild(badge);
      }

      row.appendChild(main);

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "player-option-edit";
      edit.dataset.editPlayer = profile.id;
      edit.replaceChildren(iconSvg("pencil"));
      edit.setAttribute("aria-label", tr("player.editAvatar") + " " + profile.name);
      edit.title = tr("player.editAvatar");
      row.appendChild(edit);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "player-option-delete";
      remove.dataset.deletePlayer = profile.id;
      remove.replaceChildren(iconSvg("close"));
      remove.setAttribute("aria-label", tr("player.delete") + " " + profile.name);
      remove.title = tr("player.delete");
      row.appendChild(remove);

      els.playerList.appendChild(row);
    }
  }

  function renderBoard() {
    if (!els.boardList || !Profiles) return;
    const ranked = Profiles.rank(state.profiles);
    els.boardList.replaceChildren();
    if (els.boardEmpty) els.boardEmpty.classList.toggle("is-hidden", ranked.length > 0);

    ranked.forEach((profile, index) => {
      const row = document.createElement("li");
      row.className = profile.id === state.userId ? "board-row is-current" : "board-row";

      const rank = document.createElement("span");
      rank.className = "board-rank";
      if (index < 3) {
        rank.classList.add("board-rank-icon", `rank-${index + 1}`);
        rank.replaceChildren(iconSvg("medal"));
      } else {
        rank.textContent = String(index + 1);
      }

      const avatar = document.createElement("span");
      avatar.className = "board-row-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = profile.avatar;

      const text = document.createElement("span");
      text.className = "board-row-text";
      const name = document.createElement("span");
      name.className = "board-row-name";
      name.textContent = profile.name;
      if (profile.id === state.userId) {
        const me = document.createElement("span");
        me.className = "board-me";
        me.textContent = tr("player.current");
        name.appendChild(me);
      }
      const meta = document.createElement("span");
      meta.className = "board-row-meta";
      meta.textContent = `${tr("board.best", { score: formatNumber(profile.best) })} · ${tr("board.correct", { count: formatNumber(profile.correct) })}`;
      text.append(name, meta);

      const total = document.createElement("span");
      total.className = "board-row-total";
      setStarValue(total, profile.total);

      row.setAttribute(
        "aria-label",
        `${profile.name}: ${tr("board.total", { score: formatNumber(profile.total) })}, ${tr("board.best", { score: formatNumber(profile.best) })}, ${tr("board.correct", { count: formatNumber(profile.correct) })}${profile.id === state.userId ? `, ${tr("player.current")}` : ""}`,
      );

      row.append(rank, avatar, text, total);
      els.boardList.appendChild(row);
    });
  }

  function renderPlayerUI() {
    if (!els.playerBtn) return;
    const profile = currentProfile();
    setText(els.playerAvatar, profile ? profile.avatar : "＋");
    setText(els.playerName, profile ? profile.name : tr("player.none"));
    setText(els.playerTotal, profile ? formatNumber(profile.total) : "");
    const label = profile
      ? tr("player.openAria", { name: profile.name, score: formatNumber(profile.total) })
      : tr("player.none");
    els.playerBtn.setAttribute("aria-label", label);
    els.playerBtn.setAttribute("title", label);
    els.playerBtn.classList.toggle("is-empty", !profile);
    if (profile) state.highScore = profile.best;
    renderBestLine();
  }

  function updateSessionTotal() {
    if (!els.sessionTotal) return;
    const profile = currentProfile();
    setText(
      els.sessionTotal,
      profile ? tr("over.session", { score: formatNumber(profile.total) }) : "",
    );
  }

  function updatePlayerTotals() {
    const profile = currentProfile();
    setText(els.playerTotal, formatNumber(profile ? profile.total : 0));
    if (els.boardSheet && !els.boardSheet.classList.contains("is-hidden")) renderBoard();
    if (state.phase === "over") updateSessionTotal();
  }

  function addProfilePoints(points) {
    const profile = currentProfile();
    if (!profile || !Profiles) return;
    Profiles.addPoints(state.profiles, profile.id, points, 1);
    Profiles.save(state.profiles);
    updatePlayerTotals();
  }

  function finishProfileRound() {
    if (!state.roundRecorded) return;
    state.roundRecorded = false;
    const profile = currentProfile();
    if (!profile || !Profiles) return;
    Profiles.finishRound(state.profiles, profile.id, state.score);
    Profiles.save(state.profiles);
    state.highScore = profile.best;
    mirrorHighScore(profile.best);
    renderBestLine();
    updatePlayerTotals();
  }

  function selectProfile(profile, { close = true } = {}) {
    if (!profile || !Profiles) return;
    if (editingProfileId) cancelAvatarEdit();
    state.userId = profile.id;
    Profiles.setActiveId(profile.id);
    state.highScore = profile.best;
    mirrorHighScore(profile.best);
    renderPlayerUI();
    renderPlayerList();
    if (state.phase === "over") renderOverPanel();
    if (close) closePlayerSheet();
  }

  function syncPlayerFormMode() {
    if (!els.playerForm) return;
    const profile = editingProfileId && Profiles ? Profiles.find(state.profiles, editingProfileId) : null;
    const editing = Boolean(profile);
    els.playerForm.classList.toggle("is-editing", editing);
    setText(els.playerFormTitle, editing ? tr("player.editTitle") : tr("player.createTitle"));
    if (els.avatarEditNote) els.avatarEditNote.classList.toggle("is-hidden", !editing);
    if (editing) setText(els.avatarEditText, tr("player.editingAvatar", { name: profile.name }));
    if (els.playerSubmitLabel) {
      els.playerSubmitLabel.textContent = editing ? tr("player.saveAvatar") : tr("player.create");
    }
    if (els.playerNameInput) {
      els.playerNameInput.disabled = editing;
      if (editing) els.playerNameInput.value = profile.name;
    }
  }

  function startAvatarEdit(profile) {
    if (!profile || !Profiles) return;
    editingProfileId = profile.id;
    selectedAvatar = profile.avatar;
    setText(els.playerError, "");
    renderAvatarPicker();
    syncPlayerFormMode();
    window.setTimeout(() => {
      const selected = els.avatarPicker && els.avatarPicker.querySelector(".avatar-choice.is-selected");
      if (selected && els.playerSheet && !els.playerSheet.classList.contains("is-hidden")) {
        selected.focus({ preventScroll: true });
      }
    }, 20);
  }

  function cancelAvatarEdit({ clearInput = true } = {}) {
    editingProfileId = "";
    if (Profiles) selectedAvatar = Profiles.AVATARS[state.profiles.length % Profiles.AVATARS.length];
    if (clearInput && els.playerNameInput) {
      els.playerNameInput.value = "";
      els.playerNameInput.disabled = false;
    }
    setText(els.playerError, "");
    renderAvatarPicker();
    syncPlayerFormMode();
  }

  function saveAvatarEdit() {
    const profile = Profiles ? Profiles.find(state.profiles, editingProfileId) : null;
    if (!profile) {
      cancelAvatarEdit();
      return;
    }
    profile.avatar = selectedAvatar;
    profile.updatedAt = Date.now();
    Profiles.save(state.profiles);
    if (profile.id === state.userId) renderPlayerUI();
    renderPlayerList();
    renderBoard();
    toast(tr("player.avatarSaved"));
    cancelAvatarEdit();
    closePlayerSheet();
  }

  function createPlayerFromForm(event) {
    if (event) event.preventDefault();
    if (!Profiles) return;
    if (editingProfileId) {
      saveAvatarEdit();
      return;
    }
    const result = Profiles.create(state.profiles, els.playerNameInput.value, selectedAvatar, {
      best: state.pendingLegacyBest,
    });
    if (result.error) {
      const key =
        result.error === "duplicate"
          ? "player.errorDuplicate"
          : result.error === "full"
            ? "player.errorFull"
            : "player.errorEmpty";
      setText(els.playerError, tr(key));
      els.playerNameInput.focus();
      return;
    }

    state.pendingLegacyBest = 0;
    Profiles.save(state.profiles);
    selectedAvatar = Profiles.AVATARS[state.profiles.length % Profiles.AVATARS.length];
    els.playerNameInput.value = "";
    setText(els.playerError, "");
    selectProfile(result.profile, { close: false });
    renderAvatarPicker();
    renderPlayerList();
    toast(tr("player.created", { name: result.profile.name }));
    closePlayerSheet();
  }

  function deleteProfile(profile) {
    if (!profile || !Profiles) return;
    if (!window.confirm(tr("player.deleteConfirm", { name: profile.name }))) return;
    if (editingProfileId === profile.id) cancelAvatarEdit();
    state.profiles = Profiles.remove(state.profiles, profile.id);
    Profiles.save(state.profiles);

    if (state.userId === profile.id) {
      const next = Profiles.rank(state.profiles)[0] || null;
      state.userId = next ? next.id : "";
      Profiles.setActiveId(state.userId);
      state.highScore = next ? next.best : 0;
      if (next) mirrorHighScore(next.best);
      else {
        try {
          localStorage.removeItem(HS_KEY);
        } catch {}
      }
    }

    renderPlayerUI();
    renderPlayerList();
    renderBoard();
    toast(tr("player.deleted", { name: profile.name }));
    if (!state.profiles.length && els.playerNameInput) {
      els.playerNameInput.focus();
    }
  }

  function openPlayerSheet() {
    if (!els.playerSheet) return;
    playerSheetOpener = document.activeElement && document.activeElement.focus ? document.activeElement : els.playerBtn;
    cancelAvatarEdit();
    renderPlayerList();
    renderAvatarPicker();
    setText(els.playerError, "");
    els.playerSheet.classList.remove("is-hidden");
    els.playerSheet.setAttribute("aria-hidden", "false");
    if (!currentProfile() && els.playerNameInput) {
      window.setTimeout(() => {
        if (!els.playerSheet.classList.contains("is-hidden")) {
          els.playerNameInput.focus({ preventScroll: true });
        }
      }, 40);
    }
  }

  function closePlayerSheet() {
    if (!els.playerSheet || els.playerSheet.classList.contains("is-hidden")) return;
    els.playerSheet.classList.add("is-hidden");
    els.playerSheet.setAttribute("aria-hidden", "true");
    setText(els.playerError, "");
    if (playerSheetOpener && document.contains(playerSheetOpener) && !playerSheetOpener.classList.contains("is-hidden")) {
      playerSheetOpener.focus({ preventScroll: true });
    }
  }

  function openBoard() {
    if (!els.boardSheet) return;
    boardOpener = document.activeElement && document.activeElement.focus ? document.activeElement : els.boardBtn;
    renderBoard();
    els.boardSheet.classList.remove("is-hidden");
    els.boardSheet.setAttribute("aria-hidden", "false");
    window.setTimeout(() => {
      if (els.boardClose && !els.boardSheet.classList.contains("is-hidden")) {
        els.boardClose.focus({ preventScroll: true });
      }
    }, 0);
  }

  function closeBoard() {
    if (!els.boardSheet || els.boardSheet.classList.contains("is-hidden")) return;
    els.boardSheet.classList.add("is-hidden");
    els.boardSheet.setAttribute("aria-hidden", "true");
    if (boardOpener && document.contains(boardOpener) && !boardOpener.classList.contains("is-hidden")) {
      boardOpener.focus({ preventScroll: true });
    }
  }

  function loadPlayerState() {
    if (!Profiles) return;
    state.profiles = Profiles.load();
    state.userId = Profiles.getActiveId(state.profiles);
    if (state.profiles.length && !state.userId) {
      const first = Profiles.rank(state.profiles)[0];
      state.userId = first.id;
      Profiles.setActiveId(first.id);
    }

    const active = currentProfile();
    if (active) {
      state.highScore = active.best;
      mirrorHighScore(active.best);
      selectedAvatar = Profiles.AVATARS[state.profiles.length % Profiles.AVATARS.length];
    } else if (state.highScore > 0) {
      state.pendingLegacyBest = state.highScore;
    }

    renderAvatarPicker();
    renderPlayerList();
    renderPlayerUI();
  }

  function maybeShowPlayerPicker() {
    if (!Profiles) return;
    // New devices need a first player; shared devices let each child pick.
    if (state.profiles.length === 1) return;
    window.setTimeout(() => {
      if (state.phase === "menu") openPlayerSheet();
    }, 420);
  }

  function renderBestLine() {
    const score = formatNumber(state.highScore);
    const label = tr("start.bestLabel", { score });
    setText(els.bestLineValue, score);
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
    const fill = state.mode === "fill";
    const paint = state.mode === "paint";
    const board = fill || paint;
    setText(
      els.overEyebrow,
      tr(paint ? "paint.overEyebrow" : fill ? "fill.overEyebrow" : "over.eyebrow"),
    );
    setUseIcon(
      els.overEyebrowIcon,
      paint ? "palette" : fill ? "grid" : state.newRecord ? "trophy" : "burst",
    );
    setText(
      els.overTitle,
      tr(paint ? "paint.overTitle" : fill ? "fill.overTitle" : "over.title"),
    );
    setText(
      els.overTagline,
      tr(paint ? "paint.overTagline" : fill ? "fill.overTagline" : "over.tagline"),
    );
    setText(els.overScoreLabel, tr("over.score"));
    setText(
      els.overClearedLabel,
      tr(paint ? "paint.clearedLabel" : fill ? "fill.clearedLabel" : "over.cleared"),
    );
    setText(els.overComboLabel, tr("over.combo"));
    setText(
      els.overTimeLabel,
      tr(paint ? "paint.timeLabel" : fill ? "fill.timeLabel" : "over.time"),
    );
    if (els.restartBtn) {
      els.restartBtn.textContent = tr(
        paint ? "paint.again" : fill ? "fill.again" : "over.cta",
      );
    }
    setText(
      els.missedTitle,
      tr(
        board && !state.missedWords.length
          ? paint
            ? "paint.allClear"
            : "fill.allClear"
          : "over.missedTitle",
      ),
    );
    if (els.missedList) {
      els.missedList.classList.toggle("is-hidden", board && !state.missedWords.length);
    }
    if (els.fillBonusLine) {
      els.fillBonusLine.classList.toggle("is-hidden", !board);
      const bonus = paint ? state.paintBonus : state.fillBonus;
      els.fillBonusLine.textContent = board
        ? tr(paint ? "paint.bonus" : "fill.bonus", { score: formatNumber(bonus) })
        : "";
    }
    setText(els.finalScore, formatNumber(state.score));
    setText(els.finalCleared, String(state.cleared));
    setText(els.finalCombo, `×${state.bestCombo}`);
    setText(els.finalTime, formatTime(state.elapsed));
    renderMissedList();
    els.recordLine.classList.toggle("new", state.newRecord);
    els.recordLine.replaceChildren();
    if (state.newRecord) els.recordLine.appendChild(iconSvg("trophy"));
    els.recordLine.appendChild(
      document.createTextNode(
        state.newRecord
          ? tr("over.record")
          : tr("over.best", { score: formatNumber(state.highScore) }),
      ),
    );
    updateSessionTotal();
  }

  function updatePauseButton() {
    const paused = state.phase === "paused";
    setIcon(els.pauseBtn, paused ? "play" : "pause");
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
    setIcon(els.muteBtn, state.muted ? "volume-off" : "volume");
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
    updateModeUI();
    updateHUD(true);
    updateMicUI();
    updatePauseButton();
    updateMuteUI();
    renderBestLine();
    renderPlayerUI();
    renderPlayerList();
    renderBoard();
    renderAvatarPicker();
    syncPlayerFormMode();
    renderCategoryOptions();
    updatePackUI();
    renderPackTabs();
    renderPackCategoryGrid();
    renderCustomPackList();
    updateCustomPackUI();
    updateSpeedUI();
    updateThemeUI();
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
      .replace(/[^a-z' 0-9]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => NUMBER_WORDS[token] || token)
      .join(" ");
  }

  const formCache = new Map();

  function formsFor(word) {
    const base = word.toLowerCase();
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
    for (const alias of HOMOPHONES[base] || []) forms.add(alias);
    if (base.includes(" ")) {
      for (const alias of PHRASE_REDUCTIONS[base] || []) add(alias);
      const parts = base.split(" ");
      const trimmed = parts.filter((part) => !OPTIONAL_ARTICLES.has(part));
      if (trimmed.length >= 2 && trimmed.length < parts.length) add(trimmed.join(" "));
    }
    formCache.set(base, forms);
    return forms;
  }

  function findMatch(text) {
    if (!text) return null;
    const normalized = normalizeSpeech(text);
    if (!normalized) return null;

    const tokens = normalized.split(" ").filter(Boolean);
    if (!tokens.length) return null;

    const candidates =
      state.mode === "rain"
        ? state.words.slice().sort((a, b) => b.y - a.y)
        : state.settled.slice().sort((a, b) => b.y - a.y);

    // A whole-utterance match wins first. Hyphenated number words are spoken
    // with a space, so "twenty one" should clear twenty-one rather than twenty.
    for (const word of candidates) {
      const key = word.word.toLowerCase();
      if (normalized === key || normalized === key.replace(/-/g, " ")) return word;
    }

    // Prefer an exact spelling match before plural / homophone / split-compound
    // matching, so two similar targets are not confused with each other.
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

  const PAINT_SVG_NS = "http://www.w3.org/2000/svg";
  let paintSplatSerial = 0;

  function paintSvgNode(tag, attrs = {}) {
    const node = document.createElementNS(PAINT_SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    return node;
  }

  function paintSmoothClosedPath(points) {
    const count = points.length;
    if (!count) return "";
    let path = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
    for (let i = 0; i < count; i += 1) {
      const p0 = points[(i - 1 + count) % count];
      const p1 = points[i];
      const p2 = points[(i + 1) % count];
      const p3 = points[(i + 2) % count];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      path += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    return `${path}Z`;
  }

  function paintBlobPath(cx, cy, rx, ry, count, irregular, biasAngle = 0, bias = 0) {
    const points = [];
    const offset = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i += 1) {
      const angle = offset + (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.16;
      const factor =
        (1 - irregular * 0.5 + Math.random() * irregular) *
        (1 + Math.cos(angle - biasAngle) * bias);
      points.push({
        x: cx + Math.cos(angle) * rx * factor,
        y: cy + Math.sin(angle) * ry * factor,
      });
    }
    return paintSmoothClosedPath(points);
  }

  function paintTendrilPath(cx, cy, angle, innerRadius, length, width) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const nx = -dy;
    const ny = dx;
    const baseX = cx + dx * innerRadius;
    const baseY = cy + dy * innerRadius;
    const tipX = cx + dx * length;
    const tipY = cy + dy * length;
    const bend = (Math.random() - 0.5) * width * 2.6;
    const c1x = cx + dx * length * 0.52 + nx * bend;
    const c1y = cy + dy * length * 0.52 + ny * bend;
    return `M${baseX.toFixed(2)},${baseY.toFixed(2)} Q${c1x.toFixed(2)},${c1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)}`;
  }

  function paintDripPath(x, y, length, width) {
    const sway = (Math.random() - 0.5) * width * 2.2;
    return `M${x.toFixed(2)},${y.toFixed(2)} Q${(x + sway).toFixed(2)},${(y + length * 0.55).toFixed(2)} ${(x + sway * 0.45).toFixed(2)},${(y + length).toFixed(2)}`;
  }

  function createPaintSplat(cx, cy, hue, cardW, cardH, travelAngle) {
    const layer = els.paintLayer || els.wordLayer;
    if (!layer) return;

    // Splats are deliberately uneven: some are tiny flicks, some are huge
    // gushers. The card size only sets a rough starting point.
    const base = Math.max(cardW * 0.8, cardH * 2.05);
    let scale = 0.55 + Math.random() * 0.85;
    const roll = Math.random();
    if (roll > 0.84) scale *= 1.55;
    else if (roll < 0.16) scale *= 0.55;
    const mainR = Math.max(18, Math.min(88, base * 0.5 * scale));
    const mainRy = mainR * (0.62 + Math.random() * 0.46);
    const extent = Math.max(160, Math.min(380, mainR * (3.8 + Math.random() * 1.3)));
    const size = Math.round(extent * 2);
    const center = extent;
    const biasAngle = Number.isFinite(travelAngle)
      ? travelAngle
      : Math.random() * Math.PI * 2;
    const bias = 0.1 + Math.random() * 0.14;

    const svg = paintSvgNode("svg", {
      class: "paint-splat",
      viewBox: `0 0 ${size} ${size}`,
      width: size,
      height: size,
      "aria-hidden": "true",
    });
    svg.style.left = `${cx}px`;
    svg.style.top = `${cy}px`;
    svg.style.setProperty("--splat-rot", `${(Math.random() * 70 - 35).toFixed(1)}deg`);
    svg.style.overflow = "visible";

    const gradientId = `paintInk${++paintSplatSerial}`;
    const defs = paintSvgNode("defs");
    const gradient = paintSvgNode("linearGradient", {
      id: gradientId,
      gradientUnits: "userSpaceOnUse",
      x1: (center - mainR * 1.2).toFixed(1),
      y1: (center - mainRy * 1.2).toFixed(1),
      x2: (center + mainR * 1.2).toFixed(1),
      y2: (center + mainRy * 1.2).toFixed(1),
    });
    const stops = [
      [0, `hsl(${hue} 96% 66%)`],
      [52, `hsl(${hue} 90% 56%)`],
      [100, `hsl(${hue} 86% 43%)`],
    ];
    for (const [offset, color] of stops) {
      gradient.appendChild(paintSvgNode("stop", { offset: `${offset}%`, "stop-color": color }));
    }
    defs.appendChild(gradient);
    svg.appendChild(defs);
    const inkFill = `url(#${gradientId})`;
    const dropFill = `hsl(${hue} 90% 55%)`;

    // Long, thin ink arms give the splat a fast, messy silhouette.
    const tendrilCount = REDUCED_MOTION ? 1 : 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < tendrilCount; i += 1) {
      const spread = i === 0 ? 0.55 : Math.PI * 1.6;
      let angle = biasAngle + (Math.random() - 0.5) * spread;
      if (i > 0 && Math.random() < 0.22) angle += Math.PI;
      const length = mainR * (i === 0 ? 1.7 + Math.random() * 1.0 : 1.15 + Math.random() * 1.0);
      const width = mainR * (0.11 + Math.random() * 0.12);
      const tipX = center + Math.cos(angle) * length;
      const tipY = center + Math.sin(angle) * length;
      const group = paintSvgNode("g", { class: "paint-tendril" });
      const tendril = paintSvgNode("path", {
        d: paintTendrilPath(center, center, angle, mainR * 0.3, length, width),
        fill: "none",
        stroke: inkFill,
        "stroke-width": width.toFixed(1),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      });
      group.appendChild(tendril);
      if (Math.random() < 0.7) {
        group.appendChild(paintSvgNode("circle", {
          cx: tipX.toFixed(1),
          cy: tipY.toFixed(1),
          r: (width * (0.55 + Math.random() * 0.4)).toFixed(1),
          fill: inkFill,
        }));
      }
      group.style.setProperty("--delay", `${(0.01 + Math.random() * 0.06).toFixed(3)}s`);
      svg.appendChild(group);
    }

    // Drips hang downward under gravity and can be much longer than the core.
    const dripCount = REDUCED_MOTION ? 0 : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < dripCount; i += 1) {
      const x = center + (Math.random() - 0.5) * mainR * 1.5;
      const y = center + mainRy * (0.2 + Math.random() * 0.25);
      const length = mainR * (0.5 + Math.random() * 1.1);
      const width = mainR * (0.09 + Math.random() * 0.1);
      const group = paintSvgNode("g", { class: "paint-drip" });
      group.appendChild(paintSvgNode("path", {
        d: paintDripPath(x, y, length, width),
        fill: "none",
        stroke: inkFill,
        "stroke-width": width.toFixed(1),
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }));
      group.appendChild(paintSvgNode("circle", {
        cx: (x + (Math.random() - 0.5) * width * 0.8).toFixed(1),
        cy: (y + length).toFixed(1),
        r: (width * (0.62 + Math.random() * 0.35)).toFixed(1),
        fill: inkFill,
      }));
      group.style.setProperty("--delay", `${(0.02 + Math.random() * 0.08).toFixed(3)}s`);
      svg.appendChild(group);
    }

    // Irregular secondary blobs land well away from the core.
    const lumpCount = REDUCED_MOTION ? 1 : 1 + Math.floor(Math.random() * 4);
    for (let i = 0; i < lumpCount; i += 1) {
      const angle = biasAngle + (Math.random() - 0.5) * Math.PI * 2;
      const distance = mainR * (1.0 + Math.random() * 1.5);
      const lumpRadius = mainR * (0.07 + Math.random() * 0.2);
      const lump = paintSvgNode("path", {
        d: paintBlobPath(
          center + Math.cos(angle) * distance,
          center + Math.sin(angle) * distance,
          lumpRadius * (0.8 + Math.random() * 0.6),
          lumpRadius * (0.65 + Math.random() * 0.6),
          8 + Math.floor(Math.random() * 3),
          0.42,
          angle,
          0.16,
        ),
        fill: inkFill,
        class: "paint-lump",
      });
      lump.style.setProperty("--delay", `${(0.01 + Math.random() * 0.07).toFixed(3)}s`);
      svg.appendChild(lump);
    }

    const collarCount = REDUCED_MOTION ? 1 : 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < collarCount; i += 1) {
      const angle = biasAngle + (Math.random() - 0.5) * Math.PI * 2;
      const distance = mainR * (0.35 + Math.random() * 0.55);
      const collarRadius = mainR * (0.22 + Math.random() * 0.25);
      const collar = paintSvgNode("path", {
        d: paintBlobPath(
          center + Math.cos(angle) * distance,
          center + Math.sin(angle) * distance,
          collarRadius * (0.8 + Math.random() * 0.5),
          collarRadius * (0.7 + Math.random() * 0.5),
          8 + Math.floor(Math.random() * 3),
          0.42,
          angle,
          0.18,
        ),
        fill: inkFill,
        class: "paint-lump",
      });
      collar.style.setProperty("--delay", `${(Math.random() * 0.04).toFixed(3)}s`);
      svg.appendChild(collar);
    }

    const core = paintSvgNode("path", {
      d: paintBlobPath(center, center, mainR, mainRy, 15 + Math.floor(Math.random() * 7), 0.32, biasAngle, bias),
      fill: inkFill,
      stroke: `hsla(${hue}, 72%, 34%, 0.22)`,
      "stroke-width": Math.max(0.8, mainR * 0.018),
      "stroke-linejoin": "round",
      class: "paint-core",
    });
    svg.appendChild(core);

    // Wide spray: many small droplets, a few far flyers, and a fine mist.
    const dropCount = REDUCED_MOTION ? 6 : 14 + Math.floor(Math.random() * 16);
    for (let i = 0; i < dropCount; i += 1) {
      let angle = biasAngle + (Math.random() - 0.5) * Math.PI * 2.4;
      if (Math.random() < 0.2) angle = Math.random() * Math.PI * 2;
      const distance = mainR * (1.15 + Math.pow(Math.random(), 1.5) * 3.2);
      let radius = Math.max(0.9, mainR * (0.018 + Math.pow(Math.random(), 2) * 0.15));
      if (Math.random() < 0.1) radius *= 2.2;
      const far = distance > mainR * 2.2;
      const stretch = far && Math.random() < 0.45 ? 0.38 + Math.random() * 0.24 : 0.62 + Math.random() * 0.34;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      const group = paintSvgNode("g", {
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((angle * 180) / Math.PI).toFixed(1)})`,
      });
      const drop = paintSvgNode("ellipse", {
        cx: 0,
        cy: 0,
        rx: radius.toFixed(1),
        ry: (radius * stretch).toFixed(1),
        fill: dropFill,
        class: "paint-drop",
      });
      drop.style.setProperty("--delay", `${(0.01 + Math.random() * 0.12).toFixed(3)}s`);
      group.appendChild(drop);
      svg.appendChild(group);
    }

    const streakCount = REDUCED_MOTION ? 0 : 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < streakCount; i += 1) {
      const angle = biasAngle + (Math.random() - 0.5) * Math.PI * 1.7;
      const distance = mainR * (1.5 + Math.random() * 2.1);
      const length = mainR * (0.12 + Math.random() * 0.2);
      const width = 1.1 + Math.random() * 2.1;
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      const group = paintSvgNode("g", {
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((angle * 180) / Math.PI).toFixed(1)})`,
      });
      const streak = paintSvgNode("ellipse", {
        cx: 0,
        cy: 0,
        rx: length.toFixed(1),
        ry: width.toFixed(1),
        fill: dropFill,
        class: "paint-drop",
      });
      streak.style.setProperty("--delay", `${(0.02 + Math.random() * 0.1).toFixed(3)}s`);
      group.appendChild(streak);
      svg.appendChild(group);
    }

    const speckCount = REDUCED_MOTION ? 4 : 10 + Math.floor(Math.random() * 14);
    for (let i = 0; i < speckCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = mainR * (1.5 + Math.random() * 2.7);
      const radius = 0.6 + Math.random() * 1.9;
      const speck = paintSvgNode("circle", {
        cx: (center + Math.cos(angle) * distance).toFixed(1),
        cy: (center + Math.sin(angle) * distance).toFixed(1),
        r: radius.toFixed(1),
        fill: `hsl(${hue} 92% 56%)`,
        class: "paint-drop",
      });
      speck.style.setProperty("--delay", `${(0.01 + Math.random() * 0.14).toFixed(3)}s`);
      svg.appendChild(speck);
    }

    // A small wet highlight keeps the ink from looking like flat paper.
    const gloss = paintSvgNode("ellipse", {
      cx: (center - mainR * 0.28).toFixed(1),
      cy: (center - mainRy * 0.34).toFixed(1),
      rx: (mainR * 0.16).toFixed(1),
      ry: (mainRy * 0.08).toFixed(1),
      fill: `hsla(${hue}, 100%, 96%, 0.18)`,
      transform: `rotate(-18 ${center.toFixed(1)} ${center.toFixed(1)})`,
    });
    svg.appendChild(gloss);

    layer.appendChild(svg);
    createFlash(cx, cy, hue);
    spawnSparks(cx, cy, hue, REDUCED_MOTION ? 4 : 9);
  }

  function launchPaintball(rel, hue, cardW, cardH) {
    const fieldW = els.field.clientWidth || 360;
    const fieldH = els.field.clientHeight || 600;
    const pet = state.pets[0];
    const sx = Math.max(
      16,
      Math.min(fieldW - 16, pet ? pet.x : fieldW / 2),
    );
    const sy = Math.max(
      8,
      Math.min(
        fieldH - 8,
        pet ? pet.ground + pet.hopY - pet.h * 0.72 : fieldH - 10,
      ),
    );
    const cx = rel.left + rel.width / 2;
    const cy = rel.top + rel.height / 2;
    const tx = cx - sx;
    const ty = cy - sy;
    const distance = Math.hypot(tx, ty);
    const duration = REDUCED_MOTION
      ? 0.01
      : Math.max(0.2, Math.min(0.42, distance / 1250));

    const ball = document.createElement("div");
    ball.className = "paintball";
    ball.setAttribute("aria-hidden", "true");
    ball.style.left = `${sx}px`;
    ball.style.top = `${sy}px`;
    ball.style.setProperty("--hue", hue);
    ball.style.setProperty("--tx", `${tx.toFixed(1)}px`);
    ball.style.setProperty("--ty", `${ty.toFixed(1)}px`);
    ball.style.setProperty("--mx", `${(tx * 0.55).toFixed(1)}px`);
    ball.style.setProperty("--my", `${(ty * 0.55 - Math.min(70, distance * 0.13)).toFixed(1)}px`);
    ball.style.setProperty("--ball-dur", `${duration.toFixed(3)}s`);
    els.fxLayer.appendChild(ball);
    playPaintShot();

    let finished = false;
    const impact = () => {
      if (finished) return;
      finished = true;
      // A restart can clear the fx layer mid-flight; never paint the new board.
      if (!ball.isConnected) return;
      ball.remove();
      createPaintSplat(cx, cy, hue, cardW, cardH, Math.atan2(ty, tx));
      playPaintSplat();
    };
    ball.addEventListener("animationend", impact, { once: true });
    window.setTimeout(impact, Math.round(duration * 1000) + 140);
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

  function startMeteor(cx, cy) {
    if (!els.field || state.meteor) return;
    const fieldW = els.field.clientWidth;
    const fieldH = els.field.clientHeight;
    if (!fieldW || !fieldH) return;
    if (!state.settled.length) return;

    const quadrant = Math.floor(Math.random() * 4);
    const angle = Math.PI / 4 + (Math.random() - 0.5) * (Math.PI / 7.5) + quadrant * (Math.PI / 2);
    const speed = Math.min(2400, Math.max(1040, Math.max(fieldW, fieldH) * 1.7));
    const el = document.createElement("div");
    el.className = "meteor";
    el.setAttribute("aria-hidden", "true");
    el.textContent = "☄️";

    const x = Math.max(0, Math.min(fieldW - METEOR_SIZE, cx - METEOR_SIZE / 2));
    const y = Math.max(0, Math.min(fieldH - METEOR_SIZE, cy - METEOR_SIZE / 2));
    const meteor = {
      el,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      bounces: 0,
      edgeHits: { top: 0, right: 0, bottom: 0, left: 0 },
      cleared: 0,
      hitCooldown: 0,
      startedAt: performance.now(),
      size: METEOR_SIZE,
    };
    state.meteor = meteor;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${(angle * 180) / Math.PI + 45}deg)`;
    els.fxLayer.appendChild(el);
    petMeteorStart();

    playMeteorLaunch();
    spawnStars(cx, cy, 42, 14);
    toast(tr("meteor.start"));
  }

  function updateMeteor(dt) {
    const meteor = state.meteor;
    if (!meteor) return;
    const fieldW = els.field.clientWidth;
    const fieldH = els.field.clientHeight;
    if (!fieldW || !fieldH) {
      cancelMeteor();
      return;
    }

    const maxX = Math.max(0, fieldW - meteor.size);
    const maxY = Math.max(0, fieldH - meteor.size);
    const travel = Math.hypot(meteor.vx, meteor.vy) * dt;
    const steps = Math.min(12, Math.max(1, Math.ceil(travel / 12)));
    const stepDt = dt / steps;
    let swept = 0;

    for (let step = 0; step < steps; step += 1) {
      meteor.x += meteor.vx * stepDt;
      meteor.y += meteor.vy * stepDt;

      const hits = [];
      if (meteor.x <= 0) {
        meteor.x = 0;
        meteor.vx = Math.abs(meteor.vx);
        hits.push("left");
      } else if (meteor.x >= maxX) {
        meteor.x = maxX;
        meteor.vx = -Math.abs(meteor.vx);
        hits.push("right");
      }
      if (meteor.y <= 0) {
        meteor.y = 0;
        meteor.vy = Math.abs(meteor.vy);
        hits.push("top");
      } else if (meteor.y >= maxY) {
        meteor.y = maxY;
        meteor.vy = -Math.abs(meteor.vy);
        hits.push("bottom");
      }

      for (const side of hits) {
        meteor.bounces += 1;
        meteor.edgeHits[side] += 1;
        const bx = meteor.x + meteor.size / 2;
        const by = meteor.y + meteor.size / 2;
        spawnSparks(bx, by, 42, 5);
        createFlash(bx, by, 38);
        playMeteorHit(meteor.bounces);
      }

      if (meteor.hitCooldown > 0) {
        meteor.hitCooldown = Math.max(0, meteor.hitCooldown - stepDt);
      }
      if (meteor.hitCooldown <= 0) {
        swept += sweepMeteorSettled(meteor);
      }

      if (meteor.cleared >= METEOR_TARGET || !state.settled.length) {
        if (swept) updateHUD(true);
        finishMeteor();
        return;
      }
    }

    if (swept) updateHUD(true);
    if (performance.now() - meteor.startedAt >= METEOR_MAX_FLIGHT) {
      finishMeteor();
      return;
    }
    const rotation = (Math.atan2(meteor.vy, meteor.vx) * 180) / Math.PI + 45;
    meteor.el.style.transform = `translate3d(${meteor.x}px, ${meteor.y}px, 0) rotate(${rotation}deg)`;
  }

  function sweepMeteorSettled(meteor) {
    let target = null;
    let closest = Infinity;
    for (const settled of state.settled) {
      const overlaps =
        meteor.x - METEOR_HIT_PAD < settled.x + settled.w &&
        meteor.x + meteor.size + METEOR_HIT_PAD > settled.x &&
        meteor.y - METEOR_HIT_PAD < settled.y + settled.h &&
        meteor.y + meteor.size + METEOR_HIT_PAD > settled.y;
      if (!overlaps) continue;
      const dx = meteor.x + meteor.size / 2 - (settled.x + settled.w / 2);
      const dy = meteor.y + meteor.size / 2 - (settled.y + settled.h / 2);
      const distance = dx * dx + dy * dy;
      if (distance < closest) {
        closest = distance;
        target = settled;
      }
    }
    if (!target) return 0;

    const index = state.settled.indexOf(target);
    if (index !== -1) state.settled.splice(index, 1);
    removeSettledBody(target);
    wakePhysicsPile();
    spawnStars(target.x + target.w / 2, target.y + target.h / 2, 42, 6);
    spawnSparks(target.x + target.w / 2, target.y + target.h / 2, 42, 5);
    target.el.remove();
    meteor.cleared += 1;
    meteor.hitCooldown = METEOR_HIT_COOLDOWN;
    playMeteorSweep(meteor.cleared);
    return 1;
  }

  function finishMeteor() {
    const meteor = state.meteor;
    if (!meteor) return;
    const cx = meteor.x + meteor.size / 2;
    const cy = meteor.y + meteor.size / 2;
    const count = meteor.cleared;
    meteor.el.remove();
    state.meteor = null;
    petMeteorFinish();

    createFlash(cx, cy, 42);
    spawnStars(cx, cy, 42, 30);
    spawnSparks(cx, cy, 42, 18);
    updateHUD(true);
    playMeteorFinish();
    toast(count ? tr("meteor.clear", { count }) : tr("meteor.empty"));

    if (state.settled.some((settled) => settled.y <= DANGER_Y)) {
      endGame();
    }
  }

  function cancelMeteor() {
    if (!state.meteor) return;
    state.meteor.el.remove();
    state.meteor = null;
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
      removeSettledBody(target);
      spawnStars(target.x + target.w / 2, target.y + target.h / 2, 48, 5);
      target.el.remove();
    }
    if (targets.length) {
      state.settled = state.settled.filter((settled) => !targetSet.has(settled));
      wakePhysicsPile();
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
    const activeIndex = state.words.indexOf(word);
    const settledIndex = activeIndex === -1 ? state.settled.indexOf(word) : -1;
    if (activeIndex === -1 && settledIndex === -1) return;
    if (state.focusedWord === word) clearFocus();
    if (activeIndex !== -1) {
      state.words.splice(activeIndex, 1);
    } else {
      removeSettledBody(word);
      state.settled.splice(settledIndex, 1);
      wakePhysicsPile();
    }
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
    const basePoints =
      state.mode === "fill" || state.mode === "paint"
        ? 20
        : 10 + Math.round(heightRatio * 10);
    const multiplier = 1 + Math.min(state.combo - 1, 10) * 0.1;
    const points = Math.round(basePoints * multiplier) + (golden ? 25 : 0);
    state.score += points;
    state.cleared += 1;
    addProfilePoints(points);
    if (state.mode === "rain") advanceRewardProgress();

    const paint = state.mode === "paint";
    const effect = paint ? "splat" : nextEffect();
    state.lastEffect = effect;
    const effectHue = paint
      ? typeof word.hue === "number"
        ? word.hue
        : hueFor(word.word)
      : EFFECT_HUES[effect] || hueFor(word.word);
    if (paint) launchPaintball(rel, effectHue, rel.width, rel.height);
    else runEffect(effect, word, rel, hueFor(word.word), effectHue);
    word.el.remove();
    const sub = golden
      ? `🌟${state.combo >= 2 ? ` ×${state.combo}` : ""}`
      : state.combo >= 2
        ? `×${state.combo}`
        : "";
    showFloat(`+${points}`, sub, cx, cy, golden ? "hsl(48 100% 76%)" : `hsl(${effectHue} 100% 78%)`);
    if (!paint) playEffect(effect);
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
    petCheer();
    showHeard(tr("heard.correct", { word: word.word }), "check");
    if (!golden) showPraise();
    if (state.mode === "rain") {
      if (state.cleared % 5 === 0) triggerRewardClear(rel);
      if (state.cleared % METEOR_EVERY === 0) startMeteor(cx, cy);
    } else if (state.mode === "fill" && state.settled.length === 0) {
      completeFillRound();
    } else if (paint && state.settled.length === 0) {
      completePaintRound();
    }
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
    const list = state.mode === "rain" ? state.words : state.settled;
    let lowest = null;
    for (const word of list) {
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

  function focusWord(word, hold = false) {
    clearFocus();
    state.focusedWord = word;
    word.el.classList.add("focused");
    els.wordLayer.classList.add("has-focus");
    // Help speech clears its own highlight the moment the utterance ends;
    // the timer is only a safety net if onend never arrives.
    state.focusTimer = window.setTimeout(clearFocus, hold ? 8000 : 3000);
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
      clearFocus();
      toast(tr("help.unsupported"), "warn");
      return;
    }

    const token = ++state.helpSpeakToken;
    state.helpSpeaking = true;
    state.helpWord = word.word;
    // Cover the whole utterance plus the recognizer's delayed final result.
    state.helpGuardUntil = performance.now() + 4500;

    // iOS routes web audio through a quieter record/playback session while
    // SpeechRecognition owns the microphone. Release the mic for the hint so
    // the system voice comes back through the speaker at normal volume.
    // Desktop recognizers also hear the synthetic voice; stopping the mic here
    // prevents that hint from being mistaken for a child's answer.
    const releaseMic = IS_IOS && state.micEnabled;
    const wasSpeaking = Boolean(synth.speaking || synth.pending);
    try {
      synth.cancel();
    } catch {}

    if (state.micEnabled) stopSpeech();
    updateMicUI();

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
      state.helpGuardUntil = performance.now();
      // Drop the yellow border and speaker badge together with the voice,
      // so the hint state never lingers after the word has been spoken.
      if (state.focusedWord && state.focusedWord.word === state.helpWord) clearFocus();
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
    focusWord(word, true);
    showHeard(tr("help.listen", { word: word.word }), "volume");
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

  function syncSpeechPhrases(force = false) {
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
    // Reassigning the phrase list while a session is live can stall the
    // recognizer. Keep the current list and resync on the next onstart.
    if (state.listening && !force) {
      state.speechPhraseDirty = true;
      return;
    }

    const targets = new Map();
    for (const word of state.words) targets.set(word.word, 4);
    if (state.mode !== "rain") {
      for (const word of state.settled) targets.set(word.word, 4);
    }
    // The bag's tail is what nextWord() will spawn next; bias upcoming targets
    // even if the browser only applies the phrase list when recognition starts.
    if (state.phase === "playing" && state.mode === "rain") {
      for (const word of state.bag.slice(-5)) {
        if (!targets.has(word)) targets.set(word, 2);
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
        syncSpeechPhrases(true);
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
        const now = performance.now();
        // The hint voice and its delayed final result must never clear a word.
        if (state.helpSpeaking || now < state.helpGuardUntil) return;
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
          showHeard(tr("heard.prefix", { text: latest }), "mic");
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
    syncSpeechPhrases(true);
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

  function showHeard(message, iconName) {
    if (!els.heard) return;
    els.heard.replaceChildren();
    if (iconName) els.heard.appendChild(iconSvg(iconName));
    els.heard.appendChild(document.createTextNode(message));
    els.heard.classList.add("show");
    clearTimeout(state.heardTimer);
    state.heardTimer = window.setTimeout(() => {
      els.heard.classList.remove("show");
    }, 1600);
  }

  function hideHeard() {
    clearTimeout(state.heardTimer);
    els.heard.classList.remove("show");
    els.heard.replaceChildren();
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
  for (const button of els.modeOptions) {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  }
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

  if (els.playerBtn) els.playerBtn.addEventListener("click", openPlayerSheet);
  if (els.playerClose) els.playerClose.addEventListener("click", closePlayerSheet);
  if (els.playerDone) els.playerDone.addEventListener("click", closePlayerSheet);
  if (els.playerForm) els.playerForm.addEventListener("submit", createPlayerFromForm);
  if (els.playerSheet) {
    els.playerSheet.addEventListener("click", (event) => {
      if (event.target === els.playerSheet) closePlayerSheet();
    });
  }
  if (els.playerList) {
    els.playerList.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== "function") return;
      const remove = target.closest("[data-delete-player]");
      if (remove) {
        deleteProfile(Profiles ? Profiles.find(state.profiles, remove.dataset.deletePlayer) : null);
        return;
      }
      const edit = target.closest("[data-edit-player]");
      if (edit) {
        startAvatarEdit(Profiles ? Profiles.find(state.profiles, edit.dataset.editPlayer) : null);
        return;
      }
      const pick = target.closest("[data-select-player]");
      if (pick) {
        selectProfile(Profiles ? Profiles.find(state.profiles, pick.dataset.selectPlayer) : null);
      }
    });
  }
  if (els.avatarEditCancel) {
    els.avatarEditCancel.addEventListener("click", () => cancelAvatarEdit());
  }
  if (els.avatarPicker) {
    els.avatarPicker.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== "function") return;
      const choice = target.closest("[data-avatar]");
      if (!choice) return;
      selectedAvatar = choice.dataset.avatar;
      for (const button of els.avatarPicker.querySelectorAll(".avatar-choice")) {
        const active = button.dataset.avatar === selectedAvatar;
        button.classList.toggle("is-selected", active);
        button.setAttribute("aria-checked", String(active));
      }
    });
  }

  if (els.boardBtn) els.boardBtn.addEventListener("click", openBoard);
  if (els.overBoardBtn) els.overBoardBtn.addEventListener("click", openBoard);
  if (els.boardClose) els.boardClose.addEventListener("click", closeBoard);
  if (els.boardDone) els.boardDone.addEventListener("click", closeBoard);
  if (els.boardSheet) {
    els.boardSheet.addEventListener("click", (event) => {
      if (event.target === els.boardSheet) closeBoard();
    });
  }

  if (els.packBtn) els.packBtn.addEventListener("click", openPack);
  if (els.packClose) els.packClose.addEventListener("click", closePack);
  if (els.packDone) els.packDone.addEventListener("click", closePack);
  if (els.packTabs) {
    els.packTabs.addEventListener("click", (event) => {
      const target = event.target;
      const tab =
        target && typeof target.closest === "function"
          ? target.closest("[data-pack-group]")
          : null;
      if (tab) setPackGroup(tab.dataset.packGroup);
    });
  }
  if (els.packCategoryGrid) {
    els.packCategoryGrid.addEventListener("click", (event) => {
      const target = event.target;
      const card =
        target && typeof target.closest === "function"
          ? target.closest("[data-category-id]")
          : null;
      if (card) selectPackCategory(card.dataset.categoryId);
    });
  }
  if (els.customPackChoose) {
    els.customPackChoose.addEventListener("click", () => {
      if (els.customPackFile) els.customPackFile.click();
    });
  }
  if (els.customPackFile) els.customPackFile.addEventListener("change", onCustomFileChange);
  if (els.customPackName) {
    els.customPackName.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      createCustomPackFromFile();
    });
  }
  if (els.customPackCreate) {
    els.customPackCreate.addEventListener("click", createCustomPackFromFile);
  }
  if (els.customPackList) {
    els.customPackList.addEventListener("click", onCustomPackListClick);
  }
  if (els.packSheet) {
    els.packSheet.addEventListener("click", (event) => {
      if (event.target === els.packSheet) closePack();
    });
  }
  if (els.setupBtn) els.setupBtn.addEventListener("click", openSetup);
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
  if (els.speedBtn) els.speedBtn.addEventListener("click", cycleSpeed);
  if (els.themeGroup) {
    els.themeGroup.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== "function") return;
      const choice = target.closest("[data-theme-choice]");
      if (choice) setTheme(choice.dataset.themeChoice);
    });
  }

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    const playerOpen = els.playerSheet && !els.playerSheet.classList.contains("is-hidden");
    const boardOpen = els.boardSheet && !els.boardSheet.classList.contains("is-hidden");
    const packOpen = els.packSheet && !els.packSheet.classList.contains("is-hidden");
    const setupOpen = els.setupSheet && !els.setupSheet.classList.contains("is-hidden");
    if (event.key === "Escape" && playerOpen) {
      event.preventDefault();
      closePlayerSheet();
      return;
    }
    if (event.key === "Escape" && boardOpen) {
      event.preventDefault();
      closeBoard();
      return;
    }
    if (playerOpen || boardOpen || packOpen || setupOpen) return;
    if (
      event.key === "Escape" &&
      els.packSheet &&
      !els.packSheet.classList.contains("is-hidden")
    ) {
      event.preventDefault();
      closePack();
      return;
    }
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

  if (els.petLayer) {
    els.petLayer.addEventListener("pointerdown", (event) => {
      const node = event.target && event.target.closest ? event.target.closest(".pet") : null;
      if (!node) return;
      event.stopPropagation();
      event.preventDefault();
      if (state.phase !== "playing") return;
      const pet = state.pets.find((item) => item.el === node);
      if (!pet) return;
      petSqueak(pet, true);
      petNuzzle(pet.x);
      playPetPurr();
      if (pet.hopY === 0) petHop(pet, pet.def.hop * 0.8);
    });
  }

  if (els.field) {
    els.field.addEventListener("pointermove", (event) => {
      if (state.phase !== "playing") return;
      const rect = els.field.getBoundingClientRect();
      state.pointer = {
        x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
        at: performance.now(),
      };
    });
    els.field.addEventListener("pointerleave", () => {
      state.pointer = null;
    });
  }

  if (els.wordLayer) {
    els.wordLayer.addEventListener("click", (event) => {
      if (state.phase !== "playing" || state.mode === "rain") return;
      const node = event.target && event.target.closest ? event.target.closest(".fill-word") : null;
      if (!node) return;
      const card = state.settled.find((item) => item.el === node);
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      speakFillWord(card);
    });
    els.wordLayer.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (state.phase !== "playing" || state.mode === "rain") return;
      const node = event.target && event.target.closest ? event.target.closest(".fill-word") : null;
      if (!node) return;
      const card = state.settled.find((item) => item.el === node);
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      speakFillWord(card);
    });
  }

  els.field.addEventListener("pointerdown", (event) => {
    if (state.phase !== "playing") return;
    if (event.button !== undefined && event.button !== 0) return;
    const target = event.target;
    if (
      target &&
      typeof target.closest === "function" &&
      target.closest("button, input, textarea, select, a, .overlay, .fill-word")
    ) {
      return;
    }
    const rect = els.field.getBoundingClientRect();
    const px = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    state.pointer = { x: px, y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)), at: performance.now() };
    petNuzzle(px);
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

    if (state.physics) {
      rebuildPhysicsWalls(fieldW, fieldH);
      for (const s of state.settled) {
        if (!s.body) continue;
        const baseW = s.baseW || s.w;
        const baseH = s.baseH || s.h;
        const x = Math.min(Math.max(s.body.position.x, baseW / 2 + 1), fieldW - baseW / 2 - 1);
        const y = Math.min(Math.max(s.body.position.y, baseH / 2 + 1), fieldH - baseH / 2 - 1);
        if (x !== s.body.position.x || y !== s.body.position.y) {
          Physics.Body.setPosition(s.body, { x, y });
        }
      }
      wakePhysicsPile();
      syncPhysicsPile();
    } else if (state.lastFieldH && Math.abs(fieldH - state.lastFieldH) > 4) {
      const ratio = fieldH / state.lastFieldH;
      for (const s of state.settled) {
        s.y = Math.max(0, fieldH - (state.lastFieldH - s.y) * ratio);
        const rot = typeof s.rot === "number" ? ` rotate(${s.rot.toFixed(2)}deg)` : "";
        s.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)${rot}`;
      }
    }
    if (state.lastFieldH && Math.abs(fieldH - state.lastFieldH) > 4) {
      for (const w of state.words) {
        w.y = Math.min(w.y, fieldH - w.h);
        w.el.style.transform = `translate3d(${w.x}px, ${w.y}px, 0)`;
      }
    }
    for (const word of state.words) {
      if (word.x + word.w > fieldW - 4) {
        word.x = Math.max(PAD, fieldW - word.w - PAD);
        word.el.style.transform = `translate3d(${word.x}px, ${word.y}px, 0)`;
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
    if (!(state.speed in SPEED_LEVELS)) state.speed = "normal";
    if (!THEMES.includes(state.theme)) state.theme = "candy";
    if (!GAME_MODES.includes(state.mode)) state.mode = "rain";
    applyTheme(state.theme);
    updateModeUI();
    scatterPlaySteps();
    renderCategoryOptions();
    updatePackUI();
    state.packGroup = packGroupForCategory(getSelectedCategory());
    renderPackTabs();
    renderPackCategoryGrid();
    if (CustomPacks) {
      renderCustomPackList();
      updateCustomPackUI();
    } else if (els.customPackSection) {
      els.customPackSection.classList.add("is-hidden");
    }
    updateSpeedUI();
    renderBestLine();
    loadPlayerState();
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
    maybeShowPlayerPicker();
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
      buildFillBoard,
      setMode,
      getMode: () => state.mode,
      getFill: () =>
        state.mode === "fill"
          ? {
              total: state.fillTotal,
              remaining: state.settled.length,
              cleared: state.cleared,
              bonus: state.fillBonus,
              finishing: state.fillFinishing,
              words: state.settled.map((s) => s.word),
            }
          : null,
      getPaint: () =>
        state.mode === "paint"
          ? {
              total: state.paintTotal,
              remaining: state.settled.length,
              cleared: state.cleared,
              bonus: state.paintBonus,
              finishing: state.paintFinishing,
              splats: els.paintLayer ? els.paintLayer.childElementCount : 0,
              words: state.settled.map((s) => s.word),
            }
          : null,
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
      getProfiles: () =>
        state.profiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          avatar: profile.avatar,
          pets: (profile.pets || []).slice(),
          total: profile.total,
          best: profile.best,
          correct: profile.correct,
          rounds: profile.rounds,
        })),
      startMeteor,
      getMeteor: () =>
        state.meteor
          ? {
              x: state.meteor.x,
              y: state.meteor.y,
              bounces: state.meteor.bounces,
              edgeHits: { ...state.meteor.edgeHits },
              cleared: state.meteor.cleared,
              vx: state.meteor.vx,
              vy: state.meteor.vy,
            }
          : null,
      getTheme: () => state.theme,
      setTheme,
      getPet: () => (state.pet ? petInfo(state.pet) : null),
      getPets: () => state.pets.map(petInfo),
      getPetCatalog: () => (Pets ? Pets.PETS.map((pet) => ({ ...pet })) : []),
      getPetAccessories: () => (Pets ? Pets.ACCESSORIES.map((acc) => ({ ...acc })) : []),
      randomPet: () => (Pets ? Pets.random(state.lastPetId).id : PET_FALLBACK.id),
      setPet: (id) => {
        if (!Pets) return null;
        const def = Pets.byId(id);
        if (!def) return null;
        resetPets(def);
        return state.pet ? petInfo(state.pet) : null;
      },
      petStartle: (x) => { petStartle(x == null ? (state.pet ? state.pet.x : 0) : x); },
      petCheer: () => petCheer(),
      petNuzzle: (x) => petNuzzle(x == null ? (state.pet ? state.pet.x : 0) : x),
      petSqueak: () => {
        if (state.pet) petSqueak(state.pet, true);
      },
      getSpeed: () => state.speed,
      setSpeed: (key) => {
        if (!(key in SPEED_LEVELS)) return state.speed;
        const previous = state.speed;
        state.speed = key;
        try { localStorage.setItem(SPEED_KEY, key); } catch {}
        applyFallingSpeed(previous, key);
        updateSpeedUI();
        return state.speed;
      },
      getActiveProfile: () => {
        const profile = currentProfile();
        return profile ? { ...profile } : null;
      },
      selectPlayer: (id) => selectProfile(Profiles ? Profiles.find(state.profiles, id) : null),
      createPlayer: (name, avatar) => {
        selectedAvatar = avatar && Profiles && Profiles.AVATARS.includes(avatar) ? avatar : selectedAvatar;
        if (els.playerNameInput) els.playerNameInput.value = name == null ? "" : String(name);
        createPlayerFromForm(null);
        return currentProfile();
      },
      deletePlayer: (id) => deleteProfile(Profiles ? Profiles.find(state.profiles, id) : null),
      openPlayerSheet,
      closePlayerSheet,
      openBoard,
      closeBoard,
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
        state.settled.map((s) => ({
          word: s.word,
          x: s.x,
          y: s.y,
          w: s.w,
          h: s.h,
          angle: s.body ? s.body.angle : 0,
          sleeping: s.body ? Boolean(s.body.isSleeping) : true,
        })),
      getPhysics: () =>
        state.physics
          ? {
              bodies: state.physics.engine.world.bodies.length,
              settled: state.settled.length,
              awake: state.settled.filter((s) => s.body && !s.body.isSleeping).length,
              gravity: state.physics.engine.gravity.y,
            }
          : null,
    };
  }

  init();
})();
