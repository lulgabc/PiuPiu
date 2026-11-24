import {
  state,
  els,
  FILL_HUES,
  FILL_EFFECTS,
  FILL_EFFECT_CLASSES,
  REDUCED_MOTION,
  shuffle,
  tr,
  uniqueWords,
} from "../core/state.js";
import { events } from "../core/events.js";
import { getDueWords } from "../core/storage.js";
import {
  ensurePhysics,
  attachSettledBody,
  destroyPhysics,
  stepPhysics,
} from "../systems/physics.js";
import { getWordBank } from "../data/packs.js";
import { focusWord, speakHelp, syncSpeechPhrases } from "../systems/speech.js";
import {
  spawnSparks,
  spawnStars,
  spawnEmojiBurst,
  createFlash,
  addFx,
} from "../systems/fx.js";

let fillFinishTimer = 0;
const boundFillLayers = new WeakSet();

function hasDoc() {
  return typeof document !== "undefined";
}

function getEmojiMap() {
  return typeof globalThis !== "undefined" &&
    globalThis.PIU_EMOJI &&
    typeof globalThis.PIU_EMOJI === "object"
    ? globalThis.PIU_EMOJI
    : {};
}

function ui() {
  return state.uiHooks && typeof state.uiHooks === "object" ? state.uiHooks : {};
}

export function drawFillWords(count) {
  const source = uniqueWords((state.pool.length ? state.pool : getWordBank()).slice());
  const short = source.filter((word) => word.length <= 14);
  const pool = short.length >= Math.min(count, 8) ? short : source;
  if (!pool.length) return [];

  const targetCount = Math.max(1, count);
  const dueList = getDueWords(state.userId || "_guest");
  if (!dueList.length) {
    return shuffle(pool.slice()).slice(0, targetCount);
  }

  const byLower = new Map();
  for (const word of pool) {
    const key = String(word).toLowerCase();
    if (!byLower.has(key)) byLower.set(key, word);
  }

  const prioritized = [];
  const used = new Set();
  const maxPriority = Math.max(2, Math.floor(targetCount * 0.5));
  for (const entry of dueList) {
    if (prioritized.length >= maxPriority) break;
    if (!entry || !entry.word) continue;
    const match = byLower.get(entry.word);
    if (match && !used.has(match)) {
      used.add(match);
      prioritized.push(match);
    }
  }

  const rest = shuffle(pool.filter((w) => !used.has(w)));
  return prioritized.concat(rest).slice(0, targetCount);
}

