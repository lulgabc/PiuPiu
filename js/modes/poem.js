import {
  state,
  els,
  POETRY_CATEGORY_FALLBACK,
  POETRY_ICON_NAMES,
  POETRY_MAX_BYTES,
  REDUCED_MOTION,
  normalizeSpeech,
  iconSvg,
  tr,
  formatNumber,
  setText,
  setUseIcon,
} from "../core/state.js";
import { events } from "../core/events.js";
import { ensurePoetryLoaded } from "../core/loader.js";
import {
  getPoetrySelected,
  setPoetrySelected,
  getPoetryDone,
  setPoetryDone,
  getPoetryImportRaw,
  setPoetryImportRaw,
} from "../core/storage.js";
import { playPoemLine, playPoemFinish } from "../systems/audio.js";
import { speakHelp, syncSpeechPhrases } from "../systems/speech.js";
import { petCheer, petNuzzle } from "../systems/pet.js";
import { spawnSparks, spawnStars } from "../systems/fx.js";

const boundPoemLayers = new WeakSet();
const boundListenButtons = new WeakSet();
const boundListenAllButtons = new WeakSet();
let listenAllActive = false;
let listenAllToken = 0;

function hasDoc() {
  return typeof document !== "undefined";
}

function getGlobalPoetry() {
  const g = typeof window !== "undefined" ? window : globalThis;
  return g && g.PiuPoetry && typeof g.PiuPoetry === "object" ? g.PiuPoetry : null;
}

function ui() {
  return state.uiHooks && typeof state.uiHooks === "object" ? state.uiHooks : {};
}

export function poetrySlug(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function poetryHue(value) {
  const hue = Number(value);
  return Number.isFinite(hue) ? Math.round(((hue % 360) + 360) % 360) : 45;
}

export function poetryIconName(value) {
  return POETRY_ICON_NAMES.has(value) ? value : "book";
}

export function normalizePoetryLibrary(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.poems)) return null;
  const seenCategories = new Set();
  const categories = [];
  for (const category of Array.isArray(raw.categories) ? raw.categories : []) {
    if (!category || !category.id) continue;
    const id = String(category.id).trim();
    if (!id || seenCategories.has(id)) continue;
    seenCategories.add(id);
    categories.push({
      id,
      name: String(category.name || id),
      hue: poetryHue(category.hue),
      icon: poetryIconName(category.icon),
    });
  }
  const fallbackById = new Map(POETRY_CATEGORY_FALLBACK.map((category) => [category.id, category]));
  const seenPoems = new Set();
  const poems = [];
  const rawPoems = raw.poems.slice(0, 3000);
  for (const poem of rawPoems) {
    if (!poem || typeof poem !== "object") continue;
    const lines = Array.isArray(poem.lines)
      ? poem.lines.map((line) => String(line).replace(/\s+/g, " ").trim()).filter(Boolean)
      : [];
    if (!lines.length || !poem.title) continue;
    const categoryId = String(poem.category || "family").trim() || "family";
    if (!seenCategories.has(categoryId)) {
      const fallback = fallbackById.get(categoryId) || {
        id: categoryId,
        name: categoryId,
        hue: 45,
        icon: "book",
      };
      seenCategories.add(categoryId);
      categories.push({ ...fallback });
    }
    let id = String(poem.id || "").trim() || `${poetrySlug(poem.title)}-${poems.length + 1}`;
    if (seenPoems.has(id)) id = `${id}-${poems.length + 1}`;
    seenPoems.add(id);
    const stanzaStarts = (Array.isArray(poem.stanzaStarts) ? poem.stanzaStarts : [0])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < lines.length);
    if (!stanzaStarts.includes(0)) stanzaStarts.unshift(0);
    poems.push({
      id,
      category: categoryId,
      title: String(poem.title).trim(),
      author: String(poem.author || "Anonymous").trim() || "Anonymous",
      lines,
      stanzaStarts: [...new Set(stanzaStarts)].sort((a, b) => a - b),
      page: Number(poem.page) || 0,
    });
  }
  if (!poems.length) return null;
  return {
    version: 1,
    demo: Boolean(raw.demo),
    authorized: Boolean(raw.authorized),
    source: String(raw.source || "Poetry"),
    rights: String(raw.rights || ""),
    categories,
    poems,
  };
}

