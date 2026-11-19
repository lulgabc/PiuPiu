/* PiuPiu — local player profiles and score records.
 *
 * Everything stays in localStorage on this device: there are no accounts and
 * no network calls. The leaderboard therefore ranks the players created on
 * the same phone, tablet or computer.
 */

(function (global) {
  "use strict";

  const KEY = "piupiu.profiles";
  const USER_KEY = "piupiu.user";
  const MAX_PROFILES = 20;
  const MAX_NAME = 12;
  const PET_API = global.PiuPets;
  const MAX_PETS = PET_API ? PET_API.MAX_PETS : 3;
  const DEFAULT_PETS = PET_API ? PET_API.DEFAULT_PETS.slice() : ["mouse"];
  const PET_IDS = PET_API
    ? PET_API.PET_IDS.slice()
    : ["mouse", "cat", "dog", "rabbit", "frog", "panda", "fox", "penguin", "chick", "unicorn", "turtle", "lion"];
  const AVATARS = [
    "🦊", "🐼", "🐯", "🐸", "🦄", "🐙", "🐶", "🐱",
    "🐰", "🐨", "🐷", "🐵", "🐧", "🦁", "🐮", "🐢",
  ];

  function storage() {
    try {
      return global.localStorage || null;
    } catch {
      return null;
    }
  }

  function sanitizeName(name) {
    return String(name == null ? "" : name)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_NAME);
  }

  function makeId() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === "function") {
        return `p_${global.crypto.randomUUID()}`;
      }
    } catch {}
    return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function cleanNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }

  function sanitizePets(list) {
    if (PET_API && typeof PET_API.sanitize === "function") return PET_API.sanitize(list);
    const out = [];
    if (Array.isArray(list)) {
      for (const entry of list) {
        const id = typeof entry === "string" ? entry : entry && entry.id;
        if (PET_IDS.includes(id) && !out.includes(id)) out.push(id);
        if (out.length >= MAX_PETS) break;
      }
    }
    return out.length ? out : DEFAULT_PETS.slice();
  }

  function normalizeProfile(raw, index) {
    if (!raw || typeof raw !== "object") return null;
    const name = sanitizeName(raw.name);
    if (!name) return null;
    const avatar = AVATARS.includes(raw.avatar) ? raw.avatar : AVATARS[index % AVATARS.length];
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId(),
      name,
      avatar,
      pets: sanitizePets(raw.pets),
      total: cleanNumber(raw.total),
      best: cleanNumber(raw.best),
      correct: cleanNumber(raw.correct),
      rounds: cleanNumber(raw.rounds),
      createdAt: cleanNumber(raw.createdAt) || Date.now(),
      updatedAt: cleanNumber(raw.updatedAt) || Date.now(),
    };
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    const seenIds = new Set();
    const seenNames = new Set();
    const out = [];
    for (let i = 0; i < list.length && out.length < MAX_PROFILES; i += 1) {
      const profile = normalizeProfile(list[i], i);
      if (!profile) continue;
      if (seenIds.has(profile.id)) continue;
      const nameKey = profile.name.toLocaleLowerCase();
      if (seenNames.has(nameKey)) continue;
      seenIds.add(profile.id);
      seenNames.add(nameKey);
      out.push(profile);
    }
    return out;
  }

  function load() {
    const store = storage();
    if (!store) return [];
    try {
      return normalizeList(JSON.parse(store.getItem(KEY) || "[]"));
    } catch {
      return [];
    }
  }

  function save(list) {
    const store = storage();
    if (!store) return false;
    try {
      store.setItem(KEY, JSON.stringify(normalizeList(list)));
      return true;
    } catch {
      return false;
    }
  }

  function getActiveId(list) {
    const store = storage();
    let id = "";
    try {
      id = store ? store.getItem(USER_KEY) || "" : "";
    } catch {}
    return list.some((profile) => profile.id === id) ? id : "";
  }

  function setActiveId(id) {
    const store = storage();
    if (!store) return;
    try {
      if (id) store.setItem(USER_KEY, id);
      else store.removeItem(USER_KEY);
    } catch {}
  }

  function create(list, name, avatar, options = {}) {
    const clean = sanitizeName(name);
    if (!clean) return { error: "empty" };
    if (list.length >= MAX_PROFILES) return { error: "full" };
    const nameKey = clean.toLocaleLowerCase();
    if (list.some((profile) => profile.name.toLocaleLowerCase() === nameKey)) {
      return { error: "duplicate" };
    }
    const profile = {
      id: options.id || makeId(),
      name: clean,
      avatar: AVATARS.includes(avatar) ? avatar : AVATARS[list.length % AVATARS.length],
      pets: sanitizePets(options.pets),
      total: 0,
      best: cleanNumber(options.best),
      correct: 0,
      rounds: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    list.push(profile);
    return { profile };
  }

  function find(list, id) {
    return list.find((profile) => profile.id === id) || null;
  }

  function addPoints(list, id, points, correct = 1) {
    const profile = find(list, id);
    if (!profile) return null;
    const gained = cleanNumber(points);
    if (!gained) return profile;
    profile.total += gained;
    profile.correct += Math.max(0, Math.round(correct));
    profile.updatedAt = Date.now();
    return profile;
  }

  function setPets(list, id, pets) {
    const profile = find(list, id);
    if (!profile) return null;
    profile.pets = sanitizePets(pets);
    profile.updatedAt = Date.now();
    return profile;
  }

  function finishRound(list, id, score) {
    const profile = find(list, id);
    if (!profile) return null;
    const points = cleanNumber(score);
    if (points > profile.best) profile.best = points;
    profile.rounds += 1;
    profile.updatedAt = Date.now();
    return profile;
  }

  function rank(list) {
    return list
      .slice()
      .sort(
        (a, b) =>
          b.total - a.total ||
          b.best - a.best ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }

  function remove(list, id) {
    return list.filter((profile) => profile.id !== id);
  }

  const api = {
    KEY,
    USER_KEY,
    MAX_PROFILES,
    MAX_NAME,
    MAX_PETS,
    DEFAULT_PETS,
    AVATARS,
    sanitizeName,
    sanitizePets,
    normalizeList,
    load,
    save,
    getActiveId,
    setActiveId,
    create,
    find,
    addPoints,
    setPets,
    finishRound,
    rank,
    remove,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PiuProfiles = api;
})(typeof window !== "undefined" ? window : globalThis);
