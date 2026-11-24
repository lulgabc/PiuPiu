(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * PiuPiu · PixiJS ambient engine
   * Powers the in-game field and the standalone preview. All visuals are
   * drawn procedurally with canvas gradients, soft sprites and vectors.
   * No emoji assets are used.
   * ------------------------------------------------------------------ */

  const demoStage = document.getElementById("stage");
  const gameMount = document.getElementById("pixiAmbient");
  const stageEl = demoStage || gameMount;
  if (!stageEl) return;

  const IS_DEMO = Boolean(demoStage);
  const params = new URLSearchParams(window.location.search);
  const DEBUG = params.has("debug");

  const copyEl = IS_DEMO ? document.getElementById("sceneCopy") : null;
  const kickerEl = IS_DEMO ? document.getElementById("sceneKicker") : null;
  const titleEl = IS_DEMO ? document.getElementById("sceneTitle") : null;
  const descEl = IS_DEMO ? document.getElementById("sceneDesc") : null;
  const dockEl = IS_DEMO ? document.getElementById("dock") : null;
  const autoBtn = IS_DEMO ? document.getElementById("autoBtn") : null;
  const autoLabel = IS_DEMO ? document.getElementById("autoLabel") : null;

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COARSE = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
  const SMALL_SCREEN =
    Math.min(window.innerWidth || 9999, window.innerHeight || 9999) < 760;
  const LOW_POWER = params.get("lowpower") === "1" || COARSE || SMALL_SCREEN;
  const QUALITY = LOW_POWER ? 0.55 : 1;
  const MAX_FPS = LOW_POWER ? 30 : 60;
  const MAX_DPR = LOW_POWER ? 1.3 : 2;
  const AUTO_DELAY = IS_DEMO ? 16000 : 22000;

  function qcount(count, min = 4) {
    return Math.max(min, Math.round(count * QUALITY));
  }

  if (!IS_DEMO && REDUCED) {
    stageEl.style.display = "none";
    return;
  }

  const SCENES = {
    spring: {
      label: "春 · 花雨",
      kicker: "SPRING",
      title: "春日花雨",
      desc: "樱瓣、晨光与微风的呼吸",
      color: "#ff9ec4",
    },
    summer: {
      label: "夏 · 深海",
      kicker: "SUMMER",
      title: "夏夜深海",
      desc: "水母、气泡与月光下的深流",
      color: "#4fe3ff",
    },
    autumn: {
      label: "秋 · 落叶",
      kicker: "AUTUMN",
      title: "秋林落叶",
      desc: "暖光、薄雾与慢慢下坠的银杏",
      color: "#ffa65c",
    },
    winter: {
      label: "冬 · 极光",
      kicker: "WINTER",
      title: "冬夜极光",
      desc: "星河、雪幕与流动的极光",
      color: "#7ef2c8",
    },
    egypt: {
      label: "埃及 · 金沙",
      kicker: "EGYPT",
      title: "尼罗河落日",
      desc: "金字塔、沙丘与金色尘埃",
      color: "#f0b45a",
    },
    greece: {
      label: "希腊 · 爱琴海",
      kicker: "GREECE",
      title: "爱琴海神殿",
      desc: "月光、石柱与橄榄叶",
      color: "#8fd8ff",
    },
    rome: {
      label: "罗马 · 余晖",
      kicker: "ROME",
      title: "罗马余晖",
      desc: "拱门、火炬与帝国晚霞",
      color: "#ff8a6b",
    },
    space: {
      label: "太空 · 星海",
      kicker: "SPACE",
      title: "深空星海",
      desc: "星云、行星与静谧深空",
      color: "#b69cff",
    },
  };

  const ORDER = ["spring", "summer", "autumn", "winter", "egypt", "greece", "rome", "space"];
  const RAINBOW = [
    0xff9ec6, 0xffb2d4, 0xffc7e0, 0xff86b8, 0xffe0ef, 0xfff1f8,
  ];
  const AUTUMN_LEAVES = [
    0xffbb63, 0xff8a4e, 0xdc5a38, 0xffd28a, 0xc8472f, 0xf0a53d,
  ];

  const app = new PIXI.Application();
  const TEX = {};
  const tweens = [];
  const alive = [];

  let W = 0;
  let H = 0;
  let sceneRoot = null;
  let vignette = null;
  let grain = null;
  let current = null;
  let currentKey = null;
  let autoOn = false;
  let roundsStarted = 0;
  let autoTimer = 0;
  let copyTimer = 0;
  let booted = false;
  let bootStarted = false;
  let desiredRunning = IS_DEMO;
  let contextLost = false;

  function syncRunningAttr() {
    if (stageEl) {
      stageEl.dataset.running = String(booted && desiredRunning && !contextLost);
    }
  }

  function ensureBoot() {
    if (bootStarted) return;
    bootStarted = true;
    boot().catch((error) => {
      console.warn("PiuPiu Pixi ambient unavailable:", error);
      syncRunningAttr();
      if (IS_DEMO) {
        stageEl.innerHTML =
          '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#93a0c0;font-size:13px">PixiJS 初始化失败，请刷新重试</div>';
      } else {
        stageEl.style.display = "none";
      }
    });
  }

  function setRunning(run) {
    const next = Boolean(run);
    if (next === desiredRunning) {
      syncRunningAttr();
      return;
    }
    desiredRunning = next;
    if (next) ensureBoot();
    if (!booted || contextLost) {
      syncRunningAttr();
      return;
    }
    if (desiredRunning) {
      app.ticker.start();
    } else {
      app.renderer.render(app.stage);
      app.ticker.stop();
    }
    syncRunningAttr();
  }

  const publicApi = {
    setRunning,
    isRunning: () => booted && desiredRunning && !contextLost,
    get running() {
      return booted && desiredRunning && !contextLost;
    },
    get lowPower() {
      return LOW_POWER;
    },
  };
  window.PiuAmbient = publicApi;
  window.PiuPixiAmbient = publicApi;
  syncRunningAttr();

  function seasonForMonth() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 7) return "summer";
    if (month >= 8 && month <= 10) return "autumn";
    return "winter";
  }

  /* ----------------------------- helpers ---------------------------- */

  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIn = (t) => t * t * t;

  function rngFor(seed) {
    let s = seed >>> 0;
    return function random() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function debounce(ms, fn) {
    let timer = 0;
    return function debounced() {
      window.clearTimeout(timer);
      timer = window.setTimeout(fn, ms);
    };
  }

  function tween(obj, prop, to, duration, ease, onDone) {
    tweens.push({
      obj,
      prop,
      from: obj[prop],
      to,
      duration,
      elapsed: 0,
      ease: ease || easeOut,
      onDone,
    });
  }

  function updateTweens(dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.elapsed += dt;
      const k = Math.min(1, tw.elapsed / tw.duration);
      tw.obj[tw.prop] = tw.from + (tw.to - tw.from) * tw.ease(k);
      if (k >= 1) {
        tweens.splice(i, 1);
        if (tw.onDone) tw.onDone();
      }
    }
  }

  function killTweens(obj) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      if (tweens[i].obj === obj) tweens.splice(i, 1);
    }
  }

  /* ---------------------------- textures ---------------------------- */

  function makeTexture(w, h, draw) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    draw(ctx, w, h);
    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = "linear";
    return texture;
  }

  function buildTextures() {
    TEX.glow = makeTexture(256, 256, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.22, "rgba(255,255,255,.72)");
      g.addColorStop(0.52, "rgba(255,255,255,.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });

    TEX.snow = makeTexture(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.38, "rgba(244,251,255,.92)");
      g.addColorStop(0.72, "rgba(226,244,255,.26)");
      g.addColorStop(1, "rgba(226,244,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });

    TEX.petal = makeTexture(128, 128, (ctx) => {
      ctx.translate(64, 64);
      ctx.beginPath();
      ctx.moveTo(0, -56);
      ctx.bezierCurveTo(44, -46, 52, 8, 0, 58);
      ctx.bezierCurveTo(-52, 8, -44, -46, 0, -56);
      ctx.closePath();
      const g = ctx.createRadialGradient(0, -6, 4, 0, 0, 66);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.55, "rgba(250,247,250,.98)");
      g.addColorStop(1, "rgba(212,204,212,.82)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.4)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -42);
      ctx.quadraticCurveTo(5, 2, 0, 46);
      ctx.strokeStyle = "rgba(160,140,160,.2)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    TEX.leafGinkgo = makeTexture(128, 128, (ctx) => {
      ctx.translate(64, 70);
      ctx.beginPath();
      ctx.moveTo(0, 46);
      ctx.bezierCurveTo(-26, 40, -48, 8, -50, -22);
      ctx.bezierCurveTo(-50, -44, -28, -46, -12, -40);
      ctx.quadraticCurveTo(-6, -34, 0, -26);
      ctx.quadraticCurveTo(6, -34, 12, -40);
      ctx.bezierCurveTo(28, -46, 50, -44, 50, -22);
      ctx.bezierCurveTo(48, 8, 26, 40, 0, 46);
      ctx.closePath();
      const g = ctx.createRadialGradient(0, 24, 6, 0, 0, 62);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.55, "rgba(253,250,247,.98)");
      g.addColorStop(1, "rgba(212,204,200,.84)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.24)";
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.beginPath();
      const tips = [
        [-40, -16], [-27, -31], [-12, -36], [0, -23],
        [12, -36], [27, -31], [40, -16],
      ];
      for (const [x, y] of tips) {
        ctx.moveTo(0, 40);
        ctx.quadraticCurveTo(x * 0.42, y * 0.2 + 20, x, y);
      }
      ctx.strokeStyle = "rgba(150,112,88,.2)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 44);
      ctx.lineTo(0, 64);
      ctx.strokeStyle = "rgba(120,80,50,.34)";
      ctx.lineWidth = 2.2;
      ctx.stroke();
    });

    TEX.leafOval = makeTexture(64, 128, (ctx) => {
      ctx.translate(32, 64);
      ctx.beginPath();
      ctx.moveTo(0, -52);
      ctx.bezierCurveTo(30, -30, 30, 30, 0, 56);
      ctx.bezierCurveTo(-30, 30, -30, -30, 0, -52);
      ctx.closePath();
      const g = ctx.createRadialGradient(0, -4, 4, 0, 0, 64);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.55, "rgba(253,250,248,.98)");
      g.addColorStop(1, "rgba(214,207,205,.84)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -46);
      ctx.lineTo(0, 44);
      ctx.strokeStyle = "rgba(150,110,90,.26)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 52);
      ctx.lineTo(0, 64);
      ctx.strokeStyle = "rgba(120,80,50,.35)";
      ctx.lineWidth = 2.4;
      ctx.stroke();
    });

    TEX.bubble = makeTexture(64, 64, (ctx, w, h) => {
      const g = ctx.createRadialGradient(32, 32, 8, 32, 32, 30);
      g.addColorStop(0, "rgba(150,220,255,0)");
      g.addColorStop(0.7, "rgba(186,238,255,.16)");
      g.addColorStop(0.87, "rgba(232,250,255,.88)");
      g.addColorStop(1, "rgba(170,226,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(32, 32, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.beginPath();
      ctx.arc(22, 20, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    TEX.ray = makeTexture(256, 512, (ctx, w, h) => {
      const v = ctx.createLinearGradient(0, 0, 0, h);
      v.addColorStop(0, "rgba(255,255,255,.9)");
      v.addColorStop(0.4, "rgba(255,255,255,.26)");
      v.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "destination-in";
      const s = ctx.createLinearGradient(0, 0, w, 0);
      s.addColorStop(0, "rgba(0,0,0,0)");
      s.addColorStop(0.5, "rgba(0,0,0,1)");
      s.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, w, h);
    });

    TEX.wave = makeTexture(1024, 256, (ctx, w, h) => {
      ctx.lineCap = "round";
      for (let band = 0; band < 5; band++) {
        const base = 38 + band * 43;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = base + Math.sin(x * 0.012 + band * 1.7) * 9 + Math.sin(x * 0.031 + band) * 3;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,255,255,${0.14 + band * 0.03})`;
        ctx.lineWidth = 2.4;
        ctx.shadowColor = "rgba(255,255,255,.8)";
        ctx.shadowBlur = 12;
        ctx.stroke();
      }
    });

    TEX.aurora = makeTexture(64, 256, (ctx, w, h) => {
      const v = ctx.createLinearGradient(0, 0, 0, h);
      v.addColorStop(0, "rgba(255,255,255,0)");
      v.addColorStop(0.18, "rgba(255,255,255,.9)");
      v.addColorStop(0.55, "rgba(255,255,255,.35)");
      v.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "destination-in";
      const s = ctx.createLinearGradient(0, 0, w, 0);
      s.addColorStop(0, "rgba(0,0,0,0)");
      s.addColorStop(0.5, "rgba(0,0,0,1)");
      s.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, w, h);
    });

    TEX.meteor = makeTexture(128, 8, (ctx, w, h) => {
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, "rgba(150,200,255,0)");
      gradient.addColorStop(0.72, "rgba(200,235,255,.55)");
      gradient.addColorStop(1, "rgba(255,255,255,1)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 2, w, 4);
    });

    TEX.vignette = makeTexture(1024, 1024, (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 120, w / 2, h / 2, 620);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.62, "rgba(0,0,0,.1)");
      g.addColorStop(1, "rgba(0,0,0,.72)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });

    TEX.grain = makeTexture(128, 128, (ctx, w, h) => {
      const img = ctx.createImageData(w, h);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 80 + Math.random() * 90;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  function destroyTextures() {
    for (const key of Object.keys(TEX)) {
      if (TEX[key] && typeof TEX[key].destroy === "function") {
        TEX[key].destroy(true);
      }
      delete TEX[key];
    }
  }

  /* --------------------------- backgrounds -------------------------- */

  function paintGradient(ctx, w, h, stops) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const stop of stops) g.addColorStop(stop[0], stop[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function paintGlow(ctx, x, y, radius, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const base = `rgba(${color[0]},${color[1]},${color[2]},`;
    g.addColorStop(0, `${base}${color[3]})`);
    g.addColorStop(0.42, `${base}${color[3] * 0.42})`);
    g.addColorStop(1, `${base}0)`);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  function paintHill(ctx, w, h, baseY, amp, color, blur, seed) {
    const rng = rngFor(seed);
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-50, h + 30);
    ctx.lineTo(-50, baseY);
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const x = (w + 100) * (i / steps) - 50;
      const y = baseY - Math.sin(i * 1.9 + seed) * amp - rng() * amp * 0.55;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w + 50, h + 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function paintMountains(ctx, w, h, baseY, amp, color, blur, seed) {
    const rng = rngFor(seed);
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-60, h + 30);
    ctx.lineTo(-60, baseY);
    let x = -60;
    ctx.lineTo(x, baseY - rng() * amp * 0.15);
    while (x < w + 60) {
      const step = 60 + rng() * 110;
      const peak = baseY - (0.18 + rng() * 0.82) * amp;
      const next = baseY - rng() * amp * 0.22;
      ctx.quadraticCurveTo(x + step * 0.5, peak, x + step, next);
      x += step;
    }
    ctx.lineTo(w + 60, h + 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function paintPines(ctx, w, h, baseY, seed) {
    const rng = rngFor(seed);
    ctx.save();
    ctx.filter = "blur(1.2px)";
    for (let i = 0; i < 32; i++) {
      const x = rng() * w;
      const y = baseY + (rng() - 0.5) * h * 0.025;
      const height = 8 + rng() * 22;
      const half = height * (0.24 + rng() * 0.12);
      ctx.fillStyle = `rgba(4,14,24,${0.68 + rng() * 0.27})`;
      ctx.beginPath();
      ctx.moveTo(x, y - height);
      ctx.lineTo(x - half, y);
      ctx.lineTo(x + half, y);
      ctx.closePath();
      ctx.fill();
      if (rng() > 0.58) {
        ctx.fillStyle = "rgba(190,230,255,.16)";
        ctx.beginPath();
        ctx.moveTo(x, y - height);
        ctx.lineTo(x - half * 0.44, y - height * 0.56);
        ctx.lineTo(x + half * 0.44, y - height * 0.56);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function paintBirds(ctx, w, h, count, seed, color) {
    const rng = rngFor(seed);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    for (let i = 0; i < count; i++) {
      const x = w * (0.12 + rng() * 0.5);
      const y = h * (0.08 + rng() * 0.2);
      const s = 5 + rng() * 9;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.55, x, y);
      ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.55, x + s, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function paintPyramid(ctx, cx, baseY, width, height, color, litColor) {
    ctx.beginPath();
    ctx.moveTo(cx, baseY - height);
    ctx.lineTo(cx + width / 2, baseY);
    ctx.lineTo(cx - width / 2, baseY);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, baseY - height);
    ctx.lineTo(cx + width / 2, baseY);
    ctx.lineTo(cx + width * 0.02, baseY);
    ctx.closePath();
    ctx.fillStyle = litColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, baseY - height);
    ctx.lineTo(cx + width / 2, baseY);
    ctx.strokeStyle = "rgba(255,200,140,.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function paintPalm(ctx, x, baseY, height, seed) {
    const rng = rngFor(seed);
    ctx.save();
    ctx.strokeStyle = "rgba(8,6,10,.92)";
    ctx.fillStyle = "rgba(8,6,10,.92)";
    ctx.lineCap = "round";
    const topX = x + height * 0.16;
    const topY = baseY - height;

    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + height * 0.03, baseY - height * 0.55, topX, topY);
    ctx.lineWidth = Math.max(2, height * 0.032);
    ctx.stroke();

    for (const side of [-1, 1]) {
      for (let i = 1; i <= 4; i++) {
        const spread = i / 4;
        const len = height * (0.58 - spread * 0.13);
        const ex = topX + side * len * spread;
        const ey = topY + height * 0.14 * spread + 4 + rng() * 3;
        const cx = topX + side * len * spread * 0.56;
        const cy = topY - height * 0.16 * (1 - spread * 0.25);
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.lineWidth = Math.max(1.2, height * 0.016 * (1.2 - spread * 0.3));
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.arc(topX, topY + height * 0.04, height * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function paintTemple(ctx, cx, baseY, width, height) {
    ctx.save();
    ctx.filter = "blur(1px)";
    const stone = "rgba(232,228,214,.52)";
    const stoneDim = "rgba(196,192,178,.34)";

    ctx.fillStyle = stoneDim;
    ctx.fillRect(cx - width * 0.56, baseY - height * 0.05, width * 1.12, height * 0.05);
    ctx.fillRect(cx - width * 0.52, baseY - height * 0.1, width * 1.04, height * 0.05);

    const cols = 6;
    const span = width * 0.84;
    for (let i = 0; i < cols; i++) {
      const x = cx - span / 2 + (span * i) / (cols - 1);
      ctx.fillStyle = stone;
      ctx.fillRect(x - width * 0.016, baseY - height * 0.58, width * 0.032, height * 0.49);
      ctx.fillRect(x - width * 0.028, baseY - height * 0.6, width * 0.056, height * 0.022);
      ctx.fillRect(x - width * 0.026, baseY - height * 0.115, width * 0.052, height * 0.018);
    }

    ctx.fillStyle = stone;
    ctx.fillRect(cx - width * 0.5, baseY - height * 0.66, width, height * 0.065);
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.54, baseY - height * 0.66);
    ctx.lineTo(cx, baseY - height * 0.88);
    ctx.lineTo(cx + width * 0.54, baseY - height * 0.66);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,244,220,.24)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - width * 0.54, baseY - height * 0.66);
    ctx.lineTo(cx, baseY - height * 0.88);
    ctx.lineTo(cx + width * 0.54, baseY - height * 0.66);
    ctx.stroke();
    ctx.restore();
  }

  function paintCypress(ctx, x, baseY, height, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, baseY - height);
    ctx.bezierCurveTo(x + height * 0.055, baseY - height * 0.58, x + height * 0.05, baseY - height * 0.2, x, baseY);
    ctx.bezierCurveTo(x - height * 0.05, baseY - height * 0.2, x - height * 0.055, baseY - height * 0.58, x, baseY - height);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - height * 0.007, baseY - height * 0.1, height * 0.014, height * 0.1);
    ctx.restore();
  }

  function paintColosseum(ctx, cx, baseY, width, height) {
    const left = cx - width / 2;
    const right = cx + width / 2;
    const pad = 8;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width + pad * 2);
    canvas.height = Math.ceil(height + pad * 2);
    const off = canvas.getContext("2d");
    const ox = left - pad;
    const oy = baseY - height * 0.9 - pad;
    off.translate(-ox, -oy);

    off.beginPath();
    off.moveTo(left, baseY);
    off.lineTo(left, baseY - height * 0.6);
    off.lineTo(left + width * 0.06, baseY - height * 0.72);
    off.lineTo(left + width * 0.18, baseY - height * 0.66);
    off.lineTo(left + width * 0.27, baseY - height * 0.8);
    off.lineTo(left + width * 0.4, baseY - height * 0.72);
    off.lineTo(left + width * 0.52, baseY - height * 0.84);
    off.lineTo(left + width * 0.64, baseY - height * 0.74);
    off.lineTo(left + width * 0.76, baseY - height * 0.78);
    off.lineTo(left + width * 0.88, baseY - height * 0.68);
    off.lineTo(right, baseY - height * 0.62);
    off.lineTo(right, baseY);
    off.closePath();
    off.fillStyle = "rgba(12,7,12,.94)";
    off.fill();

    const rows = [
      { cols: 9, aw: width * 0.064, ah: height * 0.2, base: baseY - height * 0.04 },
      { cols: 8, aw: width * 0.056, ah: height * 0.17, base: baseY - height * 0.33 },
    ];
    off.globalCompositeOperation = "destination-out";
    off.fillStyle = "rgba(0,0,0,1)";
    for (const row of rows) {
      const gap = width * 0.098;
      const startX = cx - ((row.cols - 1) * gap) / 2;
      for (let i = 0; i < row.cols; i++) {
        const x = startX + i * gap;
        const r = row.aw / 2;
        const spring = row.base - row.ah + r;
        off.beginPath();
        off.moveTo(x - r, row.base);
        off.lineTo(x - r, spring);
        off.arc(x, spring, r, Math.PI, Math.PI * 2, false);
        off.lineTo(x + r, row.base);
        off.closePath();
        off.fill();
      }
    }
    off.globalCompositeOperation = "source-over";

    for (let i = 0; i < 4; i++) {
      const x = cx - width * 0.3 + i * width * 0.2;
      paintGlow(off, x, baseY - height * 0.15, width * 0.055, [255, 145, 65, 0.22]);
    }

    ctx.drawImage(canvas, ox, oy);
  }

  const BACKGROUNDS = {
    spring(ctx, w, h) {
      paintGradient(ctx, w, h, [
        [0, "#100d20"],
        [0.36, "#27193a"],
        [0.6, "#4b2f4b"],
        [0.79, "#8b5663"],
        [1, "#c98274"],
      ]);
      paintGlow(ctx, w * 0.78, h * 0.23, w * 0.46, [255, 210, 176, 0.42]);
      paintGlow(ctx, w * 0.5, h * 0.62, w * 0.55, [255, 170, 160, 0.09]);
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.23, Math.max(10, w * 0.013), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,242,226,.55)";
      ctx.fill();
      paintHill(ctx, w, h, h * 0.68, h * 0.03, "rgba(52,33,63,.55)", 20, 1);
      paintHill(ctx, w, h, h * 0.79, h * 0.04, "rgba(26,18,40,.84)", 12, 3);
      paintHill(ctx, w, h, h * 0.89, h * 0.045, "rgba(10,8,20,.92)", 16, 11);
      const mist = ctx.createLinearGradient(0, h * 0.58, 0, h * 0.84);
      mist.addColorStop(0, "rgba(255,220,212,0)");
      mist.addColorStop(0.55, "rgba(255,206,202,.1)");
      mist.addColorStop(1, "rgba(255,206,202,0)");
      ctx.fillStyle = mist;
      ctx.fillRect(0, h * 0.58, w, h * 0.26);
      paintBirds(ctx, w, h, 4, 12, "rgba(44,30,52,.42)");
    },

    summer(ctx, w, h) {
      paintGradient(ctx, w, h, [
        [0, "#020915"],
        [0.32, "#041c2c"],
        [0.62, "#063845"],
        [0.84, "#07545b"],
        [1, "#0a6a66"],
      ]);
      paintGlow(ctx, w * 0.76, h * 0.16, w * 0.24, [176, 235, 255, 0.22]);
      paintGlow(ctx, w * 0.5, h * 0.9, w * 0.7, [40, 220, 205, 0.1]);
      ctx.beginPath();
      ctx.arc(w * 0.76, h * 0.16, Math.max(12, w * 0.014), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(232,249,255,.62)";
      ctx.fill();
      const deep = ctx.createLinearGradient(0, h * 0.55, 0, h);
      deep.addColorStop(0, "rgba(2,12,26,0)");
      deep.addColorStop(1, "rgba(2,10,22,.55)");
      ctx.fillStyle = deep;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
    },

    autumn(ctx, w, h) {
      paintGradient(ctx, w, h, [
        [0, "#150f1e"],
        [0.34, "#32202d"],
        [0.58, "#5c342c"],
        [0.78, "#984e2b"],
        [1, "#cd7834"],
      ]);
      paintGlow(ctx, w * 0.28, h * 0.72, w * 0.46, [255, 172, 92, 0.42]);
      paintGlow(ctx, w * 0.5, h * 0.95, w * 0.7, [255, 116, 58, 0.12]);
      paintHill(ctx, w, h, h * 0.7, h * 0.032, "rgba(46,26,35,.58)", 20, 5);
      paintHill(ctx, w, h, h * 0.8, h * 0.05, "rgba(23,14,22,.88)", 12, 8);
      const haze = ctx.createLinearGradient(0, h * 0.56, 0, h * 0.86);
      haze.addColorStop(0, "rgba(255,180,120,0)");
      haze.addColorStop(0.5, "rgba(255,170,110,.1)");
      haze.addColorStop(1, "rgba(255,150,90,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, h * 0.56, w, h * 0.3);
      paintBirds(ctx, w, h, 5, 21, "rgba(38,22,30,.5)");
    },

    winter(ctx, w, h) {
      paintGradient(ctx, w, h, [
        [0, "#03050e"],
        [0.34, "#071127"],
        [0.62, "#0b1d33"],
        [0.84, "#123447"],
        [1, "#173f4f"],
      ]);
      paintGlow(ctx, w * 0.52, h * 0.04, w * 0.5, [104, 180, 255, 0.12]);
      paintGlow(ctx, w * 0.5, h * 0.94, w * 0.6, [70, 200, 210, 0.08]);
      paintMountains(ctx, w, h, h * 0.84, h * 0.16, "rgba(24,56,80,.55)", 14, 31);
      paintMountains(ctx, w, h, h * 0.92, h * 0.2, "rgba(10,28,44,.9)", 7, 57);
      paintPines(ctx, w, h, h * 0.925, 91);
      paintGlow(ctx, w * 0.5, h * 0.94, w * 0.4, [96, 160, 190, 0.05]);
    },

    egypt(ctx, w, h) {
      paintGradient(ctx, w, h, [
        [0, "#070a18"], [0.28, "#1a1630"], [0.5, "#45283e"],
        [0.68, "#8a4a2e"], [0.82, "#c9793f"], [1, "#e6a45a"],
      ]);
      paintGlow(ctx, w * 0.5, h * 0.6, w * 0.36, [255, 190, 110, 0.5]);
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.6, Math.max(12, w * 0.02), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,235,190,.78)";
      ctx.fill();
      paintGlow(ctx, w * 0.5, h * 0.72, w * 0.66, [255, 140, 80, 0.17]);

      paintPyramid(ctx, w * 0.7, h * 0.79, w * 0.2, h * 0.18, "rgba(26,16,26,.82)", "rgba(96,56,40,.35)");
      paintPyramid(ctx, w * 0.3, h * 0.81, w * 0.26, h * 0.24, "rgba(18,12,22,.9)", "rgba(108,62,42,.32)");
      paintPyramid(ctx, w * 0.56, h * 0.82, w * 0.13, h * 0.11, "rgba(22,14,24,.88)", "rgba(100,58,40,.3)");

      const river = ctx.createLinearGradient(0, h * 0.78, 0, h * 0.94);
      river.addColorStop(0, "rgba(18,64,74,0)");
      river.addColorStop(0.38, "rgba(24,96,104,.34)");
      river.addColorStop(1, "rgba(10,38,48,.08)");
      ctx.fillStyle = river;
      ctx.fillRect(0, h * 0.78, w, h * 0.16);
      paintGlow(ctx, w * 0.5, h * 0.86, w * 0.16, [255, 200, 120, 0.24]);

      paintHill(ctx, w, h, h * 0.9, h * 0.035, "rgba(42,24,26,.9)", 16, 12);
      paintHill(ctx, w, h, h * 0.98, h * 0.03, "rgba(18,10,14,.96)", 10, 21);
      paintPalm(ctx, w * 0.07, h * 0.92, h * 0.17, 7);
      paintPalm(ctx, w * 0.93, h * 0.94, h * 0.14, 19);
      paintBirds(ctx, w, h, 4, 33, "rgba(30,18,24,.5)");
    },

    greece(ctx, w, h) {
      paintGradient(ctx, w, h, [
        [0, "#040916"], [0.3, "#091a34"], [0.55, "#0f3550"],
        [0.72, "#1d5b6e"], [0.86, "#7a6a78"], [1, "#c08478"],
      ]);
      paintGlow(ctx, w * 0.72, h * 0.18, w * 0.24, [190, 230, 255, 0.3]);
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.18, Math.max(14, w * 0.017), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(235,247,255,.82)";
      ctx.fill();

      const sea = ctx.createLinearGradient(0, h * 0.62, 0, h * 0.92);
      sea.addColorStop(0, "rgba(20,80,102,.48)");
      sea.addColorStop(0.55, "rgba(12,54,76,.72)");
      sea.addColorStop(1, "rgba(7,28,44,.9)");
      ctx.fillStyle = sea;
      ctx.fillRect(0, h * 0.62, w, h * 0.3);

      paintGlow(ctx, w * 0.72, h * 0.73, w * 0.11, [210, 240, 255, 0.1]);

      const rng = rngFor(66);
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 0; i < 24; i++) {
        const y = h * (0.64 + rng() * 0.24);
        const x = w * (0.08 + rng() * 0.84);
        const len = w * (0.018 + rng() * 0.07);
        ctx.strokeStyle = `rgba(180,240,255,${0.03 + rng() * 0.07})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y);
        ctx.stroke();
      }
      ctx.restore();
      paintGlow(ctx, w * 0.45, h * 0.63, w * 0.5, [255, 166, 132, 0.14]);

      paintHill(ctx, w, h, h * 0.75, h * 0.026, "rgba(14,30,40,.82)", 18, 4);
      paintGlow(ctx, w * 0.34, h * 0.65, w * 0.24, [255, 220, 180, 0.18]);
      paintTemple(ctx, w * 0.34, h * 0.74, w * 0.22, h * 0.13);
      paintCypress(ctx, w * 0.06, h * 0.83, h * 0.18, "rgba(8,16,22,.92)");
      paintCypress(ctx, w * 0.93, h * 0.84, h * 0.16, "rgba(8,16,22,.92)");
      paintHill(ctx, w, h, h * 0.95, h * 0.03, "rgba(5,10,14,.96)", 12, 9);
      paintBirds(ctx, w, h, 3, 17, "rgba(24,34,44,.42)");
    },

    rome(ctx, w, h) {
      paintGradient(ctx, w, h, [
        [0, "#0d0814"], [0.3, "#25101f"], [0.55, "#4e1e2a"],
        [0.75, "#8c3a30"], [0.9, "#c96a3a"], [1, "#e39a55"],
      ]);
      paintGlow(ctx, w * 0.22, h * 0.64, w * 0.4, [255, 160, 90, 0.44]);
      ctx.beginPath();
      ctx.arc(w * 0.22, h * 0.64, Math.max(10, w * 0.017), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,225,170,.65)";
      ctx.fill();
      paintGlow(ctx, w * 0.55, h * 0.8, w * 0.55, [255, 120, 60, 0.13]);

      paintHill(ctx, w, h, h * 0.78, h * 0.028, "rgba(48,24,26,.6)", 16, 6);
      paintHill(ctx, w, h, h * 0.87, h * 0.04, "rgba(24,12,16,.9)", 12, 14);
      paintColosseum(ctx, w * 0.58, h * 0.87, w * 0.44, h * 0.24);
      paintCypress(ctx, w * 0.06, h * 0.88, h * 0.2, "rgba(8,6,10,.95)");
      paintCypress(ctx, w * 0.94, h * 0.9, h * 0.18, "rgba(8,6,10,.95)");
      paintHill(ctx, w, h, h * 0.97, h * 0.03, "rgba(10,6,10,.97)", 10, 23);
      paintBirds(ctx, w, h, 4, 44, "rgba(28,14,18,.55)");
    },

    space(ctx, w, h) {
      paintGradient(ctx, w, h, [
        [0, "#02030c"], [0.3, "#070a22"], [0.55, "#0d0b2a"],
        [0.78, "#140c2a"], [1, "#05030f"],
      ]);
      paintGlow(ctx, w * 0.26, h * 0.38, w * 0.4, [120, 70, 255, 0.2]);
      paintGlow(ctx, w * 0.68, h * 0.22, w * 0.36, [60, 200, 255, 0.14]);
      paintGlow(ctx, w * 0.54, h * 0.62, w * 0.42, [220, 70, 180, 0.12]);
      paintGlow(ctx, w * 0.12, h * 0.15, w * 0.28, [70, 120, 255, 0.1]);

      const px = w * 0.77;
      const py = h * 0.3;
      const pr = Math.min(w, h) * 0.13;
      paintGlow(ctx, px, py, pr * 2.4, [130, 110, 255, 0.2]);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, pr * 1.9, pr * 0.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(160,140,255,.12)";
      ctx.lineWidth = Math.max(8, pr * 0.18);
      ctx.stroke();
      ctx.strokeStyle = "rgba(190,170,255,.32)";
      ctx.lineWidth = Math.max(2, pr * 0.05);
      ctx.stroke();
      ctx.strokeStyle = "rgba(110,220,255,.18)";
      ctx.lineWidth = Math.max(1, pr * 0.018);
      ctx.stroke();
      ctx.restore();

      const sphere = ctx.createRadialGradient(px - pr * 0.36, py - pr * 0.4, pr * 0.08, px, py, pr * 1.02);
      sphere.addColorStop(0, "#c3b3ff");
      sphere.addColorStop(0.42, "#7860d2");
      sphere.addColorStop(0.8, "#30216b");
      sphere.addColorStop(1, "#120b2c");
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = sphere;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.clip();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(px, py + i * pr * 0.2, pr * 1.1, pr * 0.2, -0.08, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,.05)";
        ctx.lineWidth = Math.max(1, pr * 0.03);
        ctx.stroke();
      }
      const shade = ctx.createRadialGradient(px - pr * 0.2, py - pr * 0.2, pr * 0.2, px + pr * 0.35, py + pr * 0.35, pr * 1.15);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(0.7, "rgba(0,0,0,.18)");
      shade.addColorStop(1, "rgba(4,3,12,.72)");
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = shade;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, pr * 1.9, pr * 0.5, 0, 0, Math.PI);
      ctx.strokeStyle = "rgba(205,190,255,.14)";
      ctx.lineWidth = Math.max(8, pr * 0.16);
      ctx.stroke();
      ctx.strokeStyle = "rgba(205,190,255,.5)";
      ctx.lineWidth = Math.max(2, pr * 0.045);
      ctx.stroke();
      ctx.restore();

      const mx = w * 0.17;
      const my = h * 0.24;
      paintGlow(ctx, mx, my, w * 0.085, [200, 230, 255, 0.24]);
      ctx.beginPath();
      ctx.arc(mx, my, Math.max(6, w * 0.009), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(220,240,255,.72)";
      ctx.fill();
    },
  };

  function makeBackground(key) {
    const maxW = LOW_POWER ? 1280 : 1600;
    const maxH = LOW_POWER ? 900 : 1040;
    const bw = Math.min(maxW, Math.max(880, Math.round(W)));
    const bh = Math.min(maxH, Math.max(540, Math.round(H)));
    return makeTexture(bw, bh, (ctx, w, h) => {
      BACKGROUNDS[key](ctx, w, h);
    });
  }

  /* --------------------------- scene base --------------------------- */

  function sceneBase(key) {
    const container = new PIXI.Container();
    const bgTexture = makeBackground(key);
    const bg = new PIXI.Sprite(bgTexture);
    bg.width = W;
    bg.height = H;
    container.addChild(bg);
    return { container, textures: [bgTexture], update: null };
  }

  function addGlow(container, x, y, size, tint, alpha) {
    const sprite = new PIXI.Sprite(TEX.glow);
    sprite.anchor.set(0.5);
    sprite.position.set(x, y);
    sprite.width = size;
    sprite.height = size;
    sprite.tint = tint;
    sprite.alpha = alpha;
    sprite.blendMode = "add";
    container.addChild(sprite);
    return sprite;
  }

  /* ----------------------------- spring ----------------------------- */

  function buildSpring() {
    const base = sceneBase("spring");
    const root = base.container;

    const rays = new PIXI.Container();
    const raySprites = [];
    for (let i = 0; i < 3; i++) {
      const ray = new PIXI.Sprite(TEX.ray);
      ray.anchor.set(0.5, 0);
      ray.position.set(W * (0.76 + i * 0.018), -H * 0.34);
      ray.rotation = 0.34 + i * 0.05;
      ray.width = W * 0.46;
      ray.height = H * 1.55;
      ray.tint = 0xffd8c4;
      ray.alpha = 0.075 - i * 0.014;
      ray.blendMode = "add";
      rays.addChild(ray);
      raySprites.push({ sprite: ray, baseAlpha: ray.alpha, phase: i * 0.8 });
    }
    root.addChild(rays);

    const bokeh = [];
    const bokehLayer = new PIXI.Container();
    root.addChild(bokehLayer);
    for (let i = 0; i < qcount(16, 8); i++) {
      const size = rand(26, 84);
      const sprite = addGlow(
        bokehLayer,
        rand(0, W),
        rand(0, H),
        size,
        i % 4 === 0 ? 0xffd0e2 : 0xffe6c9,
        rand(0.04, 0.12),
      );
      bokeh.push({
        sprite,
        x: rand(0, W),
        y: rand(0, H),
        vy: rand(4, 13),
        sway: rand(8, 26),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.2, 0.6),
        baseAlpha: sprite.alpha,
      });
    }

    const petals = [];
    const petalLayer = new PIXI.Container();
    root.addChild(petalLayer);
    const count = REDUCED ? 26 : qcount(62, 28);
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      const sprite = new PIXI.Sprite(TEX.petal);
      sprite.anchor.set(0.5);
      const size = 8 + depth * 20 + rand(-2, 3);
      sprite.width = size;
      sprite.height = size * 1.2;
      sprite.tint = pick(RAINBOW);
      sprite.alpha = 0.32 + depth * 0.58;
      sprite.rotation = rand(0, Math.PI * 2);
      sprite.position.set(rand(-40, W + 40), rand(-H * 0.2, H));
      petalLayer.addChild(sprite);
      petals.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vy: 14 + depth * 36,
        sway: 6 + depth * 18,
        phase: rand(0, Math.PI * 2),
        spin: rand(-0.9, 0.9),
        depth,
      });
    }

    const foreground = [];
    const fgLayer = new PIXI.Container();
    root.addChild(fgLayer);
    for (let i = 0; i < qcount(7); i++) {
      const sprite = new PIXI.Sprite(TEX.petal);
      sprite.anchor.set(0.5);
      const size = rand(28, 46);
      sprite.width = size;
      sprite.height = size * 1.25;
      sprite.tint = pick(RAINBOW);
      sprite.alpha = rand(0.1, 0.2);
      sprite.rotation = rand(0, Math.PI * 2);
      sprite.position.set(rand(0, W), rand(-H, H));
      fgLayer.addChild(sprite);
      foreground.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vy: rand(38, 64),
        sway: rand(18, 36),
        phase: rand(0, Math.PI * 2),
        spin: rand(-0.5, 0.5),
      });
    }

    return {
      ...base,
      update(dt, t) {
        const wind = 12 + Math.sin(t * 0.32) * 9;
        for (const petal of petals) {
          petal.y += petal.vy * dt;
          petal.x += wind * (0.35 + petal.depth * 0.9) * dt;
          petal.sprite.x = petal.x + Math.sin(t * 0.9 + petal.phase) * petal.sway;
          petal.sprite.y = petal.y;
          petal.sprite.rotation += petal.spin * dt + Math.sin(t * 0.7 + petal.phase) * 0.002;
          if (petal.y > H + 40) {
            petal.y = -40;
            petal.x = rand(-60, W * 0.9);
            petal.sprite.rotation = rand(0, Math.PI * 2);
          }
          if (petal.x > W + 70) petal.x = -60;
        }

        for (const petal of foreground) {
          petal.y += petal.vy * dt;
          petal.x += wind * 0.9 * dt;
          petal.sprite.x = petal.x + Math.sin(t * 0.7 + petal.phase) * petal.sway;
          petal.sprite.y = petal.y;
          petal.sprite.rotation += petal.spin * dt;
          if (petal.y > H + 60) {
            petal.y = -60;
            petal.x = rand(-60, W * 0.9);
          }
          if (petal.x > W + 70) petal.x = -60;
        }

        for (const b of bokeh) {
          b.y -= b.vy * dt;
          b.sprite.y = b.y;
          b.sprite.x = b.x + Math.sin(t * b.speed + b.phase) * b.sway;
          b.sprite.alpha = b.baseAlpha * (0.62 + 0.38 * Math.sin(t * b.speed * 1.6 + b.phase));
          if (b.y < -90) {
            b.y = H + 90;
            b.x = rand(0, W);
          }
        }

        for (const ray of raySprites) {
          ray.sprite.alpha = ray.baseAlpha * (0.75 + 0.25 * Math.sin(t * 0.24 + ray.phase));
          ray.sprite.rotation += Math.sin(t * 0.1 + ray.phase) * 0.00035;
        }
      },
    };
  }

  /* ----------------------------- summer ----------------------------- */

  function createJellyfish(x, y, size, tint, alpha) {
    const container = new PIXI.Container();
    container.position.set(x, y);
    container.alpha = alpha;

    const glow = new PIXI.Sprite(TEX.glow);
    glow.anchor.set(0.5);
    glow.width = size * 5;
    glow.height = size * 5;
    glow.tint = tint;
    glow.alpha = 0.28;
    glow.blendMode = "add";
    glow.position.set(0, -size * 0.2);

    const bell = new PIXI.Graphics();
    bell.moveTo(-size, 0);
    bell.bezierCurveTo(-size * 0.95, -size * 1.5, size * 0.95, -size * 1.5, size, 0);
    bell.closePath();
    bell.fill({ color: tint, alpha: 0.27 });
    bell.stroke({ width: 1.3, color: 0xd9fbff, alpha: 0.55 });
    bell.ellipse(0, -size * 0.5, size * 0.46, size * 0.2);
    bell.fill({ color: 0xffffff, alpha: 0.08 });
    for (let i = -2; i <= 2; i++) {
      bell.circle(i * size * 0.36, -size * 0.04, size * 0.035);
      bell.fill({ color: 0xffffff, alpha: 0.62 });
    }

    const tentacles = new PIXI.Graphics();
    tentacles.blendMode = "add";

    container.addChild(glow, bell, tentacles);
    return {
      container,
      bell,
      tentacles,
      size,
      phase: rand(0, Math.PI * 2),
      drift: rand(7, 20),
      speed: rand(4, 12),
      x,
      y,
    };
  }

  function createFish(size, tint, alpha) {
    const container = new PIXI.Container();
    const glow = new PIXI.Sprite(TEX.glow);
    glow.anchor.set(0.5);
    glow.width = size * 5;
    glow.height = size * 2.2;
    glow.tint = 0x6fe8ff;
    glow.alpha = 0.09;
    glow.blendMode = "add";

    const graphics = new PIXI.Graphics();
    graphics.ellipse(0, 0, size, size * 0.38);
    graphics.fill({ color: tint, alpha });
    graphics.ellipse(0, 0, size, size * 0.38);
    graphics.stroke({ width: 1, color: 0x9ff4ff, alpha: alpha * 0.55 });
    graphics.moveTo(-size * 0.78, 0);
    graphics.lineTo(-size * 1.42, -size * 0.3);
    graphics.lineTo(-size * 1.42, size * 0.3);
    graphics.closePath();
    graphics.fill({ color: tint, alpha: alpha * 0.9 });
    graphics.circle(size * 0.54, -size * 0.07, size * 0.055);
    graphics.fill({ color: 0xd9f7ff, alpha: Math.min(1, alpha * 2.4) });

    container.addChild(glow, graphics);
    return container;
  }

  function buildSummer() {
    const base = sceneBase("summer");
    const root = base.container;

    const wave = new PIXI.Sprite(TEX.wave);
    wave.anchor.set(0.5, 0);
    wave.position.set(W * 0.5, -H * 0.03);
    wave.width = W * 1.7;
    wave.height = H * 0.42;
    wave.tint = 0x7fe9ff;
    wave.alpha = 0.16;
    wave.blendMode = "add";
    root.addChild(wave);

    const wave2 = new PIXI.Sprite(TEX.wave);
    wave2.anchor.set(0.5, 0);
    wave2.position.set(W * 0.46, H * 0.04);
    wave2.width = W * 1.25;
    wave2.height = H * 0.26;
    wave2.tint = 0xb7f6ff;
    wave2.alpha = 0.08;
    wave2.blendMode = "add";
    wave2.scale.x *= -1;
    root.addChild(wave2);

    for (let i = 0; i < 2; i++) {
      const ray = new PIXI.Sprite(TEX.ray);
      ray.anchor.set(0.5, 0);
      ray.position.set(W * (0.78 + i * 0.02), -H * 0.2);
      ray.rotation = 0.26 + i * 0.06;
      ray.width = W * 0.3;
      ray.height = H * 1.15;
      ray.tint = 0xb2f4ff;
      ray.alpha = 0.045 - i * 0.015;
      ray.blendMode = "add";
      root.addChild(ray);
    }

    const bubbles = [];
    const bubbleLayer = new PIXI.Container();
    root.addChild(bubbleLayer);
    for (let i = 0; i < qcount(34, 18); i++) {
      const size = rand(5, 20);
      const sprite = new PIXI.Sprite(TEX.bubble);
      sprite.anchor.set(0.5);
      sprite.width = size;
      sprite.height = size;
      sprite.alpha = rand(0.3, 0.7);
      sprite.position.set(rand(0, W), rand(0, H));
      bubbleLayer.addChild(sprite);
      bubbles.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vy: rand(16, 46),
        sway: rand(5, 18),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.6, 1.5),
      });
    }

    const jellies = [];
    const jellySpecs = [
      [0.18, 0.68, 17, 0xb08cff, 0.8],
      [0.36, 0.48, 25, 0x63e6ff, 0.68],
      [0.62, 0.76, 20, 0xff8fcf, 0.58],
      [0.82, 0.4, 13, 0x7cf7dc, 0.5],
      [0.5, 0.9, 30, 0x6f9dff, 0.3],
    ];
    for (const spec of LOW_POWER ? jellySpecs.slice(0, 3) : jellySpecs) {
      const jelly = createJellyfish(W * spec[0], H * spec[1], spec[2], spec[3], spec[4]);
      root.addChild(jelly.container);
      jellies.push(jelly);
    }

    const fish = [];
    for (let i = 0; i < qcount(5, 3); i++) {
      const size = rand(10, 20);
      const sprite = createFish(size, 0x2b9fb5, rand(0.34, 0.52));
      sprite.position.set(rand(0, W), rand(H * 0.45, H * 0.78));
      root.addChild(sprite);
      fish.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vx: rand(14, 34) * (Math.random() < 0.5 ? 1 : -1),
        phase: rand(0, Math.PI * 2),
        baseAlpha: sprite.alpha,
      });
    }

    const plankton = [];
    const planktonLayer = new PIXI.Container();
    root.addChild(planktonLayer);
    for (let i = 0; i < qcount(36, 20); i++) {
      const sprite = addGlow(planktonLayer, rand(0, W), rand(H * 0.25, H), rand(2, 5), 0x9ff4ff, rand(0.08, 0.3));
      plankton.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.1, 0.4),
        baseAlpha: sprite.alpha,
      });
    }

    return {
      ...base,
      update(dt, t) {
        wave.x = W * 0.5 + Math.sin(t * 0.14) * W * 0.045;
        wave.alpha = 0.13 + Math.sin(t * 0.36) * 0.03;
        wave2.x = W * 0.47 + Math.sin(t * 0.18 + 1.7) * W * 0.06;
        wave2.alpha = 0.06 + Math.sin(t * 0.42 + 1) * 0.02;

        for (const bubble of bubbles) {
          bubble.y -= bubble.vy * dt;
          bubble.sprite.y = bubble.y;
          bubble.sprite.x = bubble.x + Math.sin(t * bubble.speed + bubble.phase) * bubble.sway;
          if (bubble.y < -30) {
            bubble.y = H + 30;
            bubble.x = rand(0, W);
          }
        }

        for (const jelly of jellies) {
          jelly.y -= jelly.speed * dt;
          jelly.container.y = jelly.y + Math.sin(t * 0.4 + jelly.phase) * 6;
          jelly.container.x = jelly.x + Math.sin(t * 0.24 + jelly.phase) * jelly.drift;
          if (jelly.y < -jelly.size * 3) {
            jelly.y = H + jelly.size * 3;
            jelly.x = rand(W * 0.08, W * 0.92);
          }
          jelly.bell.scale.y = 1 + Math.sin(t * 1.4 + jelly.phase) * 0.035;
          jelly.bell.scale.x = 1 - Math.sin(t * 1.4 + jelly.phase) * 0.018;

          const tent = jelly.tentacles;
          tent.clear();
          const size = jelly.size;
          for (let i = 0; i < 7; i++) {
            const x0 = (i - 3) * size * 0.22;
            const len = size * (1.3 + ((i * 3) % 4) * 0.24);
            const a = Math.sin(t * 1.5 + jelly.phase + i * 0.7) * size * 0.3;
            const b = Math.sin(t * 1.2 + jelly.phase + i * 0.4 + 1.2) * size * 0.38;
            tent.moveTo(x0, 0);
            tent.quadraticCurveTo(x0 + a, len * 0.45, x0 + b, len);
            tent.moveTo(x0, len * 0.5);
            tent.quadraticCurveTo(x0 - a * 0.7, len * 0.76, x0 + b * 0.6, len * 0.98);
          }
          tent.stroke({ width: 1, color: 0xa7ecff, alpha: 0.3 });
        }

        for (const f of fish) {
          f.x += f.vx * dt;
          f.sprite.y = f.y + Math.sin(t * 0.7 + f.phase) * 5;
          f.sprite.x = f.x;
          f.sprite.scale.x = f.vx < 0 ? -1 : 1;
          if (f.vx > 0 && f.x > W + 80) f.x = -80;
          if (f.vx < 0 && f.x < -80) f.x = W + 80;
        }

        for (const p of plankton) {
          p.sprite.y = p.y + Math.sin(t * p.speed + p.phase) * 10;
          p.sprite.x = p.x + Math.cos(t * p.speed * 0.7 + p.phase) * 8;
          p.sprite.alpha = p.baseAlpha * (0.55 + 0.45 * Math.sin(t * 0.8 + p.phase));
        }
      },
    };
  }

  /* ----------------------------- autumn ----------------------------- */

  function buildAutumn() {
    const base = sceneBase("autumn");
    const root = base.container;

    const fog = [];
    for (let i = 0; i < 3; i++) {
      const sprite = addGlow(root, rand(W * 0.15, W * 0.85), H * (0.66 + i * 0.1), W * rand(0.5, 0.85), 0xffa262, 0.055);
      sprite.blendMode = "screen";
      sprite.height = H * 0.34;
      fog.push({ sprite, x: sprite.x, phase: rand(0, Math.PI * 2), speed: rand(0.05, 0.12) });
    }

    const motes = [];
    const moteLayer = new PIXI.Container();
    root.addChild(moteLayer);
    for (let i = 0; i < qcount(24, 14); i++) {
      const sprite = addGlow(moteLayer, rand(0, W), rand(H * 0.3, H), rand(2, 5), 0xffd39a, rand(0.08, 0.28));
      motes.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.16, 0.5),
        baseAlpha: sprite.alpha,
      });
    }

    const leaves = [];
    const leafLayer = new PIXI.Container();
    root.addChild(leafLayer);
    const count = REDUCED ? 26 : qcount(56, 28);
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      const ginkgo = Math.random() > 0.42;
      const sprite = new PIXI.Sprite(ginkgo ? TEX.leafGinkgo : TEX.leafOval);
      sprite.anchor.set(0.5);
      const size = 12 + depth * 18 + rand(-2, 3);
      sprite.width = size * (ginkgo ? 1.16 : 1);
      sprite.height = size * (ginkgo ? 1.16 : 1.55);
      sprite.tint = pick(AUTUMN_LEAVES);
      sprite.alpha = 0.5 + depth * 0.48;
      sprite.rotation = rand(0, Math.PI * 2);
      sprite.position.set(rand(-50, W + 50), rand(-H * 0.25, H));
      leafLayer.addChild(sprite);
      leaves.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vy: 20 + depth * 38,
        sway: 18 + depth * 34,
        phase: rand(0, Math.PI * 2),
        spin: rand(-1.4, 1.4),
        depth,
      });
    }

    return {
      ...base,
      update(dt, t) {
        const gust = 16 + Math.sin(t * 0.26) * 12 + Math.sin(t * 0.77 + 1.2) * 4;
        for (const leaf of leaves) {
          leaf.y += leaf.vy * dt;
          leaf.x += gust * (0.25 + leaf.depth * 0.8) * dt;
          leaf.sprite.x = leaf.x + Math.sin(t * 0.85 + leaf.phase) * leaf.sway;
          leaf.sprite.y = leaf.y;
          leaf.sprite.rotation += leaf.spin * dt;
          if (leaf.y > H + 60) {
            leaf.y = -60;
            leaf.x = rand(-50, W * 0.95);
            leaf.sprite.rotation = rand(0, Math.PI * 2);
          }
          if (leaf.x > W + 90) leaf.x = -60;
        }

        for (const f of fog) {
          f.sprite.x = f.x + Math.sin(t * f.speed + f.phase) * W * 0.05;
        }

        for (const m of motes) {
          m.sprite.y = m.y + Math.sin(t * m.speed + m.phase) * 14;
          m.sprite.x = m.x + Math.cos(t * m.speed * 0.8 + m.phase) * 9;
          m.sprite.alpha = m.baseAlpha * (0.5 + 0.5 * Math.sin(t * 0.6 + m.phase));
        }
      },
    };
  }

  /* ----------------------------- winter ----------------------------- */

  function mixColor(a, b, t) {
    const ar = (a >> 16) & 255;
    const ag = (a >> 8) & 255;
    const ab = a & 255;
    const br = (b >> 16) & 255;
    const bg = (b >> 8) & 255;
    const bb = b & 255;
    return (
      (Math.round(ar + (br - ar) * t) << 16) |
      (Math.round(ag + (bg - ag) * t) << 8) |
      Math.round(ab + (bb - ab) * t)
    );
  }

  function createAurora() {
    const root = new PIXI.Container();
    const specs = [
      { base: 0.21, amp: 0.03, x: 0.4, width: 0.78, colorA: 0x5bffc8, colorB: 0x36d9ff, alpha: 0.48, count: 110, len: 0.27, f1: 1.1, f2: 2.4 },
      { base: 0.33, amp: 0.04, x: 0.52, width: 0.86, colorA: 0x36d9ff, colorB: 0x9c7dff, alpha: 0.35, count: 100, len: 0.22, f1: 1.45, f2: 2.0 },
      { base: 0.12, amp: 0.022, x: 0.62, width: 0.6, colorA: 0x9c7dff, colorB: 0x57ffd2, alpha: 0.26, count: 76, len: 0.16, f1: 1.7, f2: 3.0 },
    ];
    const ribbons = [];

    for (const spec of specs) {
      const ribbon = new PIXI.Container();
      ribbon.position.x = W * spec.x;
      const phase = rand(0, Math.PI * 2);
      const strokes = [];

      const glow = new PIXI.Sprite(TEX.glow);
      glow.anchor.set(0.5);
      glow.width = W * spec.width * 1.1;
      glow.height = H * spec.len * 1.1;
      glow.tint = spec.colorA;
      glow.alpha = 0.085;
      glow.blendMode = "add";
      glow.position.set(0, H * (spec.base + spec.len * 0.35));
      ribbon.addChild(glow);

      const ribbonCount = LOW_POWER ? Math.max(20, Math.round(spec.count * 0.38)) : spec.count;
      for (let i = 0; i < ribbonCount; i++) {
        const k = i / (spec.count - 1);
        const top =
          H *
          (spec.base +
            Math.sin(k * Math.PI * spec.f1 + phase) * spec.amp +
            Math.sin(k * Math.PI * spec.f2 + phase * 2) * spec.amp * 0.4);
        const len =
          H *
          spec.len *
          (0.55 + 0.45 * Math.sin(k * Math.PI * 2.3 + phase * 1.6)) *
          rand(0.72, 1.15);
        const sprite = new PIXI.Sprite(TEX.aurora);
        sprite.anchor.set(0.5, 0);
        sprite.blendMode = "add";
        sprite.x = (k - 0.5) * W * spec.width + rand(-4, 4);
        sprite.y = top;
        sprite.width = rand(7, 16);
        sprite.height = len;
        sprite.tint = mixColor(spec.colorA, spec.colorB, k);
        sprite.alpha = spec.alpha * rand(0.42, 1);
        ribbon.addChild(sprite);
        strokes.push({
          sprite,
          baseY: top,
          phase: rand(0, Math.PI * 2),
          baseAlpha: sprite.alpha,
        });
      }

      root.addChild(ribbon);
      ribbons.push({ ribbon, strokes, phase, spec });
    }

    return { root, ribbons };
  }

  function buildWinter() {
    const base = sceneBase("winter");
    const root = base.container;

    const stars = [];
    const starLayer = new PIXI.Container();
    root.addChild(starLayer);
    for (let i = 0; i < (REDUCED ? 45 : qcount(95, 48)); i++) {
      const size = rand(1.6, i % 11 === 0 ? 6 : 3.6);
      const sprite = addGlow(starLayer, rand(0, W), rand(0, H * 0.72), size, 0xdceaff, rand(0.2, 0.9));
      stars.push({
        sprite,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.3, 1.2),
        baseAlpha: sprite.alpha,
      });
    }

    const aurora = createAurora();
    root.addChild(aurora.root);

    const snow = [];
    const snowLayer = new PIXI.Container();
    root.addChild(snowLayer);
    const count = REDUCED ? 46 : qcount(130, 62);
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      const sprite = new PIXI.Sprite(TEX.snow);
      sprite.anchor.set(0.5);
      const size = 1.8 + depth * 7.5 + rand(0, 1.5);
      sprite.width = size;
      sprite.height = size;
      sprite.alpha = 0.32 + depth * 0.6;
      sprite.position.set(rand(0, W), rand(-H, H));
      snowLayer.addChild(sprite);
      snow.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vy: 16 + depth * 46,
        sway: 6 + depth * 26,
        phase: rand(0, Math.PI * 2),
        spin: rand(-0.6, 0.6),
      });
    }

    return {
      ...base,
      update(dt, t) {
        for (const star of stars) {
          star.sprite.alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
        }

        for (const r of aurora.ribbons) {
          r.ribbon.x = W * r.spec.x + Math.sin(t * 0.06 + r.phase) * W * 0.012;
          for (const stroke of r.strokes) {
            stroke.sprite.y = stroke.baseY + Math.sin(t * 0.26 + stroke.phase) * H * 0.006;
            stroke.sprite.alpha = stroke.baseAlpha * (0.72 + 0.28 * Math.sin(t * 0.5 + stroke.phase));
          }
        }

        for (const flake of snow) {
          flake.y += flake.vy * dt;
          flake.sprite.y = flake.y;
          flake.sprite.x = flake.x + Math.sin(t * 0.6 + flake.phase) * flake.sway;
          flake.sprite.rotation += flake.spin * dt;
          if (flake.y > H + 20) {
            flake.y = -20;
            flake.x = rand(0, W);
          }
        }
      },
    };
  }

  /* ----------------------------- egypt ------------------------------ */

  function buildEgypt() {
    const base = sceneBase("egypt");
    const root = base.container;

    const shimmer = new PIXI.Sprite(TEX.wave);
    shimmer.anchor.set(0.5, 0);
    shimmer.position.set(W * 0.5, H * 0.66);
    shimmer.width = W * 1.45;
    shimmer.height = H * 0.14;
    shimmer.tint = 0xffc078;
    shimmer.alpha = 0.05;
    shimmer.blendMode = "add";
    root.addChild(shimmer);

    const dust = [];
    const dustLayer = new PIXI.Container();
    root.addChild(dustLayer);
    for (let i = 0; i < (REDUCED ? 20 : qcount(46, 24)); i++) {
      const sprite = addGlow(
        dustLayer,
        rand(0, W),
        rand(H * 0.18, H),
        rand(2, 6),
        i % 3 === 0 ? 0xffe1a8 : 0xffc87a,
        rand(0.06, 0.24),
      );
      dust.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vy: rand(4, 14),
        sway: rand(6, 20),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.15, 0.45),
        baseAlpha: sprite.alpha,
      });
    }

    const sparks = [];
    const sparkLayer = new PIXI.Container();
    root.addChild(sparkLayer);
    for (let i = 0; i < qcount(28, 14); i++) {
      const sprite = addGlow(
        sparkLayer,
        rand(0, W),
        rand(H * 0.84, H * 0.99),
        rand(1.5, 3.5),
        0xffd79a,
        rand(0.15, 0.45),
      );
      sparks.push({
        sprite,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.5, 1.4),
        baseAlpha: sprite.alpha,
      });
    }

    return {
      ...base,
      update(dt, t) {
        shimmer.x = W * 0.5 + Math.sin(t * 0.12) * W * 0.04;
        shimmer.alpha = 0.035 + 0.02 * Math.sin(t * 0.4);

        for (const mote of dust) {
          mote.y -= mote.vy * dt;
          mote.sprite.y = mote.y;
          mote.sprite.x = mote.x + Math.sin(t * mote.speed + mote.phase) * mote.sway;
          mote.sprite.alpha = mote.baseAlpha * (0.5 + 0.5 * Math.sin(t * mote.speed * 1.4 + mote.phase));
          if (mote.y < -20) {
            mote.y = H + 20;
            mote.x = rand(0, W);
          }
        }

        for (const spark of sparks) {
          spark.sprite.alpha = spark.baseAlpha * (0.35 + 0.65 * Math.sin(t * spark.speed + spark.phase) ** 2);
        }
      },
    };
  }

  /* ----------------------------- greece ----------------------------- */

  function buildGreece() {
    const base = sceneBase("greece");
    const root = base.container;

    const shimmer = new PIXI.Sprite(TEX.wave);
    shimmer.anchor.set(0.5, 0);
    shimmer.position.set(W * 0.5, H * 0.62);
    shimmer.width = W * 1.35;
    shimmer.height = H * 0.18;
    shimmer.tint = 0x9fe6ff;
    shimmer.alpha = 0.06;
    shimmer.blendMode = "add";
    root.addChild(shimmer);

    const stars = [];
    const starLayer = new PIXI.Container();
    root.addChild(starLayer);
    for (let i = 0; i < (REDUCED ? 24 : qcount(52, 28)); i++) {
      const sprite = addGlow(starLayer, rand(0, W), rand(0, H * 0.55), rand(1.2, 3.4), 0xdceaff, rand(0.18, 0.7));
      stars.push({
        sprite,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.3, 1.1),
        baseAlpha: sprite.alpha,
      });
    }

    const leaves = [];
    const leafLayer = new PIXI.Container();
    root.addChild(leafLayer);
    const tints = [0x9fb56a, 0xb8c48a, 0xd8c99a, 0x7f9a5f, 0xc7b97a];
    for (let i = 0; i < (REDUCED ? 12 : qcount(28, 14)); i++) {
      const size = rand(5, 11);
      const sprite = new PIXI.Sprite(TEX.leafOval);
      sprite.anchor.set(0.5);
      sprite.width = size;
      sprite.height = size * 1.7;
      sprite.tint = pick(tints);
      sprite.alpha = rand(0.3, 0.62);
      sprite.rotation = rand(0, Math.PI * 2);
      sprite.position.set(rand(-30, W * 0.8), rand(0, H * 0.8));
      leafLayer.addChild(sprite);
      leaves.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vx: rand(8, 22),
        vy: rand(4, 12),
        sway: rand(6, 16),
        phase: rand(0, Math.PI * 2),
        spin: rand(-0.7, 0.7),
      });
    }

    const fireflies = [];
    const fireflyLayer = new PIXI.Container();
    root.addChild(fireflyLayer);
    for (let i = 0; i < qcount(18, 10); i++) {
      const sprite = addGlow(
        fireflyLayer,
        rand(0, W),
        rand(H * 0.35, H * 0.85),
        rand(2, 5),
        i % 4 === 0 ? 0xbfffe6 : 0xffe6a8,
        rand(0.1, 0.4),
      );
      fireflies.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.3, 0.9),
        baseAlpha: sprite.alpha,
      });
    }

    return {
      ...base,
      update(dt, t) {
        shimmer.x = W * 0.5 + Math.sin(t * 0.1) * W * 0.03;
        shimmer.alpha = 0.045 + 0.02 * Math.sin(t * 0.32);

        for (const star of stars) {
          star.sprite.alpha = star.baseAlpha * (0.45 + 0.55 * Math.sin(t * star.speed + star.phase));
        }

        for (const leaf of leaves) {
          leaf.x += leaf.vx * dt;
          leaf.y += leaf.vy * dt;
          leaf.sprite.x = leaf.x + Math.sin(t * 0.7 + leaf.phase) * leaf.sway;
          leaf.sprite.y = leaf.y;
          leaf.sprite.rotation += leaf.spin * dt;
          if (leaf.x > W + 40) leaf.x = -40;
          if (leaf.y > H + 40) {
            leaf.y = -30;
            leaf.x = rand(-40, W * 0.8);
          }
        }

        for (const fly of fireflies) {
          fly.sprite.x = fly.x + Math.cos(t * fly.speed + fly.phase) * 12;
          fly.sprite.y = fly.y + Math.sin(t * fly.speed * 0.8 + fly.phase) * 10;
          fly.sprite.alpha = fly.baseAlpha * (0.25 + 0.75 * Math.max(0, Math.sin(t * 1.1 + fly.phase)));
        }
      },
    };
  }

  /* ------------------------------ rome ------------------------------ */

  function buildRome() {
    const base = sceneBase("rome");
    const root = base.container;

    const embers = [];
    const emberLayer = new PIXI.Container();
    root.addChild(emberLayer);
    for (let i = 0; i < (REDUCED ? 18 : qcount(48, 24)); i++) {
      const sprite = addGlow(
        emberLayer,
        rand(W * 0.32, W * 0.86),
        rand(H * 0.55, H),
        rand(1.5, 5),
        i % 3 === 0 ? 0xffd08a : 0xff7a3e,
        rand(0.12, 0.5),
      );
      embers.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vy: rand(8, 30),
        sway: rand(6, 22),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.2, 0.7),
        baseAlpha: sprite.alpha,
      });
    }

    const dust = [];
    const dustLayer = new PIXI.Container();
    root.addChild(dustLayer);
    for (let i = 0; i < qcount(20, 10); i++) {
      const sprite = addGlow(dustLayer, rand(0, W), rand(H * 0.2, H * 0.9), rand(2, 5), 0xffc27a, rand(0.05, 0.16));
      dust.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.15, 0.4),
        baseAlpha: sprite.alpha,
      });
    }

    const leaves = [];
    const leafLayer = new PIXI.Container();
    root.addChild(leafLayer);
    for (let i = 0; i < (REDUCED ? 6 : qcount(14, 8)); i++) {
      const size = rand(5, 10);
      const sprite = new PIXI.Sprite(TEX.leafOval);
      sprite.anchor.set(0.5);
      sprite.width = size;
      sprite.height = size * 1.65;
      sprite.tint = pick([0xc99a4a, 0xd9b46a, 0xa8783c, 0xe0c08a]);
      sprite.alpha = rand(0.25, 0.55);
      sprite.rotation = rand(0, Math.PI * 2);
      sprite.position.set(rand(0, W), rand(-H * 0.2, H));
      leafLayer.addChild(sprite);
      leaves.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        vy: rand(14, 30),
        sway: rand(10, 26),
        phase: rand(0, Math.PI * 2),
        spin: rand(-0.8, 0.8),
      });
    }

    return {
      ...base,
      update(dt, t) {
        for (const ember of embers) {
          ember.y -= ember.vy * dt;
          ember.sprite.y = ember.y;
          ember.sprite.x = ember.x + Math.sin(t * ember.speed + ember.phase) * ember.sway;
          ember.sprite.alpha = ember.baseAlpha * (0.3 + 0.7 * Math.sin(t * 1.2 + ember.phase) ** 2);
          if (ember.y < -20) {
            ember.y = H + 20;
            ember.x = rand(W * 0.32, W * 0.86);
          }
        }

        for (const mote of dust) {
          mote.sprite.x = mote.x + Math.cos(t * mote.speed + mote.phase) * 14;
          mote.sprite.y = mote.y + Math.sin(t * mote.speed * 0.7 + mote.phase) * 10;
          mote.sprite.alpha = mote.baseAlpha * (0.45 + 0.55 * Math.sin(t * 0.7 + mote.phase));
        }

        for (const leaf of leaves) {
          leaf.y += leaf.vy * dt;
          leaf.x += 10 * dt;
          leaf.sprite.x = leaf.x + Math.sin(t * 0.8 + leaf.phase) * leaf.sway;
          leaf.sprite.y = leaf.y;
          leaf.sprite.rotation += leaf.spin * dt;
          if (leaf.y > H + 40) {
            leaf.y = -40;
            leaf.x = rand(0, W);
          }
          if (leaf.x > W + 40) leaf.x = -40;
        }
      },
    };
  }

  /* ------------------------------ space ----------------------------- */

  function createSatellite() {
    const container = new PIXI.Container();

    const panels = new PIXI.Graphics();
    panels.rect(-27, -7, 15, 14).fill({ color: 0x2c4f8f, alpha: 0.78 });
    panels.rect(12, -7, 15, 14).fill({ color: 0x2c4f8f, alpha: 0.78 });
    for (let x = -24; x < -12; x += 4) {
      panels.moveTo(x, -7);
      panels.lineTo(x, 7);
    }
    for (let x = 15; x < 27; x += 4) {
      panels.moveTo(x, -7);
      panels.lineTo(x, 7);
    }
    panels.stroke({ width: 0.5, color: 0x9fd8ff, alpha: 0.3 });

    const body = new PIXI.Graphics();
    body.roundRect(-8, -6, 16, 12, 2).fill({ color: 0xd9e6ff, alpha: 0.8 });
    body.roundRect(-8, -6, 16, 12, 2).stroke({ width: 0.8, color: 0xffffff, alpha: 0.5 });
    body.circle(0, -10, 4);
    body.stroke({ width: 0.8, color: 0xbfe4ff, alpha: 0.6 });

    const light = new PIXI.Sprite(TEX.glow);
    light.anchor.set(0.5);
    light.width = 9;
    light.height = 9;
    light.tint = 0xff7a8a;
    light.alpha = 0.65;
    light.blendMode = "add";
    light.position.set(0, -9);

    container.addChild(panels, body, light);
    return container;
  }

  function buildSpace() {
    const base = sceneBase("space");
    const root = base.container;

    const stars = [];
    const starLayer = new PIXI.Container();
    root.addChild(starLayer);
    for (let i = 0; i < (REDUCED ? 60 : qcount(150, 76)); i++) {
      const big = i % 17 === 0;
      const sprite = addGlow(
        starLayer,
        rand(0, W),
        rand(0, H * 0.85),
        big ? rand(4.5, 7) : rand(1.2, 3.6),
        big ? 0xcfe4ff : pick([0xdfe9ff, 0xcfe4ff, 0xffe1f2, 0xd8d0ff]),
        rand(0.2, 0.95),
      );
      stars.push({
        sprite,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.25, 1.1),
        baseAlpha: sprite.alpha,
      });
    }

    const nebula = [];
    const nebulaLayer = new PIXI.Container();
    root.addChild(nebulaLayer);
    const nebulaTints = [0x8b5cff, 0x3fd8ff, 0xff6aa9, 0x6f8cff, 0xb46dff];
    for (let i = 0; i < 5; i++) {
      const sprite = addGlow(
        nebulaLayer,
        rand(W * 0.1, W * 0.9),
        rand(H * 0.1, H * 0.7),
        rand(W * 0.25, W * 0.55),
        nebulaTints[i],
        rand(0.03, 0.06),
      );
      nebula.push({
        sprite,
        x: sprite.x,
        y: sprite.y,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.03, 0.08),
        baseAlpha: sprite.alpha,
      });
    }

    const meteors = [];
    let meteorTimer = rand(1.2, 3);

    function spawnMeteor() {
      const sprite = new PIXI.Sprite(TEX.meteor);
      sprite.anchor.set(1, 0.5);
      const x = rand(W * 0.15, W * 0.92);
      const y = rand(0, H * 0.38);
      const vx = rand(220, 380);
      const vy = rand(110, 210);
      sprite.position.set(x, y);
      sprite.width = rand(70, 150);
      sprite.height = rand(1.5, 3);
      sprite.tint = 0xdff0ff;
      sprite.rotation = Math.atan2(vy, vx);
      sprite.alpha = 0;
      sprite.blendMode = "add";
      root.addChild(sprite);
      meteors.push({ sprite, x, y, vx, vy, life: 0, dur: rand(0.8, 1.3) });
    }

    const satellite = createSatellite();
    satellite.alpha = 0.62;
    satellite.scale.set(1.25);
    satellite.position.set(-70, H * 0.34);
    root.addChild(satellite);
    const sat = { x: -70, y: H * 0.34, vx: rand(10, 16), phase: rand(0, Math.PI * 2) };

    return {
      ...base,
      update(dt, t) {
        for (const star of stars) {
          star.sprite.alpha = star.baseAlpha * (0.45 + 0.55 * Math.sin(t * star.speed + star.phase));
        }

        for (const gas of nebula) {
          gas.sprite.x = gas.x + Math.sin(t * gas.speed + gas.phase) * W * 0.035;
          gas.sprite.y = gas.y + Math.cos(t * gas.speed * 0.8 + gas.phase) * H * 0.02;
          gas.sprite.alpha = gas.baseAlpha * (0.7 + 0.3 * Math.sin(t * 0.25 + gas.phase));
        }

        meteorTimer -= dt;
        if (meteorTimer <= 0) {
          meteorTimer = rand(2.6, 5.8);
          spawnMeteor();
        }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const meteor = meteors[i];
          meteor.life += dt;
          const k = meteor.life / meteor.dur;
          meteor.x += meteor.vx * dt;
          meteor.y += meteor.vy * dt;
          meteor.sprite.position.set(meteor.x, meteor.y);
          meteor.sprite.alpha = Math.sin(Math.PI * Math.min(1, k)) * 0.95;
          if (k >= 1) {
            meteor.sprite.destroy();
            meteors.splice(i, 1);
          }
        }

        sat.x += sat.vx * dt;
        satellite.x = sat.x;
        satellite.y = sat.y + Math.sin(t * 0.2 + sat.phase) * 8;
        if (sat.x > W + 80) {
          sat.x = -80;
          sat.y = rand(H * 0.2, H * 0.55);
        }
      },
    };
  }

  const BUILDERS = {
    spring: buildSpring,
    summer: buildSummer,
    autumn: buildAutumn,
    winter: buildWinter,
    egypt: buildEgypt,
    greece: buildGreece,
    rome: buildRome,
    space: buildSpace,
  };

  /* -------------------------- scene control ------------------------- */

  function destroyScene(scene) {
    if (!scene || scene.destroyed) return;
    scene.destroyed = true;
    if (scene.container.parent) scene.container.parent.removeChild(scene.container);
    scene.container.destroy({ children: true });
    if (scene.textures) {
      for (const texture of scene.textures) texture.destroy(true);
      scene.textures = null;
    }
  }

  function retireScene(scene) {
    if (!scene || scene === current) return;
    const index = alive.indexOf(scene);
    if (index >= 0) alive.splice(index, 1);
    killTweens(scene.container);
    destroyScene(scene);
  }

  function pickSceneForRound() {
    const pool = ORDER.filter((key) => key !== currentKey);
    if (!pool.length) return ORDER[0];
    return pool[randInt(0, pool.length - 1)];
  }

  function handleRoundStart() {
    if (IS_DEMO || REDUCED || !booted || contextLost) return;
    roundsStarted += 1;
    if (roundsStarted === 1) return;
    switchScene(pickSceneForRound(), true);
  }

  function switchScene(key, instant) {
    if (!SCENES[key] || key === currentKey || contextLost) return;
    for (const scene of alive.slice()) {
      if (scene !== current && scene.container.alpha <= 0.01) retireScene(scene);
    }
    const meta = SCENES[key];
    const next = BUILDERS[key]();
    next.container.alpha = instant ? 1 : 0;
    sceneRoot.addChild(next.container);
    alive.push(next);

    const previous = current;
    current = next;
    currentKey = key;

    if (IS_DEMO) {
      updateCopy(meta);
      updateDock();
    } else {
      stageEl.dataset.scene = key;
    }

    if (instant) {
      if (previous) retireScene(previous);
    } else {
      tween(next.container, "alpha", 1, 0.95, easeOut);
      if (previous) {
        tween(previous.container, "alpha", 0, 0.95, easeIn, () => retireScene(previous));
      }
    }

    scheduleAuto();
  }

  function rebuild(force = false) {
    if (!booted || contextLost) return;
    const nextW = app.screen.width || stageEl.clientWidth || W;
    const nextH = app.screen.height || stageEl.clientHeight || H;
    if (!nextW || !nextH) return;
    if (force !== true && Math.abs(nextW - W) < 3 && Math.abs(nextH - H) < 3) return;
    const key = currentKey || (IS_DEMO ? "spring" : seasonForMonth());
    W = nextW;
    H = nextH;

    tweens.length = 0;
    for (const scene of alive.slice()) destroyScene(scene);
    alive.length = 0;
    current = null;

    sceneRoot.removeChildren();
    grain.width = W;
    grain.height = H;
    vignette.width = W;
    vignette.height = H;

    currentKey = null;
    switchScene(key, true);
    if (!desiredRunning && !document.hidden) app.renderer.render(app.stage);
  }

  /* ------------------------------- UI ------------------------------- */

  function updateCopy(meta) {
    if (!copyEl) return;
    copyEl.classList.add("fade");
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      kickerEl.textContent = meta.kicker;
      titleEl.textContent = meta.title;
      descEl.textContent = meta.desc;
      copyEl.classList.remove("fade");
    }, 180);
  }

  function buildDock() {
    if (!dockEl) return;
    dockEl.replaceChildren();
    for (const key of ORDER) {
      const meta = SCENES[key];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scene-btn";
      button.dataset.scene = key;
      button.style.setProperty("--c", meta.color);
      button.innerHTML =
        `<span class="scene-dot" aria-hidden="true"></span>` +
        `<span class="scene-name">${meta.label}</span>` +
        `<span class="scene-sub">${key}</span>`;
      button.addEventListener("click", () => {
        switchScene(key, false);
        scheduleAuto();
      });
      dockEl.appendChild(button);
    }
  }

  function updateDock() {
    if (!dockEl) return;
    for (const button of dockEl.children) {
      button.setAttribute("aria-pressed", button.dataset.scene === currentKey ? "true" : "false");
    }
  }

  function updateAutoUI() {
    if (!autoBtn) return;
    autoBtn.setAttribute("aria-pressed", autoOn ? "true" : "false");
    autoLabel.textContent = autoOn ? "自动轮播" : "已暂停";
  }

  function scheduleAuto() {
    window.clearTimeout(autoTimer);
    if (!IS_DEMO || !autoOn || REDUCED || contextLost) return;
    autoTimer = window.setTimeout(() => {
      const index = ORDER.indexOf(currentKey);
      switchScene(ORDER[(index + 1) % ORDER.length], false);
    }, AUTO_DELAY);
  }

  /* ------------------------------ boot ------------------------------ */

  async function boot() {
    await app.init({
      resizeTo: stageEl,
      backgroundAlpha: 0,
      antialias: !LOW_POWER,
      resolution: Math.min(window.devicePixelRatio || 1, MAX_DPR),
      autoDensity: true,
      powerPreference: LOW_POWER ? "low-power" : "high-performance",
      preference: "webgl",
    });
    app.ticker.maxFPS = MAX_FPS;

    stageEl.appendChild(app.canvas);
    W = app.screen.width || stageEl.clientWidth || 1200;
    H = app.screen.height || stageEl.clientHeight || 675;
    if (!app.screen.width || !app.screen.height) app.renderer.resize(W, H);

    buildTextures();

    sceneRoot = new PIXI.Container();
    app.stage.addChild(sceneRoot);

    grain = new PIXI.TilingSprite({ texture: TEX.grain, width: W, height: H });
    grain.alpha = 0.045;
    grain.blendMode = "overlay";
    grain.visible = !LOW_POWER;
    app.stage.addChild(grain);

    vignette = new PIXI.Sprite(TEX.vignette);
    vignette.width = W;
    vignette.height = H;
    vignette.alpha = 0.92;
    vignette.visible = !LOW_POWER;
    app.stage.addChild(vignette);

    buildDock();
    updateAutoUI();

    if (autoBtn) {
      autoBtn.addEventListener("click", () => {
        autoOn = !autoOn;
        updateAutoUI();
        scheduleAuto();
      });
    }

    const requested = params.get("scene");
    const initial = SCENES[requested]
      ? requested
      : IS_DEMO
        ? "spring"
        : seasonForMonth();
    switchScene(initial, true);
    if (!IS_DEMO) window.addEventListener("piupiu:roundstart", handleRoundStart);
    booted = true;
    if (!desiredRunning) {
      app.renderer.render(app.stage);
      app.ticker.stop();
    }
    syncRunningAttr();

    app.canvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        contextLost = true;
        app.ticker.stop();
        window.clearTimeout(autoTimer);
        syncRunningAttr();
      },
      false,
    );

    app.canvas.addEventListener(
      "webglcontextrestored",
      () => {
        contextLost = false;
        destroyTextures();
        buildTextures();
        if (grain) grain.texture = TEX.grain;
        if (vignette) vignette.texture = TEX.vignette;
        rebuild(true);
        if (desiredRunning && !document.hidden) {
          app.ticker.start();
          scheduleAuto();
        } else if (!document.hidden) {
          app.renderer.render(app.stage);
        }
        syncRunningAttr();
      },
      false,
    );

    if (DEBUG) {
      if (IS_DEMO) {
        window.__PIXI_DEMO__ = { app, switchScene, SCENES };
      }
      Object.assign(publicApi, {
        app,
        scenes: ORDER.slice(),
        setScene: (key) => switchScene(key, false),
        next: () => switchScene(ORDER[(ORDER.indexOf(currentKey) + 1) % ORDER.length], false),
        get current() {
          return currentKey;
        },
      });
    }

    app.ticker.add((ticker) => {
      const dt = Math.min(ticker.deltaMS / 1000, 0.05);
      const t = performance.now() / 1000;
      updateTweens(dt);
      for (let i = 0; i < alive.length; i++) alive[i].update(dt, t);
      for (let i = alive.length - 1; i >= 0; i--) {
        const scene = alive[i];
        if (scene !== current && scene.container.alpha <= 0.005) retireScene(scene);
      }
    });

    window.addEventListener("resize", debounce(220, () => rebuild(false)));
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(debounce(220, () => rebuild(false))).observe(stageEl);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        app.ticker.stop();
        window.clearTimeout(autoTimer);
      } else if (desiredRunning) {
        if (!contextLost) {
          app.ticker.start();
          scheduleAuto();
        }
      }
    });
  }

  // Low-power devices create the WebGL scene after the first paint (or on
  // the first start if the player is faster than the browser). This keeps
  // opening the menu instant without making every round wait for WebGL.
  if (IS_DEMO || !LOW_POWER) {
    ensureBoot();
  } else if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(ensureBoot, { timeout: 1200 });
  } else {
    window.setTimeout(ensureBoot, 450);
  }
})();