export function poetryCategoryMeta(id) {
  const library = state.poetry.library;
  const found = library && library.categories.find((category) => category.id === id);
  if (found) return found;
  return POETRY_CATEGORY_FALLBACK.find((category) => category.id === id) || POETRY_CATEGORY_FALLBACK[0];
}

export function poetryCategoryName(id) {
  const key = `poem.category.${id}`;
  const translated = tr(key);
  return translated === key ? poetryCategoryMeta(id).name : translated;
}

export function poetryPoemById(id) {
  return state.poetry.library
    ? state.poetry.library.poems.find((poem) => poem.id === id) || null
    : null;
}

export function selectedPoetryPoem() {
  const library = state.poetry.library;
  if (!library || !library.poems.length) return null;
  return poetryPoemById(state.poetry.selectedId) || library.poems[0];
}

export function savePoetrySelection() {
  setPoetrySelected(state.poetry.selectedId);
}

export function loadPoetryCompleted() {
  state.poetry.completed = new Set(getPoetryDone());
  return state.poetry.completed;
}

export function savePoetryCompleted() {
  setPoetryDone(state.poetry.completed);
}

export function readImportedPoetry() {
  const raw = getPoetryImportRaw(null);
  return raw ? normalizePoetryLibrary(raw) : null;
}

export async function loadPoetryLibrary({ force = false } = {}) {
  if (state.poetry.loaded && !force) return state.poetry.library;

  let rawPoetry = getGlobalPoetry();
  if (!rawPoetry) {
    rawPoetry = await ensurePoetryLoaded().catch(() => null);
  }

  const base = normalizePoetryLibrary(rawPoetry) || {
    version: 1,
    demo: true,
    source: "PiuPiu",
    rights: "",
    categories: POETRY_CATEGORY_FALLBACK.map((category) => ({ ...category })),
    poems: [],
  };
  state.poetry.library = base;
  loadPoetryCompleted();

  const imported = readImportedPoetry();
  if (imported) {
    state.poetry.library = imported;
    state.poetry.imported = true;
  } else {
    state.poetry.imported = false;
  }

  const savedId = getPoetrySelected("");
  const saved = poetryPoemById(savedId);
  const first = state.poetry.library.poems[0] || null;
  const selected = saved || first;
  state.poetry.selectedId = selected ? selected.id : "";
  state.poetry.categoryId = selected
    ? selected.category
    : (state.poetry.library.categories[0] || POETRY_CATEGORY_FALLBACK[0]).id;
  state.poetry.loaded = Boolean(rawPoetry || imported);

  events.emit("poetry:loaded", {
    library: state.poetry.library,
    imported: state.poetry.imported,
  });
  ui().renderPoetrySummary?.();
  return state.poetry.library;
}

export function setPoetryCategory(id) {
  if (!state.poetry.library) return false;
  if (!state.poetry.library.categories.some((category) => category.id === id)) return false;
  state.poetry.categoryId = id;
  const first = state.poetry.library.poems.find((poem) => poem.category === id);
  if (first && (!selectedPoetryPoem() || selectedPoetryPoem().category !== id)) {
    state.poetry.selectedId = first.id;
    savePoetrySelection();
    ui().renderPoetrySummary?.();
  }
  ui().renderPoetryLibrary?.();
  return true;
}

