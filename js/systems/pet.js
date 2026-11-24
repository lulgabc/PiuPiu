import { state, els, PET_FALLBACK, REDUCED_MOTION, tr } from "../core/state.js";
import { events } from "../core/events.js";
import { getPetCollection } from "../core/storage.js";
import { playPetVoice, playPetStep, playPetLand, playPetPurr } from "./audio.js";

export const PET_GRAVITY = 560;
export const PET_SCALE = 1.5;
export const PAINT_HOP_INTERVAL = 2;
export const PET_DPR =
  typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;

const PET_MOVING = ["wander", "climb", "nuzzle", "chase", "startle"];
const PET_SPEED_FACTOR = {
  wander: 1,
  climb: 1.06,
  nuzzle: 1.5,
  chase: 1.7,
  startle: 1.9,
  nervous: 0.45,
};

function getPetsCatalog() {
  const g = typeof window !== "undefined" ? window : globalThis;
  return g && g.PiuPets && typeof g.PiuPets === "object" ? g.PiuPets : null;
}

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function getFieldSize() {
  return {
    w: (els.field && els.field.clientWidth) || 360,
    h: (els.field && els.field.clientHeight) || 480,
  };
}

export function randomPetDef() {
  const Pets = getPetsCatalog();
  if (Pets && Array.isArray(Pets.PETS) && Pets.PETS.length) {
    const owned = getPetCollection(state.userId || "_guest");
    const uncollected = Pets.PETS.filter((p) => p && p.id && !Object.hasOwn(owned, p.id));
    if (uncollected.length > 0) {
      const pool =
        uncollected.length > 1
          ? uncollected.filter((p) => p.id !== state.lastPetId)
          : uncollected;
      const pick = pool[Math.floor(Math.random() * pool.length)] || uncollected[0];
      state.lastPetId = pick.id;
      return pick;
    }
  }
  const def = Pets && typeof Pets.random === "function" ? Pets.random(state.lastPetId) : PET_FALLBACK;
  state.lastPetId = def.id;
  return def;
}

export function petDef(id) {
  const Pets = getPetsCatalog();
  const def = Pets && typeof Pets.byId === "function" ? Pets.byId(id) : null;
  return def || PET_FALLBACK;
}

export function petPalette() {
  if (typeof document === "undefined" || !document.documentElement) {
    return {
      theme: "candy",
      dark: false,
      card: "#fffdf8",
      border: "#fffdf8",
      active: "#ff6fae",
      ink: "#4d2b50",
    };
  }
  const root = document.documentElement;
  const styles = typeof getComputedStyle === "function" ? getComputedStyle(root) : null;
  const read = (name, fallback) => (styles ? styles.getPropertyValue(name).trim() || fallback : fallback);
  const theme = (root.dataset && root.dataset.theme) || "candy";
  return {
    theme,
    dark: theme === "bubblegum",
    card: read("--theme-card", "#fffdf8"),
    border: read("--theme-border", "#fffdf8"),
    active: read("--theme-active", "#ff6fae"),
    ink: read("--theme-card-ink", "#4d2b50"),
  };
}

export function refreshPetPalette() {
  state.petPalette = petPalette();
  for (const pet of state.pets) {
    if (pet && pet.renderer && typeof pet.renderer.refreshTheme === "function") {
      pet.renderer.refreshTheme(state.petPalette);
    }
  }
}

