import {
  state,
  CATEGORY_ICON_IDS,
  shuffle,
  tr,
  formatNumber,
  uniqueWords,
} from "../core/state.js";
import { events } from "../core/events.js";
import { ensureEducationLoaded, ensureFamiliesLoaded } from "../core/loader.js";
import {
  LAZY_PACK_MANIFEST,
  isLazyPackId,
  getLazyPackLoader,
  getLazyPackBandCount,
} from "./pack-manifest.js";
import {
  getPackSelection,
  setPackSelection,
  getSrsStore,
  getDueWords,
} from "../core/storage.js";

export const PACK_GROUPS = [
  { id: "themes", labelKey: "pack.groupThemes" },
  { id: "education", labelKey: "pack.groupEducation" },
  { id: "phrases", labelKey: "pack.groupPhrases" },
  { id: "custom", labelKey: "pack.groupCustom" },
];

function getGlobal() {
  return typeof window !== "undefined" ? window : globalThis;
}

export function getWordBank() {
  const w = getGlobal()?.PIU_WORDS;
  return Array.isArray(w) ? w.slice() : [];
}

function getLexicon() {
  const v = getGlobal()?.PIU_LEXICON;
  return Array.isArray(v) ? v : [];
}

function getEducation() {
  const v = getGlobal()?.PIU_EDUCATION;
  return Array.isArray(v) ? v : [];
}

function getFamilies() {
  const v = getGlobal()?.PIU_FAMILIES;
  return Array.isArray(v) ? v : [];
}

function getPhrases() {
  const v = getGlobal()?.PIU_PHRASES;
  return Array.isArray(v) ? v : [];
}

function getNumbers() {
  const v = getGlobal()?.PIU_NUMBERS;
  return Array.isArray(v) ? v : [];
}

function getCustomPacksApi() {
  const v = getGlobal()?.PiuCustomPacks;
  return v && typeof v === "object" ? v : null;
}

function ui() {
  return state.uiHooks && typeof state.uiHooks === "object" ? state.uiHooks : {};
}

export function setPackUiBridge(hooks = {}) {
  state.uiHooks = Object.assign(state.uiHooks || {}, hooks);
  return state.uiHooks;
}