export function selectPoetryPoem(id, options = {}) {
  const poem = poetryPoemById(id);
  if (!poem) return null;
  state.poetry.selectedId = poem.id;
  state.poetry.categoryId = poem.category;
  savePoetrySelection();
  ui().renderPoetrySummary?.();
  ui().renderPoetryLibrary?.();
  if (options.scroll !== false && els.poetryList) {
    const active =
      typeof els.poetryList.querySelector === "function"
        ? els.poetryList.querySelector(`[data-poem-id="${poem.id}"]`)
        : null;
    if (active && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest" });
    }
  }
  events.emit("poetry:selected", { poem });
  return poem;
}

export function markPoetryCompleted(id) {
  if (!id || state.poetry.completed.has(id)) return;
  state.poetry.completed.add(id);
  savePoetryCompleted();
  events.emit("poetry:completed", { id });
}

export function shufflePoetryPoem() {
  const library = state.poetry.library;
  if (!library || !library.poems.length) return null;
  const pool = library.poems.filter((poem) => poem.category === state.poetry.categoryId);
  const source = pool.length ? pool : library.poems;
  const current = state.poetry.selectedId;
  const choices = source.filter((poem) => poem.id !== current);
  const pickFrom = choices.length ? choices : source;
  const poem = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  return poem ? selectPoetryPoem(poem.id) : null;
}

export function nextPoetryPoem() {
  const library = state.poetry.library;
  if (!library || !library.poems.length) return null;
  const poems = library.poems;
  const currentIdx = poems.findIndex((poem) => poem.id === state.poetry.selectedId);
  const unread = poems.find(
    (poem, idx) => idx > currentIdx && !state.poetry.completed.has(poem.id),
  );
  const next =
    unread ||
    poems[(currentIdx + 1 + poems.length) % poems.length] ||
    poems[0];
  return next ? selectPoetryPoem(next.id, { scroll: false }) : null;
}

export async function importPoetryFile(file) {
  if (!file) return { ok: false, error: "no-file" };
  if (file.size > POETRY_MAX_BYTES) {
    ui().poetryStatus?.(tr("poem.importLarge"), "error");
    return { ok: false, error: "too-large" };
  }
  try {
    const text = typeof file.text === "function" ? await file.text() : "";
    const library = normalizePoetryLibrary(JSON.parse(text));
    if (!library) throw new Error("invalid");
    const payload = {
      version: 1,
      demo: false,
      source: library.source,
      rights: library.rights,
      categories: library.categories,
      poems: library.poems,
    };
    if (!setPoetryImportRaw(payload)) throw new Error("storage");
    state.poetry.library = library;
    state.poetry.imported = true;
    state.poetry.loaded = true;
    state.poetry.completed = new Set(
      [...state.poetry.completed].filter((id) => library.poems.some((poem) => poem.id === id)),
    );
    savePoetryCompleted();
    const selected = poetryPoemById(state.poetry.selectedId) || library.poems[0];
    state.poetry.selectedId = selected ? selected.id : "";
    state.poetry.categoryId = selected ? selected.category : library.categories[0].id;
    ui().renderPoetrySummary?.();
    ui().renderPoetryLibrary?.();
    ui().poetryStatus?.(
      tr("poem.importSuccess", { count: formatNumber(library.poems.length) }),
      "ok",
    );
    events.emit("poetry:imported", { library });
    return { ok: true, library };
  } catch {
    ui().poetryStatus?.(tr("poem.importError"), "error");
    return { ok: false, error: "invalid" };
  } finally {
    if (els.poetryFile) els.poetryFile.value = "";
  }
}

/* ------------------------------------------------------------------ */
/* Poem round                                                         */
/* ------------------------------------------------------------------ */

export function currentPoemLine() {
  const poem = state.poem;
  if (!poem || poem.current < 0) return null;
  return poem.lines[poem.current] || null;
}

export function resetPoemRound() {
  if (state.poem) {
    clearTimeout(state.poem.finishTimer);
    clearTimeout(state.poem.focusTimer);
  }
  state.poem = null;
  if (els.poemStage) els.poemStage.classList.add("is-hidden");
  if (els.poemLines) els.poemLines.replaceChildren();
  if (els.poemSpineFill) els.poemSpineFill.style.height = "0%";
  setText(els.poemProgress, "");
  setText(els.poemCombo, "");
}