export async function buildFillBoard() {
  if (!hasDoc() || state.mode !== "fill" || !els.field || !els.wordLayer) return null;
  const fieldW = els.field.clientWidth;
  const fieldH = els.field.clientHeight;
  if (!fieldW || !fieldH) return null;

  destroyPhysics();
  const physicsPromise = ensurePhysics();

  const pad = 10;
  const gapX = 8;
  const gapY = 5;
  const baseFont = fieldW < 360 ? 21 : fieldW < 430 ? 23 : 25;
  const cardH = Math.round(baseFont * 1.7) + 10;
  const availableW = fieldW - pad * 2;
  const maxRows = Math.max(3, Math.floor((fieldH - pad * 2 + gapY) / (cardH + gapY)));
  const maxCards = Math.min(36, Math.max(16, maxRows * 3 + 2));
  const words = drawFillWords(maxCards);
  if (!words.length) return null;

  let hueBag = shuffle(FILL_HUES.slice());
  let hueIndex = 0;
  const emojiMap = getEmojiMap();
  const pending = [];
  const frag = document.createDocumentFragment();

  // Pass 1: Build all candidate elements into a DocumentFragment (zero layout reads)
  for (const word of words) {
    if (pending.length >= maxCards) break;
    const el = document.createElement("div");
    el.className = "word settled fill-word";
    el.dataset.word = word;
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
    frag.appendChild(el);
    pending.push({ word, el, hue });
  }
  els.wordLayer.appendChild(frag);

  // Pass 2: Single contiguous layout read pass (zero style writes)
  const rawWidths = pending.map((item) => item.el.offsetWidth);

  // Pass 3: Single mathematical fontSize write + row packing pass (zero layout reads)
  const cards = [];
  const removals = [];
  for (let i = 0; i < pending.length; i += 1) {
    const item = pending[i];
    const rawW = rawWidths[i];
    const estW = Math.max(56, Math.ceil(item.word.length * baseFont * 0.62 + 20));
    let width = rawW > 0 ? rawW : estW;

    if (width > availableW) {
      const nextFont = Math.max(13, Math.min(baseFont, Math.floor(baseFont * (availableW / width))));
      const scaledW = Math.ceil(width * (nextFont / baseFont));
      if (scaledW > availableW) {
        removals.push(item.el);
        continue;
      }
      item.el.style.fontSize = `${nextFont}px`;
      width = Math.min(availableW, scaledW);
    }

    const lower = item.word.toLowerCase();
    cards.push({
      word: item.word,
      el: item.el,
      x: 0,
      y: 0,
      w: width,
      h: cardH,
      hue: item.hue,
      emoji: Object.hasOwn(emojiMap, lower) ? emojiMap[lower] : "",
      golden: false,
    });
  }

  if (!cards.length) {
    for (const el of removals) el.remove();
    return null;
  }

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
    if (!used.has(card)) removals.push(card.el);
  }
  for (const el of removals) el.remove();

  const startY = fieldH - pad - cardH;
  usedRows.forEach((rowData, rowIndex) => {
    const y = startY - rowIndex * (cardH + gapY);
    let x = Math.max(pad, Math.round((fieldW - rowData.width) / 2));
    for (const card of rowData.cards) {
      card.x = x;
      card.y = y;
      card.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
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
  ui().updateHUD?.(true);

  const physics = await physicsPromise;
  if (physics && physics === state.physics) {
    for (const card of state.settled) {
      if (!card.body) attachSettledBody(card);
    }
  }
  return state.settled;
}

function fillCardCenter(card) {
  if (
    els.field &&
    card.el &&
    typeof els.field.getBoundingClientRect === "function" &&
    typeof card.el.getBoundingClientRect === "function"
  ) {
    const fRect = els.field.getBoundingClientRect();
    const r = card.el.getBoundingClientRect();
    if (r.width || r.height) {
      return {
        x: r.left - fRect.left + r.width / 2,
        y: r.top - fRect.top + r.height / 2,
      };
    }
  }
  return {
    x: card.x + card.w / 2,
    y: card.y + card.h / 2,
  };
}

function clearFillEffectClasses(el) {
  for (const name of FILL_EFFECT_CLASSES) el.classList.remove(name);
}

function playFillClass(card, cls, ms) {
  const el = card.el;
  clearFillEffectClasses(el);
  el.classList.add(cls);
  setTimeout(() => {
    if (el) el.classList.remove(cls);
  }, ms);
}

export function applyFillEffect(card) {
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
  if (effect === "ring" && hasDoc()) {
    const ring = document.createElement("div");
    ring.className = "ring";
    ring.style.left = `${cx}px`;
    ring.style.top = `${cy}px`;
    ring.style.setProperty("--hue", hue);
    addFx(ring);
  }
}

export function updateFillEffects(dt) {
  if (state.mode !== "fill" || state.phase !== "playing") return;
  state.fillFxTimer -= dt;
  if (state.fillFxTimer > 0) return;
  state.fillFxTimer = 0.65 + Math.random() * 0.85;
  if (!state.settled.length) return;
  applyFillEffect(state.settled[Math.floor(Math.random() * state.settled.length)]);
}

export function stepFillFrame(dt) {
  if (state.mode !== "fill" || state.phase !== "playing") return;
  updateFillEffects(dt);
  if (state.physics && state.settled.length) {
    stepPhysics(1000 / 60);
  }
}

export function completeFillRound() {
  if (state.mode !== "fill" || state.fillFinishing) return;
  if (state.phase !== "playing" && state.phase !== "paused") return;
  state.fillFinishing = true;
  const par = Math.max(12, state.fillTotal * 3.2);
  state.fillBonus = Math.max(0, Math.round((par - state.elapsed) * 8));
  if (state.fillBonus > 0) {
    state.score += state.fillBonus;
    ui().addProfilePoints?.(state.fillBonus);
  }
  ui().updateHUD?.(true);
  events.emit("fill:complete", {
    bonus: state.fillBonus,
    total: state.fillTotal,
    elapsed: state.elapsed,
  });
  if (fillFinishTimer) clearTimeout(fillFinishTimer);
  fillFinishTimer = setTimeout(() => {
    fillFinishTimer = 0;
    if (!state.fillFinishing) return;
    state.fillFinishing = false;
    if (state.phase === "playing" || state.phase === "paused") {
      if (typeof ui().endGame === "function") ui().endGame();
      else events.emit("game:over", { mode: "fill", reason: "complete" });
    }
  }, 720);
}

export function speakFillWord(card) {
  if (state.phase !== "playing" || state.mode !== "fill" || !card) return;
  focusWord(card, true);
  ui().showHeard?.(tr("help.listen", { word: card.word }), "volume");
  speakHelp(card);
  events.emit("fill:wordTap", { word: card.word, card });
}

export function bindFillEvents(wordLayer = els.wordLayer) {
  if (!wordLayer || boundFillLayers.has(wordLayer)) return () => {};
  boundFillLayers.add(wordLayer);

  const findCard = (target) => {
    const node =
      target && typeof target.closest === "function" ? target.closest(".fill-word") : null;
    if (!node) return null;
    return state.settled.find((item) => item.el === node) || null;
  };

  const onClick = (event) => {
    if (state.phase !== "playing" || state.mode !== "fill") return;
    const card = findCard(event.target);
    if (!card) return;
    event.stopPropagation();
    speakFillWord(card);
  };

  const onKeyDown = (event) => {
    if (state.phase !== "playing" || state.mode !== "fill") return;
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = findCard(event.target);
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    speakFillWord(card);
  };

  wordLayer.addEventListener("click", onClick);
  wordLayer.addEventListener("keydown", onKeyDown);

  return () => {
    wordLayer.removeEventListener("click", onClick);
    wordLayer.removeEventListener("keydown", onKeyDown);
    boundFillLayers.delete(wordLayer);
  };
}

export function resetFillRound() {
  if (fillFinishTimer) {
    clearTimeout(fillFinishTimer);
    fillFinishTimer = 0;
  }
  state.fillTotal = 0;
  state.fillBonus = 0;
  state.fillFinishing = false;
  state.fillFxTimer = 0;
}

(state.modeHooks ||= {}).completeFillRound = completeFillRound;
