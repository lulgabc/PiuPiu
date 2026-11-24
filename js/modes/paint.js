import {
  state,
  els,
  FILL_HUES,
  hueFor,
  shuffle,
  tr,
  uniqueWords,
} from "../core/state.js";
import { events } from "../core/events.js";
import { destroyPhysics } from "../systems/physics.js";
import { getWordBank } from "../data/packs.js";
import { focusWord, speakHelp, syncSpeechPhrases } from "../systems/speech.js";
import { clearPaintCanvas, ensurePaintCanvas, redrawPaintCanvas } from "../systems/fx.js";

let paintFinishTimer = 0;
const boundPaintLayers = new WeakSet();

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

export function drawPaintWords(count) {
  const source = uniqueWords((state.pool.length ? state.pool : getWordBank()).slice());
  const short = source.filter((word) => word.length <= 14);
  const pool = short.length >= Math.min(count, 8) ? short : source;
  if (!pool.length) return [];
  return shuffle(pool.slice()).slice(0, Math.max(1, count));
}

export function buildPaintBoard() {
  if (!hasDoc() || state.mode !== "paint" || !els.field || !els.wordLayer) return null;
  const fieldW = els.field.clientWidth;
  const fieldH = els.field.clientHeight;
  if (!fieldW || !fieldH) return null;

  destroyPhysics();
  clearPaintCanvas();
  ensurePaintCanvas();
  redrawPaintCanvas();

  const padLeft = 12;
  const padTop = 12;
  const padBottom = 16;
  const padRight = 34;
  const availableW = fieldW - padLeft - padRight;
  const baseFont = fieldW < 360 ? 17 : fieldW < 430 ? 18 : 20;
  const cardH = Math.round(baseFont * 1.9) + 6;
  const area = Math.max(1, fieldW * fieldH);
  const target = Math.min(46, Math.max(18, Math.round(area / 7200)));
  const candidates = drawPaintWords(Math.min(62, target + 16));
  if (!candidates.length) return null;

  let hueBag = shuffle(FILL_HUES.slice());
  let hueIndex = 0;
  const emojiMap = getEmojiMap();
  const pending = [];
  const frag = document.createDocumentFragment();

  // Pass 1: Build all candidate elements into a DocumentFragment (zero layout reads)
  for (const word of candidates) {
    const el = document.createElement("div");
    el.className = "word settled fill-word paint-word";
    el.dataset.word = word;
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
    frag.appendChild(el);
    pending.push({ word, el, hue, rotation });
  }
  els.wordLayer.appendChild(frag);

  // Pass 2: Single contiguous layout read pass (zero style writes)
  const rawSizes = pending.map((item) => ({
    w: item.el.offsetWidth,
    h: item.el.offsetHeight,
  }));

  // Pass 3: Single mathematical fontSize write + collage packing pass (zero layout reads)
  const maxW = Math.max(52, availableW - 8);
  const cards = [];
  const removals = [];

  for (let i = 0; i < pending.length; i += 1) {
    const item = pending[i];
    const rawW = rawSizes[i].w;
    const rawH = rawSizes[i].h;
    const estW = Math.max(52, Math.ceil(item.word.length * baseFont * 0.6 + 20));
    let width = rawW > 0 ? rawW : estW;
    const height = rawH > 0 ? rawH : cardH;

    if (width > maxW) {
      const nextFont = Math.max(12, Math.min(baseFont, Math.floor(baseFont * (maxW / width))));
      const scaledW = Math.ceil(width * (nextFont / baseFont));
      if (scaledW > availableW) {
        removals.push(item.el);
        continue;
      }
      item.el.style.fontSize = `${nextFont}px`;
      width = Math.min(availableW, scaledW);
    }

    const radians = Math.abs((item.rotation * Math.PI) / 180);
    const lower = item.word.toLowerCase();
    cards.push({
      word: item.word,
      el: item.el,
      x: 0,
      y: 0,
      w: width,
      h: height,
      rot: item.rotation,
      boundW: Math.ceil(width * Math.cos(radians) + height * Math.sin(radians)),
      boundH: Math.ceil(width * Math.sin(radians) + height * Math.cos(radians)),
      hue: item.hue,
      emoji: Object.hasOwn(emojiMap, lower) ? emojiMap[lower] : "",
      golden: false,
    });
  }

  if (!cards.length) {
    for (const el of removals) el.remove();
    return null;
  }

  cards.sort((a, b) => b.w * b.h - a.w * a.h);
  const placed = [];
  const margins = [8, 6, 4, 2];
  const minX = padLeft;
  const maxX = fieldW - padRight;
  const minY = padTop;
  const maxY = fieldH - padBottom;

  for (const card of cards) {
    if (placed.length >= target) {
      removals.push(card.el);
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
      removals.push(card.el);
      continue;
    }
    card.bx = spot.bx;
    card.by = spot.by;
    card.x = Math.round(spot.bx + (card.boundW - card.w) / 2);
    card.y = Math.round(spot.by + (card.boundH - card.h) / 2);
    placed.push(card);
  }

  for (const el of removals) el.remove();
  for (const card of placed) {
    card.el.style.transform = `translate3d(${card.x}px, ${card.y}px, 0) rotate(${card.rot.toFixed(2)}deg)`;
    state.settled.push(card);
  }

  if (!state.settled.length) {
    const word = candidates[0];
    if (!word) return null;
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
    const estW = Math.max(52, Math.ceil(word.length * 14 * 0.6 + 20));
    const w = Math.min(fieldW, el.offsetWidth > 0 ? el.offsetWidth : estW);
    const h = el.offsetHeight > 0 ? el.offsetHeight : 34;
    const x = Math.max(0, Math.round((fieldW - w) / 2));
    const y = Math.max(0, Math.round((fieldH - h) / 2));
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    const lower = word.toLowerCase();
    state.settled.push({
      word,
      el,
      x,
      y,
      w,
      h,
      hue: hueFor(word),
      emoji: Object.hasOwn(emojiMap, lower) ? emojiMap[lower] : "",
      golden: false,
    });
  }

  state.paintTotal = state.settled.length;
  state.cleared = 0;
  state.paintBonus = 0;
  state.paintFinishing = false;
  syncSpeechPhrases();
  ui().updateHUD?.(true);
  return state.settled;
}