export function poemScrollToCurrent() {
  const poem = state.poem;
  if (!poem || !els.poemLines) return;
  const line = poem.lines[poem.current];
  if (!line || !line.el) return;
  if (
    typeof els.poemLines.getBoundingClientRect !== "function" ||
    typeof line.el.getBoundingClientRect !== "function"
  ) {
    return;
  }
  const box = els.poemLines.getBoundingClientRect();
  const rect = line.el.getBoundingClientRect();
  if (rect.top < box.top + 12 || rect.bottom > box.bottom - 12) {
    const target =
      (els.poemLines.scrollTop || 0) +
      (rect.top - box.top) -
      box.height / 2 +
      rect.height / 2;
    if (typeof els.poemLines.scrollTo === "function") {
      els.poemLines.scrollTo({
        top: Math.max(0, target),
        behavior: REDUCED_MOTION ? "auto" : "smooth",
      });
    }
  }
}

export function advancePoemCurrent(scroll = true) {
  const poem = state.poem;
  if (!poem) return;
  let next = poem.lines.findIndex((line, index) => index >= poem.current && !line.read);
  if (next < 0) next = poem.lines.findIndex((line) => !line.read);
  poem.current = next;
  for (const line of poem.lines) {
    if (!line.el) continue;
    line.el.classList.toggle("is-current", line.index === next);
    if (line.index === next) line.el.setAttribute("aria-current", "true");
    else line.el.removeAttribute("aria-current");
  }
  if (next >= 0 && scroll) poemScrollToCurrent();
}

export function updatePoemProgress() {
  const poem = state.poem;
  if (!poem) return;
  setText(els.poemProgress, `${poem.read} / ${poem.total}`);
  if (els.poemProgress) {
    els.poemProgress.setAttribute(
      "aria-label",
      tr("poem.progressAria", { read: poem.read, total: poem.total }),
    );
  }
  if (els.poemSpineFill) {
    els.poemSpineFill.style.height = `${poem.total ? (poem.read / poem.total) * 100 : 0}%`;
  }
  setText(els.poemCombo, state.combo >= 2 ? `×${state.combo}` : "");
  ui().updateHUD?.();
}

export function focusPoemLine(index, speak = true) {
  const poem = state.poem;
  if (!poem) return;
  const line = poem.lines[index];
  if (!line) return;
  clearTimeout(poem.focusTimer);
  for (const item of poem.lines) {
    if (item.el) item.el.classList.remove("is-focus");
  }
  if (line.el) line.el.classList.add("is-focus");
  if (!line.read) {
    poem.current = index;
    for (const item of poem.lines) {
      if (item.el) item.el.classList.toggle("is-current", item.index === index);
    }
    poemScrollToCurrent();
  }
  poem.focusTimer = setTimeout(() => {
    if (line.el) line.el.classList.remove("is-focus");
  }, 1800);
  if (speak) {
    ui().showHeard?.(tr("help.listen", { word: line.text }), "volume");
    speakHelp(line.text);
  }
}

export function spawnPoemSparkle(line) {
  if (!line || !line.el || !els.field) return;
  if (
    typeof els.field.getBoundingClientRect !== "function" ||
    typeof line.el.getBoundingClientRect !== "function"
  ) {
    return;
  }
  const fieldRect = els.field.getBoundingClientRect();
  const rect = line.el.getBoundingClientRect();
  const cx = rect.left - fieldRect.left + Math.min(rect.width * 0.72, 220);
  const cy = rect.top - fieldRect.top + rect.height / 2;
  const hue = state.poem ? state.poem.category.hue : 45;
  spawnSparks(cx, cy, hue, 14);
  spawnStars(cx, cy, hue, 4);
}

