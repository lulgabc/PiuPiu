(() => {
  "use strict";

  const PETS = {
    mochi: {
      image: "pets/mochi.webp",
      base: "pets/mochi-base.webp",
      phase: 0.7,
      eyes: [
        { x: 0.367, y: 0.349, rx: 0.052, ry: 0.046 },
        { x: 0.666, y: 0.349, rx: 0.052, ry: 0.046 },
      ],
      eyeInk: "#3a233e",
      eyeSkin: "#f4a8c2",
      mouth: null,
    },
    gummy: {
      image: "pets/gummy.webp",
      base: "pets/gummy-base.webp",
      phase: 2.1,
      eyes: [
        { x: 0.341, y: 0.352, rx: 0.142, ry: 0.150 },
        { x: 0.664, y: 0.352, rx: 0.142, ry: 0.150 },
      ],
      eyeInk: "#1f3f36",
      eyeSkin: "#9edfc7",
      mouth: { x: 0.5, y: 0.567, rx: 0.365, ry: 0.158 },
    },
  };

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STATIC = new URLSearchParams(location.search).has("static");
  window.__MONSTER_STATIC = STATIC;
  const BARE = new URLSearchParams(location.search).has("bare");
  window.__MONSTER_BARE = BARE;
  const instances = [];
  const byPet = new Map();

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not load ${src}`));
      image.src = src;
    });
  }

  function makeEyePatch(base, eye, padding = 1.32) {
    const iw = base.width;
    const ih = base.height;
    const rx = eye.rx * iw * padding;
    const ry = eye.ry * ih * padding;
    const cx = eye.x * iw;
    const cy = eye.y * ih;
    const x = Math.max(0, Math.floor(cx - rx));
    const y = Math.max(0, Math.floor(cy - ry));
    const w = Math.min(iw - x, Math.ceil(rx * 2));
    const h = Math.min(ih - y, Math.ceil(ry * 2));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, w);
    canvas.height = Math.max(1, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(base, x, y, w, h, 0, 0, w, h);
    ctx.globalCompositeOperation = "destination-in";
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(w / 2, h / 2);
    const mask = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    mask.addColorStop(0, "rgba(0,0,0,1)");
    mask.addColorStop(0.72, "rgba(0,0,0,1)");
    mask.addColorStop(1, "rgba(0,0,0,0)");
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fillStyle = mask;
    ctx.fill();
    ctx.restore();
    return { canvas, x, y, w, h };
  }

  class PetView {
    constructor(canvas, pet, assets, size) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.pet = pet;
      this.image = assets.image;
      this.base = assets.base;
      this.eyePatches = pet.eyes.map((eye) => makeEyePatch(assets.base, eye));
      this.size = size;
      this.phase = pet.phase + (size === "mini" ? 1.3 : 0);
      this.now = performance.now() / 1000;
      this.nextBlink = this.now + 2 + Math.random() * 3.5;
      this.blinkAt = null;
      this.nextChomp = this.now + 2.2 + Math.random() * 3.2;
      this.chompAt = null;
      this.happyUntil = 0;
      this.sleeping = false;
      this.dpr = 1;
      this.cssW = 0;
      this.cssH = 0;
      this.resize();
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(canvas);
      canvas.addEventListener("pointerdown", () => {
        if (REDUCED) return;
        this.happy();
      });
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cssW = w;
      this.cssH = h;
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = "high";
    }

    blink() {
      this.blinkAt = performance.now() / 1000;
    }

    chomp() {
      if (!this.pet.mouth) return;
      this.chompAt = performance.now() / 1000;
    }

    happy() {
      const now = performance.now() / 1000;
      this.happyUntil = now + 1.4;
      this.blinkAt = now + 0.18;
      if (this.pet.mouth) this.chompAt = now + 0.05;
    }

    toggleSleep() {
      this.sleeping = !this.sleeping;
      if (!this.sleeping) {
        this.nextBlink = performance.now() / 1000 + 1.8;
        this.blinkAt = null;
      }
      return this.sleeping;
    }

    draw(now) {
      const ctx = this.ctx;
      const w = this.cssW;
      const h = this.cssH;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      if (BARE) {
        const th = h * 0.84;
        const tw = this.image.width * (th / this.image.height);
        ctx.drawImage(this.image, (w - tw) / 2, h * 0.925 - th, tw, th);
        return;
      }

      const targetH = h * (this.size === "large" ? 0.84 : 0.86);
      const scale = targetH / this.image.height;
      const drawW = this.image.width * scale;
      const drawH = targetH;
      const ground = h * 0.925;
      const cx = w / 2;
      const t = now + this.phase;

      let energy = 0;
      let hop = 0;
      if (now < this.happyUntil) {
        const p = 1 - (this.happyUntil - now) / 1.4;
        energy = 1;
        hop = -Math.abs(Math.sin(p * Math.PI * 3)) * Math.min(30, targetH * 0.13);
      }

      let sx = 1 + (0.032 + 0.022 * energy) * Math.sin(t * (2.15 + energy * 1.1));
      let sy = 1 - (0.028 + 0.02 * energy) * Math.sin(t * (2.15 + energy * 1.1) + 0.7);
      let shear = (0.055 + 0.035 * energy) * Math.sin(t * (1.55 + energy * 0.7) + this.phase * 0.4);
      let rot = (0.03 + 0.02 * energy) * Math.sin(t * (1.15 + energy * 0.5) + this.phase);
      let bob = Math.sin(t * 2) * 2.2 + hop;

      if (!STATIC && this.sleeping) {
        sx = 1 + 0.012 * Math.sin(t * 1.1);
        sy = 1 + 0.018 * Math.sin(t * 1.1 + 1.2);
        shear = 0.012 * Math.sin(t * 0.9);
        rot = 0.012 * Math.sin(t * 0.8);
        bob = 0;
      }

      const shadowScale = 1 - Math.min(0.32, Math.abs(bob) / 100);
      const shadow = ctx.createRadialGradient(cx, ground + 3, 0, cx, ground + 3, drawW * 0.42);
      shadow.addColorStop(0, `rgba(108, 57, 98, ${0.22 * shadowScale})`);
      shadow.addColorStop(1, "rgba(108, 57, 98, 0)");
      ctx.save();
      ctx.translate(cx, ground + 3);
      ctx.scale(1, 0.23);
      ctx.beginPath();
      ctx.arc(0, 0, drawW * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = shadow;
      ctx.fill();
      ctx.restore();

      const blink = this.blinkAmount(now);
      const chomp = this.chompAmount(now);

      ctx.save();
      ctx.translate(cx, ground + bob);
      ctx.rotate(rot);
      ctx.scale(sx, sy);
      ctx.transform(1, 0, shear, 1, 0, 0);
      ctx.translate(-drawW / 2, -drawH);

      ctx.drawImage(this.image, 0, 0, drawW, drawH);
      if (!STATIC && blink > 0.01) this.drawBlink(blink, drawW, drawH);
      if (!STATIC && chomp > 0.01) this.drawMouth(chomp, drawW, drawH);

      if (this.sleeping) {
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#7b5a86";
        ctx.font = `800 ${Math.max(13, drawW * 0.08)}px ui-rounded, "SF Pro Rounded", sans-serif`;
        const zz = 0.5 + 0.5 * Math.sin(now * 2);
        ctx.fillText("z", drawW * 0.65, -Math.max(12, drawH * 0.06) - zz * 6);
        ctx.restore();
      }

      ctx.restore();
    }

    blinkAmount(now) {
      if (this.sleeping) return 1;
      if (this.blinkAt != null) {
        const age = now - this.blinkAt;
        if (age >= 0.24) {
          this.blinkAt = null;
          return 0;
        }
        return Math.sin((age / 0.24) * Math.PI);
      }
      if (now > this.nextBlink) {
        this.blinkAt = now;
        this.nextBlink = now + 2.4 + Math.random() * 4.2;
        return 0.001;
      }
      return 0;
    }

    chompAmount(now) {
      if (!this.pet.mouth || this.sleeping) return 0;
      if (this.chompAt != null) {
        const age = now - this.chompAt;
        if (age >= 0.62) {
          this.chompAt = null;
          return 0;
        }
        return Math.sin((age / 0.62) * Math.PI);
      }
      if (now > this.nextChomp) {
        this.chompAt = now;
        this.nextChomp = now + 2.6 + Math.random() * 4.4;
        return 0.001;
      }
      return 0;
    }

    drawBlink(amount, drawW, drawH) {
      if (amount < 0.15) return;
      const ctx = this.ctx;
      const ink = this.pet.eyeInk || "#3a233e";
      const scaleX = drawW / this.image.width;
      const scaleY = drawH / this.image.height;
      for (let i = 0; i < this.pet.eyes.length; i += 1) {
        const eye = this.pet.eyes[i];
        const patch = this.eyePatches[i];
        const ex = eye.x * drawW;
        const ey = eye.y * drawH;
        const rx = eye.rx * drawW;
        const ry = eye.ry * drawH;
        ctx.drawImage(
          patch.canvas,
          patch.x * scaleX,
          patch.y * scaleY,
          patch.w * scaleX,
          patch.h * scaleY,
        );
        ctx.save();
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(2, drawW * 0.011);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ex - rx * 0.66, ey - ry * 0.03);
        ctx.quadraticCurveTo(ex, ey + ry * 0.36, ex + rx * 0.66, ey - ry * 0.03);
        ctx.stroke();
        ctx.restore();
      }
    }

    drawMouth(amount, drawW, drawH) {
      const mouth = this.pet.mouth;
      if (!mouth) return;
      const ctx = this.ctx;
      const mx = mouth.x * drawW;
      const my = mouth.y * drawH;
      const rx = mouth.rx * drawW;
      const ry = mouth.ry * drawH;
      const scaleY = 1 + 0.2 * amount;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(mx, my, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.base, 0, 0, drawW, drawH);
      const sx = (mouth.x - mouth.rx) * this.image.width;
      const sy = (mouth.y - mouth.ry) * this.image.height;
      const sw = mouth.rx * 2 * this.image.width;
      const sh = mouth.ry * 2 * this.image.height;
      const dx = mx - rx;
      const dh = ry * 2 * scaleY;
      ctx.drawImage(this.image, sx, sy, sw, sh, dx, my - dh / 2, rx * 2, dh);
      ctx.restore();
    }
  }

  async function boot() {
    const entries = Object.entries(PETS);
    const assets = new Map();
    await Promise.all(
      entries.map(async ([id, pet]) => {
        const [image, base] = await Promise.all([loadImage(pet.image), loadImage(pet.base)]);
        assets.set(id, { image, base });
      }),
    );

    document.querySelectorAll(".pet-canvas").forEach((canvas) => {
      const id = canvas.dataset.pet;
      const pet = PETS[id];
      const asset = assets.get(id);
      if (!pet || !asset) return;
      const size = canvas.dataset.size === "mini" ? "mini" : "large";
      const view = new PetView(canvas, pet, asset, size);
      instances.push(view);
      window.__MONSTER_VIEWS = instances;
      if (!byPet.has(id)) byPet.set(id, []);
      byPet.get(id).push(view);
    });

    document.querySelectorAll(".actions button").forEach((button) => {
      button.addEventListener("click", () => {
        const views = byPet.get(button.dataset.pet) || [];
        const act = button.dataset.act;
        if (act === "blink") views.forEach((view) => view.blink());
        else if (act === "happy") views.forEach((view) => view.happy());
        else if (act === "chomp") views.forEach((view) => view.chomp());
        else if (act === "sleep") {
          let sleeping = false;
          views.forEach((view) => {
            sleeping = view.toggleSleep();
          });
          button.textContent = sleeping ? "醒来" : "睡觉";
        }
      });
    });

    const loop = () => {
      const now = performance.now() / 1000;
      for (const view of instances) view.draw(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  boot().catch((error) => {
    console.error(error);
    const hero = document.querySelector(".sub");
    if (hero) hero.textContent = "宠物素材加载失败，请刷新重试。";
  });
})();
