export const SCRIPT_PATHS = Object.freeze({
  education: "js/education.js",
  families: "js/families.js",
  poetry: "js/poetry.js",
  matter: "js/vendor/matter.min.js",
  pixi: "js/vendor/pixi.min.js",
  pixiAmbient: "js/pixi-ambient.js",
});

const inflight = new Map();

function getGlobal() {
  return typeof window !== "undefined" ? window : globalThis;
}

function normalizeScriptKey(src) {
  const value = String(src || "").trim();
  if (!value) return "";
  try {
    const base =
      typeof location !== "undefined" && location.href
        ? location.href
        : "https://local.invalid/";
    return new URL(value, base).pathname;
  } catch {
    return value.replace(/[?#].*$/, "");
  }
}

function findExistingScript(doc, src) {
  const key = normalizeScriptKey(src);
  const scripts = doc.querySelectorAll ? doc.querySelectorAll("script[src]") : doc.scripts || [];
  for (const el of scripts) {
    const attr = el.getAttribute ? el.getAttribute("src") : el.src;
    if (attr && normalizeScriptKey(attr) === key) return el;
  }
  return null;
}

export function loadScriptOnce(src) {
  const key = normalizeScriptKey(src);
  if (!key) {
    return Promise.reject(new Error("Invalid script src"));
  }
  if (inflight.has(key)) {
    return inflight.get(key);
  }

  const doc = typeof globalThis !== "undefined" ? globalThis.document : null;
  if (!doc || typeof doc.createElement !== "function") {
    return Promise.reject(new Error(`Cannot load script without document: ${src}`));
  }

  const existing = findExistingScript(doc, src);
  if (existing && (existing.dataset?.loaded === "true" || existing.readyState === "complete")) {
    const resolved = Promise.resolve();
    inflight.set(key, resolved);
    return resolved;
  }

  const promise = new Promise((resolve, reject) => {
    const script = existing || doc.createElement("script");
    if (!existing) {
      script.src = src;
      script.async = true;
      if (script.dataset) script.dataset.loading = "true";
    }

    const cleanup = () => {
      if (typeof script.removeEventListener === "function") {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
        script.removeEventListener("abort", onAbort);
      }
    };

    const onLoad = () => {
      cleanup();
      if (script.dataset) {
        delete script.dataset.loading;
        script.dataset.loaded = "true";
      }
      resolve();
    };

    const fail = (reason) => {
      cleanup();
      inflight.delete(key);
      if (!existing && typeof script.remove === "function") {
        script.remove();
      }
      reject(new Error(`Failed to load script (${reason}): ${src}`));
    };

    const onError = () => fail("error");
    const onAbort = () => fail("abort");

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    script.addEventListener("abort", onAbort);

    if (!existing) {
      const mount = doc.head || doc.body || doc.documentElement;
      if (!mount || typeof mount.appendChild !== "function") {
        fail("no-mount");
        return;
      }
      mount.appendChild(script);
    }
  });

  inflight.set(key, promise);
  return promise;
}

export async function ensureEducationLoaded() {
  const g = getGlobal();
  if (Array.isArray(g.PIU_EDUCATION)) return g.PIU_EDUCATION;
  await loadScriptOnce(SCRIPT_PATHS.education);
  if (!Array.isArray(g.PIU_EDUCATION)) {
    throw new Error("PIU_EDUCATION missing after loading js/education.js");
  }
  return g.PIU_EDUCATION;
}

export async function ensureFamiliesLoaded() {
  const g = getGlobal();
  if (Array.isArray(g.PIU_FAMILIES)) return g.PIU_FAMILIES;
  await loadScriptOnce(SCRIPT_PATHS.families);
  if (!Array.isArray(g.PIU_FAMILIES)) {
    throw new Error("PIU_FAMILIES missing after loading js/families.js");
  }
  return g.PIU_FAMILIES;
}

export async function ensurePoetryLoaded() {
  const g = getGlobal();
  if (g.PiuPoetry && typeof g.PiuPoetry === "object") return g.PiuPoetry;
  await loadScriptOnce(SCRIPT_PATHS.poetry);
  if (!g.PiuPoetry || typeof g.PiuPoetry !== "object") {
    throw new Error("PiuPoetry missing after loading js/poetry.js");
  }
  return g.PiuPoetry;
}

export async function ensureMatterLoaded() {
  const g = getGlobal();
  if (g.Matter && g.Matter.Engine) return g.Matter;
  await loadScriptOnce(SCRIPT_PATHS.matter);
  if (!g.Matter || !g.Matter.Engine) {
    throw new Error("Matter.Engine missing after loading js/vendor/matter.min.js");
  }
  return g.Matter;
}

export async function ensurePixiLoaded() {
  const g = getGlobal();
  if (!g.PIXI) {
    await loadScriptOnce(SCRIPT_PATHS.pixi);
  }
  if (!g.PIXI) {
    throw new Error("PIXI missing after loading js/vendor/pixi.min.js");
  }
  if (!g.PiuAmbient) {
    await loadScriptOnce(SCRIPT_PATHS.pixiAmbient);
  }
  return {
    PIXI: g.PIXI || null,
    PiuAmbient: g.PiuAmbient || null,
  };
}

export function _resetLoaderForTests() {
  inflight.clear();
}