export function markPoemLine(line) {
  const poem = state.poem;
  if (!poem || poem.finishing || !line || line.read) return;
  line.read = true;
  poem.read += 1;
  state.cleared += 1;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);

  // P0 #1 Fix: Credit poetry line points to both round score and player total/leaderboard
  const points = 10 + Math.min(10, Math.max(0, state.combo - 1));
  state.score += points;
  ui().addProfilePoints?.(points);
  events.emit("poem:lineCompleted", { line, points, poem: poem.poem });

  if (line.el) {
    line.el.classList.remove("is-current", "is-focus");
    line.el.classList.add("is-read", "is-burst");
    line.el.setAttribute("aria-label", tr("poem.readAria", { text: line.text }));
    for (const span of line.wordEls || []) {
      span.classList.add("is-spoken");
    }
    setTimeout(() => {
      if (line.el) line.el.classList.remove("is-burst");
    }, 460);
  }

  playPoemLine();
  spawnPoemSparkle(line);
  if (poem.read % 2 === 0) petCheer();
  else petNuzzle(state.pet ? state.pet.x : undefined);
  if (state.combo >= 3 && state.combo % 3 === 0) ui().showPraise?.();
  updatePoemProgress();
  syncSpeechPhrases();

  if (poem.read >= poem.total) {
    poem.finishing = true;
    markPoetryCompleted(poem.poem.id);
    advancePoemCurrent(false);
    playPoemFinish();
    petCheer();
    ui().showHeard?.(tr("poem.toast.complete"), "check");
    events.emit("poem:finished", { poem: poem.poem });
    poem.finishTimer = setTimeout(() => {
      if (state.phase !== "menu" && state.phase !== "over") {
        if (typeof ui().endGame === "function") ui().endGame();
        else events.emit("game:end", { mode: "poem" });
      }
    }, 900);
    return;
  }
  advancePoemCurrent(true);
}

