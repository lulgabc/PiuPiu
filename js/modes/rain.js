import {
  state,
  els,
  PAD,
  DANGER_Y,
  GOLDEN_CHANCE,
  SPEED_LEVELS,
  tr,
  hueFor,
} from "../core/state.js";
import { events } from "../core/events.js";
import { recordWordOutcome } from "../core/storage.js";
import { playLevel, playMiss } from "../systems/audio.js";
import {
  ensurePhysics,
  attachSettledBody,
  stepPhysics,
  destroyPhysics,
} from "../systems/physics.js";
import { nextWord } from "../data/packs.js";
import {
  focusWord,
  clearFocus,
  speakHelp,
  syncSpeechPhrases,
} from "../systems/speech.js";
import { petStartle } from "../systems/pet.js";

const boundRainLayers = new WeakSet();
let shakeTimer = 0;

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

function triggerEndGame(reason = "danger") {
  if (typeof ui().endGame === "function") {
    ui().endGame();
  } else {
    events.emit("game:over", { mode: "rain", reason });
  }
}

export async function startRainRound() {
  state.spawnTimer = 1.4;
  state.level = 1;
  const initialCount =
    Array.isArray(state.practiceWords) && state.practiceWords.length > 0
      ? Math.min(4, state.practiceWords.length)
      : 1;
  for (let i = 0; i < initialCount; i += 1) {
    const spawned = spawnWord();
    if (spawned && i > 0) {
      spawned.y = 4 + i * 56;
      if (spawned.el && spawned.el.style) {
        spawned.el.style.transform = `translate3d(${spawned.x}px, ${spawned.y}px, 0)`;
      }
    }
  }
  return ensurePhysics();
}

export function onLevelUp() {
  playLevel();
  ui().toast?.(tr("toast.levelUp", { level: state.level }));
  events.emit("rain:levelUp", { level: state.level });
}

export function shakeField() {
  if (!els.field) return;
  if (shakeTimer) {
    clearTimeout(shakeTimer);
    shakeTimer = 0;
  }
  els.field.classList.remove("shake");
  els.field.classList.add("shake");
  shakeTimer = setTimeout(() => {
    shakeTimer = 0;
    if (els.field) els.field.classList.remove("shake");
  }, 340);
}

export function applyFallingSpeed(previous, next) {
  const oldMultiplier = SPEED_LEVELS[previous] || 1;
  const newMultiplier = SPEED_LEVELS[next] || 1;
  if (oldMultiplier === newMultiplier) return;
  for (const word of state.words) {
    const base = word.baseSpeed || word.speed / oldMultiplier;
    word.speed = base * newMultiplier;
  }
}

export function updateWordFace(word, dt) {
  if (!word || !word.emoji) return;
  word.faceTimer -= dt;
  if (word.faceTimer > 0) return;
  word.faceTimer += 1;
  word.showEmoji = !word.showEmoji;
  if (word.el) word.el.classList.toggle("show-emoji", word.showEmoji);
}

export function checkPileDanger() {
  if (state.phase !== "playing" || state.meteor) return false;
  if (state.settled.some((settled) => settled.y <= DANGER_Y)) {
    triggerEndGame("danger");
    return true;
  }
  return false;
}

export function settleWord(word, y) {
  const index = state.words.indexOf(word);
  if (index === -1) return null;
  if (state.focusedWord === word) clearFocus();
  state.words.splice(index, 1);
  syncSpeechPhrases();

  const fallbackY = Math.max(
    0,
    ((els.field && els.field.clientHeight) || 400) - (word.h || 44) - 4,
  );
  const finalY = Number.isFinite(y) ? Math.max(0, y) : fallbackY;
  word.y = finalY;
  word.showEmoji = false;
  word.golden = false;
  if (word.el) {
    word.el.classList.remove("show-emoji", "golden");
    const goldenBadge =
      typeof word.el.querySelector === "function"
        ? word.el.querySelector(".golden-badge")
        : null;
    if (goldenBadge && typeof goldenBadge.remove === "function") goldenBadge.remove();
    word.el.classList.add("settled", "miss");
    word.el.style.transform = `translate3d(${word.x}px, ${finalY}px, 0)`;
    setTimeout(() => {
      if (word.el) word.el.classList.remove("miss");
    }, 340);
  }

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

  recordWordOutcome(state.userId || "_guest", word.word, "miss");
  playMiss();
  shakeField();
  ui().updateHUD?.(true);
  petStartle(word.x + word.w / 2);
  events.emit("word:missed", { word: word.word, settled });

  if (finalY <= DANGER_Y && !state.meteor) {
    triggerEndGame("danger");
  }
  return settled;
}

