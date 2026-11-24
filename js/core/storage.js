import { STORAGE_KEYS } from "./state.js";

export const ALL_PIUPIU_KEYS = Object.freeze(Object.values(STORAGE_KEYS));

const JSON_KEYS = new Set([
  STORAGE_KEYS.profiles,
  STORAGE_KEYS.customPacks,
  STORAGE_KEYS.poetryDone,
  STORAGE_KEYS.poetryImport,
  STORAGE_KEYS.srs,
  STORAGE_KEYS.pets,
]);

const SRS_INTERVALS_MS = [
  0,
  5 * 60_000,
  60 * 60_000,
  24 * 60 * 60_000,
  3 * 24 * 60 * 60_000,
  7 * 24 * 60 * 60_000,
];
const MAX_SRS_WORDS_PER_PROFILE = 2000;

function getStorage() {
  try {
    if (typeof globalThis === "undefined") return null;
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createDict() {
  return Object.create(null);
}

function setOwn(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
  return target;
}

function cloneDict(source) {
  const copy = createDict();
  if (!isPlainObject(source)) return copy;
  for (const [key, val] of Object.entries(source)) {
    setOwn(copy, key, val);
  }
  return copy;
}

export function getItem(key, fallback = null) {
  try {
    const ls = getStorage();
    if (!ls || typeof ls.getItem !== "function") return fallback;
    const value = ls.getItem(key);
    return value === null || value === undefined ? fallback : value;
  } catch {
    return fallback;
  }
}

export function setItem(key, value) {
  try {
    const ls = getStorage();
    if (!ls || typeof ls.setItem !== "function") return false;
    ls.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key) {
  try {
    const ls = getStorage();
    if (!ls || typeof ls.removeItem !== "function") return false;
    ls.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getJson(key, fallback = null) {
  const raw = getItem(key, null);
  if (raw === null || raw === "") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setJson(key, value) {
  try {
    return setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

export function getNumber(key, fallback = 0) {
  const raw = getItem(key, null);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getBool(key, fallback = false) {
  const raw = getItem(key, null);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return fallback;
}

export function setBool(key, value) {
  return setItem(key, value ? "1" : "0");
}

// Typed getters / setters for all 17 existing piupiu.* keys
export function getProfiles(fallback = []) {
  const val = getJson(STORAGE_KEYS.profiles, fallback);
  return Array.isArray(val) ? val : fallback;
}
export function setProfiles(profiles) {
  return setJson(STORAGE_KEYS.profiles, Array.isArray(profiles) ? profiles : []);
}

export function getActiveUserId(fallback = "") {
  return getItem(STORAGE_KEYS.user, fallback);
}
export function setActiveUserId(userId) {
  return userId ? setItem(STORAGE_KEYS.user, userId) : removeItem(STORAGE_KEYS.user);
}

export function getCustomPacks(fallback = []) {
  const val = getJson(STORAGE_KEYS.customPacks, fallback);
  return Array.isArray(val) ? val : fallback;
}
export function setCustomPacks(packs) {
  return setJson(STORAGE_KEYS.customPacks, Array.isArray(packs) ? packs : []);
}

export function getLang(fallback = "zh") {
  return getItem(STORAGE_KEYS.lang, fallback);
}
export function setLang(lang) {
  return setItem(STORAGE_KEYS.lang, lang);
}

export function getHighScore(fallback = 0) {
  return getNumber(STORAGE_KEYS.highScore, fallback);
}
export function setHighScore(score) {
  return setItem(STORAGE_KEYS.highScore, String(Math.max(0, Math.floor(Number(score) || 0))));
}
export function clearHighScore() {
  return removeItem(STORAGE_KEYS.highScore);
}

export function getMuted(fallback = false) {
  return getBool(STORAGE_KEYS.muted, fallback);
}
export function setMuted(muted) {
  return setBool(STORAGE_KEYS.muted, Boolean(muted));
}

export function getPack(fallback = "core") {
  return getItem(STORAGE_KEYS.pack, fallback);
}
export function setPack(categoryId) {
  return setItem(STORAGE_KEYS.pack, categoryId);
}

export function getSpeed(fallback = "normal") {
  return getItem(STORAGE_KEYS.speed, fallback);
}
export function setSpeed(speed) {
  return setItem(STORAGE_KEYS.speed, speed);
}

export function getLevel(fallback = "0") {
  return getItem(STORAGE_KEYS.level, fallback);
}
export function setLevel(level) {
  return setItem(STORAGE_KEYS.level, String(level));
}

export function getBand(fallback = "all") {
  return getItem(STORAGE_KEYS.band, fallback);
}
export function setBand(band) {
  return setItem(STORAGE_KEYS.band, band);
}

export function getPackSelection() {
  return {
    categoryId: getPack("core"),
    difficulty: Number(getLevel("0")) || 0,
    band: getBand("all"),
  };
}
export function setPackSelection({ categoryId, difficulty, band }) {
  let ok = true;
  if (categoryId !== undefined) ok = setPack(categoryId) && ok;
  if (difficulty !== undefined) ok = setLevel(difficulty) && ok;
  if (band !== undefined) ok = setBand(band) && ok;
  return ok;
}

export function getVoice(fallback = "auto") {
  return getItem(STORAGE_KEYS.voice, fallback);
}
export function setVoice(voice) {
  return setItem(STORAGE_KEYS.voice, voice);
}

export function getTheme(fallback = "candy") {
  return getItem(STORAGE_KEYS.theme, fallback);
}
export function setTheme(theme) {
  return setItem(STORAGE_KEYS.theme, theme);
}

export function getIntroSeen(fallback = false) {
  return getBool(STORAGE_KEYS.introSeen, fallback);
}
export function setIntroSeen(seen = true) {
  return setBool(STORAGE_KEYS.introSeen, Boolean(seen));
}

export function getMode(fallback = "rain") {
  return getItem(STORAGE_KEYS.mode, fallback);
}
export function setMode(mode) {
  return setItem(STORAGE_KEYS.mode, mode);
}

export function getPoetrySelected(fallback = "") {
  return getItem(STORAGE_KEYS.poetrySelected, fallback);
}
export function setPoetrySelected(poemId) {
  return poemId ? setItem(STORAGE_KEYS.poetrySelected, poemId) : removeItem(STORAGE_KEYS.poetrySelected);
}

export function getPoetryDone() {
  const val = getJson(STORAGE_KEYS.poetryDone, []);
  if (!Array.isArray(val)) return [];
  return val.filter((item) => typeof item === "string" && item.length > 0);
}
export function setPoetryDone(doneIterable) {
  const list = Array.from(doneIterable || []).filter((item) => typeof item === "string" && item.length > 0);
  return setJson(STORAGE_KEYS.poetryDone, list);
}

export function getPoetryImportRaw(fallback = null) {
  const val = getJson(STORAGE_KEYS.poetryImport, fallback);
  return isPlainObject(val) && Array.isArray(val.poems) ? val : fallback;
}
export function setPoetryImportRaw(libraryOrJson) {
  if (typeof libraryOrJson === "string") {
    try {
      const parsed = JSON.parse(libraryOrJson);
      if (!isPlainObject(parsed) || !Array.isArray(parsed.poems)) return false;
      return setJson(STORAGE_KEYS.poetryImport, parsed);
    } catch {
      return false;
    }
  }
  if (!isPlainObject(libraryOrJson) || !Array.isArray(libraryOrJson.poems)) return false;
  return setJson(STORAGE_KEYS.poetryImport, libraryOrJson);
}

// Backup Export / Import
export function exportBackupJson() {
  const data = {};
  for (const key of ALL_PIUPIU_KEYS) {
    const raw = getItem(key, null);
    if (raw === null) continue;
    if (JSON_KEYS.has(key)) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        // skip corrupt JSON entries
      }
    } else {
      data[key] = raw;
    }
  }
  return JSON.stringify(
    {
      app: "piupiu",
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2,
  );
}

export function importBackupJson(jsonText) {
  if (typeof jsonText !== "string") {
    return { ok: false, error: "invalid-json" };
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "invalid-json" };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, error: "invalid-json" };
  }

  let payload;
  if (parsed.data !== undefined) {
    if ((parsed.app && parsed.app !== "piupiu") || !isPlainObject(parsed.data)) {
      return { ok: false, error: "invalid-json" };
    }
    payload = parsed.data;
  } else {
    if (parsed.app && parsed.app !== "piupiu") {
      return { ok: false, error: "invalid-json" };
    }
    payload = parsed;
  }

  const whitelist = new Set(ALL_PIUPIU_KEYS);
  const restoredKeys = [];

  const unwrapJson = (value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  for (const [key, rawVal] of Object.entries(payload)) {
    if (!whitelist.has(key)) continue;
    const val = JSON_KEYS.has(key) ? unwrapJson(rawVal) : rawVal;

    if (key === STORAGE_KEYS.profiles) {
      if (!Array.isArray(val)) continue;
      const validRaw = val.filter(
        (entry) => entry && typeof entry === "object" && String(entry.name || "").trim().length > 0,
      );
      const normalizer =
        typeof globalThis !== "undefined" &&
        globalThis.PiuProfiles &&
        typeof globalThis.PiuProfiles.normalizeList === "function"
          ? globalThis.PiuProfiles.normalizeList
          : null;
      const normalized = normalizer ? normalizer(validRaw) : validRaw;
      if (setJson(key, normalized)) restoredKeys.push(key);
    } else if (key === STORAGE_KEYS.customPacks) {
      if (!Array.isArray(val)) continue;
      if (setJson(key, val)) restoredKeys.push(key);
    } else if (key === STORAGE_KEYS.poetryDone) {
      if (!Array.isArray(val)) continue;
      const list = val.filter((item) => typeof item === "string" && item.length > 0);
      if (setJson(key, list)) restoredKeys.push(key);
    } else if (key === STORAGE_KEYS.poetryImport) {
      if (!isPlainObject(val) || !Array.isArray(val.poems)) continue;
      if (setJson(key, val)) restoredKeys.push(key);
    } else if (key === STORAGE_KEYS.srs) {
      if (!isPlainObject(val)) continue;
      if (setJson(key, normalizeSrsStore(val))) restoredKeys.push(key);
    } else if (key === STORAGE_KEYS.pets) {
      if (!isPlainObject(val)) continue;
      if (setJson(key, normalizePetStore(val))) restoredKeys.push(key);
    } else if (typeof val === "boolean") {
      if (setBool(key, val)) restoredKeys.push(key);
    } else if (typeof val === "string" || typeof val === "number") {
      if (setItem(key, String(val))) restoredKeys.push(key);
    }
  }

  if (!restoredKeys.length) {
    return { ok: false, error: "no-valid-keys" };
  }
  return { ok: true, restoredKeys };
}

// M3 SRS Missed-Word Notebook (piupiu.srs.v1)
function normalizeSrsEntry(entry) {
  if (!isPlainObject(entry)) return null;
  const seen = Math.max(0, Math.floor(Number(entry.seen) || 0));
  const hit = Math.max(0, Math.floor(Number(entry.hit) || 0));
  const miss = Math.max(0, Math.floor(Number(entry.miss) || 0));
  const help = Math.max(0, Math.floor(Number(entry.help) || 0));
  const box = Math.max(0, Math.min(5, Math.floor(Number(entry.box) || 0)));
  const dueAt = Math.max(0, Number(entry.dueAt) || 0);
  const lastAt = Math.max(0, Number(entry.lastAt) || 0);
  return { seen, hit, miss, help, box, dueAt, lastAt };
}

function normalizeSrsStore(raw) {
  const out = createDict();
  if (!isPlainObject(raw)) return out;
  for (const [pid, wordsMap] of Object.entries(raw)) {
    if (!pid || !isPlainObject(wordsMap)) continue;
    const cleanWords = createDict();
    for (const [word, stats] of Object.entries(wordsMap)) {
      const key = String(word || "").trim().toLowerCase();
      if (!key) continue;
      const norm = normalizeSrsEntry(stats);
      if (norm) setOwn(cleanWords, key, norm);
    }
    setOwn(out, pid, cleanWords);
  }
  return out;
}

export function getSrsStore(profileId) {
  const full = normalizeSrsStore(getJson(STORAGE_KEYS.srs, {}));
  if (typeof profileId === "string") {
    const pid = profileId || "_guest";
    return cloneDict(Object.hasOwn(full, pid) ? full[pid] : null);
  }
  return full;
}

export function recordWordOutcome(profileId, word, outcome, now = Date.now()) {
  const key = String(word || "").trim().toLowerCase();
  if (!key) return null;

  let kind = outcome;
  if (outcome === true) kind = "hit";
  else if (outcome === false) kind = "miss";
  if (kind !== "hit" && kind !== "miss" && kind !== "help") return null;

  const pid = typeof profileId === "string" && profileId ? profileId : "_guest";
  const ts = Number.isFinite(now) ? now : Date.now();
  const full = normalizeSrsStore(getJson(STORAGE_KEYS.srs, {}));
  const profileMap = Object.hasOwn(full, pid) ? full[pid] : createDict();
  const prev = Object.hasOwn(profileMap, key)
    ? profileMap[key]
    : {
        seen: 0,
        hit: 0,
        miss: 0,
        help: 0,
        box: 0,
        dueAt: ts,
        lastAt: ts,
      };

  let box = prev.box;
  let dueAt = prev.dueAt;
  let hit = prev.hit;
  let miss = prev.miss;
  let help = prev.help;

  if (kind === "hit") {
    hit += 1;
    box = Math.min(5, prev.box + 1);
    dueAt = ts + SRS_INTERVALS_MS[box];
  } else if (kind === "miss") {
    miss += 1;
    box = 0;
    dueAt = ts;
  } else {
    help += 1;
    box = Math.max(0, prev.box - 1);
    dueAt = ts + 60_000;
  }

  const updated = {
    seen: prev.seen + 1,
    hit,
    miss,
    help,
    box,
    dueAt,
    lastAt: ts,
  };
  setOwn(profileMap, key, updated);

  const entries = Object.entries(profileMap);
  if (entries.length > MAX_SRS_WORDS_PER_PROFILE) {
    entries.sort((a, b) => {
      if (a[1].box !== b[1].box) return a[1].box - b[1].box;
      if (a[1].dueAt !== b[1].dueAt) return a[1].dueAt - b[1].dueAt;
      return b[1].lastAt - a[1].lastAt;
    });
    const trimmedMap = createDict();
    for (const [entryKey, entryVal] of entries.slice(0, MAX_SRS_WORDS_PER_PROFILE)) {
      setOwn(trimmedMap, entryKey, entryVal);
    }
    setOwn(full, pid, trimmedMap);
  } else {
    setOwn(full, pid, profileMap);
  }

  setJson(STORAGE_KEYS.srs, full);
  return { ...updated };
}

export function getDueWords(profileId, now = Date.now()) {
  const pid = typeof profileId === "string" && profileId ? profileId : "_guest";
  const ts = Number.isFinite(now) ? now : Date.now();
  const profileMap = getSrsStore(pid);
  const due = [];
  for (const [word, stats] of Object.entries(profileMap)) {
    if (stats.miss > 0 || stats.help > 0 || stats.dueAt <= ts) {
      due.push({ word, ...stats });
    }
  }
  due.sort((a, b) => {
    const aDue = a.dueAt <= ts ? 1 : 0;
    const bDue = b.dueAt <= ts ? 1 : 0;
    if (aDue !== bDue) return bDue - aDue;
    const aPriority = a.miss * 2 + a.help - a.hit;
    const bPriority = b.miss * 2 + b.help - b.hit;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return a.dueAt - b.dueAt;
  });
  return due;
}

// M3 35-Pet Encounter Collection (piupiu.pets.v1)
function normalizePetEntry(entry) {
  if (!isPlainObject(entry)) return null;
  const count = Math.max(1, Math.floor(Number(entry.count) || 1));
  const firstAt = Math.max(0, Number(entry.firstAt) || 0);
  const lastAt = Math.max(firstAt, Number(entry.lastAt) || firstAt);
  return { count, firstAt, lastAt };
}

function normalizePetStore(raw) {
  const out = createDict();
  if (!isPlainObject(raw)) return out;
  const knownIds =
    typeof globalThis !== "undefined" &&
    globalThis.PiuPets &&
    Array.isArray(globalThis.PiuPets.PET_IDS)
      ? new Set(globalThis.PiuPets.PET_IDS)
      : null;
  for (const [pid, petMap] of Object.entries(raw)) {
    if (!pid || !isPlainObject(petMap)) continue;
    const cleanPets = createDict();
    for (const [petId, info] of Object.entries(petMap)) {
      const cleanId = String(petId || "").trim();
      if (!cleanId) continue;
      if (knownIds && knownIds.size > 0 && !knownIds.has(cleanId)) continue;
      const norm = normalizePetEntry(info);
      if (norm) setOwn(cleanPets, cleanId, norm);
    }
    setOwn(out, pid, cleanPets);
  }
  return out;
}

export function getPetCollection(profileId) {
  const full = normalizePetStore(getJson(STORAGE_KEYS.pets, {}));
  const pid = typeof profileId === "string" && profileId ? profileId : "_guest";
  return cloneDict(Object.hasOwn(full, pid) ? full[pid] : null);
}

export function unlockEncounteredPet(profileId, petId, now = Date.now()) {
  const cleanId = String(petId || "").trim();
  if (!cleanId) return null;
  const pid = typeof profileId === "string" && profileId ? profileId : "_guest";
  const ts = Number.isFinite(now) ? now : Date.now();
  const full = normalizePetStore(getJson(STORAGE_KEYS.pets, {}));
  const collection = Object.hasOwn(full, pid) ? full[pid] : createDict();
  const existing = Object.hasOwn(collection, cleanId) ? collection[cleanId] : null;
  const newlyUnlocked = !existing;
  const entry = existing
    ? {
        count: existing.count + 1,
        firstAt: existing.firstAt || ts,
        lastAt: ts,
      }
    : {
        count: 1,
        firstAt: ts,
        lastAt: ts,
      };
  setOwn(collection, cleanId, entry);
  setOwn(full, pid, collection);
  setJson(STORAGE_KEYS.pets, full);
  return {
    newlyUnlocked,
    entry: { ...entry },
    collection: cloneDict(collection),
    unlockedCount: Object.keys(collection).length,
  };
}