function cleanPoemToken(raw) {
  return normalizeSpeech(raw).replace(/'/g, "").trim();
}

function poemWordMatches(expected, spoken) {
  if (!expected || !spoken) return false;
  if (expected === spoken) return true;
  const stem = (t) => t.replace(/ies$/, "y").replace(/es$/, "").replace(/s$/, "");
  return expected.length > 2 && spoken.length > 2 && stem(expected) === stem(spoken);
}

export function highlightPoemInterim(transcript) {
  const line = currentPoemLine();
  if (!line || line.read || !Array.isArray(line.wordEls) || !line.wordEls.length) return 0;
  const spokenTokens = normalizeSpeech(transcript)
    .split(" ")
    .map((t) => t.replace(/'/g, ""))
    .filter(Boolean);
  if (!spokenTokens.length) return 0;

  let spokenIdx = 0;
  let matchedCount = 0;
  for (const span of line.wordEls) {
    const wordTokens = cleanPoemToken(span.textContent || "")
      .split(" ")
      .filter(Boolean);
    const expected = wordTokens[0] || "";
    if (!expected) continue;
    let foundOffset = -1;
    const limit = Math.min(4, spokenTokens.length - spokenIdx);
    for (let offset = 0; offset < limit; offset += 1) {
      if (poemWordMatches(expected, spokenTokens[spokenIdx + offset])) {
        foundOffset = offset;
        break;
      }
    }
    if (foundOffset >= 0) {
      span.classList.add("is-spoken");
      spokenIdx += foundOffset + wordTokens.length;
      matchedCount += 1;
    } else {
      span.classList.remove("is-spoken");
    }
  }
  return matchedCount;
}

export function stopPoemListenAll(cancelSynth = true) {
  listenAllToken += 1;
  const wasActive = listenAllActive;
  listenAllActive = false;
  if (els.poemListenAll) {
    els.poemListenAll.setAttribute("aria-pressed", "false");
    els.poemListenAll.classList.remove("is-active");
  }
  if (cancelSynth && wasActive) {
    const g = typeof window !== "undefined" ? window : globalThis;
    try {
      if (g && g.speechSynthesis) g.speechSynthesis.cancel();
    } catch {}
  }
}

export function togglePoemListenAll() {
  if (listenAllActive) {
    stopPoemListenAll(true);
    return false;
  }
  const poem = state.poem;
  if (!poem || !poem.lines.length || state.phase !== "playing" || state.mode !== "poem") {
    return false;
  }
  const g = typeof window !== "undefined" ? window : globalThis;
  const synth = g && g.speechSynthesis ? g.speechSynthesis : null;
  const Utterance = g && typeof g.SpeechSynthesisUtterance === "function" ? g.SpeechSynthesisUtterance : null;
  if (!synth || !Utterance) {
    ui().toast?.(tr("help.unsupported"), "warn");
    return false;
  }

  listenAllActive = true;
  const token = ++listenAllToken;
  if (els.poemListenAll) {
    els.poemListenAll.setAttribute("aria-pressed", "true");
    els.poemListenAll.classList.add("is-active");
  }

  try {
    synth.cancel();
  } catch {}

  const speakIndex = (idx) => {
    if (!listenAllActive || token !== listenAllToken || state.phase !== "playing" || state.mode !== "poem") {
      stopPoemListenAll(false);
      return;
    }
    if (idx >= poem.lines.length) {
      stopPoemListenAll(false);
      return;
    }
    const line = poem.lines[idx];
    focusPoemLine(idx, false);
    const utt = new Utterance(line.text);
    utt.lang = "en-US";
    utt.rate = 0.92;
    utt.pitch = 1;
    utt.volume = 1;
    utt.onend = () => {
      if (listenAllActive && token === listenAllToken) {
        speakIndex(idx + 1);
      }
    };
    utt.onerror = () => {
      if (listenAllActive && token === listenAllToken) {
        stopPoemListenAll(false);
      }
    };
    try {
      synth.speak(utt);
    } catch {
      stopPoemListenAll(false);
    }
  };

  speakIndex(0);
  return true;
}

export async function buildPoemRound() {
  stopPoemListenAll(true);
  if (!state.poetry.loaded || !selectedPoetryPoem()) {
    await loadPoetryLibrary();
  }
  const poem = selectedPoetryPoem();
  if (!poem) {
    ui().toast?.(tr("poem.empty"), "warn");
    ui().goHome?.();
    return null;
  }
  const category = poetryCategoryMeta(poem.category);
  state.poem = {
    poem,
    category,
    lines: [],
    current: 0,
    read: 0,
    total: poem.lines.length,
    finishing: false,
    focusTimer: 0,
    finishTimer: 0,
  };
  if (els.poemStage) {
    els.poemStage.classList.remove("is-hidden");
    els.poemStage.style.setProperty("--poem-hue", String(category.hue));
  }
  setUseIcon(els.poemCategoryIcon, category.icon);
  setUseIcon(els.poemMotif, category.icon);
  setText(els.poemCategoryName, poetryCategoryName(poem.category));
  setText(els.poemTitle, poem.title);
  setText(els.poemAuthor, poem.author || tr("poem.anonymous"));
  setText(els.poemProgress, `0 / ${poem.lines.length}`);
  if (els.poemProgress) {
    els.poemProgress.setAttribute(
      "aria-label",
      tr("poem.progressAria", { read: 0, total: poem.lines.length }),
    );
    els.poemProgress.setAttribute("aria-live", "polite");
  }
  setText(els.poemCombo, "");
  if (els.poemSpineFill) els.poemSpineFill.style.height = "0%";
  if (els.poemLines) {
    els.poemLines.replaceChildren();
    els.poemLines.scrollTop = 0;
  }

  const stanzaStarts = new Set(poem.stanzaStarts);
  const frag = hasDoc() ? document.createDocumentFragment() : null;

  poem.lines.forEach((text, index) => {
    const line = {
      index,
      text,
      tokens: normalizeSpeech(text).split(" ").filter(Boolean),
      read: false,
      el: null,
      wordEls: [],
    };
    if (hasDoc()) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "poem-line";
      if (stanzaStarts.has(index) && index > 0) button.classList.add("stanza-start");
      button.dataset.lineIndex = String(index);
      button.dataset.lineText = text;
      button.setAttribute("aria-label", tr("poem.lineAria", { n: index + 1, text }));

      const number = document.createElement("span");
      number.className = "poem-line-index";
      number.textContent = String(index + 1).padStart(2, "0");

      const copy = document.createElement("span");
      copy.className = "poem-line-text";
      const parts = text.split(/(\s+)/);
      let wordIdx = 0;
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          copy.appendChild(document.createTextNode(part));
        } else {
          const wordSpan = document.createElement("span");
          wordSpan.className = "poem-word";
          wordSpan.dataset.wordIndex = String(wordIdx++);
          wordSpan.textContent = part;
          copy.appendChild(wordSpan);
          line.wordEls.push(wordSpan);
        }
      }

      const mark = document.createElement("span");
      mark.className = "poem-line-mark";
      const checkSvg = iconSvg("check");
      if (checkSvg) mark.appendChild(checkSvg);

      button.append(number, copy, mark);
      if (frag) frag.appendChild(button);
      line.el = button;
    }
    state.poem.lines.push(line);
  });

  if (els.poemLines && frag) {
    els.poemLines.appendChild(frag);
  }

  advancePoemCurrent(false);
  ui().updateHUD?.(true);
  syncSpeechPhrases(true);
  return state.poem;
}

