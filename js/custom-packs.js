/* PiuPiu — local custom word packs created from plain text files.
 *
 * A pack is parsed entirely on this device: articles are reduced to useful
 * English words, while newline/comma separated lists keep their phrases and
 * order. Nothing is uploaded and nothing leaves localStorage.
 */

(function (global) {
  "use strict";

  const KEY = "piupiu.customPacks";
  const MAX_PACKS = 12;
  const MAX_WORDS = 600;
  const MIN_WORDS = 4;
  const MAX_NAME = 30;
  const MAX_WORD_LENGTH = 30;
  const MAX_PHRASE_WORDS = 4;
  const MAX_FILE_BYTES = 2 * 1024 * 1024;

  // Function words are skipped when extracting words from an article. Word
  // lists are treated literally, so a list that includes "the" keeps it.
  const STOPWORDS = new Set(
    `
    a about above after again against all also am an and any are aren't as at
    be because been before being below between both but by can can't cannot
    could couldn't did didn't do does doesn't doing don't down during each few
    for from further had hadn't has hasn't have haven't having he he'd he'll
    he's her here here's hers herself him himself his how how's i i'd i'll i'm
    i've if in into is isn't it it's its itself just let's me more most mustn't
    my myself no nor not now of off on once only or other ought our ours
    ourselves out over own same shan't she she'd she'll she's should shouldn't
    so some such than that that's the their theirs them themselves then there
    there's these they they'd they'll they're they've this those through to too
    under until up very was wasn't we we'd we'll we're we've were weren't what
    what's when when's where where's which while who who's whom why why's with
    won't would wouldn't you you'd you'll you're you've your yours yourself
    yourselves
    `
      .trim()
      .split(/\s+/),
  );

  function storage() {
    try {
      return global.localStorage || null;
    } catch {
      return null;
    }
  }

  function makeId() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === "function") {
        return `c_${global.crypto.randomUUID()}`;
      }
    } catch {}
    return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function sanitizeName(name) {
    return String(name == null ? "" : name)
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_NAME);
  }

  function normalizeValue(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/[^a-z0-9' -]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^['-]+|['-]+$/g, "");
  }

  function isUsableWord(word) {
    if (typeof word !== "string") return false;
    const value = word.trim();
    if (value.length < 2 || value.length > MAX_WORD_LENGTH) return false;
    if (!/[a-z]/.test(value)) return false;
    const parts = value.split(" ").filter(Boolean);
    if (!parts.length || parts.length > MAX_PHRASE_WORDS) return false;
    return parts.every((part) => part.length <= 24 && /[a-z]/.test(part));
  }

  function normalizeWords(words) {
    const seen = new Set();
    const out = [];
    for (const raw of Array.isArray(words) ? words : []) {
      const word = normalizeValue(raw);
      if (!isUsableWord(word) || seen.has(word)) continue;
      seen.add(word);
      out.push(word);
      if (out.length >= MAX_WORDS) break;
    }
    return out;
  }

  function stripLine(line) {
    return String(line)
      .replace(/^\uFEFF/, "")
      .replace(/^\s*(?:[#>*•]+|\d+[.)])\s*/, "")
      .replace(/[（(\[].*?[）)\]]/g, " ")
      .trim();
  }

  function looksLikeEntry(line) {
    const raw = String(line).trim();
    if (/^#{1,6}\s+/.test(raw)) return false;
    const text = stripLine(line);
    if (!text || text.length > 80 || /[.!?]/.test(text)) return false;
    const count = text.split(/\s+/).filter(Boolean).length;
    return count >= 1 && count <= 6;
  }

  function isListLike(lines) {
    if (!lines.length) return false;
    if (lines.length >= 2) {
      const entries = lines.filter(looksLikeEntry).length;
      return entries / lines.length >= 0.6;
    }
    const line = stripLine(lines[0]);
    if (!line || /[.!?]/.test(line)) return false;
    if (/[,;\t|]/.test(line)) return true;
    return line.split(/\s+/).filter(Boolean).length === 1;
  }

  function uniqueAll(words) {
    const seen = new Set();
    const out = [];
    for (const word of words) {
      if (seen.has(word)) continue;
      seen.add(word);
      out.push(word);
    }
    return out;
  }

  function parseList(text) {
    const entries = [];
    for (const rawLine of String(text).split(/\r?\n/)) {
      if (/^#{1,6}\s+/.test(String(rawLine).trim())) continue;
      if (/:\s*$/.test(String(rawLine).trim())) continue;
      const line = stripLine(rawLine);
      if (!line) continue;
      let parts;
      if (/[,;|\t]/.test(line)) parts = line.split(/[,;|\t]+/);
      else if (/\s+[-–—]\s+/.test(line)) parts = line.split(/\s+[-–—]\s+/);
      else {
        const count = line.split(/\s+/).filter(Boolean).length;
        parts = count > MAX_PHRASE_WORDS ? line.split(/\s+/) : [line];
      }
      for (const part of parts) {
        const word = normalizeValue(part);
        if (isUsableWord(word)) entries.push(word);
      }
    }
    return uniqueAll(entries);
  }

  function parseProse(text) {
    const counts = new Map();
    const matches = String(text).match(/[A-Za-z]+(?:['’\-][A-Za-z]+)*/g) || [];
    for (const raw of matches) {
      const word = normalizeValue(raw);
      if (!isUsableWord(word) || STOPWORDS.has(word)) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([word]) => word);
  }

  function parseText(text) {
    const content = String(text == null ? "" : text).replace(/^\uFEFF/, "");
    if (!content.trim()) {
      return { words: [], mode: "prose", totalFound: 0, truncated: false };
    }
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const list = isListLike(lines);
    const all = list ? parseList(content) : parseProse(content);
    return {
      words: all.slice(0, MAX_WORDS),
      mode: list ? "list" : "prose",
      totalFound: all.length,
      truncated: all.length > MAX_WORDS,
    };
  }

  function normalizePack(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = sanitizeName(raw.name);
    if (!name) return null;
    const words = normalizeWords(raw.words);
    if (!words.length) return null;
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId(),
      name,
      words,
      createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    };
  }

  function load() {
    const store = storage();
    if (!store) return [];
    let raw;
    try {
      raw = JSON.parse(store.getItem(KEY) || "[]");
    } catch {
      return [];
    }
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const packs = [];
    for (const item of raw) {
      const pack = normalizePack(item);
      if (!pack || seen.has(pack.id)) continue;
      seen.add(pack.id);
      packs.push(pack);
      if (packs.length >= MAX_PACKS) break;
    }
    return packs;
  }

  function save(packs) {
    const store = storage();
    if (!store) return false;
    try {
      store.setItem(KEY, JSON.stringify((Array.isArray(packs) ? packs : []).slice(0, MAX_PACKS)));
      return true;
    } catch {
      return false;
    }
  }

  function create(name, words) {
    const list = normalizeWords(words);
    if (!list.length) return { error: "no-words" };
    if (list.length < MIN_WORDS) return { error: "too-few" };
    const packs = load();
    if (packs.length >= MAX_PACKS) return { error: "too-many" };

    const base = sanitizeName(name) || "My words";
    const taken = new Set(packs.map((pack) => pack.name.toLowerCase()));
    let packName = base;
    let suffix = 2;
    while (taken.has(packName.toLowerCase())) {
      const tail = ` ${suffix++}`;
      packName = `${base.slice(0, MAX_NAME - tail.length)}${tail}`;
    }

    const pack = {
      id: makeId(),
      name: packName,
      words: list,
      createdAt: Date.now(),
    };
    packs.push(pack);
    if (!save(packs)) return { error: "storage" };
    return { pack };
  }

  function remove(id) {
    const packs = load();
    const next = packs.filter((pack) => pack.id !== id);
    if (next.length === packs.length) return false;
    return save(next);
  }

  const api = {
    KEY,
    MAX_PACKS,
    MAX_WORDS,
    MIN_WORDS,
    MAX_NAME,
    MAX_FILE_BYTES,
    sanitizeName,
    normalizeWords,
    parseText,
    load,
    save,
    create,
    remove,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PiuCustomPacks = api;
})(typeof window !== "undefined" ? window : globalThis);
