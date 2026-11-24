import assert from 'node:assert/strict';
import { getMockInitScript } from './mocks.mjs';

export const VIEWPORTS = Object.freeze({
  desktop: { id: 'desktop', name: 'Desktop', width: 1280, height: 800, deviceScaleFactor: 1, mobile: false, hasTouch: false },
  mobile: { id: 'mobile', name: 'Mobile Phone', width: 390, height: 844, deviceScaleFactor: 2, mobile: true, hasTouch: true },
  tablet_p: { id: 'tablet_p', name: 'Tablet Portrait', width: 768, height: 1024, deviceScaleFactor: 2, mobile: true, hasTouch: true },
  tablet_l: { id: 'tablet_l', name: 'Tablet Landscape', width: 1024, height: 768, deviceScaleFactor: 2, mobile: true, hasTouch: true },
});

export const TINY_VIEWPORT = Object.freeze({
  id: 'tiny',
  name: 'Tiny Phone',
  width: 320,
  height: 568,
  deviceScaleFactor: 2,
  mobile: true,
  hasTouch: true,
});

export const TARGET_VIEWPORT_LIST = Object.freeze([
  VIEWPORTS.desktop,
  VIEWPORTS.mobile,
  VIEWPORTS.tablet_p,
  VIEWPORTS.tablet_l,
]);

export const LEGACY_LEAK_RGBS = Object.freeze([
  'rgb(10, 16, 36)',   // #0a1024
  'rgb(11, 18, 40)',   // #0b1228
  'rgb(17, 28, 58)',   // #111c3a
  'rgb(23, 37, 74)',   // #17254a
  'rgb(38, 50, 82)',   // #263252
  'rgb(110, 214, 255)', // #6ed6ff
  'rgb(92, 242, 214)', // #5cf2d6
  'rgb(29, 43, 80)',   // #1d2b50
  'rgb(13, 20, 48)',   // #0d1430
  'rgb(9, 14, 32)',    // #090e20
]);

export const LEGACY_LEAK_TRIPLETS = Object.freeze([
  [10, 16, 36],
  [11, 18, 40],
  [17, 28, 58],
  [23, 37, 74],
  [38, 50, 82],
  [110, 214, 255],
  [92, 242, 214],
  [29, 43, 80],
  [13, 20, 48],
  [9, 14, 32],
]);

export function parseRgb(colorStr, { minAlpha = 0 } = {}) {
  if (!colorStr || colorStr === 'transparent') return null;
  const m = String(colorStr).match(/rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/i);
  if (!m) return null;
  let a = 1;
  if (m[4] !== undefined) {
    a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : Number(m[4]);
  }
  if (!Number.isFinite(a) || a === 0 || a < minAlpha) return null;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a };
}

export function extractOpaqueGradientStops(bgImage, { minAlpha = 0.85 } = {}) {
  if (!bgImage || bgImage === 'none') return [];
  const matches = String(bgImage).match(/rgba?\([^)]+\)/gi) || [];
  const stops = [];
  for (const token of matches) {
    const parsed = parseRgb(token, { minAlpha });
    if (parsed) stops.push(parsed);
  }
  return stops;
}