export function buildCategories() {
  const wordBank = getWordBank();
  const coreLevels = { 1: [], 2: [], 3: [] };
  for (const word of wordBank) {
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

  const missedDue = getDueWords(state.userId || "_guest")
    .filter((entry) => entry && (entry.miss > 0 || entry.help > 0) && entry.word)
    .map((entry) => entry.word);
  const missedWords = uniqueWords(missedDue);
  if (missedWords.length > 0) {
    categories.push({
      id: "missed",
      icon: "✨",
      nameKey: "pack.missedTitle",
      education: false,
      virtual: true,
      group: "themes",
      levels: { 1: missedWords, 2: [], 3: [] },
      countKey: "pack.count",
    });
  }

  for (const category of getNumbers()) {
    if (!category || !category.id || !Array.isArray(category.bands)) continue;
    categories.push({ ...category, education: false, group: category.group || "themes" });
  }

  for (const category of getLexicon()) {
    if (!category || !category.id || !category.levels) continue;
    categories.push({ ...category, education: false, group: "themes" });
  }

  const eduById = new Map();
  for (const category of getEducation()) {
    if (category && category.id && Array.isArray(category.bands)) {
      eduById.set(category.id, category);
    }
  }
  const famById = new Map();
  for (const category of getFamilies()) {
    if (category && category.id && Array.isArray(category.bands)) {
      famById.set(category.id, category);
    }
  }

  const seenLazy = new Set();
  for (const entry of LAZY_PACK_MANIFEST) {
    seenLazy.add(entry.id);
    const live =
      entry.lazy === "education" ? eduById.get(entry.id) : famById.get(entry.id);
    if (live) {
      categories.push({
        ...live,
        education: true,
        group: live.group || entry.group,
        countKey: live.countKey || entry.countKey,
        lazy: entry.lazy,
        loaded: true,
        totalCount: entry.totalCount,
      });
    } else {
      categories.push({
        id: entry.id,
        icon: entry.icon,
        nameKey: entry.nameKey,
        education: true,
        group: entry.group,
        countKey: entry.countKey,
        lazy: entry.lazy,
        loaded: false,
        totalCount: entry.totalCount,
        bands: entry.bands.map((band) => ({
          id: band.id,
          labelKey: band.labelKey,
          count: band.count,
          words: [],
        })),
      });
    }
  }

  for (const category of getEducation()) {
    if (!category || !category.id || !Array.isArray(category.bands) || seenLazy.has(category.id)) {
      continue;
    }
    categories.push({
      ...category,
      education: true,
      group: category.group || "education",
      loaded: true,
    });
  }

  for (const category of getFamilies()) {
    if (!category || !category.id || !Array.isArray(category.bands) || seenLazy.has(category.id)) {
      continue;
    }
    categories.push({
      ...category,
      education: true,
      group: category.group || "families",
      loaded: true,
    });
  }

  for (const category of getPhrases()) {
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

export function packGroupForCategory(category) {
  if (!category) return "themes";
  if (category.custom || category.group === "custom") return "custom";
  if (category.group === "phrases") return "phrases";
  if (category.group === "education" || category.group === "families") return "education";
  return "themes";
}

export function categoryIcon(category) {
  if (!category) return "spark";
  if (category.custom || category.packId) return "file";
  return CATEGORY_ICON_IDS[category.id] || "spark";
}

export function categoryName(category) {
  if (!category) return "";
  return category.name || tr(category.nameKey || "");
}

export function categoryTotalCount(category) {
  if (!category) return 0;
  if (Array.isArray(category.bands)) {
    return category.bands.reduce(
      (sum, band) => sum + ((band.words && band.words.length) || band.count || 0),
      0,
    );
  }
  if (category.levels) {
    return [1, 2, 3].reduce((sum, level) => sum + (category.levels[level] || []).length, 0);
  }
  return category.totalCount || 0;
}

export function getSelectedCategory() {
  return (
    state.categories.find((category) => category.id === state.categoryId) ||
    state.categories[0] ||
    null
  );
}

export function getSelectedPool() {
  const category = getSelectedCategory();
  if (!category) return getWordBank();

  if (category.id === "missed") {
    const liveMissed = uniqueWords(
      getDueWords(state.userId || "_guest")
        .filter((entry) => entry && (entry.miss > 0 || entry.help > 0) && entry.word)
        .map((entry) => entry.word),
    );
    if (liveMissed.length) return liveMissed;
    const staticMissed = uniqueWords(
      [1, 2, 3].flatMap((level) => (category.levels && category.levels[level]) || []),
    );
    return staticMissed.length ? staticMissed : getWordBank();
  }

  if (category.lazy && !category.loaded) {
    if (typeof document !== "undefined") {
      ensureCategoryPoolLoaded(category.id).catch(() => {});
    }
    return uniqueWords(getWordBank());
  }

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
    pool = uniqueWords(fallback.length ? fallback : getWordBank());
  }
  return pool;
}

export function getSelectedPoolCount() {
  const category = getSelectedCategory();
  if (category && category.lazy && !category.loaded) {
    return getLazyPackBandCount(category.id, state.band);
  }
  return getSelectedPool().length;
}

export async function ensureCategoryPoolLoaded(categoryId = state.categoryId) {
  const kind = getLazyPackLoader(categoryId);
  if (kind === "education") {
    await ensureEducationLoaded();
  } else if (kind === "families") {
    await ensureFamiliesLoaded();
  } else {
    return getSelectedPool();
  }

  state.categories = buildCategories();
  if (state.categoryId === categoryId) {
    const category = getSelectedCategory();
    if (category && Array.isArray(category.bands)) {
      const validBand =
        state.band === "all" || category.bands.some((band) => band.id === state.band);
      if (!validBand) state.band = "all";
    }
    state.pool = getSelectedPool();
  }
  events.emit("packs:loaded", { categoryId, loader: kind, pool: state.pool });
  ui().updatePackUI?.();
  return state.pool;
}

export function savePackSelection() {
  setPackSelection({
    categoryId: state.categoryId,
    difficulty: state.difficulty,
    band: state.band,
  });
}

export function loadPackSelection() {
  const CustomPacks = getCustomPacksApi();
  state.customPacks = CustomPacks ? CustomPacks.load() : [];
  state.categories = buildCategories();

  const saved = getPackSelection();
  state.categoryId = state.categories.some((category) => category.id === saved.categoryId)
    ? saved.categoryId
    : "core";

  const savedLevel = Number(saved.difficulty);
  state.difficulty =
    Number.isInteger(savedLevel) && savedLevel >= 0 && savedLevel <= 3 ? savedLevel : 0;

  state.band = saved.band || "all";
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

  state.packGroup = packGroupForCategory(category);
  state.pool = getSelectedPool();

  if (isLazyPackId(state.categoryId) && category && !category.loaded && typeof document !== "undefined") {
    ensureCategoryPoolLoaded(state.categoryId).catch(() => {});
  }
}

export function setPackGroup(group) {
  if (!PACK_GROUPS.some((item) => item.id === group)) return false;
  if (group === "custom" && !getCustomPacksApi()) return false;
  state.packGroup = group;
  ui().updatePackUI?.();
  events.emit("packs:changed", {
    packGroup: state.packGroup,
    categoryId: state.categoryId,
    band: state.band,
    difficulty: state.difficulty,
  });
  return true;
}

export function selectPackCategory(next) {
  const category = state.categories.find((item) => item.id === next);
  if (!category) return false;
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

  state.pool = getSelectedPool();
  savePackSelection();
  ui().updatePackUI?.();
  events.emit("packs:changed", {
    packGroup: state.packGroup,
    categoryId: state.categoryId,
    band: state.band,
    difficulty: state.difficulty,
  });

  if (isLazyPackId(next) && !category.loaded && typeof document !== "undefined") {
    ensureCategoryPoolLoaded(next).catch(() => {});
  }
  return true;
}

export function setPackBand(bandId) {
  const category = getSelectedCategory();
  if (!category || !Array.isArray(category.bands)) return false;
  if (bandId !== "all" && !category.bands.some((band) => band.id === bandId)) return false;
  state.band = bandId;
  state.pool = getSelectedPool();
  savePackSelection();
  ui().updatePackUI?.();
  events.emit("packs:changed", {
    packGroup: state.packGroup,
    categoryId: state.categoryId,
    band: state.band,
    difficulty: state.difficulty,
  });
  return true;
}

export function setPackDifficulty(level) {
  const numeric = Number(level);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 3) return false;
  const category = getSelectedCategory();
  if (category && category.levels && numeric > 0 && !(category.levels[numeric] || []).length) {
    return false;
  }
  state.difficulty = numeric;
  state.pool = getSelectedPool();
  savePackSelection();
  ui().updatePackUI?.();
  events.emit("packs:changed", {
    packGroup: state.packGroup,
    categoryId: state.categoryId,
    band: state.band,
    difficulty: state.difficulty,
  });
  return true;
}

export function resetBag(sourceWords = null) {
  const base =
    Array.isArray(sourceWords) && sourceWords.length
      ? sourceWords.slice()
      : Array.isArray(state.practiceWords) && state.practiceWords.length
        ? state.practiceWords.slice()
        : Array.isArray(state.pool) && state.pool.length
          ? state.pool.slice()
          : getWordBank();

  if (!base.length) {
    state.bag = [];
    return state.bag;
  }

  const extras = [];
  const inPractice = Array.isArray(state.practiceWords) && state.practiceWords.length > 0;
  if (!inPractice && !Array.isArray(sourceWords)) {
    const pid = state.userId || "_guest";
    const srsMap = getSrsStore(pid);
    const dueList = getDueWords(pid);
    if (dueList.length) {
      const poolByLower = new Map();
      for (const word of base) {
        const lower = String(word).toLowerCase();
        if (!poolByLower.has(lower)) poolByLower.set(lower, word);
      }
      const maxExtras = Math.min(24, Math.max(4, Math.floor(base.length * 0.35)));
      for (const entry of dueList) {
        if (extras.length >= maxExtras) break;
        if (!entry || !entry.word || !Object.hasOwn(srsMap, entry.word)) continue;
        const original = poolByLower.get(entry.word);
        if (!original) continue;
        const pressure = entry.miss * 2 + entry.help - entry.hit;
        const weight = pressure >= 2 || (entry.box === 0 && entry.miss > 0) ? 2 : 1;
        for (let i = 0; i < weight && extras.length < maxExtras; i++) {
          extras.push(original);
        }
      }
    }
  }

  state.bag = shuffle(base.concat(extras));
  return state.bag;
}

export function nextWord() {
  if (!state.bag.length) resetBag();
  if (!state.bag.length) return "";
  let word = state.bag.pop();
  if (word === state.lastWord && state.bag.length) {
    for (let i = state.bag.length - 1; i >= 0; i--) {
      if (state.bag[i] !== state.lastWord) {
        const alt = state.bag[i];
        state.bag[i] = word;
        word = alt;
        break;
      }
    }
  }
  state.lastWord = word;
  return word;
}

export function getCategoriesByGroup(group = state.packGroup) {
  return state.categories.filter((category) => packGroupForCategory(category) === group);
}

export function filterCategories(query, group = null) {
  const q = String(query || "").trim().toLowerCase();
  const base = group ? getCategoriesByGroup(group) : state.categories;
  if (!q) return base;
  return base.filter((category) => {
    const name = categoryName(category).toLowerCase();
    const id = String(category.id || "").toLowerCase();
    return name.includes(q) || id.includes(q);
  });
}

export function getCategoryPreviewWords(category, limit = 12) {
  if (!category) return [];
  let words = [];
  if (Array.isArray(category.bands)) {
    for (const band of category.bands) {
      if (Array.isArray(band.words) && band.words.length) {
        words = words.concat(band.words);
      }
    }
  } else if (category.levels) {
    for (const level of [1, 2, 3]) {
      if (Array.isArray(category.levels[level])) {
        words = words.concat(category.levels[level]);
      }
    }
  }
  return uniqueWords(words).slice(0, Math.max(0, limit));
}

export function getPackMasteryStats(category, profileId = state.userId || "_guest") {
  if (!category) return { total: 0, mastered: 0, seen: 0 };
  const srsMap = getSrsStore(profileId || "_guest");
  let words = [];
  if (Array.isArray(category.bands)) {
    for (const band of category.bands) {
      if (Array.isArray(band.words)) words = words.concat(band.words);
    }
  } else if (category.levels) {
    for (const level of [1, 2, 3]) {
      if (Array.isArray(category.levels[level])) words = words.concat(category.levels[level]);
    }
  }
  const unique = uniqueWords(words);
  const total = unique.length || categoryTotalCount(category);
  let mastered = 0;
  let seen = 0;
  for (const word of unique) {
    const key = String(word).toLowerCase();
    if (!Object.hasOwn(srsMap, key)) continue;
    const stats = srsMap[key];
    seen += 1;
    if (stats.box >= 2 || (stats.hit > 0 && stats.miss === 0)) {
      mastered += 1;
    }
  }
  return { total, mastered, seen };
}

export function formatFileSize(bytes) {
  const kb = Math.max(1, Math.round(Number(bytes) / 1024));
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function isSupportedCustomFile(file) {
  if (!file) return false;
  const name = String(file.name || "").toLowerCase();
  if (/\.(txt|text|md|csv)$/.test(name)) return true;
  return /^text\//.test(String(file.type || "").toLowerCase());
}

export function fileBaseName(name) {
  const CustomPacks = getCustomPacksApi();
  const base = String(name || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return CustomPacks ? CustomPacks.sanitizeName(base) : base.slice(0, 30);
}

export function setCustomNotice(key, vars = {}, type = "info") {
  state.customNotice = key ? { key, vars, type } : null;
  ui().renderCustomNotice?.();
  events.emit("packs:customNotice", state.customNotice);
}

export function refreshCustomPackCategories(preferredId) {
  const CustomPacks = getCustomPacksApi();
  if (!CustomPacks) return;
  state.customPacks = CustomPacks.load();
  state.categories = buildCategories();
  const preferred =
    preferredId && state.categories.some((category) => category.id === preferredId)
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
  ui().updatePackUI?.();
  ui().renderPoetrySummary?.();
  ui().updateCustomPackUI?.();
  events.emit("packs:customChanged", {
    customPacks: state.customPacks,
    categoryId: state.categoryId,
  });
}

export function createCustomPackFromText(text, rawName = "", fallbackName = "") {
  const CustomPacks = getCustomPacksApi();
  if (!CustomPacks) {
    setCustomNotice("custom.unsupported", {}, "error");
    return { ok: false, errorKey: "custom.unsupported" };
  }
  const parsed = CustomPacks.parseText(typeof text === "string" ? text : "");
  if (!parsed.words.length) {
    setCustomNotice("custom.noWords", {}, "error");
    return { ok: false, errorKey: "custom.noWords" };
  }
  if (parsed.words.length < CustomPacks.MIN_WORDS) {
    const vars = { min: CustomPacks.MIN_WORDS };
    setCustomNotice("custom.tooFew", vars, "error");
    return { ok: false, errorKey: "custom.tooFew", errorVars: vars };
  }
  const name =
    CustomPacks.sanitizeName(String(rawName || "").trim()) ||
    CustomPacks.sanitizeName(fallbackName) ||
    tr("custom.defaultName");
  const result = CustomPacks.create(name, parsed.words);
  if (result.error) {
    let errorKey = "custom.noWords";
    let errorVars = {};
    if (result.error === "too-many") {
      errorKey = "custom.tooMany";
      errorVars = { max: CustomPacks.MAX_PACKS };
    } else if (result.error === "too-few") {
      errorKey = "custom.tooFew";
      errorVars = { min: CustomPacks.MIN_WORDS };
    } else if (result.error === "storage") {
      errorKey = "custom.storage";
    }
    setCustomNotice(errorKey, errorVars, "error");
    return { ok: false, errorKey, errorVars };
  }

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
  return { ok: true, pack: result.pack, truncated: Boolean(parsed.truncated) };
}

export async function importCustomPackFile(file, typedName = "") {
  const CustomPacks = getCustomPacksApi();
  if (!CustomPacks) {
    setCustomNotice("custom.unsupported", {}, "error");
    return { ok: false, errorKey: "custom.unsupported" };
  }
  if (!file) {
    setCustomNotice("custom.selectFirst", {}, "warn");
    return { ok: false, errorKey: "custom.selectFirst" };
  }
  if (!isSupportedCustomFile(file)) {
    setCustomNotice("custom.fileType", {}, "error");
    return { ok: false, errorKey: "custom.fileType" };
  }
  if (state.customPackReading) {
    return { ok: false, errorKey: "custom.reading" };
  }
  if (file.size > CustomPacks.MAX_FILE_BYTES) {
    const vars = { mb: Math.round(CustomPacks.MAX_FILE_BYTES / (1024 * 1024)) };
    setCustomNotice("custom.fileTooLarge", vars, "error");
    return { ok: false, errorKey: "custom.fileTooLarge", errorVars: vars };
  }

  const g = getGlobal();
  const Reader = g && typeof g.FileReader === "function" ? g.FileReader : null;
  if (!Reader && typeof file.text !== "function") {
    setCustomNotice("custom.unsupported", {}, "error");
    return { ok: false, errorKey: "custom.unsupported" };
  }

  state.customPackReading = true;
  setCustomNotice("custom.reading", {}, "info");
  ui().updateCustomPackUI?.();

  try {
    let text = "";
    if (Reader) {
      text = await new Promise((resolve, reject) => {
        const reader = new Reader();
        reader.onerror = () => reject(new Error("readError"));
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.readAsText(file, "utf-8");
      });
    } else {
      text = await file.text();
    }
    state.customPackReading = false;
    const outcome = createCustomPackFromText(text, typedName, fileBaseName(file.name));
    if (outcome.ok) {
      state.customPackFile = null;
    }
    ui().updateCustomPackUI?.();
    return outcome;
  } catch {
    state.customPackReading = false;
    setCustomNotice("custom.readError", {}, "error");
    ui().updateCustomPackUI?.();
    return { ok: false, errorKey: "custom.readError" };
  }
}

export function deleteCustomPack(id) {
  const CustomPacks = getCustomPacksApi();
  if (!CustomPacks) {
    setCustomNotice("custom.unsupported", {}, "error");
    return { ok: false, errorKey: "custom.unsupported" };
  }
  const pack = (state.customPacks || []).find((item) => item.id === id);
  if (!pack) return { ok: false, errorKey: "custom.notFound" };
  if (!CustomPacks.remove(id)) {
    setCustomNotice("custom.storage", {}, "error");
    return { ok: false, errorKey: "custom.storage" };
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
  return { ok: true, pack };
}
