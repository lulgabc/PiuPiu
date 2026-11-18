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
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const HS_KEY = "piupiu.highscore";
  const MUTE_KEY = "piupiu.muted";
  const PACK_KEY = "piupiu.pack";
  const LEVEL_KEY = "piupiu.level";
  const BAND_KEY = "piupiu.band";
  const PAD = 12;
  const DANGER_Y = 10;
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
    micEnabled: Boolean(SpeechRec),
    speech: null,
    listening: false,
    speechStarting: false,
    speechError: false,
    speechNetworkErrors: 0,
    restartTimer: 0,
    heardTimer: 0,
    praiseTimer: 0,
    focusTimer: 0,
    focusedWord: null,
    helpSpeaking: false,
    helpSpeakToken: 0,
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
    if (!state.audioCtx) state.audioCtx = new Ctx();
    if (state.audioCtx.state === "suspended") state.audioCtx.resume().catch(() => {});
    return state.audioCtx;
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
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
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
    gain.gain.value = volume;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(ctx.currentTime + delay);
  }

  function playPop() {
    noiseBurst(0.14, 0.035);
    tone(180, 0.18, "sine", 0.055, 0, 62);
    tone(920, 0.09, "triangle", 0.025, 0.01, 1500);
  }

  function playMiss() {
    tone(130, 0.18, "sine", 0.05, 0, 72);
    noiseBurst(0.05, 0.02);
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
    gain.gain.exponentialRampToValueAtTime(volume, start + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    src.connect(filter).connect(gain).connect(ctx.destination);
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
    tone(523.25, 0.12, "triangle", 0.035, 0.02);
    tone(783.99, 0.13, "triangle", 0.035, 0.12);
    tone(1046.5, 0.16, "triangle", 0.032, 0.24);
    tone(1567.98, 0.3, "sine", 0.025, 0.38);
    noiseBurst(0.22, 0.025, 0.12);
  }

  function playLevel() {
    tone(620, 0.1, "triangle", 0.03);
    tone(930, 0.14, "triangle", 0.03, 0.09);
  }

  function playOver() {
    tone(392, 0.18, "triangle", 0.04);
    tone(294, 0.22, "triangle", 0.04, 0.16);
    tone(196, 0.42, "sine", 0.05, 0.34, 140);
    noiseBurst(0.3, 0.015, 0.02);
  }

  /* ------------------------------------------------------------------ */
  /* game flow                                                           */
  /* ------------------------------------------------------------------ */

  function resetGame() {
    cancelAnimationFrame(state.raf);
    state.raf = 0;
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

  function startGame() {
    audio();
    state.pool = getSelectedPool();
    resetGame();
    state.phase = "playing";
    window.dispatchEvent(new CustomEvent("piupiu:roundstart"));
    hideOverlay();
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
    const el = document.createElement("div");
    el.className = "word";
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
      faceTimer: 1,
      showEmoji: false,
    };
    el.style.transform = `translate3d(${x}px, ${obj.y}px, 0)`;
    state.words.push(obj);
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

    const finalY = Math.max(0, y);
    word.y = finalY;
    word.showEmoji = false;
    word.el.classList.remove("show-emoji");
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
    stopHelpSpeech();
    clearFocus();
    stopSpeech();
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
    cancelAnimationFrame(state.raf);
    state.raf = 0;
    stopHelpSpeech();
    clearFocus();
    stopSpeech();
    updatePauseButton();
    updateMicUI();
    showPanel(els.pausePanel);
  }

  function resumeGame() {
    if (state.phase !== "paused") return;
    state.phase = "playing";
    hideOverlay();
    updatePauseButton();
    state.lastFrame = 0;
    state.raf = requestAnimationFrame(frame);
    if (state.micEnabled) startSpeech();
    updateMicUI();
    els.typeInput.blur();
  }

  function goHome() {
    state.phase = "menu";
    stopSpeech();
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
    setText(els.bestLine, tr("start.best", { score: formatNumber(state.highScore) }));
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

  function refreshLanguage() {
    updateHUD(true);
    updateMicUI();
    updatePauseButton();
    updateMuteUI();
    renderBestLine();
    renderCategoryOptions();
    updatePackUI();
    els.speechNote.textContent = SpeechRec
      ? tr("speech.note.ok")
      : tr("speech.note.unsupported");
    if (state.phase === "over") renderOverPanel();
    hideHeard();
    hidePraise();
    hideToast();
  }

  /* ------------------------------------------------------------------ */
  /* matching & explosions                                               */
  /* ------------------------------------------------------------------ */

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
    if (base.length >= 3 && base.endsWith("y") && !/[aeiou]y$/.test(base)) {
      add(`${base.slice(0, -1)}ies`);
    }
    for (const alias of HOMOPHONES[base] || []) forms.add(alias);
    return forms;
  }

  function findMatch(text) {
    if (!text) return null;
    const normalized = text
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z' ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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
      const forms = formsFor(word.word);

      if (forms.has(normalized)) return word;

      for (const token of tokens) {
        if (forms.has(token)) return word;
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
    const basePoints = 10 + Math.round(heightRatio * 10);
    const multiplier = 1 + Math.min(state.combo - 1, 10) * 0.1;
    const points = Math.round(basePoints * multiplier);
    state.score += points;
    state.cleared += 1;
    advanceRewardProgress();

    const effect = nextEffect();
    state.lastEffect = effect;
    const effectHue = EFFECT_HUES[effect] || hueFor(word.word);
    runEffect(effect, word, rel, hueFor(word.word), effectHue);
    word.el.remove();
    showFloat(
      `+${points}`,
      state.combo >= 2 ? `×${state.combo}` : "",
      cx,
      cy,
      `hsl(${effectHue} 100% 78%)`,
    );
    playEffect(effect);
    pulseCombo();
    updateHUD(true);
    showHeard(tr("heard.correct", { word: word.word }));
    showPraise();
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

  function pickHelpVoice() {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    try {
      const voices = synth.getVoices() || [];
      helpVoice =
        voices.find((voice) => /^en[-_]US/i.test(voice.lang) && voice.localService) ||
        voices.find((voice) => /^en[-_]US/i.test(voice.lang)) ||
        voices.find((voice) => /^en/i.test(voice.lang)) ||
        null;
    } catch {
      helpVoice = null;
    }
    return helpVoice;
  }

  function stopHelpSpeech() {
    state.helpSpeakToken += 1;
    state.helpSpeaking = false;
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
    if (state.micEnabled) stopSpeech();
    try {
      synth.cancel();
    } catch {}
    updateMicUI();

    const utterance = new Utterance(word.word);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    if (!helpVoice) pickHelpVoice();
    if (helpVoice) utterance.voice = helpVoice;

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (token !== state.helpSpeakToken) return;
      state.helpSpeaking = false;
      updateMicUI();
      if (state.phase === "playing" && state.micEnabled) {
        window.setTimeout(() => {
          if (state.phase === "playing" && state.micEnabled && !state.helpSpeaking) {
            startSpeech();
          }
        }, 350);
      }
    };

    utterance.onend = done;
    utterance.onerror = done;

    try {
      synth.speak(utterance);
    } catch {
      done();
      toast(tr("help.unsupported"), "warn");
      return;
    }

    window.setTimeout(() => {
      if (token === state.helpSpeakToken && state.helpSpeaking) done();
    }, 6000);
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
    if (!window.speechSynthesis) return;
    pickHelpVoice();
    window.speechSynthesis.onvoiceschanged = pickHelpVoice;
  }

  /* ------------------------------------------------------------------ */
  /* speech recognition                                                  */
  /* ------------------------------------------------------------------ */

  function setupSpeech() {
    if (!SpeechRec) return;
    try {
      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        state.listening = true;
        state.speechStarting = false;
        state.speechError = false;
        updateMicUI();
      };

      recognition.onresult = (event) => {
        if (state.phase !== "playing") return;
        let latest = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result || !result[0]) continue;
          const transcript = (result[0].transcript || "").trim();
          if (!transcript) continue;
          latest = transcript;
          const hit = findMatch(transcript);
          if (hit) {
            explodeWord(hit);
            return;
          }
        }
        if (latest) showHeard(tr("heard.prefix", { text: latest }));
      };

      recognition.onerror = (event) => {
        handleSpeechError(event.error);
      };

      recognition.onend = () => {
        state.listening = false;
        state.speechStarting = false;
        updateMicUI();
        if (state.phase === "playing" && state.micEnabled && !state.helpSpeaking && !state.restartTimer) {
          state.restartTimer = window.setTimeout(() => {
            state.restartTimer = 0;
            if (state.phase === "playing" && state.micEnabled && !state.listening && !state.helpSpeaking) {
              startSpeech();
            }
          }, 300);
        }
      };

      state.speech = recognition;
    } catch (err) {
      console.warn("Speech recognition unavailable:", err);
      state.micEnabled = false;
      state.speech = null;
    }
  }

  function startSpeech() {
    if (!state.speech || !state.micEnabled) return;
    if (state.listening || state.speechStarting) return;
    state.speechStarting = true;
    try {
      state.speech.start();
    } catch (err) {
      state.speechStarting = false;
      if (err && err.name === "NotAllowedError") {
        handleSpeechError("not-allowed");
      } else if (err && err.name !== "InvalidStateError") {
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
    if (state.speech) {
      try {
        state.speech.abort();
      } catch {}
    }
    state.listening = false;
    updateMicUI();
  }

  function handleSpeechError(code) {
    if (code === "no-speech" || code === "aborted") return;
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

  function showPraise() {
    if (!els.praise) return;
    const keys = ["praise.1", "praise.2", "praise.3", "praise.4"];
    const key = keys[Math.floor(Math.random() * keys.length)];
    setText(els.praise, `⭐ ${tr(key)}`);
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
  els.diffGroup.querySelectorAll("[data-level]").forEach((button) => {
    button.addEventListener("click", () => onDifficultyClick(button));
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
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

    if (event.key === "Enter" && state.phase === "menu" && !typing && target.tagName !== "BUTTON") {
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
      els.speechNote.textContent = tr("speech.note.ok");
    } else {
      state.micEnabled = false;
      els.speechNote.textContent = tr("speech.note.unsupported");
    }
    setupHelp();

    state.lastFieldW = els.field.clientWidth;
    state.lastFieldH = els.field.clientHeight;
    resetRewardProgress();
    updateHUD(true);
    updateMicUI();
    updatePauseButton();
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
      getFalling: () =>
        state.words.map((w) => ({
          word: w.word,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          emoji: w.emoji,
          showEmoji: w.showEmoji,
        })),
      updateWordFace,
      getSettled: () =>
        state.settled.map((s) => ({ word: s.word, x: s.x, y: s.y, w: s.w, h: s.h })),
    };
  }

  init();
})();