export function compositeOver(fg, bg) {
  const a = fg.a ?? 1;
  if (a >= 1) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

export function relativeLuminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function makeTestProfile(overrides = {}) {
  const now = Date.now();
  return {
    id: overrides.id || 'p_e2e_default',
    name: overrides.name || 'Tester',
    avatar: overrides.avatar || '🦊',
    total: 0,
    best: 0,
    correct: 0,
    rounds: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export async function openApp(browser, {
  viewport = VIEWPORTS.desktop,
  path = '/',
  mockOptions = {},
  seed = null,
  withPlayer = false,
} = {}) {
  const effectiveSeed = seed ? { ...seed } : {};
  if (withPlayer && !effectiveSeed['piupiu.profiles']) {
    const p = makeTestProfile(typeof withPlayer === 'object' ? withPlayer : {});
    effectiveSeed['piupiu.profiles'] = JSON.stringify([p]);
    effectiveSeed['piupiu.user'] = p.id;
  }

  const initScript = getMockInitScript({
    ...mockOptions,
    seedStorage: Object.keys(effectiveSeed).length ? effectiveSeed : mockOptions.seedStorage,
  });

  const page = await browser.newPage({
    viewport,
    initScripts: [initScript],
  });

  await page.goto(path);
  await page.waitForSelector('#startBtn', { visible: false, timeout: 10000 });
  // Let initial microtasks/init settle
  await page.waitFor(() => Boolean(document.getElementById('modeSwitch')), { timeout: 6000 });
  return page;
}

export async function seedStorage(page, entries) {
  await page.eval((data) => {
    for (const [k, v] of Object.entries(data)) {
      if (v === null || v === undefined) {
        localStorage.removeItem(k);
      } else {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }
  }, entries);
}

export async function readStorage(page, key) {
  return page.eval((k) => localStorage.getItem(k), key);
}

export async function readJsonStorage(page, key, fallback = null) {
  return page.eval((k, fb) => {
    const raw = localStorage.getItem(k);
    if (raw == null) return fb;
    try {
      return JSON.parse(raw);
    } catch {
      return fb;
    }
  }, key, fallback);
}

export async function clearStorage(page) {
  await page.eval(() => localStorage.clear());
}

export async function selectMode(page, mode) {
  const sel = `#modeSwitch [data-mode="${mode}"]`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.waitFor(
    (s) => {
      const btn = document.querySelector(s);
      return btn && btn.getAttribute('aria-pressed') === 'true';
    },
    { args: [sel], message: `mode ${mode} active` }
  );
}

export async function startRound(page) {
  await page.waitForSelector('#startBtn');
  await page.click('#startBtn');
  await page.waitFor(
    () => document.body.classList.contains('phase-playing'),
    { timeout: 6000, message: 'body.phase-playing' }
  );
}

export async function typeAnswer(page, text) {
  await page.waitForSelector('#typeInput');
  await page.eval((val) => {
    const inp = document.getElementById('typeInput');
    if (!inp) throw new Error('#typeInput missing');
    inp.focus();
    inp.value = val;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    const form = document.getElementById('typeForm');
    if (form && typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }, String(text));
}

export async function submitTypedViaUI(page, text) {
  await page.type('#typeInput', String(text), { clear: true, submit: true });
}

export async function isSheetOpen(page, dialogSel) {
  return page.eval((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    if (el.tagName === 'DIALOG') return Boolean(el.open);
    return !el.classList.contains('is-hidden') && el.getAttribute('aria-hidden') !== 'true';
  }, dialogSel);
}

export async function openDialog(page, triggerSel, dialogSel) {
  await page.waitForSelector(triggerSel);
  await page.click(triggerSel);
  await page.waitFor(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      if (el.tagName === 'DIALOG') return Boolean(el.open);
      return !el.classList.contains('is-hidden') && el.getAttribute('aria-hidden') !== 'true';
    },
    { args: [dialogSel], timeout: 5000, message: `open dialog ${dialogSel}` }
  );
}

export async function closeByEscape(page, dialogSel) {
  await page.press('Escape');
  await page.waitFor(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return true;
      if (el.tagName === 'DIALOG') return !el.open;
      return el.classList.contains('is-hidden') || el.getAttribute('aria-hidden') === 'true';
    },
    { args: [dialogSel], timeout: 4000, message: `close dialog ${dialogSel} via Escape` }
  );
}

export async function ensureMicRunning(page) {
  const status = await page.eval(() => {
    const btn = document.getElementById('micBtn');
    return {
      disabled: Boolean(btn && btn.disabled),
      pressed: btn ? btn.getAttribute('aria-pressed') : null,
      running: Boolean(window.__E2E_MOCK__ && window.__E2E_MOCK__.isRunning()),
    };
  });
  assert.equal(status.disabled, false, '#micBtn must not be disabled');
  if (status.pressed !== 'true' && !status.running) {
    await page.click('#micBtn');
  }
  await page.waitFor(
    () => Boolean(window.__E2E_MOCK__ && window.__E2E_MOCK__.isRunning()),
    { timeout: 4000, message: 'SpeechRecognition running' }
  );
}

export async function quitRoundToOver(page) {
  const mode = await page.eval(() => {
    if (window.__PIU__ && typeof window.__PIU__.endGame === 'function') {
      window.__PIU__.endGame();
      return '__debug__';
    }
    const active = document.querySelector('#modeSwitch [aria-pressed="true"], #modeSwitch .is-active');
    return active?.dataset?.mode || 'rain';
  });

  if (mode !== '__debug__') {
    if (mode === 'poem') {
      const remaining = await page.eval(() =>
        Array.from(document.querySelectorAll('#poemLines .poem-line:not(.is-read)'))
          .map((el) => (el.dataset.lineText || el.textContent || '').trim())
          .filter(Boolean)
      );
      for (const line of remaining) {
        await typeAnswer(page, line);
      }
    } else if (mode === 'fill' || mode === 'paint') {
      const remaining = await page.eval(() =>
        Array.from(document.querySelectorAll('#wordLayer .word:not(.exploding)'))
          .map((el) => (el.dataset.word || el.textContent || '').trim())
          .filter(Boolean)
      );
      for (const word of remaining) {
        await typeAnswer(page, word);
      }
    } else {
      throw new Error(
        'quitRoundToOver in rain mode requires ?debug=1 (window.__PIU__.endGame); #quitBtn calls goHome(), not endGame()'
      );
    }
  }

  await page.waitFor(
    () => {
      const over = document.getElementById('overPanel');
      return over && !over.classList.contains('hidden');
    },
    { timeout: 6000, message: '#overPanel visible after round end' }
  );
}

export async function getVisibleWords(page) {
  return page.eval(() => {
    return Array.from(document.querySelectorAll('#wordLayer .word'))
      .filter((el) => !el.classList.contains('exploding'))
      .map((el) => ({
        word: (el.dataset.word || el.textContent || '').trim(),
        settled: el.classList.contains('settled'),
        focused: el.classList.contains('focused'),
        fill: el.classList.contains('fill-word'),
        paint: el.classList.contains('paint-word'),
        rect: el.getBoundingClientRect().toJSON(),
      }));
  });
}

export async function auditViewportA11y(page, {
  require16pxInputs = true,
  require44pxTargets = true,
  require10pxText = true,
  checkSiblingOverlap = true,
  label = '',
} = {}) {
  const report = await page.eval((opts) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const docSw = document.documentElement.scrollWidth;
    const bodySw = document.body ? document.body.scrollWidth : 0;

    const isVisible = (el) => {
      if (!el || !el.isConnected) return false;
      if (el.closest('dialog:not([open])')) return false;
      let cur = el;
      while (cur && cur.nodeType === 1) {
        if (cur.classList.contains('is-hidden') || cur.classList.contains('hidden')) return false;
        if (cur.getAttribute('aria-hidden') === 'true') return false;
        const st = getComputedStyle(cur);
        if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) {
          return false;
        }
        cur = cur.parentElement;
      }
      const rects = el.getClientRects();
      if (!rects || rects.length === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };

    const overflow = {
      innerWidth: vw,
      innerHeight: vh,
      docScrollWidth: docSw,
      bodyScrollWidth: bodySw,
      hasOverflow: docSw > vw || bodySw > vw,
    };

    const inputViolations = [];
    if (opts.require16pxInputs) {
      const inputs = document.querySelectorAll(
        'input:not([type="file"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea'
      );
      for (const el of inputs) {
        if (!isVisible(el)) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (!Number.isFinite(fs) || fs < 16) {
          inputViolations.push({
            id: el.id || el.className || el.tagName,
            tag: el.tagName,
            fontSize: fs,
          });
        }
      }
    }

    const hitViolations = [];
    if (opts.require44pxTargets) {
      const selectors = [
        'button:not(:disabled)',
        '[role="button"]',
        '[role="tab"]',
        '[role="radio"]',
        '[role="switch"]',
        'summary',
        'a[href]',
        'select',
        '.icon-btn',
        '.pack-pill',
        '.player-pill',
        '.pack-tab',
        '.diff-btn',
        '.poem-line',
        '.pack-category',
        '.theme-choice',
        '.avatar-choice',
        '[data-edit-player]',
        '[data-delete-player]',
        'dialog .close-btn',
        '[id$="Close"]',
      ].join(',');
      const seen = new Set();
      for (const el of document.querySelectorAll(selectors)) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (!isVisible(el)) continue;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 44 || r.height < 44) {
          hitViolations.push({
            id: el.id || el.dataset?.mode || el.className || el.tagName,
            width: Math.round(r.width * 10) / 10,
            height: Math.round(r.height * 10) / 10,
          });
        }
      }
    }

    const overlapViolations = [];
    if (opts.checkSiblingOverlap) {
      const groupSelectors = [
        '.tools',
        '.story-pills',
        '.home-meta',
        '#homePlayerChips',
        '#missedList',
        '#overPanel',
        '.over-actions',
        '.pack-tabs',
        '.diff-group',
        '.theme-group',
        '.mode-switch',
        '.player-row-actions',
      ];
      for (const gSel of groupSelectors) {
        for (const group of document.querySelectorAll(gSel)) {
          if (!isVisible(group)) continue;
          const items = Array.from(
            group.querySelectorAll('button:not(:disabled), select, a[href], [role="button"], [role="tab"], [role="radio"], [role="switch"]')
          ).filter(isVisible);
          for (let i = 0; i < items.length; i++) {
            const a = items[i].getBoundingClientRect();
            for (let j = i + 1; j < items.length; j++) {
              const b = items[j].getBoundingClientRect();
              const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
              const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
              if (ox > 1 && oy > 1) {
                overlapViolations.push({
                  group: gSel,
                  a: items[i].id || items[i].className,
                  b: items[j].id || items[j].className,
                  area: Math.round(ox * oy),
                });
              }
            }
          }
        }
      }
    }

    const textViolations = [];
    if (opts.require10pxText) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const checkedEls = new Set();
      let node;
      while ((node = walker.nextNode())) {
        if (!node.textContent || !node.textContent.trim()) continue;
        const el = node.parentElement;
        if (!el || checkedEls.has(el)) continue;
        checkedEls.add(el);
        if (el.closest('svg, title, style, script')) continue;
        if (!isVisible(el)) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (!Number.isFinite(fs) || fs < 10) {
          textViolations.push({
            id: el.id || el.className || el.tagName,
            text: node.textContent.trim().slice(0, 24),
            fontSize: fs,
          });
        }
      }
    }

    return {
      overflow,
      inputViolations,
      hitViolations,
      overlapViolations,
      textViolations,
    };
  }, {
    require16pxInputs,
    require44pxTargets,
    require10pxText,
    checkSiblingOverlap,
  });

  const prefix = label ? `[${label}] ` : '';
  assert.equal(
    report.overflow.hasOverflow,
    false,
    `${prefix}Horizontal overflow detected: ${JSON.stringify(report.overflow)}`
  );
  assert.deepEqual(
    report.inputViolations,
    [],
    `${prefix}Input/select font-size < 16px: ${JSON.stringify(report.inputViolations)}`
  );
  assert.deepEqual(
    report.hitViolations,
    [],
    `${prefix}Interactive hit targets < 44x44px: ${JSON.stringify(report.hitViolations)}`
  );
  assert.deepEqual(
    report.overlapViolations,
    [],
    `${prefix}Sibling interactive controls overlap: ${JSON.stringify(report.overlapViolations)}`
  );
  assert.deepEqual(
    report.textViolations,
    [],
    `${prefix}Micro-text (< 10px) detected: ${JSON.stringify(report.textViolations)}`
  );

  return report;
}

