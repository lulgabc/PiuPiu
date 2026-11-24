import {
  state,
  els,
  EFFECTS,
  EFFECT_HUES,
  METEOR_EVERY,
  METEOR_TARGET,
  METEOR_MAX_FLIGHT,
  METEOR_HIT_PAD,
  METEOR_HIT_COOLDOWN,
  METEOR_SIZE,
  DANGER_Y,
  REDUCED_MOTION,
  shuffle,
  tr,
  hueFor,
} from "../core/state.js";
import { events } from "../core/events.js";
import { recordWordOutcome } from "../core/storage.js";
import {
  playEffect,
  playRewardClear,
  playGolden,
  playCombo,
  playMeteorLaunch,
  playMeteorHit,
  playMeteorSweep,
  playMeteorFinish,
  playPaintShot,
  playPaintSplat,
  playWordEasterEgg,
  maybeSurprise,
} from "./audio.js";
import { removeSettledBody, wakePhysicsPile } from "./physics.js";

let effectBag = [];
let fxHooks = {};
let paintRafId = 0;
let emojiBurstUnsub = null;

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function setFxHooks(hooks = {}) {
  fxHooks = { ...fxHooks, ...hooks };
}

function getHook(name) {
  if (fxHooks && typeof fxHooks[name] === "function") return fxHooks[name];
  if (state.uiHooks && typeof state.uiHooks[name] === "function") return state.uiHooks[name];
  return null;
}

function callHook(name, ...args) {
  const fn = getHook(name);
  return fn ? fn(...args) : undefined;
}

function cancelPaintAnim() {
  if (paintRafId && typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(paintRafId);
  }
  paintRafId = 0;
}

export function nextEffect() {
  if (!effectBag.length) effectBag = shuffle(EFFECTS.slice());
  return effectBag.pop();
}

export function addFx(node) {
  if (!node || !els.fxLayer) return;
  if (typeof node.addEventListener === "function") {
    node.addEventListener("animationend", () => node.remove(), { once: true });
  }
  els.fxLayer.appendChild(node);
}