export function createMonsterRenderer(pet, def, dpr = PET_DPR) {
  const canvas = pet && pet.canvas;
  const ctx = canvas && typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
  if (!ctx || typeof Image !== "function") return null;

  const image = new Image();
  const base = new Image();
  let imageReady = false;
  let patches = null;
  let ready = false;
  let elapsed = 0;
  let dust = [];
  let nextBlink = 2.2 + Math.random() * 3.8;
  let blinkAt = null;
  let nextMouth = 3.2 + Math.random() * 4.5;
  let mouthAt = null;
  let current = "Idle";
  const phase = Math.random() * Math.PI * 2;
  const ink = def.ink || "#3a233e";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  function eyeBand() {
    const layout = def.eyeLayout || "row";
    const count = def.eyeCount || 2;
    const eyeX = def.eyeX == null ? 0.5 : def.eyeX;
    const eyeY = def.eyeY == null ? 0.34 : def.eyeY;
    const spread = def.eyeSpread == null ? 0.16 : def.eyeSpread;
    if (layout === "column") {
      const gap = def.eyeGap == null ? 0.14 : def.eyeGap;
      return { x: eyeX, y: eyeY, rx: 0.2, ry: 0.11 + ((count - 1) * gap) / 2 + 0.12 };
    }
    if (count === 1) return { x: eyeX, y: eyeY, rx: 0.17, ry: 0.16 };
    return { x: eyeX, y: eyeY, rx: spread + 0.14, ry: 0.15 };
  }

  function mouthBand() {
    return {
      x: def.mouthX == null ? 0.5 : def.mouthX,
      y: def.mouthY == null ? 0.57 : def.mouthY,
      rx: (def.mouthW == null ? 0.28 : def.mouthW) + 0.05,
      ry: (def.mouthH == null ? 0.13 : def.mouthH) + 0.05,
    };
  }

  function makeBandPatch(source, band) {
    if (typeof document === "undefined" || !source.width || !source.height) return null;
    const iw = source.width;
    const ih = source.height;
    const rx = Math.max(2, band.rx * iw);
    const ry = Math.max(2, band.ry * ih);
    const w = Math.ceil(rx * 2);
    const h = Math.ceil(ry * 2);
    const cx = band.x * iw;
    const cy = band.y * ih;
    const patch = document.createElement("canvas");
    patch.width = w;
    patch.height = h;
    const px = patch.getContext("2d");
    if (!px) return null;
    px.drawImage(source, w / 2 - cx, h / 2 - cy);
    px.globalCompositeOperation = "destination-in";
    px.save();
    px.translate(w / 2, h / 2);
    px.scale(w / 2, h / 2);
    const mask = px.createRadialGradient(0, 0, 0, 0, 0, 1);
    mask.addColorStop(0, "rgba(0,0,0,1)");
    mask.addColorStop(0.8, "rgba(0,0,0,1)");
    mask.addColorStop(1, "rgba(0,0,0,0)");
    px.beginPath();
    px.arc(0, 0, 1, 0, Math.PI * 2);
    px.fillStyle = mask;
    px.fill();
    px.restore();
    return { canvas: patch, x: cx - w / 2, y: cy - h / 2, w, h };
  }

  function buildPatches() {
    if (!imageReady) return;
    if (base.width && base.height) {
      const eye = makeBandPatch(base, eyeBand());
      const mouthBase = makeBandPatch(base, mouthBand());
      const mouthFace = makeBandPatch(image, mouthBand());
      patches = eye && mouthBase && mouthFace ? { eye, mouthBase, mouthFace } : null;
    }
    ready = true;
  }

  function spawnDust(x, y, count = 2) {
    for (let i = 0; i < count; i += 1) {
      if (dust.length > 10) dust.shift();
      dust.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 2,
        vx: (Math.random() - 0.5) * 18,
        vy: -10 - Math.random() * 14,
        life: 0.34 + Math.random() * 0.2,
        size: 1.2 + Math.random() * 2,
      });
    }
  }

  function closedEyes(fitW, fitH, ox, oy) {
    const count = def.eyeCount || 2;
    const layout = def.eyeLayout || "row";
    const eyeX = def.eyeX == null ? 0.5 : def.eyeX;
    const eyeY = def.eyeY == null ? 0.34 : def.eyeY;
    const spread = def.eyeSpread == null ? 0.16 : def.eyeSpread;
    const gap = def.eyeGap == null ? 0.14 : def.eyeGap;
    const points = [];
    if (layout === "column") {
      for (let i = 0; i < count; i += 1) {
        points.push({ x: eyeX, y: eyeY + (i - (count - 1) / 2) * gap });
      }
    } else if (count <= 1) {
      points.push({ x: eyeX, y: eyeY });
    } else {
      const step = spread / ((count - 1) / 2);
      for (let i = 0; i < count; i += 1) {
        points.push({ x: eyeX + (i - (count - 1) / 2) * step, y: eyeY });
      }
    }
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.5, fitW * 0.009);
    ctx.lineCap = "round";
    for (const point of points) {
      const cx = ox + point.x * fitW;
      const cy = oy + point.y * fitH;
      const half = fitW * (count === 1 ? 0.075 : 0.045);
      const drop = fitH * 0.018;
      ctx.beginPath();
      ctx.moveTo(cx - half, cy);
      ctx.quadraticCurveTo(cx, cy + drop, cx + half, cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(dt = 0) {
    const w = pet.drawW;
    const h = pet.drawH;
    const calm = REDUCED_MOTION;
    elapsed += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (dust.length) {
      for (const puff of dust) {
        const alpha = Math.max(0, puff.life / 0.5) * 0.2;
        ctx.beginPath();
        ctx.arc(puff.x, puff.y, puff.size + (0.5 - puff.life) * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 88, 108, ${alpha})`;
        ctx.fill();
      }
    }

    if (!ready) return;
    const iw = image.width;
    const ih = image.height;
    const fitH = h;
    const fitW = fitH * (iw / ih);
    const ox = (w - fitW) / 2;
    const oy = h - fitH;
    const b = pet.brain || {};
    const t = elapsed + phase;
    const energy = b.action === "cheer" || b.action === "nuzzle" ? 1 : b.moving ? 0.45 : 0;
    let sx = 1 + (calm ? 0.008 : 0.032 + 0.018 * energy) * Math.sin(t * 2.1);
    let sy = 1 - (calm ? 0.006 : 0.026 + 0.016 * energy) * Math.sin(t * 2.1 + 0.7);
    let shear = (calm ? 0.006 : 0.045 + 0.026 * energy) * Math.sin(t * 1.5 + phase * 0.4);
    let rot = (calm ? 0.004 : 0.02 + 0.012 * energy) * Math.sin(t * 1.1 + phase);
    let bob = calm ? 0 : Math.sin(t * 2) * 2.2;
    if (b.action === "nap") {
      sx = 1 + 0.008 * Math.sin(t * 1.1);
      sy = 1 + 0.012 * Math.sin(t * 1.1 + 1.2);
      shear = 0.004 * Math.sin(t * 0.9);
      rot = 0.004 * Math.sin(t * 0.8);
      bob = 0;
    }

    ctx.save();
    ctx.translate(w / 2, h + bob);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    ctx.transform(1, 0, shear, 1, 0, 0);
    ctx.translate(-w / 2, -h);
    ctx.drawImage(image, ox, oy, fitW, fitH);

    if (patches) {
      let blink = false;
      if (b.action === "nap") {
        blink = true;
      } else if (blinkAt != null) {
        if (elapsed - blinkAt < 0.18) blink = true;
        else blinkAt = null;
      } else if (elapsed > nextBlink) {
        blinkAt = elapsed;
        nextBlink = elapsed + 2.5 + Math.random() * 4;
        blink = true;
      }
      if (blink) {
        const p = patches.eye;
        const sx2 = fitW / iw;
        const sy2 = fitH / ih;
        ctx.drawImage(p.canvas, ox + p.x * sx2, oy + p.y * sy2, p.w * sx2, p.h * sy2);
        closedEyes(fitW, fitH, ox, oy);
      }

      let open = 0;
      if (b.action === "cheer" || b.action === "nuzzle" || pet.squeakTimer > 0) open = 1;
      else if (b.action === "chase") open = 0.55;
      if (!calm && elapsed > nextMouth) {
        mouthAt = elapsed;
        nextMouth = elapsed + 4 + Math.random() * 5;
      }
      if (mouthAt != null) {
        const age = elapsed - mouthAt;
        if (age >= 0.5) mouthAt = null;
        else open = Math.max(open, Math.sin((age / 0.5) * Math.PI));
      }
      if (b.action === "nap") open = 0;
      if (open > 0.02) {
        const mb = patches.mouthBase;
        const mf = patches.mouthFace;
        const sx2 = fitW / iw;
        const sy2 = fitH / ih;
        const dx = ox + mb.x * sx2;
        const dy = oy + mb.y * sy2;
        const dw = mb.w * sx2;
        const dh = mb.h * sy2;
        ctx.drawImage(mb.canvas, dx, dy, dw, dh);
        const scaleY = 1 + 0.2 * open;
        ctx.drawImage(mf.canvas, dx, dy + dh / 2 - (dh * scaleY) / 2, dw, dh * scaleY);
      }
    }
    ctx.restore();

    if (dust.length) {
      for (const puff of dust) {
        puff.x += puff.vx * dt;
        puff.y += puff.vy * dt;
        puff.vy += 30 * dt;
        puff.life -= dt;
      }
      dust = dust.filter((puff) => puff.life > 0);
    }

    if (b.action === "nap") current = "Sleep";
    else if (b.action === "cheer" || b.action === "nuzzle") current = "Happy";
    else if (pet.hopY < -2) current = "Jump";
    else if (b.moving) current = "Walk";
    else current = "Idle";
  }

  image.onload = () => {
    imageReady = true;
    buildPatches();
    draw(0);
  };
  base.onload = buildPatches;
  image.onerror = () => {
    pet.renderer = createPetRenderer(pet, def, dpr);
  };
  base.onerror = () => {
    patches = null;
    if (imageReady) ready = true;
  };
  image.src = def.image;
  base.src = def.base;

  return {
    draw,
    spawnDust,
    refreshTheme() {},
    getAction: () => current,
    kind: "monster",
    isMonster: true,
  };
}

export function createPetRenderer(pet, def, dpr = PET_DPR) {
  const ctx =
    pet && pet.canvas && typeof pet.canvas.getContext === "function"
      ? pet.canvas.getContext("2d")
      : null;
  if (!ctx) return null;
  let t = 0;
  let current = "Idle";
  function draw(dt = 0) {
    const w = pet.drawW;
    const h = pet.drawH;
    const b = pet.brain || {};
    t += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sx = pet.motion ? pet.motion.squashX : 1;
    const sy = pet.motion ? pet.motion.squashY : 1;
    const bob = REDUCED_MOTION ? 0 : Math.sin(t * 2.2) * 1.5;
    ctx.save();
    ctx.translate(w / 2, h - 2 + bob);
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.44, w * 0.34, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = def.body || "#f5a0bd";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = def.accent || "#fffdf8";
    ctx.stroke();
    ctx.font = `${Math.round(h * 0.56)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.emoji || "👾", 0, -h * 0.42);
    ctx.restore();
    current =
      b.action === "nap"
        ? "Sleep"
        : b.action === "cheer" || b.action === "nuzzle"
          ? "Happy"
          : pet.hopY < -2
            ? "Jump"
            : b.moving
              ? "Walk"
              : "Idle";
  }
  return {
    draw,
    spawnDust() {},
    refreshTheme() {},
    getAction: () => current,
    kind: "fallback",
    isMonster: false,
  };
}

export function createPetElement(def, w, h, drawW, drawH) {
  if (typeof document === "undefined") return { el: null, canvas: null };
  const el = document.createElement("div");
  el.className = "pet";
  el.dataset.pet = def.id;
  el.dataset.shape = def.shape || "round";
  el.style.setProperty("--pet-w", `${w}px`);
  el.style.setProperty("--pet-h", `${h}px`);

  const shadow = document.createElement("span");
  shadow.className = "pet-shadow";

  const canvas = document.createElement("canvas");
  canvas.className = "pet-canvas";
  canvas.width = Math.max(1, Math.round(drawW * PET_DPR));
  canvas.height = Math.max(1, Math.round(drawH * PET_DPR));
  canvas.style.width = `${drawW}px`;
  canvas.style.height = `${drawH}px`;

  const bubble = document.createElement("span");
  bubble.className = "pet-squeak";
  bubble.dataset.i18n = def.say;
  bubble.textContent = tr(def.say);

  el.append(shadow, canvas, bubble);
  return { el, canvas };
}

function petPickTarget(p, fieldW, bias = 0) {
  const min = p.drawW / 2 + 8;
  const max = Math.max(min + 24, fieldW - p.drawW / 2 - 10);
  let lo = min;
  let hi = max;
  if (!bias && state.settled.length > 1 && Math.random() < 0.72) {
    let pileLeft = Infinity;
    let pileRight = -Infinity;
    for (const settled of state.settled) {
      pileLeft = Math.min(pileLeft, settled.x);
      pileRight = Math.max(pileRight, settled.x + settled.w);
    }
    if (pileRight - pileLeft > 40) {
      lo = Math.max(min, pileLeft + 8);
      hi = Math.min(max, pileRight - 8);
      if (hi - lo < 36) {
        lo = min;
        hi = max;
      }
    }
  }
  let next = lo + Math.random() * (hi - lo);
  if (!bias && Math.abs(next - p.x) < 46) {
    const away = p.x < fieldW / 2 ? 1 : -1;
    next = p.x + away * (64 + Math.random() * 86);
  } else if (bias) {
    next = p.x + bias * (58 + Math.random() * 76);
  }
  return Math.min(max, Math.max(min, next));
}

function petGroundAt(x) {
  const fieldH = getFieldSize().h;
  let ground = fieldH - Math.max(10, Math.round(fieldH * 0.02));
  for (const settled of state.settled) {
    if (x >= settled.x - 4 && x <= settled.x + settled.w + 4 && settled.y < ground) {
      ground = Math.max(64, settled.y - 5);
    }
  }
  return Math.max(64, ground);
}

function paintCardTop(card) {
  return Math.max(64, card.y + 3);
}

function paintPetOverlap(p, card) {
  const centerX = card.x + card.w / 2;
  const halfW = (p.drawW || p.w || 70) * 0.46;
  const height = (p.h || 80) * 1.02;
  const left = centerX - halfW;
  const right = centerX + halfW;
  const top = card.y - height;
  const bottom = card.y - 2;
  let overlap = 0;
  for (const other of state.settled) {
    if (other === card) continue;
    const ox = Math.min(right, other.x + other.w) - Math.max(left, other.x);
    const oy = Math.min(bottom, other.y + other.h) - Math.max(top, other.y);
    if (ox > 0 && oy > 0) overlap += ox * oy;
  }
  return overlap;
}

function paintPickCard(p, exclude) {
  const cards = state.settled.filter(
    (card) => card && card.el && card.el.isConnected && card !== exclude,
  );
  if (!cards.length) return null;
  const visible = cards.filter((card) => card.y >= (p.h || 80) + 10);
  const roomy = visible.filter((card) => card.w >= 62);
  let pool = roomy.length ? roomy : visible.length ? visible : cards;
  const far = pool.filter((card) => Math.abs(card.x + card.w / 2 - p.x) > 52);
  if (far.length) pool = far;
  const scored = pool.map((card) => ({ card, overlap: paintPetOverlap(p, card) }));
  const least = Math.min(...scored.map((item) => item.overlap));
  const clear = scored.filter((item) => item.overlap <= least + 420);
  return clear[Math.floor(Math.random() * clear.length)].card;
}

function paintStartJump(p, card) {
  const st = p.paint;
  const fieldW = getFieldSize().w;
  const minX = p.drawW / 2 + 2;
  const maxX = Math.max(minX, fieldW - p.drawW / 2 - 2);
  const jitter = (Math.random() - 0.5) * Math.min(16, card.w * 0.24);
  const toX = Math.max(minX, Math.min(maxX, card.x + card.w / 2 + jitter));
  const toY = paintCardTop(card);
  const distance = Math.hypot(toX - p.x, toY - p.ground);
  st.card = card;
  st.target = card;
  st.phase = "jump";
  st.fromX = p.x;
  st.fromY = p.ground;
  st.toX = toX;
  st.toY = toY;
  st.t = 0;
  st.duration = REDUCED_MOTION ? 0.3 : Math.max(0.32, Math.min(0.64, 0.28 + distance / 1300));
  st.hop = REDUCED_MOTION ? 24 : 34 + Math.min(76, distance * 0.16);
  const headroom = Math.max(10, Math.min(p.ground, toY) - p.h - 10);
  st.hop = Math.min(st.hop, headroom);
  p.brain.action = "climb";
  p.brain.time = 0;
  p.brain.duration = st.duration;
  p.brain.mood = "excited";
  p.brain.lookTarget = { x: toX, y: toY };
  p.dir = toX >= p.x ? 1 : -1;
}

function paintDropToFloor(p) {
  const fieldH = getFieldSize().h;
  const floorY = fieldH - Math.max(10, Math.round(fieldH * 0.02));
  const st = p.paint;
  st.card = null;
  st.target = null;
  st.phase = "jump";
  st.fromX = p.x;
  st.fromY = p.ground;
  st.toX = p.x;
  st.toY = floorY;
  st.t = 0;
  st.duration = 0.34;
  st.hop = REDUCED_MOTION ? 14 : 22;
  p.brain.action = "climb";
  p.brain.time = 0;
  p.brain.duration = st.duration;
  p.brain.lookTarget = null;
}

export function updatePaintPet(p, dt) {
  const st = p.paint;
  if (!st) return;
  const fieldH = getFieldSize().h;
  const floorY = fieldH - Math.max(10, Math.round(fieldH * 0.02));

  if (st.phase === "jump") {
    if (st.target && !state.settled.includes(st.target)) {
      const next = paintPickCard(p, st.card);
      if (next) {
        paintStartJump(p, next);
        return;
      }
      st.target = null;
      st.fromX = p.x;
      st.fromY = p.ground;
      st.toX = p.x;
      st.toY = floorY;
      st.t = 0;
      st.duration = 0.3;
      st.hop = REDUCED_MOTION ? 12 : 20;
    }

    st.t += dt / Math.max(0.01, st.duration);
    const t = Math.min(1, st.t);
    const ease = t * t * (3 - 2 * t);
    p.x = st.fromX + (st.toX - st.fromX) * ease;
    p.ground = st.fromY + (st.toY - st.fromY) * ease;
    p.hopY = -Math.sin(Math.PI * t) * st.hop;
    p.brain.moving = true;
    p.brain.time += dt;
    p.brain.lookTarget = { x: st.toX, y: st.toY };

    if (t >= 1) {
      p.hopY = 0;
      p.x = st.toX;
      p.ground = st.toY;
      st.card = st.target;
      st.target = null;
      st.phase = "rest";
      st.timer = Math.max(0.4, PAINT_HOP_INTERVAL - st.duration);
      p.brain.action = "observe";
      p.brain.time = 0;
      p.brain.duration = st.timer;
      p.brain.mood = "happy";
      p.brain.moving = false;
      p.brain.lookTarget = null;
      p.landTimer = 0.18;
      if (p.el) {
        p.el.classList.remove("landed");
        p.el.classList.add("landed");
      }
      if (!REDUCED_MOTION) {
        if (p.renderer) p.renderer.spawnDust(p.drawW / 2, p.h - 4, 3);
        playPetLand();
      }
    }
    return;
  }

  st.timer -= dt;
  p.hopY = 0;
  p.brain.moving = false;
  p.brain.time += dt;

  if (st.card && !state.settled.includes(st.card)) {
    st.card = null;
    st.timer = 0;
  }

  if (st.card) {
    const fieldW = getFieldSize().w;
    const minX = p.drawW / 2 + 2;
    const maxX = Math.max(minX, fieldW - p.drawW / 2 - 2);
    const targetX = Math.max(minX, Math.min(maxX, st.card.x + st.card.w / 2));
    p.x += (targetX - p.x) * Math.min(1, dt * 7);
    p.ground += (paintCardTop(st.card) - p.ground) * Math.min(1, dt * 10);
    p.brain.action = "observe";
    p.brain.lookTarget =
      state.pointer && nowMs() - state.pointer.at < 2600
        ? { x: state.pointer.x, y: state.pointer.y }
        : null;
  } else {
    p.ground += (floorY - p.ground) * Math.min(1, dt * 8);
    p.brain.action = "observe";
    p.brain.lookTarget = null;
  }

  if (st.timer > 0) return;
  const next = paintPickCard(p, st.card);
  if (next) paintStartJump(p, next);
  else if (st.card) st.timer = 0.45;
  else paintDropToFloor(p);
}

function petApply(p) {
  if (!p || !p.el) return;
  const fieldW = getFieldSize().w;
  const minX = p.drawW / 2 + 2;
  const maxX = Math.max(minX, fieldW - p.drawW / 2 - 2);
  p.x = Math.min(maxX, Math.max(minX, p.x));
  const left = Math.round(p.x - p.w / 2);
  const top = Math.round(p.ground - p.h);
  p.el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  p.el.style.setProperty("--pet-face", p.dir > 0 ? "-1" : "1");
  p.el.style.setProperty("--pet-hop", `${p.hopY.toFixed(1)}px`);
  const lift = Math.min(1, Math.abs(p.hopY) / Math.max(40, p.def.hop));
  p.el.style.setProperty("--pet-shadow-scale", (1 - lift * 0.42).toFixed(2));
  p.el.style.setProperty("--pet-shadow-alpha", (0.86 - lift * 0.4).toFixed(2));
}

export function clearPets() {
  if (els.petLayer) els.petLayer.replaceChildren();
  state.pets = [];
  state.pet = null;
}

function petContext(p) {
  const { w: fieldW, h: fieldH } = getFieldSize();
  let pileTop = fieldH;
  for (const settled of state.settled) pileTop = Math.min(pileTop, settled.y);
  const danger = state.settled.length ? Math.max(0, Math.min(1, 1 - pileTop / fieldH)) : 0;
  let nearest = null;
  let best = Infinity;
  for (const word of state.words) {
    const cx = word.x + word.w / 2;
    const cy = word.y + word.h / 2;
    const dx = cx - p.x;
    const dy = cy - (p.ground - p.h / 2);
    const distance = dx * dx + dy * dy * 0.55;
    if (distance < best) {
      best = distance;
      nearest = word;
    }
  }
  const pointer = state.pointer && nowMs() - state.pointer.at < 3200 ? state.pointer : null;
  return { fieldW, fieldH, pileTop, danger, nearest, pointer, meteor: state.meteor };
}

export function petStartAction(p, action, ctx) {
  const b = p.brain;
  b.action = action;
  b.time = 0;
  b.duration = 1.4 + Math.random() * 1.4;
  b.moving = false;
  b.lookTarget = null;
  b.recent.unshift(action);
  if (b.recent.length > 4) b.recent.pop();

  if (action === "wander") {
    b.targetX = petPickTarget(p, ctx.fieldW);
    b.duration = 1.8 + Math.random() * 2.2;
    b.energy = Math.max(0, b.energy - 0.03);
  } else if (action === "observe") {
    b.targetX = p.x;
    b.lookTarget = ctx.pointer
      ? { x: ctx.pointer.x, y: ctx.pointer.y }
      : ctx.nearest
        ? { x: ctx.nearest.x + ctx.nearest.w / 2, y: ctx.nearest.y + ctx.nearest.h / 2 }
        : { x: p.x + p.dir * 90, y: ctx.fieldH * 0.42 };
    b.duration = 1.1 + Math.random() * 1.2;
    b.mood = "curious";
  } else if (action === "climb") {
    b.targetX = petPickTarget(p, ctx.fieldW);
    b.duration = 2.2 + Math.random() * 1.6;
    b.energy = Math.max(0, b.energy - 0.02);
  } else if (action === "sit") {
    b.targetX = p.x;
    b.duration = 2.2 + Math.random() * 2;
    b.energy = Math.min(1, b.energy + 0.16);
    b.mood = "calm";
  } else if (action === "groom") {
    b.targetX = p.x;
    b.duration = 1.6 + Math.random() * 1.2;
    b.energy = Math.min(1, b.energy + 0.1);
    b.mood = "calm";
  } else if (action === "nap") {
    b.targetX = p.x;
    b.duration = 4 + Math.random() * 3;
    b.energy = Math.min(1, b.energy + 0.4);
    b.mood = "sleepy";
  } else if (action === "nuzzle") {
    b.targetX = ctx.pointer ? ctx.pointer.x : p.x;
    b.duration = 1.1;
    b.energy = Math.max(0, b.energy - 0.02);
    b.mood = "happy";
  } else if (action === "nervous") {
    b.targetX = p.x;
    b.duration = 1.5;
    b.mood = "nervous";
  } else if (action === "chase") {
    b.targetX = ctx.meteor ? ctx.meteor.x + ctx.meteor.size / 2 : p.x;
    b.duration = 0.55;
    b.energy = Math.max(0, b.energy - 0.03);
    b.mood = "excited";
  }
}

export function petChooseAction(p, ctx) {
  const b = p.brain;
  const candidates = [
    ["wander", 0.45],
    ["observe", 0.34 + (ctx.nearest ? 0.18 : 0) + (ctx.pointer ? 0.2 : 0)],
    ["climb", state.settled.length > 2 && ctx.danger < 0.58 ? 0.55 : 0],
    ["sit", b.energy < 0.36 ? 0.85 : 0.06],
    ["groom", b.energy < 0.58 ? 0.26 : 0.04],
    ["nap", b.energy < 0.18 && b.idle > 6 ? 1.05 : 0],
    ["nuzzle", ctx.pointer ? 0.45 + b.sociability * 0.35 : 0],
    ["nervous", ctx.danger > 0.52 ? 0.9 + ctx.danger : 0],
    ["chase", ctx.meteor ? 1.3 : 0],
  ];
  let best = "wander";
  let bestScore = -Infinity;
  for (const [action, base] of candidates) {
    if (!base) continue;
    const recent = b.recent.indexOf(action);
    const penalty = recent === 0 ? 0.55 : recent === 1 ? 0.22 : 0;
    const score = base + Math.random() * 0.2 - penalty;
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  petStartAction(p, best, ctx);
}

export function petThink(p, dt) {
  const b = p.brain;
  b.time += dt;
  b.idle += dt;
  b.thinkTimer -= dt;
  if (b.thinkTimer > 0) return;
  b.thinkTimer = 0.18 + Math.random() * 0.12;

  const ctx = petContext(p);

  if (b.action === "startle" || b.action === "cheer") {
    if (b.time < b.duration) return;
  } else if (ctx.danger > 0.72 && b.action !== "nervous") {
    petStartAction(p, "nervous", ctx);
    return;
  } else if (ctx.meteor && b.action !== "chase") {
    petStartAction(p, "chase", ctx);
    return;
  } else if (b.action === "wander" && Math.abs(b.targetX - p.x) < 4) {
    b.time = b.duration;
  } else if (b.time < b.duration) {
    if (b.action === "observe") {
      if (ctx.pointer) b.lookTarget = { x: ctx.pointer.x, y: ctx.pointer.y };
      else if (ctx.nearest) {
        b.lookTarget = {
          x: ctx.nearest.x + ctx.nearest.w / 2,
          y: ctx.nearest.y + ctx.nearest.h / 2,
        };
      }
    }
    return;
  }

  petChooseAction(p, ctx);
}

function petUpdateMotion(p, dt, moving) {
  const m = p.motion;
  const b = p.brain;
  const nap = b.action === "nap";
  m.action = b.action;
  m.breathPhase += dt * (nap ? 1.2 : 2.3);
  m.breath = Math.sin(m.breathPhase) * (nap ? 0.012 : 0.018);
  m.tailPhase += dt * (nap ? 1.1 : 3.1);

  if (moving) {
    m.gaitPhase += dt * (7.5 + p.def.speed * 0.055);
    m.gait = Math.sin(m.gaitPhase);
  } else {
    m.gait *= Math.exp(-dt * 9);
  }
  const stepSign = Math.sign(m.gait);
  if (moving && stepSign !== m.lastStepSign && Math.abs(m.gait) > 0.55) {
    m.lastStepSign = stepSign;
    if (!REDUCED_MOTION) {
      if (p.renderer) p.renderer.spawnDust(p.drawW / 2 + stepSign * p.def.w * 0.2, p.h - 5, 1);
      playPetStep();
    }
  }

  let lookX = 0;
  let lookY = 0;
  if (b.lookTarget) {
    lookX = Math.max(-1, Math.min(1, (b.lookTarget.x - p.x) / (p.def.w * 2.2)));
    lookY = Math.max(-1, Math.min(1, (b.lookTarget.y - (p.ground - p.def.h)) / (p.def.h * 2.4)));
  } else if (b.action === "nervous") {
    lookY = -0.4;
  }
  if (
    (b.action === "observe" ||
      b.action === "nuzzle" ||
      b.action === "nervous" ||
      b.action === "chase") &&
    b.lookTarget &&
    Math.abs(b.lookTarget.x - p.x) > 8
  ) {
    p.dir = b.lookTarget.x > p.x ? 1 : -1;
  }
  m.lookX += (lookX - m.lookX) * Math.min(1, dt * 5);
  m.lookY += (lookY - m.lookY) * Math.min(1, dt * 5);

  let sx = 1 + m.breath;
  let sy = 1 - m.breath;
  if (p.landTimer > 0) {
    const q = p.landTimer / 0.18;
    sx += 0.12 * q;
    sy -= 0.14 * q;
  }
  if (b.action === "cheer") {
    const q = Math.sin(Math.min(1, b.time / Math.max(0.01, b.duration)) * Math.PI);
    sy += q * 0.08;
    sx -= q * 0.04;
  }
  if (nap) sy *= 0.94;
  if (b.action === "sit") {
    sy *= 0.97;
    sx *= 1.01;
  }
  if (b.action === "nervous") {
    sy *= 0.93;
    sx *= 1.03;
  }
  if (b.action === "startle") {
    sy *= 0.95;
    sx *= 1.04;
  }
  m.squashX = sx;
  m.squashY = sy;
  m.tilt = m.lookX * 0.09 + p.dir * 0.014 + (b.action === "nervous" ? 0.04 : 0);
  m.bob =
    -Math.abs(m.gait) * 1.9 +
    (nap ? p.def.h * 0.08 : 0) +
    (b.action === "sit" ? p.def.h * 0.02 : 0) +
    (b.action === "nervous" ? p.def.h * 0.03 : 0) +
    Math.sin(m.breathPhase) * 0.35;
  m.footL = Math.max(0, Math.sin(m.gaitPhase)) * (moving ? 3 : 0);
  m.footR = Math.max(0, Math.sin(m.gaitPhase + Math.PI)) * (moving ? 3 : 0);

  let pawL = 0;
  let pawR = 0;
  if (moving) {
    pawL = Math.max(0, Math.sin(m.gaitPhase + Math.PI)) * 2.2;
    pawR = Math.max(0, Math.sin(m.gaitPhase)) * 2.2;
  }
  if (b.action === "cheer") {
    const q = Math.sin(Math.min(1, b.time / Math.max(0.01, b.duration)) * Math.PI);
    pawL = q * p.def.h * 0.38;
    pawR = q * p.def.h * 0.38;
  } else if (b.action === "groom") {
    pawR = p.def.h * 0.22;
  } else if (b.action === "nuzzle") {
    pawL = 2.5;
    pawR = 2.5;
  } else if (b.action === "sit") {
    pawL = 2.2;
    pawR = 2.2;
  } else if (b.action === "nervous" || b.action === "startle") {
    pawL = 1.6;
    pawR = 1.6;
  }
  m.pawL = pawL;
  m.pawR = pawR;

  if (b.action === "cheer" && !REDUCED_MOTION) {
    const progress = Math.min(1, b.time / Math.max(0.01, b.duration));
    m.spin = Math.sin(progress * Math.PI * 2) * 0.32;
  } else {
    m.spin *= Math.exp(-dt * 12);
  }
}

export function updatePet(p, dt) {
  if (!p || !p.el || !els.field) return;
  const fieldW = els.field.clientWidth;
  const fieldH = els.field.clientHeight;
  if (!fieldW || !fieldH) return;

  if (p.squeakCooldown > 0) p.squeakCooldown = Math.max(0, p.squeakCooldown - dt);
  if (p.startleCooldown > 0) p.startleCooldown = Math.max(0, p.startleCooldown - dt);
  if (p.squeakTimer > 0) {
    p.squeakTimer -= dt;
    if (p.squeakTimer <= 0) p.el.classList.remove("squeaking");
  }
  if (p.landTimer > 0) {
    p.landTimer = Math.max(0, p.landTimer - dt);
    if (p.landTimer <= 0) p.el.classList.remove("landed");
  }

  if (state.mode === "paint") {
    updatePaintPet(p, dt);
    petUpdateMotion(p, dt, p.brain.moving);
    petApply(p);
    if (p.renderer) p.renderer.draw(dt);
    return;
  }

  petThink(p, dt);

  const action = p.brain.action;
  const movingAction = PET_MOVING.includes(action);
  let moving = false;
  if (movingAction) {
    const dx = p.brain.targetX - p.x;
    if (Math.abs(dx) > 2.5) {
      p.dir = dx > 0 ? 1 : -1;
      const speed =
        p.def.speed * (PET_SPEED_FACTOR[action] || 1) * (REDUCED_MOTION ? 0.55 : 1);
      p.x += p.dir * speed * dt;
      moving = true;
      p.brain.energy = Math.max(0, p.brain.energy - dt * 0.012);
      p.brain.idle = Math.max(0, p.brain.idle - dt * 2);
    } else if (action === "wander" || action === "nuzzle") {
      p.brain.time = p.brain.duration;
    }
  }
  p.brain.moving = moving;

  const ground = petGroundAt(p.x);
  if (ground < p.ground - 5 && p.hopY === 0 && p.hopV === 0) {
    p.hopV = -Math.min(p.def.hop, Math.abs(ground - p.ground) * 3.4 + 70);
  }
  const ease = Math.min(1, dt * (ground < p.ground ? 18 : 10));
  p.ground += (ground - p.ground) * ease;

  const canIdleHop = action === "wander" || action === "climb" || action === "observe";
  p.nextHop -= dt;
  if (p.nextHop <= 0) {
    if (canIdleHop && p.hopY === 0 && !REDUCED_MOTION && Math.random() < 0.55) {
      p.hopV = -(p.def.hop * 0.55 + Math.random() * 30);
    }
    const [hopMin, hopMax] = p.def.hopEvery;
    p.nextHop = hopMin + Math.random() * (hopMax - hopMin);
  }

  if (p.hopY < 0 || p.hopV < 0) {
    p.hopV += PET_GRAVITY * dt;
    p.hopY += p.hopV * dt;
    if (p.hopY >= 0) {
      p.hopY = 0;
      p.hopV = 0;
      p.landTimer = 0.18;
      p.el.classList.remove("landed");
      p.el.classList.add("landed");
      if (!REDUCED_MOTION) {
        if (p.renderer) p.renderer.spawnDust(p.drawW / 2, p.h - 4, 3);
        playPetLand();
      }
    }
  }

  petUpdateMotion(p, dt, moving);
  petApply(p);
  if (p.renderer) p.renderer.draw(dt);
}

export function updatePets(dt) {
  for (const pet of state.pets) updatePet(pet, dt);
  state.pet = state.pets[0] || null;
}

export function introducePet(pet) {
  const bubble = pet && pet.el && pet.el.querySelector(".pet-squeak");
  if (!bubble) return;
  bubble.textContent = tr(`pet.name.${pet.id}`);
  pet.el.classList.add("squeaking");
  setTimeout(() => {
    if (!pet.el || !pet.el.isConnected) return;
    pet.el.classList.remove("squeaking");
    bubble.textContent = tr(pet.def.say);
  }, 2200);
}

export function resetPets(forcedDef) {
  clearPets();
  if (!els.petLayer || typeof document === "undefined") return;
  state.petPalette = petPalette();
  const def = forcedDef || randomPetDef();
  state.lastPetId = def.id;
  const w = Math.round(def.w * PET_SCALE);
  const h = Math.round(def.h * PET_SCALE);
  const drawW = Math.round(w * 1.38);
  const drawH = h;
  const { el, canvas } = createPetElement(def, w, h, drawW, drawH);
  els.petLayer.appendChild(el);
  const accessory = null;
  const { w: fieldW, h: fieldH } = getFieldSize();
  const minX = drawW / 2 + 2;
  const maxX = Math.max(minX, fieldW - drawW / 2 - 2);
  const x = Math.min(maxX, Math.max(minX, fieldW * (0.26 + Math.random() * 0.48)));
  const pet = {
    id: def.id,
    def,
    accessory,
    el,
    canvas,
    renderer: null,
    w,
    h,
    drawW,
    drawH,
    x,
    dir: Math.random() < 0.5 ? -1 : 1,
    ground: Math.max(64, fieldH - 10),
    hopY: 0,
    hopV: 0,
    squeakCooldown: 0,
    startleCooldown: 0,
    squeakTimer: 0,
    landTimer: 0,
    nextHop: 2 + Math.random() * 3,
    brain: {
      action: "observe",
      time: 0,
      duration: 1.2,
      thinkTimer: 0,
      targetX: x,
      lookTarget: { x: fieldW / 2, y: fieldH * 0.4 },
      recent: [],
      energy: 0.62 + Math.random() * 0.34,
      sociability: 0.35 + Math.random() * 0.55,
      idle: 0,
      mood: "curious",
      moving: false,
    },
    motion: {
      action: "observe",
      breathPhase: Math.random() * Math.PI * 2,
      breath: 0,
      gaitPhase: Math.random() * Math.PI * 2,
      gait: 0,
      lastStepSign: 0,
      tailPhase: Math.random() * Math.PI * 2,
      lookX: 0,
      lookY: 0,
      tilt: 0,
      spin: 0,
      bob: 0,
      squashX: 1,
      squashY: 1,
      footL: 0,
      footR: 0,
      pawL: 0,
      pawR: 0,
    },
  };
  pet.paint = {
    card: null,
    target: null,
    phase: "rest",
    timer: PAINT_HOP_INTERVAL - 0.4,
    fromX: pet.x,
    fromY: pet.ground,
    toX: pet.x,
    toY: pet.ground,
    t: 0,
    duration: 0.4,
    hop: 0,
  };
  pet.renderer = createMonsterRenderer(pet, def, PET_DPR);
  if (!pet.renderer) {
    pet.renderer = createPetRenderer(pet, def, PET_DPR);
  }
  if (!pet.renderer) {
    const body = document.createElement("span");
    body.className = "pet-body";
    body.textContent = def.emoji;
    el.appendChild(body);
    canvas.remove();
  }
  state.pets = [pet];
  state.pet = pet;
  petApply(pet);
  introducePet(pet);
  events.emit("pet:spawned", { pet, def });
}

export function petSqueak(pet, force = false) {
  if (!pet || !pet.el || state.phase !== "playing") return;
  if (!force && pet.squeakCooldown > 0) return;
  pet.squeakCooldown = 1.8 + Math.random() * 2.2;
  pet.squeakTimer = 1.15;
  pet.el.classList.remove("squeaking");
  pet.el.classList.add("squeaking");
  playPetVoice(pet.id);
}

export function petHop(p, power) {
  if (!p || p.hopY < 0 || REDUCED_MOTION) return;
  p.hopV = -Math.max(40, power);
}

export function petStartle(x) {
  if (state.phase !== "playing") return;
  const fieldW = getFieldSize().w;
  let closest = null;
  let closestDistance = Infinity;
  for (const p of state.pets) {
    const nx = Number.isFinite(x) ? x : p.x;
    const dx = p.x - nx;
    if (Math.abs(dx) > 190) continue;
    p.brain.action = "startle";
    p.brain.time = 0;
    p.brain.duration = 0.9;
    p.brain.targetX = petPickTarget(p, fieldW, dx >= 0 ? 1 : -1);
    if (p.startleCooldown > 0) continue;
    p.startleCooldown = 1.3 + Math.random() * 1.2;
    p.brain.mood = "scared";
    p.brain.energy = Math.max(0, p.brain.energy - 0.04);
    p.brain.idle = 0;
    petHop(p, p.def.hop * 0.68);
    if (Math.abs(dx) < closestDistance) {
      closest = p;
      closestDistance = Math.abs(dx);
    }
  }
  if (closest && closest.squeakCooldown <= 0) petSqueak(closest);
}

export function petCheer() {
  if (state.phase !== "playing") return;
  const milestone = state.combo > 0 && state.combo % 5 === 0;
  let cheerPet = null;
  for (const p of state.pets) {
    if (!milestone && Math.random() > 0.38) continue;
    if (p.brain.action === "startle") continue;
    p.brain.action = "cheer";
    p.brain.time = 0;
    p.brain.duration = 0.95;
    p.brain.lookTarget = null;
    p.brain.mood = "happy";
    p.brain.energy = Math.min(1, p.brain.energy + 0.04);
    p.brain.idle = 0;
    petHop(p, p.def.hop * (milestone ? 0.95 : 0.62));
    if (milestone && !cheerPet) cheerPet = p;
  }
  if (cheerPet && cheerPet.squeakCooldown <= 0) petSqueak(cheerPet, true);
}

export function petNuzzle(x) {
  if (state.phase !== "playing") return;
  const fieldW = getFieldSize().w;
  for (const p of state.pets) {
    if (p.brain.action === "startle" || p.brain.action === "cheer") continue;
    const nx = Number.isFinite(x) ? x : p.x;
    p.brain.action = "nuzzle";
    p.brain.time = 0;
    p.brain.duration = 1.15;
    p.brain.targetX = Math.min(fieldW - p.drawW / 2 - 2, Math.max(p.drawW / 2 + 2, nx));
    p.brain.lookTarget = { x: nx, y: p.ground - p.h * 0.4 };
    p.brain.mood = "happy";
    p.brain.idle = 0;
    petHop(p, p.def.hop * 0.38);
  }
}

export function petMeteorStart() {
  if (state.phase !== "playing") return;
  const fieldW = getFieldSize().w;
  for (const p of state.pets) {
    p.brain.action = "chase";
    p.brain.time = 0;
    p.brain.duration = 0.6;
    p.brain.targetX = state.meteor
      ? Math.max(
          p.drawW / 2 + 2,
          Math.min(fieldW - p.drawW / 2 - 2, state.meteor.x + state.meteor.size / 2),
        )
      : p.x;
    p.brain.lookTarget = state.meteor
      ? { x: state.meteor.x + state.meteor.size / 2, y: state.meteor.y + state.meteor.size / 2 }
      : null;
    p.brain.mood = "excited";
  }
}

export function petMeteorFinish() {
  if (state.phase !== "playing") return;
  for (const p of state.pets) {
    p.brain.action = "cheer";
    p.brain.time = 0;
    p.brain.duration = 0.9;
    p.brain.lookTarget = null;
    p.brain.mood = "happy";
    petHop(p, p.def.hop * 0.8);
  }
}

export function petInfo(pet) {
  return {
    id: pet.id,
    accessory: pet.accessory ? pet.accessory.id : null,
    renderer: pet.renderer && pet.renderer.kind ? pet.renderer.kind : "canvas",
    spriteAction: pet.renderer && pet.renderer.getAction ? pet.renderer.getAction() : null,
    x: Math.round(pet.x),
    y: Math.round(pet.ground + pet.hopY - pet.h),
    ground: Math.round(pet.ground),
    dir: pet.dir,
    hop: Math.round(pet.hopY),
    action: pet.brain.action,
    mood: pet.brain.mood,
    moving: Boolean(pet.brain.moving),
    squeaking: Boolean(pet.el && pet.el.classList.contains("squeaking")),
    paintCard: pet.paint && pet.paint.card ? pet.paint.card.word : null,
    paintPhase: pet.paint ? pet.paint.phase : null,
  };
}

let petEventsBound = false;
let petLayerBoundEl = null;

function onPetCheerEvent() {
  petCheer();
}

function onPetMeteorStartEvent() {
  petMeteorStart();
}

function onPetMeteorFinishEvent() {
  petMeteorFinish();
}

function onPetStartleEvent(detail) {
  petStartle(detail && detail.x);
}

function onPetNuzzleEvent(detail) {
  petNuzzle(detail && detail.x);
}

function onPetPointerDown(event) {
  const node =
    event.target && typeof event.target.closest === "function"
      ? event.target.closest(".pet")
      : null;
  if (!node) return;
  event.stopPropagation();
  event.preventDefault();
  if (state.phase !== "playing") return;
  const pet = state.pets.find((item) => item.el === node);
  if (!pet) return;
  petSqueak(pet, true);
  petNuzzle(pet.x);
  playPetPurr();
  if (pet.hopY === 0) petHop(pet, pet.def.hop * 0.8);
}

export function initPetSystem() {
  if (!petEventsBound) {
    petEventsBound = true;
    events.on("pet:cheer", onPetCheerEvent);
    events.on("pet:meteorStart", onPetMeteorStartEvent);
    events.on("pet:meteorFinish", onPetMeteorFinishEvent);
    events.on("pet:startle", onPetStartleEvent);
    events.on("pet:nuzzle", onPetNuzzleEvent);
  }
  if (els.petLayer && petLayerBoundEl !== els.petLayer) {
    if (petLayerBoundEl) petLayerBoundEl.removeEventListener("pointerdown", onPetPointerDown);
    els.petLayer.addEventListener("pointerdown", onPetPointerDown);
    petLayerBoundEl = els.petLayer;
  }
}

initPetSystem();