export function moveWord(word, dt, fieldH) {
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

  if (word.el && word.el.style) {
    word.el.style.transform = `translate3d(${word.x}px, ${word.y}px, 0)`;
  }
}

export function spawnWord() {
  if (!hasDoc() || state.phase !== "playing") return null;
  if (state.words.length >= 9) return null;
  if (!els.field || !els.wordLayer) return null;
  const fieldW = els.field.clientWidth;
  const fieldH = els.field.clientHeight;
  if (!fieldW || !fieldH) return null;

  const word = nextWord();
  if (!word) return null;
  const golden =
    state.cleared >= 3 &&
    !state.words.some((item) => item.golden) &&
    Math.random() < GOLDEN_CHANCE;
  const el = document.createElement("div");
  el.className = golden ? "word golden" : "word";
  el.dataset.word = word;
  el.style.setProperty("--hue", hueFor(word));
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", word);
  el.tabIndex = 0;

  const span = document.createElement("span");
  span.className = "word-text";
  span.textContent = word;
  el.appendChild(span);

  const emojiMap = getEmojiMap();
  const key = word.toLowerCase();
  const emoji = Object.hasOwn(emojiMap, key) ? emojiMap[key] : "";
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

  const rawW = el.offsetWidth;
  const rawH = el.offsetHeight;
  let width = rawW > 0 ? rawW : Math.max(56, word.length * 16 + 24);
  const height = rawH > 0 ? rawH : 40;
  const maxWordWidth = Math.max(80, fieldW - PAD * 2);
  if (width > maxWordWidth) {
    const currentSize =
      (typeof getComputedStyle === "function" ? Number.parseFloat(getComputedStyle(el).fontSize) : 0) ||
      32;
    const nextSize = Math.max(10, Math.floor(currentSize * (maxWordWidth / width)));
    el.style.fontSize = `${nextSize}px`;
    width = Math.min(maxWordWidth, Math.ceil(width * (nextSize / currentSize)));
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
    y: 4,
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
  return obj;
}

export function stepRainFrame(dt) {
  if (state.mode !== "rain" || state.phase !== "playing") return false;
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

  const fieldH = els.field ? els.field.clientHeight : 0;
  for (const word of state.words.slice()) {
    if (state.phase !== "playing") break;
    updateWordFace(word, dt);
    moveWord(word, dt, fieldH);
  }

  if (state.phase !== "playing") return true;
  if (state.physics && state.settled.length) {
    stepPhysics(1000 / 60);
    if (checkPileDanger()) return true;
  }
  return false;
}

export function speakRainWord(card) {
  if (state.phase !== "playing" || state.mode !== "rain" || !card) return;
  focusWord(card, true);
  ui().showHeard?.(tr("help.listen", { word: card.word }), "volume");
  speakHelp(card);
  events.emit("rain:wordTap", { word: card.word, card });
}

export function bindRainEvents(wordLayer = els.wordLayer) {
  if (!wordLayer || boundRainLayers.has(wordLayer)) return () => {};
  boundRainLayers.add(wordLayer);

  const findCard = (target) => {
    const node =
      target && typeof target.closest === "function" ? target.closest(".word") : null;
    if (!node) return null;
    return (
      state.words.find((item) => item.el === node) ||
      state.settled.find((item) => item.el === node) ||
      null
    );
  };

  const onClick = (event) => {
    if (state.phase !== "playing" || state.mode !== "rain") return;
    const card = findCard(event.target);
    if (!card) return;
    event.stopPropagation();
    speakRainWord(card);
  };

  const onKeyDown = (event) => {
    if (state.phase !== "playing" || state.mode !== "rain") return;
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = findCard(event.target);
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    speakRainWord(card);
  };

  wordLayer.addEventListener("click", onClick);
  wordLayer.addEventListener("keydown", onKeyDown);

  return () => {
    wordLayer.removeEventListener("click", onClick);
    wordLayer.removeEventListener("keydown", onKeyDown);
    boundRainLayers.delete(wordLayer);
  };
}

export function resetRainRound() {
  if (shakeTimer) {
    clearTimeout(shakeTimer);
    shakeTimer = 0;
  }
  destroyPhysics();
  for (const word of state.words) {
    if (word.el && typeof word.el.remove === "function") word.el.remove();
  }
  for (const settled of state.settled) {
    if (settled.el && typeof settled.el.remove === "function") settled.el.remove();
  }
  state.words = [];
  state.settled = [];
}