export function cloneWordFace(word, rel) {
  if (!word || !word.el) return null;
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

export function spawnSparks(cx, cy, hue, count) {
  if (typeof document === "undefined" || !els.fxLayer) return;
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

export function spawnStars(cx, cy, hue, count) {
  if (typeof document === "undefined" || !els.fxLayer) return;
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

export function spawnStreaks(cx, cy, hue, count) {
  if (typeof document === "undefined" || !els.fxLayer) return;
  for (let i = 0; i < count; i++) {
    const streak = document.createElement("div");
    streak.className = "fx-streak";
    streak.style.left = `${cx + (Math.random() - 0.5) * 90}px`;
    streak.style.top = `${cy - 20 + (Math.random() - 0.5) * 20}px`;
    streak.style.setProperty("--hue", hue);
    addFx(streak);
  }
}

export function createFlash(cx, cy, hue) {
  if (typeof document === "undefined" || !els.fxLayer) return;
  const flash = document.createElement("div");
  flash.className = "fx-flash";
  flash.style.setProperty("--x", `${cx}px`);
  flash.style.setProperty("--y", `${cy}px`);
  flash.style.setProperty("--hue", hue);
  addFx(flash);
}

export function spawnEmojiBurst(word, cx, cy) {
  if (typeof document === "undefined" || !els.fxLayer || !word || !word.emoji) return;
  const node = document.createElement("span");
  node.className = "fx-emoji";
  node.textContent = word.emoji;
  node.style.left = `${cx}px`;
  node.style.top = `${cy}px`;
  addFx(node);
}

export function showFloat(text, sub, x, y, color) {
  if (typeof document === "undefined" || !els.fxLayer) return;
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
/* Single-<canvas id="paintCanvas"> splat renderer                    */
/* ------------------------------------------------------------------ */

function findPaintCanvas(layer) {
  if (!layer) return null;
  if (typeof layer.querySelector === "function") {
    const found = layer.querySelector("#paintCanvas");
    if (found) return found;
  }
  const kids = layer.children || layer.childNodes || [];
  for (const child of kids) {
    if (child && child.id === "paintCanvas") return child;
  }
  return null;
}

export function ensurePaintCanvas() {
  const layer = els.paintLayer;
  if (!layer || typeof document === "undefined") return null;
  let canvas = findPaintCanvas(layer);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "paintCanvas";
    canvas.className = "paint-canvas";
    canvas.setAttribute("aria-hidden", "true");
    if (canvas.style) {
      canvas.style.display = "block";
      canvas.style.pointerEvents = "none";
    }
    if (typeof layer.replaceChildren === "function") {
      layer.replaceChildren(canvas);
    } else if (typeof layer.appendChild === "function") {
      layer.appendChild(canvas);
    }
  }
  return canvas;
}

function sizePaintCanvas(canvas) {
  if (!canvas || !els.paintLayer) return null;
  const fieldW = els.paintLayer.clientWidth || (els.field && els.field.clientWidth) || 0;
  const fieldH = els.paintLayer.clientHeight || (els.field && els.field.clientHeight) || 0;
  if (!fieldW || !fieldH) return null;
  const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
  if (fieldW !== canvas._cssW || fieldH !== canvas._cssH || dpr !== canvas._dpr) {
    canvas.width = Math.max(1, Math.round(fieldW * dpr));
    canvas.height = Math.max(1, Math.round(fieldH * dpr));
    if (canvas.style) {
      canvas.style.width = `${fieldW}px`;
      canvas.style.height = `${fieldH}px`;
    }
    canvas._cssW = fieldW;
    canvas._cssH = fieldH;
    canvas._dpr = dpr;
  }
  const ctx = typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
  if (!ctx) return null;
  return { canvas, ctx, fieldW, fieldH, dpr };
}

function makeBlobPoints(cx, cy, rx, ry, count, irregular, biasAngle = 0, bias = 0) {
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
  return points;
}

function traceSmoothClosedPath(ctx, points) {
  const count = points.length;
  if (!count) return;
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

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawRotatedEllipse(ctx, x, y, rx, ry, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  if (typeof ctx.ellipse === "function") {
    ctx.ellipse(0, 0, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  } else {
    ctx.scale(1, Math.max(0.1, ry / Math.max(0.5, rx)));
    ctx.arc(0, 0, Math.max(0.5, rx), 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function drawSplatDescriptor(ctx, splat, animT, scaleX, scaleY) {
  const popScale = animT >= 1 || REDUCED_MOTION ? 1 : Math.max(0.15, easeOutBack(animT));
  const alpha = 0.92 * Math.min(1, 0.25 + animT * 0.75);
  const hue = splat.hue;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(splat.cx * scaleX, splat.cy * scaleY);
  ctx.rotate(splat.rot);
  ctx.scale(popScale * scaleX, popScale * scaleY);

  let inkFill = `hsl(${hue} 90% 56%)`;
  if (typeof ctx.createLinearGradient === "function") {
    const grad = ctx.createLinearGradient(
      -splat.mainR * 1.2,
      -splat.mainRy * 1.2,
      splat.mainR * 1.2,
      splat.mainRy * 1.2,
    );
    grad.addColorStop(0, `hsl(${hue} 96% 66%)`);
    grad.addColorStop(0.52, `hsl(${hue} 90% 56%)`);
    grad.addColorStop(1, `hsl(${hue} 86% 43%)`);
    inkFill = grad;
  }
  const dropFill = `hsl(${hue} 90% 55%)`;

  // 1. Tendrils
  ctx.strokeStyle = inkFill;
  ctx.fillStyle = inkFill;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const t of splat.tendrils) {
    ctx.lineWidth = t.width;
    ctx.beginPath();
    ctx.moveTo(t.bx, t.by);
    ctx.quadraticCurveTo(t.c1x, t.c1y, t.tx, t.ty);
    ctx.stroke();
    if (t.hasTip) {
      ctx.beginPath();
      ctx.arc(t.tx, t.ty, t.tipR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Drips
  for (const d of splat.drips) {
    ctx.lineWidth = d.width;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.quadraticCurveTo(d.c1x, d.c1y, d.tx, d.ty);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(d.tipX, d.ty, d.tipR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Lumps & Collars
  ctx.fillStyle = inkFill;
  for (const lump of splat.lumps) {
    traceSmoothClosedPath(ctx, lump.points);
    ctx.fill();
  }
  for (const collar of splat.collars) {
    traceSmoothClosedPath(ctx, collar.points);
    ctx.fill();
  }

  // 4. Core blob
  traceSmoothClosedPath(ctx, splat.core);
  ctx.fillStyle = inkFill;
  ctx.fill();
  ctx.strokeStyle = `hsla(${hue}, 72%, 34%, 0.22)`;
  ctx.lineWidth = Math.max(0.8, splat.mainR * 0.018);
  ctx.stroke();

  // 5. Droplets & streaks
  ctx.fillStyle = dropFill;
  for (const drop of splat.drops) {
    drawRotatedEllipse(ctx, drop.x, drop.y, drop.rx, drop.ry, drop.angle);
  }

  // 6. Mist specks
  ctx.fillStyle = `hsl(${hue} 92% 56%)`;
  for (const speck of splat.specks) {
    ctx.beginPath();
    ctx.arc(speck.x, speck.y, speck.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Wet specular highlight
  ctx.fillStyle = `hsla(${hue}, 100%, 96%, 0.18)`;
  drawRotatedEllipse(
    ctx,
    -splat.mainR * 0.28,
    -splat.mainRy * 0.34,
    splat.mainR * 0.16,
    splat.mainRy * 0.08,
    (-18 * Math.PI) / 180,
  );

  ctx.restore();
}

export function redrawPaintCanvas() {
  cancelPaintAnim();
  const canvas = ensurePaintCanvas();
  if (!canvas) return;
  const sized = sizePaintCanvas(canvas);
  if (!sized) return;
  const { ctx, fieldW, fieldH, dpr } = sized;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, fieldW, fieldH);

  const now = nowMs();
  let animating = false;
  for (const splat of state.paintSplats) {
    const scaleX = splat.refW ? fieldW / splat.refW : 1;
    const scaleY = splat.refH ? fieldH / splat.refH : 1;
    const animT = REDUCED_MOTION ? 1 : Math.min(1, (now - splat.bornAt) / 260);
    if (animT < 1) animating = true;
    drawSplatDescriptor(ctx, splat, animT, scaleX, scaleY);
  }

  if (animating && typeof requestAnimationFrame === "function") {
    paintRafId = requestAnimationFrame(() => {
      paintRafId = 0;
      redrawPaintCanvas();
    });
  }
}

export function clearPaintCanvas() {
  cancelPaintAnim();
  state.paintSplats.length = 0;
  const canvas = findPaintCanvas(els.paintLayer);
  if (canvas && typeof canvas.getContext === "function") {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0);
    }
  }
}

export function createPaintSplat(cx, cy, hue, cardW, cardH, travelAngle) {
  const layer = els.paintLayer;
  if (!layer) return null;

  const fieldW = layer.clientWidth || (els.field && els.field.clientWidth) || 0;
  const fieldH = layer.clientHeight || (els.field && els.field.clientHeight) || 0;

  const base = Math.max(cardW * 0.8, cardH * 2.05);
  let scale = 0.55 + Math.random() * 0.85;
  const roll = Math.random();
  if (roll > 0.84) scale *= 1.55;
  else if (roll < 0.16) scale *= 0.55;
  const mainR = Math.max(18, Math.min(88, base * 0.5 * scale));
  const mainRy = mainR * (0.62 + Math.random() * 0.46);
  const biasAngle = Number.isFinite(travelAngle) ? travelAngle : Math.random() * Math.PI * 2;
  const bias = 0.1 + Math.random() * 0.14;

  const tendrils = [];
  const tendrilCount = REDUCED_MOTION ? 1 : 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < tendrilCount; i += 1) {
    const spread = i === 0 ? 0.55 : Math.PI * 1.6;
    let angle = biasAngle + (Math.random() - 0.5) * spread;
    if (i > 0 && Math.random() < 0.22) angle += Math.PI;
    const length = mainR * (i === 0 ? 1.7 + Math.random() * 1.0 : 1.15 + Math.random() * 1.0);
    const width = mainR * (0.11 + Math.random() * 0.12);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const nx = -dy;
    const ny = dx;
    const bend = (Math.random() - 0.5) * width * 2.6;
    tendrils.push({
      bx: dx * mainR * 0.3,
      by: dy * mainR * 0.3,
      c1x: dx * length * 0.52 + nx * bend,
      c1y: dy * length * 0.52 + ny * bend,
      tx: dx * length,
      ty: dy * length,
      width,
      hasTip: Math.random() < 0.7,
      tipR: width * (0.55 + Math.random() * 0.4),
    });
  }

  const drips = [];
  const dripCount = REDUCED_MOTION ? 0 : 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < dripCount; i += 1) {
    const x = (Math.random() - 0.5) * mainR * 1.5;
    const y = mainRy * (0.2 + Math.random() * 0.25);
    const length = mainR * (0.5 + Math.random() * 1.1);
    const width = mainR * (0.09 + Math.random() * 0.1);
    const sway = (Math.random() - 0.5) * width * 2.2;
    drips.push({
      x,
      y,
      c1x: x + sway,
      c1y: y + length * 0.55,
      tx: x + sway * 0.45,
      ty: y + length,
      tipX: x + (Math.random() - 0.5) * width * 0.8,
      width,
      tipR: width * (0.62 + Math.random() * 0.35),
    });
  }

  const lumps = [];
  const lumpCount = REDUCED_MOTION ? 1 : 1 + Math.floor(Math.random() * 4);
  for (let i = 0; i < lumpCount; i += 1) {
    const angle = biasAngle + (Math.random() - 0.5) * Math.PI * 2;
    const distance = mainR * (1.0 + Math.random() * 1.5);
    const lumpRadius = mainR * (0.07 + Math.random() * 0.2);
    lumps.push({
      points: makeBlobPoints(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        lumpRadius * (0.8 + Math.random() * 0.6),
        lumpRadius * (0.65 + Math.random() * 0.6),
        8 + Math.floor(Math.random() * 3),
        0.42,
        angle,
        0.16,
      ),
    });
  }

  const collars = [];
  const collarCount = REDUCED_MOTION ? 1 : 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < collarCount; i += 1) {
    const angle = biasAngle + (Math.random() - 0.5) * Math.PI * 2;
    const distance = mainR * (0.35 + Math.random() * 0.55);
    const collarRadius = mainR * (0.22 + Math.random() * 0.25);
    collars.push({
      points: makeBlobPoints(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        collarRadius * (0.8 + Math.random() * 0.5),
        collarRadius * (0.7 + Math.random() * 0.5),
        8 + Math.floor(Math.random() * 3),
        0.42,
        angle,
        0.18,
      ),
    });
  }

  const drops = [];
  const dropCount = REDUCED_MOTION ? 6 : 14 + Math.floor(Math.random() * 16);
  for (let i = 0; i < dropCount; i += 1) {
    let angle = biasAngle + (Math.random() - 0.5) * Math.PI * 2.4;
    if (Math.random() < 0.2) angle = Math.random() * Math.PI * 2;
    const distance = mainR * (1.15 + Math.pow(Math.random(), 1.5) * 3.2);
    let radius = Math.max(0.9, mainR * (0.018 + Math.pow(Math.random(), 2) * 0.15));
    if (Math.random() < 0.1) radius *= 2.2;
    const far = distance > mainR * 2.2;
    const stretch =
      far && Math.random() < 0.45 ? 0.38 + Math.random() * 0.24 : 0.62 + Math.random() * 0.34;
    drops.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      angle,
      rx: radius,
      ry: radius * stretch,
    });
  }

  const streakCount = REDUCED_MOTION ? 0 : 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < streakCount; i += 1) {
    const angle = biasAngle + (Math.random() - 0.5) * Math.PI * 1.7;
    const distance = mainR * (1.5 + Math.random() * 2.1);
    const length = mainR * (0.12 + Math.random() * 0.2);
    const width = 1.1 + Math.random() * 2.1;
    drops.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      angle,
      rx: length,
      ry: width,
    });
  }

  const specks = [];
  const speckCount = REDUCED_MOTION ? 4 : 10 + Math.floor(Math.random() * 14);
  for (let i = 0; i < speckCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = mainR * (1.5 + Math.random() * 2.7);
    specks.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      r: 0.6 + Math.random() * 1.9,
    });
  }

  const splat = {
    cx,
    cy,
    hue,
    refW: fieldW,
    refH: fieldH,
    rot: ((Math.random() * 70 - 35) * Math.PI) / 180,
    mainR,
    mainRy,
    core: makeBlobPoints(0, 0, mainR, mainRy, 15 + Math.floor(Math.random() * 7), 0.32, biasAngle, bias),
    collars,
    lumps,
    tendrils,
    drips,
    drops,
    specks,
    bornAt: nowMs(),
  };

  state.paintSplats.push(splat);
  redrawPaintCanvas();
  createFlash(cx, cy, hue);
  spawnSparks(cx, cy, hue, REDUCED_MOTION ? 4 : 9);
  return splat;
}

export function launchPaintball(rel, hue, cardW, cardH) {
  const cx = rel.left + rel.width / 2;
  const cy = rel.top + rel.height / 2;
  if (typeof document === "undefined" || !els.fxLayer) {
    createPaintSplat(cx, cy, hue, cardW, cardH, 0);
    playPaintSplat();
    return;
  }
  const fieldW = (els.field && els.field.clientWidth) || 360;
  const fieldH = (els.field && els.field.clientHeight) || 600;
  const pet = state.pets[0];
  const sx = Math.max(16, Math.min(fieldW - 16, pet ? pet.x : fieldW / 2));
  const sy = Math.max(
    8,
    Math.min(fieldH - 8, pet ? pet.ground + pet.hopY - pet.h * 0.72 : fieldH - 10),
  );
  const tx = cx - sx;
  const ty = cy - sy;
  const distance = Math.hypot(tx, ty);
  const duration = REDUCED_MOTION ? 0.01 : Math.max(0.2, Math.min(0.42, distance / 1250));

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
    if (!ball.isConnected) return;
    ball.remove();
    createPaintSplat(cx, cy, hue, cardW, cardH, Math.atan2(ty, tx));
    playPaintSplat();
  };
  if (typeof ball.addEventListener === "function") {
    ball.addEventListener("animationend", impact, { once: true });
  }
  setTimeout(impact, Math.round(duration * 1000) + 140);
}