export async function sampleThemeSurface(page) {
  return page.eval((leakTriplets) => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const st = getComputedStyle(el);
      return {
        bg: st.backgroundColor,
        bgImage: st.backgroundImage,
        color: st.color,
        borderColor: st.borderTopColor,
        boxShadow: st.boxShadow,
      };
    };

    const samples = {
      themeAttr: document.documentElement.dataset.theme || '',
      body: pick('body'),
      app: pick('#app'),
      field: pick('#field'),
      fieldGrid: pick('.field-grid'),
      panel: pick('.panel:not(.hidden)') || pick('#startPanel'),
      primaryBtn: pick('.primary-btn'),
      rewardNode: pick('.reward-node'),
      gaugeTrack: pick('.gauge-track'),
      word: pick('.word'),
      dialog: pick('dialog[open], .sheet[open]'),
    };

    const leakMatchers = leakTriplets.map(([r, g, b]) => ({
      label: `rgb(${r}, ${g}, ${b})`,
      rx: new RegExp(`rgba?\\(\\s*${r}\\s*[,\\s]\\s*${g}\\s*[,\\s]\\s*${b}(?:\\s*[,/]\\s*[\\d.]+%?)?\\s*\\)`, 'i'),
    }));

    const leaks = [];
    for (const [name, s] of Object.entries(samples)) {
      if (!s || typeof s !== 'object') continue;
      for (const prop of ['bg', 'color', 'borderColor', 'boxShadow', 'bgImage']) {
        const val = String(s[prop] || '');
        for (const { label, rx } of leakMatchers) {
          if (rx.test(val)) {
            leaks.push({ element: name, prop, leak: label, value: val });
          }
        }
      }
    }

    return { samples, leaks };
  }, LEGACY_LEAK_TRIPLETS);
}