export function bindPoemEvents(poemLinesEl = els.poemLines, poemListenEl = els.poemListen) {
  const cleanups = [];

  if (poemLinesEl && !boundPoemLayers.has(poemLinesEl)) {
    boundPoemLayers.add(poemLinesEl);
    const onLineClick = (event) => {
      if (state.phase !== "playing" || state.mode !== "poem") return;
      const button =
        event.target && typeof event.target.closest === "function"
          ? event.target.closest("[data-line-index]")
          : null;
      if (!button) return;
      const index = Number(button.dataset.lineIndex);
      if (Number.isInteger(index)) focusPoemLine(index, true);
    };
    poemLinesEl.addEventListener("click", onLineClick);
    cleanups.push(() => {
      poemLinesEl.removeEventListener("click", onLineClick);
      boundPoemLayers.delete(poemLinesEl);
    });
  }

  if (poemListenEl && !boundListenButtons.has(poemListenEl)) {
    boundListenButtons.add(poemListenEl);
    const onListenClick = () => {
      if (state.phase !== "playing" || state.mode !== "poem") return;
      const line =
        currentPoemLine() ||
        (state.poem && state.poem.lines.find((item) => !item.read));
      if (line) focusPoemLine(line.index, true);
    };
    poemListenEl.addEventListener("click", onListenClick);
    cleanups.push(() => {
      poemListenEl.removeEventListener("click", onListenClick);
      boundListenButtons.delete(poemListenEl);
    });
  }

  if (els.poemListenAll && !boundListenAllButtons.has(els.poemListenAll)) {
    boundListenAllButtons.add(els.poemListenAll);
    const onListenAllClick = () => {
      if (state.phase !== "playing" || state.mode !== "poem") return;
      togglePoemListenAll();
    };
    els.poemListenAll.addEventListener("click", onListenAllClick);
    cleanups.push(() => {
      els.poemListenAll.removeEventListener("click", onListenAllClick);
      boundListenAllButtons.delete(els.poemListenAll);
    });
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}

(state.modeHooks ||= {}).markPoemLine = markPoemLine;
state.modeHooks.focusPoemLine = focusPoemLine;
state.modeHooks.highlightPoemInterim = highlightPoemInterim;
state.modeHooks.stopPoemListenAll = stopPoemListenAll;