export function completePaintRound() {
  if (state.mode !== "paint" || state.paintFinishing) return;
  if (state.phase !== "playing" && state.phase !== "paused") return;
  state.paintFinishing = true;
  const par = Math.max(10, state.paintTotal * 2.6);
  state.paintBonus = Math.max(0, Math.round((par - state.elapsed) * 8));
  if (state.paintBonus > 0) {
    state.score += state.paintBonus;
    ui().addProfilePoints?.(state.paintBonus);
  }
  ui().updateHUD?.(true);
  events.emit("paint:complete", {
    bonus: state.paintBonus,
    total: state.paintTotal,
    elapsed: state.elapsed,
  });
  if (paintFinishTimer) clearTimeout(paintFinishTimer);
  paintFinishTimer = setTimeout(() => {
    paintFinishTimer = 0;
    if (!state.paintFinishing) return;
    state.paintFinishing = false;
    if (state.phase === "playing" || state.phase === "paused") {
      if (typeof ui().endGame === "function") ui().endGame();
      else events.emit("game:over", { mode: "paint", reason: "complete" });
    }
  }, 900);
}

export function speakPaintWord(card) {
  if (state.phase !== "playing" || state.mode !== "paint" || !card) return;
  focusWord(card, true);
  ui().showHeard?.(tr("help.listen", { word: card.word }), "volume");
  speakHelp(card);
  events.emit("paint:wordTap", { word: card.word, card });
}

export const speakFillWord = speakPaintWord;

export function bindPaintEvents(wordLayer = els.wordLayer) {
  if (!wordLayer || boundPaintLayers.has(wordLayer)) return () => {};
  boundPaintLayers.add(wordLayer);

  const findCard = (target) => {
    const node =
      target && typeof target.closest === "function" ? target.closest(".paint-word") : null;
    if (!node) return null;
    return state.settled.find((item) => item.el === node) || null;
  };

  const onClick = (event) => {
    if (state.phase !== "playing" || state.mode !== "paint") return;
    const card = findCard(event.target);
    if (!card) return;
    event.stopPropagation();
    speakPaintWord(card);
  };

  const onKeyDown = (event) => {
    if (state.phase !== "playing" || state.mode !== "paint") return;
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = findCard(event.target);
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    speakPaintWord(card);
  };

  wordLayer.addEventListener("click", onClick);
  wordLayer.addEventListener("keydown", onKeyDown);

  return () => {
    wordLayer.removeEventListener("click", onClick);
    wordLayer.removeEventListener("keydown", onKeyDown);
    boundPaintLayers.delete(wordLayer);
  };
}

export function resetPaintRound() {
  if (paintFinishTimer) {
    clearTimeout(paintFinishTimer);
    paintFinishTimer = 0;
  }
  state.paintTotal = 0;
  state.paintBonus = 0;
  state.paintFinishing = false;
  clearPaintCanvas();
}

(state.modeHooks ||= {}).completePaintRound = completePaintRound;