export function burst(el, rel, hue) {
  if (typeof document === "undefined" || !els.fxLayer || !el) return;
  const computed = typeof getComputedStyle === "function" ? getComputedStyle(el) : null;
  const fontFamily = computed ? computed.fontFamily : "";
  const fontSize = computed ? computed.fontSize : "";
  const cx = rel.left + rel.width / 2;
  const cy = rel.top + rel.height / 2;

  const ring = document.createElement("div");
  ring.className = "ring";
  ring.style.left = `${cx}px`;
  ring.style.top = `${cy}px`;
  ring.style.setProperty("--hue", hue);
  addFx(ring);

  spawnSparks(cx, cy, hue, 18);

  const textEl = typeof el.querySelector === "function" ? el.querySelector(".word-text") : null;
  const node = textEl && textEl.firstChild;
  const textNodeType = typeof Node !== "undefined" ? Node.TEXT_NODE : 3;
  if (node && node.nodeType === textNodeType && typeof document.createRange === "function" && els.field) {
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

export function runEffect(effect, word, rel, wordHue, effectHue) {
  if (typeof document === "undefined" || !els.fxLayer) return;
  const cx = rel.left + rel.width / 2;
  const cy = rel.top + rel.height / 2;
  createFlash(cx, cy, effectHue);

  if (effect === "crack") {
    const left = cloneWordFace(word, rel);
    if (left) {
      left.classList.add("fx-crack-left");
      left.style.setProperty("--fx-hue", effectHue);
      addFx(left);
    }
    const right = cloneWordFace(word, rel);
    if (right) {
      right.classList.add("fx-crack-right");
      right.style.setProperty("--fx-hue", effectHue);
      addFx(right);
    }
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
    if (clone) {
      clone.classList.add("fx-fly");
      clone.style.setProperty("--fx-hue", effectHue);
      addFx(clone);
    }
    spawnStreaks(cx, cy, effectHue, 4);
    spawnStars(cx, cy, effectHue, 8);
    spawnEmojiBurst(word, cx, cy);
    return;
  }

  if (effect === "drop") {
    const clone = cloneWordFace(word, rel);
    if (clone) {
      clone.classList.add("fx-drop");
      clone.style.setProperty("--fx-hue", effectHue);
      addFx(clone);
    }
    spawnStreaks(cx, cy, effectHue, 7);
    spawnSparks(cx, cy, effectHue, 8);
    spawnEmojiBurst(word, cx, cy);
    return;
  }

  if (effect === "spin") {
    const clone = cloneWordFace(word, rel);
    if (clone) {
      clone.classList.add("fx-spin");
      clone.style.setProperty("--fx-hue", effectHue);
      addFx(clone);
    }
    spawnStars(cx, cy, effectHue, 12);
    spawnEmojiBurst(word, cx, cy);
    return;
  }

  burst(word.el, rel, wordHue);
  spawnStars(cx, cy, effectHue, 6);
  spawnEmojiBurst(word, cx, cy);
}

/* ------------------------------------------------------------------ */
/* Meteor sweep & reward clear                                        */
/* ------------------------------------------------------------------ */

export function cancelMeteor() {
  if (!state.meteor) return;
  if (state.meteor.el && typeof state.meteor.el.remove === "function") {
    state.meteor.el.remove();
  }
  state.meteor = null;
}

export function sweepMeteorSettled(meteor) {
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
  if (target.el && typeof target.el.remove === "function") target.el.remove();
  meteor.cleared += 1;
  meteor.hitCooldown = METEOR_HIT_COOLDOWN;
  playMeteorSweep(meteor.cleared);
  return 1;
}

export function finishMeteor() {
  const meteor = state.meteor;
  if (!meteor) return;
  const cx = meteor.x + meteor.size / 2;
  const cy = meteor.y + meteor.size / 2;
  const count = meteor.cleared;
  if (meteor.el && typeof meteor.el.remove === "function") meteor.el.remove();
  state.meteor = null;
  events.emit("pet:meteorFinish");

  createFlash(cx, cy, 42);
  spawnStars(cx, cy, 42, 30);
  spawnSparks(cx, cy, 42, 18);
  callHook("updateHUD", true);
  playMeteorFinish();
  callHook("toast", count ? tr("meteor.clear", { count }) : tr("meteor.empty"));

  if (state.settled.some((settled) => settled.y <= DANGER_Y)) {
    const endFn = getHook("endGame");
    if (endFn) endFn();
    else events.emit("game:end", { reason: "danger" });
  }
}

export function startMeteor(cx, cy) {
  if (!els.field || state.meteor || typeof document === "undefined") return;
  const fieldW = els.field.clientWidth;
  const fieldH = els.field.clientHeight;
  if (!fieldW || !fieldH || !state.settled.length) return;

  const quadrant = Math.floor(Math.random() * 4);
  const angle =
    Math.PI / 4 + (Math.random() - 0.5) * (Math.PI / 7.5) + quadrant * (Math.PI / 2);
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
    startedAt: nowMs(),
    size: METEOR_SIZE,
  };
  state.meteor = meteor;
  el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${(angle * 180) / Math.PI + 45}deg)`;
  if (els.fxLayer) els.fxLayer.appendChild(el);
  events.emit("pet:meteorStart");

  playMeteorLaunch();
  spawnStars(cx, cy, 42, 14);
  callHook("toast", tr("meteor.start"));
}

export function updateMeteor(dt) {
  const meteor = state.meteor;
  if (!meteor) return;
  const fieldW = els.field ? els.field.clientWidth : 0;
  const fieldH = els.field ? els.field.clientHeight : 0;
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
      if (swept) callHook("updateHUD", true);
      finishMeteor();
      return;
    }
  }

  if (swept) callHook("updateHUD", true);
  if (nowMs() - meteor.startedAt >= METEOR_MAX_FLIGHT) {
    finishMeteor();
    return;
  }
  const rotation = (Math.atan2(meteor.vy, meteor.vx) * 180) / Math.PI + 45;
  if (meteor.el && meteor.el.style) {
    meteor.el.style.transform = `translate3d(${meteor.x}px, ${meteor.y}px, 0) rotate(${rotation}deg)`;
  }
}

export function triggerRewardClear(rel) {
  const fieldH = (els.field && els.field.clientHeight) || 1;
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
    if (target.el && typeof target.el.remove === "function") target.el.remove();
  }
  if (targets.length) {
    state.settled = state.settled.filter((settled) => !targetSet.has(settled));
    wakePhysicsPile();
  }

  if (typeof document !== "undefined" && els.fxLayer) {
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
  }

  playRewardClear();
  if (els.correctStat) {
    els.correctStat.classList.remove("reward");
    els.correctStat.classList.add("reward");
    setTimeout(() => {
      if (els.correctStat) els.correctStat.classList.remove("reward");
    }, 1200);
  }
  callHook("updateHUD", true);
}

export function explodeWord(word) {
  const activeIndex = state.words.indexOf(word);
  const settledIndex = activeIndex === -1 ? state.settled.indexOf(word) : -1;
  if (activeIndex === -1 && settledIndex === -1) return;

  if (state.focusedWord === word) {
    const clearFn = state.speechHooks?.clearFocus || getHook("clearFocus");
    if (typeof clearFn === "function") {
      clearFn();
    } else {
      clearTimeout(state.focusTimer);
      state.focusTimer = 0;
      if (state.focusedWord.el) state.focusedWord.el.classList.remove("focused");
      state.focusedWord = null;
      if (els.wordLayer) els.wordLayer.classList.remove("has-focus");
    }
  }

  if (activeIndex !== -1) {
    state.words.splice(activeIndex, 1);
  } else {
    removeSettledBody(word);
    state.settled.splice(settledIndex, 1);
    wakePhysicsPile();
  }

  if (typeof state.speechHooks?.syncSpeechPhrases === "function") {
    state.speechHooks.syncSpeechPhrases();
  } else if (getHook("syncSpeechPhrases")) {
    callHook("syncSpeechPhrases");
  } else {
    events.emit("speech:sync");
  }

  let rel;
  if (els.field && word.el && typeof els.field.getBoundingClientRect === "function" && typeof word.el.getBoundingClientRect === "function") {
    const fRect = els.field.getBoundingClientRect();
    const wRect = word.el.getBoundingClientRect();
    rel = {
      left: wRect.left - fRect.left,
      top: wRect.top - fRect.top,
      width: wRect.width || word.w || 60,
      height: wRect.height || word.h || 34,
    };
  } else {
    rel = {
      left: word.x || 0,
      top: word.y || 0,
      width: word.w || 60,
      height: word.h || 34,
    };
  }
  const cx = rel.left + rel.width / 2;
  const cy = rel.top + rel.height / 2;
  const fieldH = (els.field && els.field.clientHeight) || 1;
  const heightRatio = Math.min(1, Math.max(0, ((word.y || 0) + (word.h || 0) / 2) / fieldH));

  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const golden = Boolean(word.golden);
  const basePoints =
    state.mode === "fill" || state.mode === "paint" ? 20 : 10 + Math.round(heightRatio * 10);
  const multiplier = 1 + Math.min(state.combo - 1, 10) * 0.1;
  const points = Math.round(basePoints * multiplier) + (golden ? 25 : 0);
  state.score += points;
  state.cleared += 1;

  callHook("addProfilePoints", points);
  events.emit("profile:addPoints", { points, word: word.word });
  recordWordOutcome(state.userId || "_guest", word.word, "hit");
  events.emit("word:hit", { word: word.word, points, golden, combo: state.combo });

  if (state.mode === "rain") {
    callHook("advanceRewardProgress");
    events.emit("hud:rewardProgress", { cleared: state.cleared });
  }

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

  if (word.el && typeof word.el.remove === "function") word.el.remove();

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
    callHook("showPraise", "easter.golden");
  } else {
    const special = playWordEasterEgg(word.word, cx, cy);
    if (!special) maybeSurprise(cx, cy);
    if (state.combo > 0 && state.combo % 5 === 0) {
      playCombo(state.combo);
      spawnStars(cx, cy, 48, 10);
    }
  }

  callHook("pulseCombo");
  callHook("updateHUD", true);
  events.emit("pet:cheer");
  callHook("showHeard", tr("heard.correct", { word: word.word }), "check");
  if (!golden) callHook("showPraise");

  if (state.mode === "rain") {
    if (state.cleared % 5 === 0) triggerRewardClear(rel);
    if (state.cleared % METEOR_EVERY === 0) startMeteor(cx, cy);
  } else if (state.mode === "fill" && state.settled.length === 0) {
    const fillFn = state.modeHooks?.completeFillRound || getHook("completeFillRound");
    if (typeof fillFn === "function") fillFn();
    else events.emit("mode:fillComplete");
  } else if (paint && state.settled.length === 0) {
    const paintFn = state.modeHooks?.completePaintRound || getHook("completePaintRound");
    if (typeof paintFn === "function") paintFn();
    else events.emit("mode:paintComplete");
  }
}

function handleEmojiBurst(detail) {
  if (!detail || !detail.emoji) return;
  spawnEmojiBurst({ emoji: detail.emoji }, detail.cx, detail.cy);
}

export function initFx(hooks) {
  if (hooks) setFxHooks(hooks);
  if (!emojiBurstUnsub) {
    emojiBurstUnsub = events.on("fx:emojiBurst", handleEmojiBurst);
  }
  return emojiBurstUnsub;
}

export function disposeFx() {
  if (emojiBurstUnsub) {
    emojiBurstUnsub();
    emojiBurstUnsub = null;
  }
  cancelPaintAnim();
}

(state.fxHooks ||= {}).explodeWord = explodeWord;
initFx();