export async function auditThemeTokens(page, expectedTheme) {
  const { samples, leaks } = await sampleThemeSurface(page);
  assert.equal(samples.themeAttr, expectedTheme, `Expected html[data-theme="${expectedTheme}"], got "${samples.themeAttr}"`);

  if (expectedTheme !== 'candy') {
    assert.deepEqual(
      leaks,
      [],
      `Legacy navy/mint color leaks in theme "${expectedTheme}": ${JSON.stringify(leaks)}`
    );
  }

  if (expectedTheme === 'daylight') {
    const resolveSurfaceRgb = (s) => {
      if (!s) return null;
      const opaqueBg = parseRgb(s.bg, { minAlpha: 0.85 });
      if (opaqueBg) return opaqueBg;
      const stops = extractOpaqueGradientStops(s.bgImage, { minAlpha: 0.85 });
      if (stops.length > 0) {
        // Pick the darkest gradient stop so a dark-tinted gradient cannot pass as daylight
        return stops.reduce((min, cur) => (relativeLuminance(cur) < relativeLuminance(min) ? cur : min), stops[0]);
      }
      return null;
    };

    const bgParsed =
      resolveSurfaceRgb(samples.field) ||
      resolveSurfaceRgb(samples.app) ||
      resolveSurfaceRgb(samples.body);
    const inkParsed =
      parseRgb(samples.panel?.color, { minAlpha: 0.85 }) ||
      parseRgb(samples.body?.color, { minAlpha: 0.85 });

    assert.ok(
      bgParsed,
      `Daylight theme must have opaque (>=0.85 alpha) light background or gradient, got field=${samples.field?.bg} (${samples.field?.bgImage}), body=${samples.body?.bg} (${samples.body?.bgImage})`
    );
    assert.ok(inkParsed, `Daylight theme must have opaque readable ink color, got ${samples.panel?.color || samples.body?.color}`);

    const bgLum = relativeLuminance(bgParsed);
    const inkLum = relativeLuminance(inkParsed);
    const ratio = contrastRatio(bgParsed, inkParsed);

    assert.ok(bgLum > 0.5, `Daylight background luminance expected > 0.5, got ${bgLum.toFixed(3)} (${samples.field?.bg || samples.body?.bg})`);
    assert.ok(inkLum < 0.25, `Daylight text luminance expected < 0.25, got ${inkLum.toFixed(3)} (${samples.body?.color})`);
    assert.ok(ratio >= 4.5, `Daylight contrast ratio expected >= 4.5, got ${ratio.toFixed(2)}`);
  }

  return samples;
}
