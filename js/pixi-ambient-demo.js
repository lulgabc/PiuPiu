(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * PiuPiu · PixiJS ambient preview
   * All visuals are drawn procedurally: canvas gradients for backdrops,
   * soft sprites for particles, vector shapes for jellyfish, rain and
   * lightning. No emoji assets are used.
   * ------------------------------------------------------------------ */

  const stageEl = document.getElementById("stage");
  const copyEl = document.getElementById("sceneCopy");
  const kickerEl = document.getElementById("sceneKicker");
  const titleEl = document.getElementById("sceneTitle");
  const descEl = document.getElementById("sceneDesc");
  const dockEl = document.getElementById("dock");
  const autoBtn = document.getElementById("autoBtn");
  const autoLabel = document.getElementById("autoLabel");

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AUTO_DELAY = 16000;

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
      desc: "暖光、薄雾与慢慢下坠的枫叶",
      color: "#ffa65c",
    },
    winter: {
      label: "冬 · 极光",
      kicker: "WINTER",
      title: "冬夜极光",
      desc: "星河、雪幕与流动的极光",
      color: "#7ef2c8",
    },
    rain: {
      label: "雨 · 霓虹",
      kicker: "RAIN",
      title: "雨夜霓虹",
      desc: "雨线、霓虹与远处的雷声",
      color: "#8ea8ff",
    },
  };

  const ORDER = ["spring", "summer", "autumn", "winter", "rain"];
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
  let flash = null;
  let flashAlpha = 0;
  let current = null;
  let currentKey = null;
  let autoOn = !REDUCED;
  let autoTimer = 0;
  let copyTimer = 0;

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

    TEX.rain = makeTexture(4, 64, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(210,235,255,0)");
      g.addColorStop(0.72, "rgba(225,244,255,.95)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(1, 0, 2, h);
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

  function paintCity(ctx, w, h) {
    const rng = rngFor(77);
    const base = h * 0.81;
    paintGlow(ctx, w * 0.5, base, w * 0.6, [104, 132, 255, 0.14]);
    paintGlow(ctx, w * 0.2, h * 0.62, w * 0.3, [255, 92, 168, 0.08]);
    paintGlow(ctx, w * 0.86, h * 0.6, w * 0.26, [88, 205, 255, 0.08]);

    const farBase = base - h * 0.035;
    let fx = -14;
    ctx.fillStyle = "rgba(18,27,52,.55)";
    while (fx < w + 14) {
      const fw = 12 + rng() * 32;
      const fh = 20 + rng() * h * 0.13;
      ctx.fillRect(fx, farBase - fh, fw, fh);
      fx += fw + 2 + rng() * 9;
    }
    paintGlow(ctx, w * 0.5, farBase, w * 0.65, [80, 112, 210, 0.08]);

    let x = -20;
    while (x < w + 20) {
      const bw = 16 + rng() * 46;
      const bh = 34 + rng() * h * 0.22;
      const top = base - bh;
      ctx.fillStyle = "rgba(6,9,18,.94)";
      ctx.fillRect(x, top, bw, bh);
      if (rng() > 0.62) {
        ctx.fillStyle = "rgba(255,124,158,.5)";
        ctx.fillRect(x + bw * 0.5 - 1, top - 2, 2, 2);
      }
      for (let wy = top + 8; wy < base - 8; wy += 10) {
        for (let wx = x + 5; wx < x + bw - 5; wx += 9) {
          if (rng() > 0.6) {
            ctx.fillStyle = rng() > 0.5 ? "rgba(255,205,130,.55)" : "rgba(120,210,255,.4)";
            ctx.fillRect(wx, wy, 2.6, 3.4);
          }
        }
      }
      x += bw + 4 + rng() * 10;
    }

    ctx.fillStyle = "rgba(150,190,255,.14)";
    ctx.fillRect(0, base - 1, w, 1.4);

    const g = ctx.createLinearGradient(0, base, 0, h);
    g.addColorStop(0, "rgba(90,120,220,.18)");
    g.addColorStop(0.5, "rgba(50,80,160,.07)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, base, w, h - base);

    for (let i = 0; i < 14; i++) {
      const rx = rng() * w;
      const rw = 20 + rng() * 80;
      const rg = ctx.createLinearGradient(0, base, 0, h);
      rg.addColorStop(0, rng() > 0.5 ? "rgba(120,220,255,.12)" : "rgba(255,110,180,.11)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(rx, base, rw, h - base);
    }

    for (let i = 0; i < 7; i++) {
      const nx = rng() * w;
      const nw = 3 + rng() * 9;
      const warm = rng() > 0.5;
      const ng = ctx.createLinearGradient(0, base, 0, h);
      ng.addColorStop(0, warm ? "rgba(255,120,190,.22)" : "rgba(120,228,255,.2)");
      ng.addColorStop(0.55, warm ? "rgba(255,120,190,.06)" : "rgba(120,228,255,.05)");
      ng.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ng;
      ctx.fillRect(nx, base, nw, h - base);
    }
    paintGlow(ctx, w * 0.5, base + 4, w * 0.58, [100, 150, 255, 0.09]);
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

    rain(ctx, w, h) {
      paintGradient(ctx, w, h, [
        [0, "#04070f"],
        [0.34, "#091123"],
        [0.62, "#121b33"],
        [0.84, "#1a2340"],
        [1, "#0e1428"],
      ]);
      paintGlow(ctx, w * 0.5, h * 0.55, w * 0.55, [96, 126, 255, 0.12]);
      paintCity(ctx, w, h);
      const fog = ctx.createLinearGradient(0, h * 0.6, 0, h);
      fog.addColorStop(0, "rgba(120,160,255,0)");
      fog.addColorStop(0.75, "rgba(110,150,255,.06)");
      fog.addColorStop(1, "rgba(80,120,230,.11)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);
    },
  };

  function makeBackground(key) {
    const bw = Math.min(1600, Math.max(880, Math.round(W)));
    const bh = Math.min(1040, Math.max(540, Math.round(H)));
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
    for (let i = 0; i < 16; i++) {
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
    const count = REDUCED ? 26 : 62;
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
    for (let i = 0; i < 7; i++) {
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
    for (let i = 0; i < 34; i++) {
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
    for (const spec of jellySpecs) {
      const jelly = createJellyfish(W * spec[0], H * spec[1], spec[2], spec[3], spec[4]);
      root.addChild(jelly.container);
      jellies.push(jelly);
    }

    const fish = [];
    for (let i = 0; i < 5; i++) {
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
    for (let i = 0; i < 36; i++) {
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
    for (let i = 0; i < 24; i++) {
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
    const count = REDUCED ? 26 : 56;
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

      for (let i = 0; i < spec.count; i++) {
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
    for (let i = 0; i < (REDUCED ? 45 : 95); i++) {
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
    const count = REDUCED ? 46 : 130;
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

  /* ------------------------------ rain ------------------------------ */

  function buildRain() {
    const base = sceneBase("rain");
    const root = base.container;

    const mist = [];
    for (let i = 0; i < 3; i++) {
      const sprite = addGlow(root, rand(W * 0.2, W * 0.8), H * (0.62 + i * 0.1), W * rand(0.5, 0.8), 0x92b8ff, 0.05);
      sprite.blendMode = "screen";
      mist.push({ sprite, x: sprite.x, phase: rand(0, Math.PI * 2), speed: rand(0.05, 0.11) });
    }

    const drops = [];
    const rainLayer = new PIXI.Container();
    root.addChild(rainLayer);
    const count = REDUCED ? 70 : 230;
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      const sprite = new PIXI.Sprite(TEX.rain);
      sprite.anchor.set(0.5);
      sprite.width = 0.8 + depth * 2.4;
      sprite.height = 13 + depth * 34;
      sprite.alpha = 0.14 + depth * 0.36;
      sprite.rotation = 0.16;
      sprite.tint = 0xbfe4ff;
      sprite.position.set(rand(-W * 0.2, W + 40), rand(-H, H));
      rainLayer.addChild(sprite);
      drops.push({
        sprite,
        v: 560 + depth * 720 + rand(0, 140),
        depth,
        x: sprite.x,
        y: sprite.y,
      });
    }

    const rippleLayer = new PIXI.Container();
    root.addChild(rippleLayer);
    const ripples = [];
    for (let i = 0; i < 12; i++) {
      const g = new PIXI.Graphics();
      g.blendMode = "add";
      rippleLayer.addChild(g);
      ripples.push({
        g,
        x: rand(0, W),
        y: rand(H * 0.82, H * 0.98),
        life: rand(0, 1.6),
        max: rand(1.2, 1.9),
      });
    }

    let nextBolt = rand(2.5, 4.5);
    let bolt = null;
    let boltLife = 0;

    function strike() {
      flashAlpha = 0.5;
      if (bolt) {
        bolt.destroy({ children: true });
        bolt = null;
      }
      const pts = [];
      let x = rand(W * 0.14, W * 0.86);
      let y = -24;
      pts.push([x, y]);
      for (let i = 0; i < 10; i++) {
        x += rand(-W * 0.055, W * 0.055);
        y += H * 0.055;
        pts.push([x, y]);
      }
      const branchAt = pts[4 + randInt(0, 3)];
      const branch = [
        branchAt,
        [branchAt[0] + rand(-W * 0.11, W * 0.11), branchAt[1] + rand(H * 0.04, H * 0.11)],
        [branchAt[0] + rand(-W * 0.14, W * 0.14), branchAt[1] + rand(H * 0.07, H * 0.15)],
      ];

      const group = new PIXI.Container();
      group.blendMode = "add";
      const glowLine = new PIXI.Graphics();
      drawPolyline(glowLine, pts);
      glowLine.stroke({ width: 9, color: 0x9fd8ff, alpha: 0.2 });
      drawPolyline(glowLine, branch);
      glowLine.stroke({ width: 5, color: 0x9fd8ff, alpha: 0.12 });

      const coreLine = new PIXI.Graphics();
      drawPolyline(coreLine, pts);
      coreLine.stroke({ width: 2.2, color: 0xf2f9ff, alpha: 0.95 });
      drawPolyline(coreLine, branch);
      coreLine.stroke({ width: 1.4, color: 0xe4f3ff, alpha: 0.7 });

      group.addChild(glowLine, coreLine);
      root.addChild(group);
      bolt = group;
      boltLife = 0.42;
    }

    if (new URLSearchParams(window.location.search).has("debug")) {
      window.__PIXI_RAIN_STRIKE__ = strike;
    }

    return {
      ...base,
      update(dt, t) {
        for (const drop of drops) {
          drop.y += drop.v * dt;
          drop.x += drop.v * 0.16 * dt;
          drop.sprite.y = drop.y;
          drop.sprite.x = drop.x;
          if (drop.y > H + 40 || drop.x > W + 60) {
            drop.y = rand(-H * 0.45, -20);
            drop.x = rand(-W * 0.25, W * 0.9);
          }
        }

        for (const m of mist) {
          m.sprite.x = m.x + Math.sin(t * m.speed + m.phase) * W * 0.05;
        }

        for (const r of ripples) {
          r.life += dt;
          if (r.life > r.max) {
            r.life = 0;
            r.x = rand(0, W);
            r.y = rand(H * 0.82, H * 0.98);
            r.max = rand(1.2, 1.9);
          }
          const k = r.life / r.max;
          const radius = 6 + easeOut(k) * 30;
          r.g.clear();
          r.g.ellipse(r.x, r.y, radius, radius * 0.27);
          r.g.stroke({ width: 1.1, color: 0x9fe0ff, alpha: (1 - k) * 0.3 });
        }

        nextBolt -= dt;
        if (nextBolt <= 0) {
          nextBolt = rand(5.5, 10);
          strike();
        }
        if (bolt) {
          boltLife -= dt;
          bolt.alpha = clamp(boltLife / 0.42, 0, 1);
          if (boltLife <= 0) {
            bolt.destroy({ children: true });
            bolt = null;
          }
        }
        flashAlpha = Math.max(0, flashAlpha - dt * 2.4);
        flash.alpha = flashAlpha;
      },
    };
  }

  function drawPolyline(graphics, points) {
    graphics.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) graphics.lineTo(points[i][0], points[i][1]);
  }

  const BUILDERS = {
    spring: buildSpring,
    summer: buildSummer,
    autumn: buildAutumn,
    winter: buildWinter,
    rain: buildRain,
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

  function switchScene(key, instant) {
    if (!SCENES[key] || key === currentKey) return;
    const meta = SCENES[key];
    const next = BUILDERS[key]();
    next.container.alpha = instant ? 1 : 0;
    sceneRoot.addChild(next.container);
    alive.push(next);

    const previous = current;
    current = next;
    currentKey = key;

    updateCopy(meta);
    updateDock();

    flashAlpha = 0;
    if (flash) flash.alpha = 0;

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

  function rebuild() {
    const nextW = app.screen.width;
    const nextH = app.screen.height;
    if (Math.abs(nextW - W) < 3 && Math.abs(nextH - H) < 3) return;
    const key = currentKey || "spring";
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

    if (flash) flash.destroy();
    flash = createFlash();
    flashAlpha = 0;

    currentKey = null;
    switchScene(key, true);
  }

  /* ------------------------------- UI ------------------------------- */

  function updateCopy(meta) {
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
    for (const button of dockEl.children) {
      button.setAttribute("aria-pressed", button.dataset.scene === currentKey ? "true" : "false");
    }
  }

  function updateAutoUI() {
    autoBtn.setAttribute("aria-pressed", autoOn ? "true" : "false");
    autoLabel.textContent = autoOn ? "自动轮播" : "已暂停";
  }

  function scheduleAuto() {
    window.clearTimeout(autoTimer);
    if (!autoOn || REDUCED) return;
    autoTimer = window.setTimeout(() => {
      const index = ORDER.indexOf(currentKey);
      switchScene(ORDER[(index + 1) % ORDER.length], false);
    }, AUTO_DELAY);
  }

  function createFlash() {
    const graphics = new PIXI.Graphics().rect(0, 0, W, H).fill({ color: 0xe8f2ff, alpha: 1 });
    graphics.alpha = 0;
    graphics.blendMode = "add";
    app.stage.addChild(graphics);
    return graphics;
  }

  /* ------------------------------ boot ------------------------------ */

  async function boot() {
    await app.init({
      resizeTo: stageEl,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: "high-performance",
      preference: "webgl",
    });

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
    app.stage.addChild(grain);

    vignette = new PIXI.Sprite(TEX.vignette);
    vignette.width = W;
    vignette.height = H;
    vignette.alpha = 0.92;
    app.stage.addChild(vignette);

    flash = createFlash();

    buildDock();
    updateAutoUI();

    autoBtn.addEventListener("click", () => {
      autoOn = !autoOn;
      updateAutoUI();
      scheduleAuto();
    });

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("scene");
    const initial = SCENES[requested] ? requested : "spring";
    switchScene(initial, true);
    if (params.has("debug")) {
      window.__PIXI_DEMO__ = { app, switchScene, SCENES };
    }

    app.ticker.add((ticker) => {
      const dt = Math.min(ticker.deltaMS / 1000, 0.05);
      const t = performance.now() / 1000;
      updateTweens(dt);
      for (let i = 0; i < alive.length; i++) alive[i].update(dt, t);
    });

    window.addEventListener("resize", debounce(220, rebuild));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        window.clearTimeout(autoTimer);
      } else {
        scheduleAuto();
      }
    });
  }

  boot().catch((error) => {
    console.error("PiuPiu Pixi preview failed:", error);
    stageEl.innerHTML =
      '<div style="position:absolute;inset:0;display:grid;place-items:center;color:#93a0c0;font-size:13px">PixiJS 初始化失败，请刷新重试</div>';
  });
})();
