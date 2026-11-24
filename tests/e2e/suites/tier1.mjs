import assert from 'node:assert/strict';
import {
  VIEWPORTS,
  auditThemeTokens,
  auditViewportA11y,
  closeByEscape,
  ensureMicRunning,
  getVisibleWords,
  makeTestProfile,
  openApp,
  openDialog,
  quitRoundToOver,
  readJsonStorage,
  readStorage,
  sampleThemeSurface,
  selectMode,
  startRound,
  submitTypedViaUI,
  typeAnswer,
} from '../assertions.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clearNextRainWord(page) {
  await page.waitFor(
    () => document.querySelectorAll('#wordLayer .word:not(.exploding)').length > 0,
    { timeout: 6000, message: 'falling word in #wordLayer' }
  );
  const words = await getVisibleWords(page);
  assert.ok(words.length > 0, 'Expected at least one visible word');
  const target = words[0].word;
  await typeAnswer(page, target);
  return target;
}

async function clearPoemLine(page, index) {
  const lineText = await page.eval((idx) => {
    const line = document.querySelector(`#poemLines .poem-line[data-line-index="${idx}"]`);
    return line ? (line.dataset.lineText || line.textContent || '').trim() : '';
  }, index);
  assert.ok(lineText, `Expected poem line ${index} text`);
  await typeAnswer(page, lineText);
  await page.waitFor(
    (idx) => {
      const line = document.querySelector(`#poemLines .poem-line[data-line-index="${idx}"]`);
      return Boolean(line && line.classList.contains('is-read'));
    },
    { args: [index], timeout: 4000, message: `poem line ${index} marked .is-read` }
  );
  return lineText;
}

async function setupShortPoemAndPlay(page, poemId = 'traveling-together-97', extraSeed = {}) {
  await page.eval((id, extra) => {
    localStorage.setItem('piupiu.poetry.selected', id);
    for (const [k, v] of Object.entries(extra)) {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, poemId, extraSeed);
  await page.reload();
  await page.waitForSelector('#startBtn');
  await selectMode(page, 'poem');
  await startRound(page);
  await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length > 0, {
    timeout: 6000,
    message: 'poem lines rendered',
  });
}

export function getTier1Tests() {
  const tests = [];
  const add = (id, feature, title, run) => tests.push({ id, tier: 1, feature, title, run });

  // =========================================================================
  // Feature #1: markPoemLine profile scoring (P0)
  // =========================================================================
  add('T1-F01-01', 'F01', 'Single poem line hit credits active profile total (+10, correct=1)', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Alice', total: 0 } });
    try {
      await setupShortPoemAndPlay(page);
      await clearPoemLine(page, 0);
      const scoreText = await page.eval(() => document.getElementById('score')?.textContent?.trim());
      assert.equal(scoreText, '10');
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      const p1 = profiles.find((p) => p.id === 'p1');
      assert.ok(p1, 'Active profile p1 must exist in localStorage');
      assert.equal(p1.total, 10, 'markPoemLine must credit addProfilePoints(10) to profile.total');
      assert.equal(p1.correct, 1, 'profile.correct must increment to 1');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F01-02', 'F01', 'Combo escalation across consecutive poem lines credits exact sum', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Alice', total: 0 } });
    try {
      await setupShortPoemAndPlay(page, 'three-15');
      await clearPoemLine(page, 0); // +10
      await clearPoemLine(page, 1); // +11
      await clearPoemLine(page, 2); // +12
      await clearPoemLine(page, 3); // +13 => 46
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      const p1 = profiles.find((p) => p.id === 'p1');
      assert.equal(p1.total, 46, '4 consecutive lines must credit 10+11+12+13 = 46');
      assert.equal(p1.correct, 4);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F01-03', 'F01', 'Completing full poem updates profile total, best & rounds', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Alice', total: 0 } });
    try {
      await setupShortPoemAndPlay(page, 'traveling-together-97'); // 3 lines -> 10+11+12 = 33
      await clearPoemLine(page, 0);
      await clearPoemLine(page, 1);
      await clearPoemLine(page, 2);
      await page.waitFor(
        () => {
          const over = document.getElementById('overPanel');
          return over && !over.classList.contains('hidden');
        },
        { timeout: 6000, message: '#overPanel opens after final poem line' }
      );
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      const p1 = profiles.find((p) => p.id === 'p1');
      assert.equal(p1.total, 33);
      assert.equal(p1.best, 33);
      assert.equal(p1.rounds, 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F01-04', 'F01', 'Poem line score reflects immediately on #boardSheet leaderboard', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: { id: 'p1', name: 'Alice', total: 0 } });
    try {
      await setupShortPoemAndPlay(page, 'traveling-together-97');
      await clearPoemLine(page, 0); // +10
      await clearPoemLine(page, 1); // +11 => 21
      await quitRoundToOver(page);
      await openDialog(page, '#overBoardBtn', '#boardSheet');
      const rowText = await page.eval(() => document.getElementById('boardList')?.textContent || '');
      assert.ok(rowText.includes('Alice'), 'Leaderboard must include Alice');
      assert.ok(rowText.includes('21'), `Leaderboard must display 21 points, got: ${rowText}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F01-05', 'F01', 'Multi-profile isolation during poetry scoring', async ({ browser }) => {
    const pA = makeTestProfile({ id: 'pA', name: 'Alpha', total: 0 });
    const pB = makeTestProfile({ id: 'pB', name: 'Beta', total: 0 });
    const page = await openApp(browser, {
      seed: {
        'piupiu.profiles': JSON.stringify([pA, pB]),
        'piupiu.user': 'pB',
      },
    });
    try {
      await setupShortPoemAndPlay(page, 'traveling-together-97');
      await clearPoemLine(page, 0);
      await clearPoemLine(page, 1);
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      const a = profiles.find((p) => p.id === 'pA');
      const b = profiles.find((p) => p.id === 'pB');
      assert.equal(b.total, 21);
      assert.equal(a.total, 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #2: Dynamic speakHelp timeout & onstart (P0)
  // =========================================================================
  add('T1-F02-01', 'F02', 'Short word help TTS pauses mic and resumes cleanly on onend', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 30, utteranceDelayMs: 400 },
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      await page.press('Space');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);
      const duringTts = await page.eval(() => ({
        running: window.__E2E_MOCK__.isRunning(),
        micListening: document.getElementById('micBtn')?.classList.contains('listening'),
      }));
      assert.equal(duringTts.running, false, 'Mic must pause while TTS speaks');
      assert.equal(duringTts.micListening, false);

      await page.waitFor(
        () => window.__E2E_MOCK__.isRunning() && document.getElementById('micBtn')?.classList.contains('listening'),
        { timeout: 3000, message: 'Mic resumes after TTS onend' }
      );
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F02-02', 'F02', 'Long poetry line (>60 chars) scales timeout beyond 4000ms without premature restart', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 150, utteranceDelayMs: 5000 },
    });
    try {
      await setupShortPoemAndPlay(page, 'breakfast-160'); // Line 0 is 65 chars
      await ensureMicRunning(page);
      await page.click('#poemListen');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);

      // At 4250ms (past legacy 4000ms cap, before 5150ms onend), mic MUST still be paused!
      await sleep(4250);
      const at4250 = await page.eval(() => ({
        running: window.__E2E_MOCK__.isRunning(),
        micListening: document.getElementById('micBtn')?.classList.contains('listening'),
        speaking: window.speechSynthesis.speaking,
      }));
      assert.equal(at4250.speaking, true);
      assert.equal(at4250.running, false, 'Dynamic speakHelp guard must NOT release mic at 4000ms for >60-char line');
      assert.equal(at4250.micListening, false);

      // After 5150ms onend fires, mic resumes cleanly
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), {
        timeout: 3000,
        message: 'Mic restarts after 5.15s onend',
      });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F02-03', 'F02', 'Slow speech rate scales speakHelp timeout proportionally beyond 4000ms', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 50, utteranceDelayMs: 4700 },
    });
    try {
      // Child voice uses slower rate (0.9) and long line (>55 chars)
      await page.eval(() => localStorage.setItem('piupiu.voice', 'child'));
      await setupShortPoemAndPlay(page, 'breakfast-160');
      await ensureMicRunning(page);
      await page.click('#poemListen');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);
      await sleep(4150);
      const stillGuarded = await page.eval(() => !window.__E2E_MOCK__.isRunning());
      assert.equal(stillGuarded, true, 'Mic must stay paused past 4000ms for long line at slower rate');
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F02-04', 'F02', 'utterance.onstart resets guard timer when TTS queue start lags', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 2200, utteranceDelayMs: 2800 }, // onend at 5000ms total
    });
    try {
      await setupShortPoemAndPlay(page, 'breakfast-160');
      await ensureMicRunning(page);
      await page.click('#poemListen');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);

      await sleep(4200);
      const midSpeech = await page.eval(() => ({
        running: window.__E2E_MOCK__.isRunning(),
        speaking: window.speechSynthesis.speaking,
      }));
      assert.equal(midSpeech.speaking, true);
      assert.equal(midSpeech.running, false, 'onstart reset must preserve guard past 4200ms');

      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F02-05', 'F02', 'Echo guard suppresses immediate post-TTS recognizer echo of spoken word', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 800 },
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      await page.press('Space');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);
      const spokenWord = await page.eval(() => window.__E2E_MOCK__.spoken[0].text);

      // Force an echo result while TTS is still speaking
      await page.eval((w) => window.__E2E_MOCK__.emitSpeech(w, true, [], { force: true }), spokenWord);
      await sleep(80);
      const scoreDuring = await page.eval(() => document.getElementById('score')?.textContent?.trim());
      assert.equal(scoreDuring, '0', 'Echo speech during active helpSpeaking must be ignored');

      // Wait for TTS onend + guard release, then speak the word cleanly
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      await sleep(300);
      await page.eval((w) => window.__E2E_MOCK__.emitSpeech(w, true), spokenWord);
      await page.waitFor(() => Number(document.getElementById('score')?.textContent?.trim() || '0') > 0, {
        timeout: 3000,
        message: 'Real speech after TTS completes clears the word',
      });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #3: ES Module split & dead code removal (P3)
  // =========================================================================
  add('T1-F03-01', 'F03', 'App boots via native ES Module <script type="module" src="js/main.js">', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const modInfo = await page.eval(() => {
        const mods = Array.from(document.querySelectorAll('script[type="module"]')).map((s) => s.getAttribute('src') || '');
        return { mods, hasMain: mods.some((src) => src.includes('js/main.js')) };
      });
      assert.equal(modInfo.hasMain, true, `Expected <script type="module" src="js/main.js">, got ${JSON.stringify(modInfo.mods)}`);
      const reqs = page.getRequests().map((r) => r.url);
      assert.ok(reqs.some((u) => u.includes('/js/main.js')), 'Expected network request for js/main.js');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F03-02', 'F03', 'Dead voicePopover DOM & legacy js/game.js monolith removed', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const legacy = await page.eval(() => ({
        voicePopover: Boolean(document.querySelector('#voicePopover, .voice-popover')),
        gameScriptTag: Boolean(document.querySelector('script[src*="js/game.js"]')),
      }));
      assert.equal(legacy.voicePopover, false, '#voicePopover dead DOM must be removed');
      assert.equal(legacy.gameScriptTag, false, 'Legacy js/game.js monolith must not be loaded');
      const reqs = page.getRequests().map((r) => r.url);
      assert.equal(reqs.some((u) => /\/js\/game\.js(\?|$)/.test(u)), false, 'js/game.js must not be requested');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F03-03', 'F03', 'Modular event bus decouples word hit across HUD, audio & storage', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await clearNextRainWord(page);
      await page.waitFor(() => Number(document.getElementById('score')?.textContent?.trim() || '0') > 0);
      const stateAfter = await page.eval(() => ({
        score: Number(document.getElementById('score')?.textContent?.trim() || '0'),
        reward: document.getElementById('rewardCount')?.textContent?.trim(),
        audio: window.__E2E_MOCK__.getAudioStats(),
        profiles: JSON.parse(localStorage.getItem('piupiu.profiles') || '[]'),
      }));
      assert.ok(stateAfter.score >= 10);
      assert.equal(stateAfter.reward, '1/5');
      assert.ok(stateAfter.audio.oscillatorsStarted > 0 || stateAfter.audio.buffersStarted > 0, 'Audio SFX must play on hit');
      assert.ok(stateAfter.profiles[0].total >= 10);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F03-04', 'F03', 'Pet Canvas fallback renders cleanly when monster WebPs are blocked', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      page.setRequestOverrides(new Map([[new RegExp('^/assets/monsters/.*\\.webp$'), { status: 404, body: 'Not found' }]]));
      await selectMode(page, 'rain');
      await startRound(page);
      await sleep(300);
      const petCanvas = await page.eval(() => {
        const c = document.querySelector('#petLayer canvas');
        if (!c) return null;
        return { width: c.width, height: c.height };
      });
      assert.ok(petCanvas && petCanvas.width > 0 && petCanvas.height > 0, 'Fallback pet canvas must render in #petLayer');
      assert.deepEqual(page.getPageErrors(), [], 'Must have zero uncaught page errors when WebP images fail');
    } finally {
      await page.close();
    }
  });

  add('T1-F03-05', 'F03', '?debug=1 exposes window.__PIU__ contract via ES modules', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      const api = await page.eval(() => {
        const p = window.__PIU__;
        if (!p) return null;
        return {
          hasState: Boolean(p.state),
          funcs: ['startGame', 'setMode', 'setTheme', 'getPet', 'getFill', 'getPaint'].every(
            (k) => typeof p[k] === 'function'
          ),
        };
      });
      assert.ok(api && api.hasState && api.funcs, 'window.__PIU__ debug surface must remain intact');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #4: Dynamic lazy loading (P2)
  // =========================================================================
  add('T1-F04-01', 'F04', 'Initial Home boot skips lazy vendor & data scripts', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const reqUrls = page.getRequests().map((r) => r.url);
      for (const lazy of ['pixi.min.js', 'pixi-ambient.js', 'matter.min.js', 'families.js', 'poetry.js', 'education.js']) {
        assert.equal(
          reqUrls.some((u) => u.includes(lazy)),
          false,
          `Lazy script "${lazy}" must NOT be requested on initial Home boot`
        );
      }
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F04-02', 'F04', 'Entering Word Rain lazy-loads Pixi & Matter on demand', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => {
        const c = document.querySelector('#pixiAmbient canvas');
        return Boolean(c);
      }, { timeout: 6000 });
      const reqUrls = page.getRequests().map((r) => r.url);
      assert.ok(reqUrls.some((u) => u.includes('pixi.min.js')), 'pixi.min.js must load on rain start');
      assert.ok(reqUrls.some((u) => u.includes('pixi-ambient.js')), 'pixi-ambient.js must load on rain start');
      assert.ok(reqUrls.some((u) => u.includes('matter.min.js')), 'matter.min.js must load on rain start');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F04-03', 'F04', 'Opening education pack tab lazy-loads education.js & families.js', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      page.clearRequests();
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="education"]');
      await page.waitFor(
        () => document.querySelectorAll('#packCategoryGrid [data-category-id]').length > 0,
        { timeout: 6000, message: 'education packs populated' }
      );
      let reqUrls = page.getRequests().map((r) => r.url);
      assert.ok(reqUrls.some((u) => u.includes('education.js')), 'education.js must load when opening education tab');

      const bncBtn = await page.eval(() => Boolean(document.querySelector('#packCategoryGrid [data-category-id="bnc"]')));
      assert.equal(bncBtn, true, 'Education tab must render [data-category-id="bnc"]');
      page.clearRequests();
      await page.click('#packCategoryGrid [data-category-id="bnc"]');
      await page.waitFor(
        () => !document.getElementById('levelSelect')?.classList.contains('is-hidden'),
        { timeout: 5000 }
      );
      reqUrls = page.getRequests().map((r) => r.url);
      assert.ok(reqUrls.some((u) => u.includes('families.js')), 'families.js must load when BNC/COCA selected');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F04-04', 'F04', 'Selecting poem mode / #poetryBtn lazy-loads poetry.js with 153 poems', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      page.clearRequests();
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.waitFor(() => document.querySelectorAll('#poetryList [data-poem-id]').length > 0, { timeout: 6000 });
      const info = await page.eval(() => ({
        tabs: document.querySelectorAll('#poetryTabs [data-poetry-category]').length,
        poems: window.PiuPoetry?.poems?.length || 0,
      }));
      assert.ok(info.tabs >= 8, `Expected >= 8 poetry category tabs, got ${info.tabs}`);
      assert.equal(info.poems, 153);
      assert.ok(page.getRequests().some((r) => r.url.includes('poetry.js')));
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F04-05', 'F04', 'Deduplicated loader fetches each lazy script at most once', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      page.clearRequests();
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.waitFor(() => document.querySelectorAll('#poetryList [data-poem-id]').length > 0, { timeout: 6000 });
      await closeByEscape(page, '#poetrySheet');
      await selectMode(page, 'rain');
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      const poetryHits = page.getRequests().filter((r) => r.url.includes('poetry.js')).length;
      assert.equal(poetryHits, 1, `poetry.js should be requested once, got ${poetryHits}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #5: 3-Bucket sw.js & pwa.js Update Notice (P2)
  // =========================================================================
  add('T1-F05-01', 'F05', 'Service Worker creates 3 named buckets (shell, static, data)', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const keys = await page.eval(async () => {
        if (!('serviceWorker' in navigator)) return [];
        await navigator.serviceWorker.ready;
        // Give SW activate a moment if just installed
        for (let i = 0; i < 20; i++) {
          const k = await caches.keys();
          if (k.some((x) => x.startsWith('piupiu-shell-')) && k.includes('piupiu-static-v1')) return k;
          await new Promise((r) => setTimeout(r, 100));
        }
        return caches.keys();
      });
      assert.ok(keys.some((k) => k.startsWith('piupiu-shell-')), `Missing piupiu-shell-* cache in ${JSON.stringify(keys)}`);
      assert.ok(keys.includes('piupiu-static-v1'), `Missing piupiu-static-v1 cache in ${JSON.stringify(keys)}`);
      assert.ok(keys.includes('piupiu-data-v1'), `Missing piupiu-data-v1 cache in ${JSON.stringify(keys)}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F05-02', 'F05', 'Static monster WebPs & vendor libs route to piupiu-static-v1', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.eval(() => navigator.serviceWorker.ready);
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => Boolean(document.querySelector('#pixiAmbient canvas')));
      const entries = await page.eval(async () => {
        const cache = await caches.open('piupiu-static-v1');
        const reqs = await cache.keys();
        return reqs.map((r) => new URL(r.url).pathname);
      });
      assert.ok(entries.some((p) => p.endsWith('/js/vendor/pixi.min.js')), `pixi.min.js missing in piupiu-static-v1: ${JSON.stringify(entries)}`);
      assert.ok(entries.some((p) => p.endsWith('/js/vendor/matter.min.js')), 'matter.min.js missing in piupiu-static-v1');
      assert.ok(entries.some((p) => p.includes('/assets/monsters/') && p.endsWith('.webp')), 'monster .webp missing in piupiu-static-v1');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F05-03', 'F05', 'Lazy data packs route to piupiu-data-v1', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.eval(() => navigator.serviceWorker.ready);
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.waitFor(() => document.querySelectorAll('#poetryList [data-poem-id]').length > 0, { timeout: 6000 });
      await closeByEscape(page, '#poetrySheet');
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="education"]');
      await page.waitFor(() => document.querySelectorAll('#packCategoryGrid [data-category-id]').length > 0, { timeout: 6000 });

      const dataEntries = await page.eval(async () => {
        const cache = await caches.open('piupiu-data-v1');
        const reqs = await cache.keys();
        return reqs.map((r) => new URL(r.url).pathname);
      });
      assert.ok(dataEntries.some((p) => p.endsWith('/js/poetry.js')), `poetry.js missing in piupiu-data-v1: ${JSON.stringify(dataEntries)}`);
      assert.ok(dataEntries.some((p) => p.endsWith('/js/education.js')), 'education.js missing in piupiu-data-v1');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F05-04', 'F05', 'Offline reload serves app shell & plays round without errors', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.eval(async () => {
        const reg = await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller && reg.active) {
          await new Promise((r) => setTimeout(r, 200));
        }
      });
      await page.reload();
      await page.waitFor(() => Boolean(navigator.serviceWorker.controller), { timeout: 6000 });
      await page.setOffline(true);
      await page.reload();
      await page.waitForSelector('#startBtn', { timeout: 6000 });
      await startRound(page);
      await clearNextRainWord(page);
      const score = await page.eval(() => Number(document.getElementById('score')?.textContent?.trim() || '0'));
      assert.ok(score >= 10, 'Gameplay must work offline after SW precache');
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F05-05', 'F05', 'pwa.js surfaces non-intrusive update notice when new SW installs', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.eval(() => navigator.serviceWorker.ready);
      const swBody = await page.eval(async () => {
        const res = await fetch('./sw.js');
        return res.text();
      });
      const bumpedSw = swBody.replace(/VERSION\s*=\s*["']([^"']+)["']/, 'VERSION = "$1-e2e-update"');
      page.setRequestOverrides(new Map([['/sw.js', { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8' }, body: bumpedSw }]]));

      await page.eval(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      });

      await page.waitFor(
        () => {
          const el = document.querySelector('#pwaUpdateToast, .pwa-update-toast, [data-pwa-update]');
          if (!el) return false;
          const st = getComputedStyle(el);
          return !el.classList.contains('is-hidden') && !el.classList.contains('hidden') && st.display !== 'none';
        },
        { timeout: 6000, message: 'PWA update notification toast visible' }
      );
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #6: Runtime rendering & WebGL resilience (P2)
  // =========================================================================
  add('T1-F06-01', 'F06', 'Paint mode uses single <canvas> in #paintLayer (zero .paint-splat SVGs)', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'paint');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .paint-word').length > 0, { timeout: 6000 });
      const words = await getVisibleWords(page);
      const beforeInfo = await page.eval(() => {
        const layer = document.getElementById('paintLayer');
        const canvas = layer?.querySelector('canvas');
        return {
          canvasCount: layer ? layer.querySelectorAll('canvas').length : 0,
          svgCount: document.querySelectorAll('.paint-splat').length,
          dataUrl: canvas ? canvas.toDataURL() : '',
        };
      });
      assert.equal(beforeInfo.canvasCount, 1, '#paintLayer must contain exactly 1 <canvas>');
      assert.equal(beforeInfo.svgCount, 0, 'Zero .paint-splat SVG nodes allowed');

      for (const item of words.slice(0, 4)) {
        await typeAnswer(page, item.word);
      }
      await sleep(300);
      const afterInfo = await page.eval(() => {
        const canvas = document.querySelector('#paintLayer canvas');
        return {
          svgCount: document.querySelectorAll('.paint-splat').length,
          dataUrl: canvas ? canvas.toDataURL() : '',
        };
      });
      assert.equal(afterInfo.svgCount, 0, 'Zero .paint-splat SVGs after paintball hits');
      assert.notEqual(afterInfo.dataUrl, beforeInfo.dataUrl, '<canvas> pixel buffer must mutate on paintball hits');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F06-02', 'F06', 'Fill mode builds non-overlapping board inside #field across viewports', async ({ browser }) => {
    for (const vp of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
      const page = await openApp(browser, { viewport: vp, withPlayer: true });
      try {
        await selectMode(page, 'fill');
        await startRound(page);
        await page.waitFor(() => document.querySelectorAll('#wordLayer .fill-word').length >= 4, { timeout: 6000 });
        const check = await page.eval(() => {
          const field = document.getElementById('field').getBoundingClientRect();
          const rects = Array.from(document.querySelectorAll('#wordLayer .fill-word')).map((el) =>
            el.getBoundingClientRect()
          );
          const outOfBounds = rects.filter(
            (r) => r.left < field.left - 2 || r.right > field.right + 2 || r.top < field.top - 2 || r.bottom > field.bottom + 2
          );
          let overlaps = 0;
          for (let i = 0; i < rects.length; i++) {
            for (let j = i + 1; j < rects.length; j++) {
              const a = rects[i], b = rects[j];
              const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
              const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
              if (ox > 2 && oy > 2) overlaps++;
            }
          }
          return { count: rects.length, outOfBounds: outOfBounds.length, overlaps };
        });
        assert.ok(check.count >= 4);
        assert.equal(check.outOfBounds, 0, `${vp.id}: fill cards out of #field bounds`);
        assert.equal(check.overlaps, 0, `${vp.id}: fill cards overlapped`);
        assert.deepEqual(page.getAllErrors(), []);
      } finally {
        await page.close();
      }
    }
  });

  add('T1-F06-03', 'F06', 'Paint mode scatters rotated collage inside #field without card overlap', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'paint');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .paint-word').length >= 4, { timeout: 6000 });
      const check = await page.eval(() => {
        const field = document.getElementById('field').getBoundingClientRect();
        const cards = Array.from(document.querySelectorAll('#wordLayer .paint-word'));
        const rects = cards.map((el) => el.getBoundingClientRect());
        const outOfBounds = rects.filter(
          (r) => r.left < field.left - 4 || r.right > field.right + 4 || r.top < field.top - 4 || r.bottom > field.bottom + 4
        );
        let rotatedCount = 0;
        for (const el of cards) {
          const tf = getComputedStyle(el).transform;
          const m = tf && tf.match(/^matrix\(([^)]+)\)$/);
          if (m) {
            const parts = m[1].split(',').map((x) => Number(x.trim()));
            if (Math.abs(parts[1]) > 0.001 || Math.abs(parts[2]) > 0.001) {
              rotatedCount += 1;
            }
          } else if (el.style.transform && /rotate\((?!0(?:deg)?\))/.test(el.style.transform)) {
            rotatedCount += 1;
          }
        }
        let overlaps = 0;
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i], b = rects[j];
            const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            if (ox > 2 && oy > 2) overlaps++;
          }
        }
        return { count: rects.length, outOfBounds: outOfBounds.length, rotatedCount, overlaps };
      });
      assert.ok(check.count >= 4);
      assert.equal(check.outOfBounds, 0, 'Paint cards must stay inside #field');
      assert.ok(check.rotatedCount >= 2, `Expected rotated collage cards in paint mode, got ${check.rotatedCount}/${check.count}`);
      assert.equal(check.overlaps, 0, 'Paint collage cards must not overlap inside #field');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F06-04', 'F06', 'Pixi ambient runs during active play and pauses on menu/pause/over', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => Boolean(window.PiuPixiAmbient));
      const playing = await page.eval(() => window.PiuPixiAmbient?.isRunning?.() ?? document.getElementById('pixiAmbient')?.dataset.running);
      assert.ok(playing === true || playing === 'true', `Expected ambient running during play, got ${playing}`);
      await page.click('#pauseBtn');
      const paused = await page.eval(() => window.PiuPixiAmbient?.isRunning?.() ?? document.getElementById('pixiAmbient')?.dataset.running);
      assert.ok(paused === false || paused === 'false', `Expected ambient paused on pause, got ${paused}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F06-05', 'F06', 'webglcontextlost and webglcontextrestored handled cleanly without errors', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => Boolean(document.querySelector('#pixiAmbient canvas')), { timeout: 6000 });
      const res = await page.eval(() => {
        const c = document.querySelector('#pixiAmbient canvas');
        const evLost = new Event('webglcontextlost', { cancelable: true });
        c.dispatchEvent(evLost);
        const evRestored = new Event('webglcontextrestored', { cancelable: true });
        c.dispatchEvent(evRestored);
        return { defaultPrevented: evLost.defaultPrevented };
      });
      assert.equal(res.defaultPrevented, true, 'pixi-ambient.js must preventDefault() on webglcontextlost');
      await clearNextRainWord(page);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #7: CSS @layer & semantic Design Tokens (P0/P3)
  // =========================================================================
  add('T1-F07-01', 'F07', '@layer stylesheet order & zero background-attachment: fixed', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const cssCheck = await page.eval(() => {
        let layerOrder = '';
        let fixedAttachments = 0;
        const scanRules = (rules) => {
          for (const r of rules) {
            if (r.type === CSSRule.STATEMENT_RULE || r.constructor?.name === 'CSSLayerStatementRule') {
              const txt = r.cssText || '';
              if (txt.includes('reset') && txt.includes('tokens')) layerOrder = txt;
            }
            if (r.style && r.style.backgroundAttachment === 'fixed') {
              fixedAttachments += 1;
            }
            if (r.cssRules) scanRules(r.cssRules);
          }
        };
        for (const sheet of document.styleSheets) {
          try {
            if (sheet.cssRules) scanRules(sheet.cssRules);
          } catch {}
        }
        return {
          layerOrder,
          fixedAttachments,
          appBgAttachment: getComputedStyle(document.getElementById('app')).backgroundAttachment,
        };
      });
      assert.ok(cssCheck.layerOrder.includes('reset') && cssCheck.layerOrder.includes('tokens'), `Missing @layer order declaration, got: "${cssCheck.layerOrder}"`);
      assert.equal(cssCheck.fixedAttachments, 0, 'Zero rules may use background-attachment: fixed');
      assert.notEqual(cssCheck.appBgAttachment, 'fixed');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F07-02', 'F07', 'candy theme applies Mint Arcade tokens and persists across reload', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      await page.click('[data-theme-choice="candy"]');
      await auditThemeTokens(page, 'candy');
      assert.equal(await readStorage(page, 'piupiu.theme'), 'candy');
      await page.reload();
      await page.waitForSelector('#startBtn');
      await auditThemeTokens(page, 'candy');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F07-03', 'F07', 'bubblegum theme applies Violet Arcade tokens with zero navy/mint leaks', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      await page.click('[data-theme-choice="candy"]');
      const candySample = await sampleThemeSurface(page);
      await page.click('[data-theme-choice="bubblegum"]');
      const gumSample = await auditThemeTokens(page, 'bubblegum');
      assert.notEqual(gumSample.field?.bg, candySample.samples.field?.bg);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F07-04', 'F07', 'cream theme applies Lemon Arcade tokens with zero navy/mint leaks', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      await page.click('[data-theme-choice="bubblegum"]');
      const gumSample = await sampleThemeSurface(page);
      await page.click('[data-theme-choice="cream"]');
      const creamSample = await auditThemeTokens(page, 'cream');
      assert.notEqual(creamSample.field?.bg, gumSample.samples.field?.bg);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F07-05', 'F07', 'daylight eye-care light theme applies bright luminance & >=4.5:1 contrast', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      await page.waitForSelector('[data-theme-choice="daylight"]');
      await page.click('[data-theme-choice="daylight"]');
      await auditThemeTokens(page, 'daylight');
      assert.equal(await readStorage(page, 'piupiu.theme'), 'daylight');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #8: iOS >=16px inputs, typography & >=44px hit areas (P0/P1)
  // =========================================================================
  add('T1-F08-01', 'F08', 'Desktop 1280x800 Home/Play/Over passes A11y geometry & typography audit', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.desktop, path: '/?debug=1', withPlayer: true });
    try {
      await auditViewportA11y(page, { require16pxInputs: false, label: 'desktop-home' });
      await selectMode(page, 'rain');
      await startRound(page);
      await auditViewportA11y(page, { require16pxInputs: false, label: 'desktop-play' });
      await quitRoundToOver(page);
      await auditViewportA11y(page, { require16pxInputs: false, label: 'desktop-over' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F08-02', 'F08', 'Mobile 390x844 passes >=16px inputs, >=44px targets & zero overflow', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.mobile, path: '/?debug=1', withPlayer: true });
    try {
      await auditViewportA11y(page, { require16pxInputs: true, label: 'mobile-home' });
      await selectMode(page, 'rain');
      await startRound(page);
      await auditViewportA11y(page, { require16pxInputs: true, label: 'mobile-play' });
      await quitRoundToOver(page);
      await auditViewportA11y(page, { require16pxInputs: true, label: 'mobile-over' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F08-03', 'F08', 'Tablet Portrait 768x1024 passes full A11y geometry audit', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.tablet_p, path: '/?debug=1', withPlayer: true });
    try {
      await auditViewportA11y(page, { require16pxInputs: true, label: 'tablet_p-home' });
      await selectMode(page, 'fill');
      await startRound(page);
      await auditViewportA11y(page, { require16pxInputs: true, label: 'tablet_p-fill' });
      await quitRoundToOver(page);
      await auditViewportA11y(page, { require16pxInputs: true, label: 'tablet_p-over' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F08-04', 'F08', 'Tablet Landscape 1024x768 passes full A11y geometry audit', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.tablet_l, path: '/?debug=1', withPlayer: true });
    try {
      await auditViewportA11y(page, { require16pxInputs: true, label: 'tablet_l-home' });
      await selectMode(page, 'poem');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length > 0, { timeout: 6000 });
      await auditViewportA11y(page, { require16pxInputs: true, label: 'tablet_l-poem' });
      await quitRoundToOver(page);
      await auditViewportA11y(page, { require16pxInputs: true, label: 'tablet_l-over' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F08-05', 'F08', 'All 7 <dialog> sheets pass A11y geometry audit at 390x844', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.mobile, withPlayer: true });
    try {
      const sheetTriggers = [
        ['#installBtn', '#installSheet'],
        ['#playerBtn', '#playerSheet'],
        ['#boardBtn', '#boardSheet'],
        ['#packBtn', '#packSheet'],
        ['#setupBtn', '#setupSheet'],
        ['#petCollectionBtn', '#petSheet'],
      ];
      for (const [trigger, dialogSel] of sheetTriggers) {
        await openDialog(page, trigger, dialogSel);
        await auditViewportA11y(page, { require16pxInputs: true, label: `mobile-${dialogSel}` });
        await closeByEscape(page, dialogSel);
      }
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.waitFor(() => document.querySelectorAll('#poetryList [data-poem-id]').length > 0, { timeout: 6000 });
      await auditViewportA11y(page, { require16pxInputs: true, label: 'mobile-#poetrySheet' });
      await closeByEscape(page, '#poetrySheet');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #9: Complete UI redesign & dead DOM cleanup (P1/P3)
  // =========================================================================
  add('T1-F09-01', 'F09', 'Legacy dead DOM nodes removed (.play-steps, .mascot-face, .field-stars, #categorySelect)', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const deadCount = await page.eval(() =>
        document.querySelectorAll('.play-steps, #playSteps, .mascot-face, .field-stars, #categorySelect').length
      );
      assert.equal(deadCount, 0, 'All legacy dead DOM nodes must be removed');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F09-02', 'F09', 'Home displays redesigned hero, 4 mode cards, CTA & pills cleanly', async ({ browser }) => {
    for (const vp of [VIEWPORTS.desktop, VIEWPORTS.mobile]) {
      const page = await openApp(browser, { viewport: vp, withPlayer: true });
      try {
        const home = await page.eval(() => ({
          startVisible: Boolean(document.getElementById('startBtn')?.getBoundingClientRect().height > 0),
          modes: document.querySelectorAll('#modeSwitch [data-mode]').length,
          packBtn: Boolean(document.getElementById('packBtn')?.getBoundingClientRect().height > 0),
          playerBtn: Boolean(document.getElementById('playerBtn')?.getBoundingClientRect().height > 0),
          setupBtn: Boolean(document.getElementById('setupBtn')?.getBoundingClientRect().height > 0),
        }));
        assert.equal(home.startVisible, true);
        assert.equal(home.modes, 4);
        assert.equal(home.packBtn, true);
        assert.equal(home.playerBtn, true);
        assert.equal(home.setupBtn, true);
        assert.deepEqual(page.getAllErrors(), []);
      } finally {
        await page.close();
      }
    }
  });

  add('T1-F09-03', 'F09', 'Language switching (zh -> fr -> en) updates UI copy live & persists', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const zhStart = await page.eval(() => document.getElementById('startBtn')?.textContent?.trim());
      await page.eval(() => {
        const sel = document.getElementById('langSelect');
        sel.value = 'fr';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const frInfo = await page.eval(() => ({
        lang: document.documentElement.lang,
        start: document.getElementById('startBtn')?.textContent?.trim(),
      }));
      assert.equal(frInfo.lang, 'fr');
      assert.notEqual(frInfo.start, zhStart);

      await page.eval(() => {
        const sel = document.getElementById('langSelect');
        sel.value = 'en';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const enInfo = await page.eval(() => ({
        lang: document.documentElement.lang,
        start: document.getElementById('startBtn')?.textContent?.trim(),
      }));
      assert.equal(enInfo.lang, 'en');
      assert.notEqual(enInfo.start, frInfo.start);
      assert.equal(await readStorage(page, 'piupiu.lang'), 'en');
      await page.reload();
      await page.waitForSelector('#startBtn');
      assert.equal(await page.eval(() => document.documentElement.lang), 'en');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F09-04', 'F09', 'Mode switching updates Home pills & Playing HUD layout cleanly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      assert.equal(
        await page.eval(() => document.getElementById('poetryBtn')?.classList.contains('is-hidden')),
        true,
        '#poetryBtn hidden in rain mode'
      );
      await selectMode(page, 'poem');
      assert.equal(
        await page.eval(() => document.getElementById('poetryBtn')?.classList.contains('is-hidden')),
        false,
        '#poetryBtn visible in poem mode'
      );
      await startRound(page);
      const poemHud = await page.eval(() => ({
        stageHidden: document.getElementById('poemStage')?.classList.contains('is-hidden'),
        speedHidden: getComputedStyle(document.getElementById('speedBtn')).display === 'none' || document.getElementById('speedBtn')?.classList.contains('is-hidden'),
      }));
      assert.equal(poemHud.stageHidden, false);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F09-05', 'F09', 'Settlement (#overPanel) adapts copy & actions per mode', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await quitRoundToOver(page);
      const rainOver = await page.eval(() => ({
        poemResultHidden: document.getElementById('poemResult')?.classList.contains('is-hidden'),
        restart: Boolean(document.getElementById('restartBtn')),
        home: Boolean(document.getElementById('homeBtn')),
      }));
      assert.equal(rainOver.poemResultHidden, true);
      assert.equal(rainOver.restart && rainOver.home, true);

      await page.click('#homeBtn');
      await page.waitFor(() => document.body.classList.contains('phase-menu'));
      await selectMode(page, 'poem');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length > 0, { timeout: 6000 });
      await quitRoundToOver(page);
      const poemOver = await page.eval(() => ({
        poemResultHidden: document.getElementById('poemResult')?.classList.contains('is-hidden'),
        overPoetryHidden: document.getElementById('overPoetryBtn')?.classList.contains('is-hidden'),
      }));
      assert.equal(poemOver.poemResultHidden, false);
      assert.equal(poemOver.overPoetryHidden, false);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #10: Native <dialog> sheets, 2-step delete & :focus-visible (P3)
  // =========================================================================
  add('T1-F10-01', 'F10', 'All 7 sheets are native <dialog> elements opened via showModal()', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const ids = ['installSheet', 'playerSheet', 'boardSheet', 'packSheet', 'poetrySheet', 'setupSheet', 'petSheet'];
      const tags = await page.eval((list) =>
        list.map((id) => ({ id, tag: document.getElementById(id)?.tagName || null })),
        ids
      );
      for (const item of tags) {
        assert.equal(item.tag, 'DIALOG', `Expected #${item.id} to be <dialog>, got ${item.tag}`);
      }

      await openDialog(page, '#packBtn', '#packSheet');
      const isModal = await page.eval(() => {
        const d = document.getElementById('packSheet');
        return Boolean(d && d.open && d.matches(':modal'));
      });
      assert.equal(isModal, true, '#packSheet must match :modal when opened via showModal()');
      await closeByEscape(page, '#packSheet');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F10-02', 'F10', 'Zero window.confirm() calls on destructive delete actions', async ({ browser }) => {
    const p1 = makeTestProfile({ id: 'p1', name: 'One' });
    const p2 = makeTestProfile({ id: 'p2', name: 'Two' });
    const page = await openApp(browser, {
      seed: {
        'piupiu.profiles': JSON.stringify([p1, p2]),
        'piupiu.user': 'p1',
        'piupiu.customPacks': JSON.stringify([{ id: 'c_1', name: 'MyPack', words: ['apple', 'banana', 'cherry', 'orange'], createdAt: Date.now() }]),
      },
    });
    try {
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.click('[data-delete-player="p2"]');
      await page.click('[data-delete-player="p2"]');
      await closeByEscape(page, '#playerSheet');

      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="custom"]');
      await page.waitForSelector('[data-delete-pack="c_1"]');
      await page.click('[data-delete-pack="c_1"]');
      await page.click('[data-delete-pack="c_1"]');

      const confirms = await page.eval(() => window.__E2E_MOCK__.confirmCalls.length);
      assert.equal(confirms, 0, 'window.confirm() must NEVER be called');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F10-03', 'F10', '2-step delete confirms & removes player profile cleanly', async ({ browser }) => {
    const p1 = makeTestProfile({ id: 'p1', name: 'One' });
    const p2 = makeTestProfile({ id: 'p2', name: 'Two' });
    const page = await openApp(browser, {
      seed: {
        'piupiu.profiles': JSON.stringify([p1, p2]),
        'piupiu.user': 'p1',
      },
    });
    try {
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.click('[data-delete-player="p2"]');
      const afterFirstClick = await page.eval(() => ({
        armed: document.querySelector('[data-delete-player="p2"]')?.getAttribute('data-confirm-armed'),
        count: JSON.parse(localStorage.getItem('piupiu.profiles') || '[]').length,
      }));
      assert.equal(afterFirstClick.armed, 'true', 'First delete click must arm confirmation');
      assert.equal(afterFirstClick.count, 2, 'First delete click must NOT delete player yet');

      await page.click('[data-delete-player="p2"]');
      await page.waitFor(() => !document.querySelector('[data-delete-player="p2"]'), { timeout: 3000 });
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      assert.equal(profiles.length, 1);
      assert.equal(profiles[0].id, 'p1');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F10-04', 'F10', '2-step delete confirms & removes custom pack cleanly', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      seed: {
        'piupiu.customPacks': JSON.stringify([
          { id: 'c_del', name: 'ToDelete', words: ['apple', 'banana', 'cherry', 'mango'], createdAt: Date.now() },
        ]),
      },
    });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="custom"]');
      await page.waitForSelector('[data-delete-pack="c_del"]');
      await page.click('[data-delete-pack="c_del"]');
      const armed = await page.eval(() => ({
        armed: document.querySelector('[data-delete-pack="c_del"]')?.getAttribute('data-confirm-armed'),
        packs: JSON.parse(localStorage.getItem('piupiu.customPacks') || '[]').length,
      }));
      assert.equal(armed.armed, 'true');
      assert.equal(armed.packs, 1);

      await page.click('[data-delete-pack="c_del"]');
      await page.waitFor(() => !document.querySelector('[data-delete-pack="c_del"]'), { timeout: 3000 });
      const remaining = await readJsonStorage(page, 'piupiu.customPacks', []);
      assert.equal(remaining.length, 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F10-05', 'F10', 'Keyboard Tab navigation triggers :focus-visible outline across controls', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.focus('#startBtn');
      let foundVisibleRing = false;
      for (let i = 0; i < 6; i++) {
        await page.press('Tab');
        const st = await page.eval(() => {
          const el = document.activeElement;
          if (!el) return null;
          const cs = getComputedStyle(el);
          return {
            tag: el.tagName,
            id: el.id,
            matchesFocusVisible: el.matches(':focus-visible'),
            outlineStyle: cs.outlineStyle,
            outlineWidth: parseFloat(cs.outlineWidth),
            boxShadow: cs.boxShadow,
          };
        });
        if (st && st.matchesFocusVisible && ((st.outlineStyle !== 'none' && st.outlineWidth > 0) || (st.boxShadow && st.boxShadow !== 'none'))) {
          foundVisibleRing = true;
          break;
        }
      }
      assert.equal(foundVisibleRing, true, 'Keyboard Tab must produce visible :focus-visible focus indicator');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #11: Instant Play & post-round rename (P1)
  // =========================================================================
  add('T1-F11-01', 'F11', 'First launch auto-creates guest profile & starts Round 1 immediately', async ({ browser }) => {
    const page = await openApp(browser); // NO withPlayer seed! Fresh localStorage
    try {
      await sleep(500); // Ensure no 420ms blocking player picker pops up
      const autoOpened = await page.eval(() => {
        const d = document.getElementById('playerSheet');
        return d ? (d.tagName === 'DIALOG' ? d.open : !d.classList.contains('is-hidden')) : false;
      });
      assert.equal(autoOpened, false, 'First launch must NOT auto-open #playerSheet');
      await startRound(page);
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      assert.equal(profiles.length, 1, 'Guest profile must be auto-created on first launch');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F11-02', 'F11', 'Guest profile receives round points & displays on Home pill', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1' });
    try {
      await startRound(page);
      await clearNextRainWord(page);
      await quitRoundToOver(page);
      await page.click('#homeBtn');
      await page.waitFor(() => document.body.classList.contains('phase-menu'));
      const pill = await page.eval(() => ({
        name: document.getElementById('playerName')?.textContent?.trim(),
        total: Number(document.getElementById('playerTotal')?.textContent?.trim() || '0'),
      }));
      assert.ok(pill.name && pill.name.length > 0);
      assert.ok(pill.total >= 10, `Expected guest total >= 10, got ${pill.total}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F11-03', 'F11', 'Gentle post-round rename banner appears after Round 1 for guest', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1' });
    try {
      await startRound(page);
      await clearNextRainWord(page);
      await quitRoundToOver(page);
      await page.waitFor(
        () => {
          const b = document.getElementById('guestRenameBanner');
          return Boolean(b && !b.classList.contains('is-hidden') && !b.classList.contains('hidden'));
        },
        { timeout: 4000, message: '#guestRenameBanner visible for guest after Round 1' }
      );
      await page.type('#guestRenameInput', 'Milo');
      await page.click('#guestRenameSave, #guestRenameBanner button[type="submit"], #guestRenameBanner .primary-btn');
      await page.waitFor(() => {
        const profiles = JSON.parse(localStorage.getItem('piupiu.profiles') || '[]');
        return profiles[0]?.name === 'Milo';
      }, { timeout: 3000 });
      assert.equal(await page.eval(() => document.getElementById('playerName')?.textContent?.trim()), 'Milo');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F11-04', 'F11', 'Home quick-switch chips appear when >= 2 profiles exist & switch player', async ({ browser }) => {
    const p1 = makeTestProfile({ id: 'p1', name: 'Ava', total: 100 });
    const p2 = makeTestProfile({ id: 'p2', name: 'Ben', total: 250 });
    const page = await openApp(browser, {
      seed: {
        'piupiu.profiles': JSON.stringify([p1, p2]),
        'piupiu.user': 'p1',
      },
    });
    try {
      const chips = await page.eval(() => {
        const strip = document.getElementById('homePlayerChips');
        if (!strip || strip.classList.contains('is-hidden')) return [];
        return Array.from(strip.querySelectorAll('[data-switch-player], [data-player-id], button')).map((b) =>
          b.textContent.trim()
        );
      });
      assert.ok(chips.length >= 2, `Expected >= 2 quick-switch chips on Home, got ${JSON.stringify(chips)}`);
      await page.click('#homePlayerChips [data-switch-player="p2"], #homePlayerChips [data-player-id="p2"], #homePlayerChips button:nth-child(2)');
      const active = await page.eval(() => ({
        user: localStorage.getItem('piupiu.user'),
        name: document.getElementById('playerName')?.textContent?.trim(),
        total: document.getElementById('playerTotal')?.textContent?.trim(),
      }));
      assert.equal(active.user, 'p2');
      assert.equal(active.name, 'Ben');
      assert.equal(active.total, '250');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F11-05', 'F11', 'Home quick-switch chips stay hidden when < 2 profiles exist', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const visibleChips = await page.eval(() => {
        const strip = document.getElementById('homePlayerChips');
        if (!strip || strip.classList.contains('is-hidden') || getComputedStyle(strip).display === 'none') return 0;
        return strip.querySelectorAll('button').length;
      });
      assert.equal(visibleChips, 0, 'Quick-switch strip must not show when < 2 profiles');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #12: Word Rain tap-any-word & settlement missed-word loop (P1)
  // =========================================================================
  add('T1-F12-01', 'F12', 'Tapping a falling Rain card focuses & speaks that specific word', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word:not(.settled)').length >= 2, {
        timeout: 8000,
        message: '2 falling words in rain',
      });
      // Click the 2nd (higher) falling word specifically to prove it doesn't just speak lowestFallingWord
      const targetWord = await page.eval(() => {
        const list = Array.from(document.querySelectorAll('#wordLayer .word:not(.settled)'));
        const el = list[list.length - 1];
        el.dataset.e2eTarget = '1';
        return (el.dataset.word || el.textContent || '').trim();
      });
      await page.click('#wordLayer .word[data-e2e-target="1"]');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 1, { timeout: 3000 });
      const state = await page.eval(() => ({
        spoken: window.__E2E_MOCK__.spoken.map((s) => s.text),
        focused: document.querySelector('#wordLayer .word[data-e2e-target="1"]')?.classList.contains('focused'),
      }));
      assert.equal(state.focused, true, 'Tapped falling Rain card must get .focused');
      assert.equal(state.spoken[state.spoken.length - 1], targetWord, 'Must speak the exact tapped falling word');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F12-02', 'F12', 'Tapping a settled (stacked) Rain card focuses & speaks that word', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0, { timeout: 6000 });
      // Force settle a word deterministically via ?debug=1 or speed turbo
      const settledWord = await page.eval(() => {
        const w = window.__PIU__.state.words[0];
        window.__PIU__.settleWord(w);
        return w.word;
      });
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word.settled').length > 0);
      await page.click('#wordLayer .word.settled');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 1, { timeout: 3000 });
      const res = await page.eval(() => ({
        spoken: window.__E2E_MOCK__.spoken.map((s) => s.text),
        focused: document.querySelector('#wordLayer .word.settled')?.classList.contains('focused'),
      }));
      assert.equal(res.focused, true);
      assert.equal(res.spoken[res.spoken.length - 1], settledWord);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F12-03', 'F12', 'Settlement missed-word chips are clickable <button>s that speak on tap', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0, { timeout: 6000 });
      const missedText = await page.eval(() => {
        const w = window.__PIU__.state.words[0];
        window.__PIU__.settleWord(w);
        return w.word;
      });
      await quitRoundToOver(page);
      const chipInfo = await page.eval(() => {
        const chip = document.querySelector('#missedList button, #missedList [data-speak-word]');
        return chip ? { tag: chip.tagName, text: (chip.dataset.speakWord || chip.textContent || '').trim() } : null;
      });
      assert.ok(chipInfo && chipInfo.tag === 'BUTTON', 'Missed chip must be a clickable <button>');
      await page.click('#missedList button');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 1, { timeout: 3000 });
      const spoken = await page.eval(() => window.__E2E_MOCK__.spoken[0].text);
      assert.equal(spoken, missedText);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F12-04', 'F12', '"Practice Missed Words" starts a focused review round from settlement', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length >= 1, { timeout: 6000 });
      const missedList = await page.eval(() => {
        const words = ['falcon', 'nectar'];
        for (const text of words) {
          window.__PIU__.state.missedWords.push(text);
        }
        return words;
      });
      await quitRoundToOver(page);
      await page.waitForSelector('#practiceMissedBtn');
      await page.click('#practiceMissedBtn');
      await page.waitFor(() => document.body.classList.contains('phase-playing'), { timeout: 5000 });
      const activeWords = await getVisibleWords(page);
      assert.ok(activeWords.length >= 1);
      assert.ok(
        activeWords.some((w) => missedList.includes(w.word.toLowerCase())),
        `Practice round should contain missed words ${JSON.stringify(missedList)}, got ${JSON.stringify(activeWords.map((x) => x.word))}`
      );
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F12-05', 'F12', 'Poetry "Next Poem" button advances directly & poetry import moved to Parent Settings', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      // Verify #poetryImport / #poetryFile are inside #setupSheet, NOT #poetrySheet
      const loc = await page.eval(() => ({
        inSetup: Boolean(document.querySelector('#setupSheet #poetryImport, #setupSheet #poetryFile')),
        inPoetry: Boolean(document.querySelector('#poetrySheet #poetryImport, #poetrySheet #poetryFile')),
      }));
      assert.equal(loc.inSetup, true, 'Poetry import must live inside #setupSheet Parent Settings');
      assert.equal(loc.inPoetry, false, 'Poetry import must be removed from #poetrySheet');

      await setupShortPoemAndPlay(page, 'traveling-together-97');
      await clearPoemLine(page, 0);
      await clearPoemLine(page, 1);
      await clearPoemLine(page, 2);
      await page.waitForSelector('#overNextPoemBtn', { timeout: 6000 });
      await page.click('#overNextPoemBtn');
      await page.waitFor(() => document.body.classList.contains('phase-playing'), { timeout: 5000 });
      const nextSelected = await readStorage(page, 'piupiu.poetry.selected');
      assert.notEqual(nextSelected, 'traveling-together-97', 'Next Poem must advance to a subsequent poem');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #13: 35-Pet Encounter Collection (P2)
  // =========================================================================
  add('T1-F13-01', 'F13', 'Finishing a round unlocks encountered pet in piupiu.pets.v1 & #petCollectionBtn', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: { id: 'p1', name: 'PetFan' } });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await clearNextRainWord(page);
      await quitRoundToOver(page);
      await page.click('#homeBtn');
      await page.waitFor(() => document.body.classList.contains('phase-menu'));

      const petsStore = await readJsonStorage(page, 'piupiu.pets.v1', {});
      const p1Pets = petsStore.p1 || {};
      assert.ok(Object.keys(p1Pets).length >= 1, `Expected >= 1 unlocked pet in piupiu.pets.v1, got ${JSON.stringify(petsStore)}`);
      const btnText = await page.eval(() => document.getElementById('petCollectionBtn')?.textContent?.trim() || '');
      assert.match(btnText, /1\s*\/\s*35/, `Expected 1/35 counter on #petCollectionBtn, got "${btnText}"`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F13-02', 'F13', 'Pet Collection <dialog> renders all 35 slots with unlocked & silhouette states', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'PetFan' },
      seed: {
        'piupiu.pets.v1': JSON.stringify({ p1: { kitty: { count: 1, firstAt: Date.now() } } }),
      },
    });
    try {
      await openDialog(page, '#petCollectionBtn', '#petSheet');
      const grid = await page.eval(() => {
        const items = Array.from(document.querySelectorAll('#petSheet [data-pet-id], #petGrid .pet-card'));
        const unlocked = items.filter((el) => !el.classList.contains('is-locked') && el.dataset.locked !== 'true');
        const locked = items.filter((el) => el.classList.contains('is-locked') || el.dataset.locked === 'true');
        return { total: items.length, unlocked: unlocked.length, locked: locked.length };
      });
      assert.equal(grid.total, 35, `Expected 35 pet slots, got ${grid.total}`);
      assert.equal(grid.unlocked, 1);
      assert.equal(grid.locked, 34);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F13-03', 'F13', 'Clicking an unlocked pet previews Web Audio voice & animation', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'PetFan' },
      seed: {
        'piupiu.pets.v1': JSON.stringify({ p1: { kitty: { count: 2, firstAt: Date.now() } } }),
      },
    });
    try {
      await openDialog(page, '#petCollectionBtn', '#petSheet');
      const before = await page.eval(() => window.__E2E_MOCK__.getAudioStats());
      await page.click('#petSheet [data-pet-id="kitty"]');
      await sleep(100);
      const after = await page.eval(() => ({
        audio: window.__E2E_MOCK__.getAudioStats(),
        hasPreviewMotion: Boolean(
          document.querySelector('#petSheet [data-pet-id="kitty"].is-previewing, #petSheet [data-pet-id="kitty"].is-active, #petDetailPreview')
        ),
      }));
      assert.ok(after.audio.oscillatorsStarted > before.oscillatorsStarted, 'Unlocked pet preview must play Web Audio voice');
      assert.equal(after.hasPreviewMotion, true);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F13-04', 'F13', 'Pet Collection updates localized pet metadata across zh/fr/en', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'PetFan' },
      seed: {
        'piupiu.pets.v1': JSON.stringify({ p1: { kitty: { count: 1, firstAt: Date.now() } } }),
      },
    });
    try {
      await openDialog(page, '#petCollectionBtn', '#petSheet');
      await page.click('#petSheet [data-pet-id="kitty"]');
      const zhText = await page.eval(() => document.getElementById('petSheet')?.textContent || '');
      await closeByEscape(page, '#petSheet');

      await page.eval(() => {
        const s = document.getElementById('langSelect');
        s.value = 'en';
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await openDialog(page, '#petCollectionBtn', '#petSheet');
      await page.click('#petSheet [data-pet-id="kitty"]');
      const enText = await page.eval(() => document.getElementById('petSheet')?.textContent || '');
      assert.notEqual(enText, zhText, 'Pet collection copy must localize when language changes');
      assert.match(enText, /1\s*\/\s*35/);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F13-05', 'F13', 'Pet unlocks are strictly isolated per player profile', async ({ browser }) => {
    const pA = makeTestProfile({ id: 'pA', name: 'Alpha' });
    const pB = makeTestProfile({ id: 'pB', name: 'Beta' });
    const page = await openApp(browser, {
      seed: {
        'piupiu.profiles': JSON.stringify([pA, pB]),
        'piupiu.user': 'pA',
        'piupiu.pets.v1': JSON.stringify({ pA: { kitty: { count: 1, firstAt: Date.now() } } }),
      },
    });
    try {
      await page.click('#homePlayerChips [data-switch-player="pB"], #homePlayerChips [data-player-id="pB"], #homePlayerChips button:nth-child(2)');
      await openDialog(page, '#petCollectionBtn', '#petSheet');
      const countText = await page.eval(() => document.getElementById('petSheet')?.textContent || '');
      assert.match(countText, /0\s*\/\s*35/, 'Player B must start with 0/35 unlocked pets');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #14: Per-player missed-word notebook & SRS nextWord() (P2)
  // =========================================================================
  add('T1-F14-01', 'F14', 'Missed words persist in piupiu.srs.v1 per active profile', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: { id: 'p1', name: 'Learner' } });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0, { timeout: 6000 });
      const missedWord = await page.eval(() => {
        const w = window.__PIU__.state.words[0];
        window.__PIU__.settleWord(w);
        return w.word.toLowerCase();
      });
      await quitRoundToOver(page);
      const srs = await readJsonStorage(page, 'piupiu.srs.v1', {});
      const rec = srs?.p1?.[missedWord];
      assert.ok(rec, `Expected SRS entry for "${missedWord}" in piupiu.srs.v1.p1`);
      assert.ok(rec.miss >= 1);
      assert.ok(Number.isFinite(rec.box));
      assert.ok(Number.isFinite(rec.dueAt));
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F14-02', 'F14', 'Hitting a word records hit & advances SRS box & dueAt', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Learner' } });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      const before = Date.now();
      const word = (await clearNextRainWord(page)).toLowerCase();
      await sleep(100);
      const srs = await readJsonStorage(page, 'piupiu.srs.v1', {});
      const rec = srs?.p1?.[word];
      assert.ok(rec, `Expected SRS entry for hit word "${word}"`);
      assert.ok(rec.hit >= 1);
      assert.ok(rec.seen >= 1);
      assert.ok(rec.dueAt > before, 'SRS dueAt must schedule into the future on hit');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F14-03', 'F14', 'Triggering speakHelp records SRS help counter', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Learner' } });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0, { timeout: 6000 });
      await page.press('Space');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 1);
      const spokenWord = await page.eval(() => window.__E2E_MOCK__.spoken[0].text.toLowerCase());
      const srs = await readJsonStorage(page, 'piupiu.srs.v1', {});
      const rec = srs?.p1?.[spokenWord];
      assert.ok(rec && rec.help >= 1, `Expected SRS help >= 1 for "${spokenWord}", got ${JSON.stringify(rec)}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F14-04', 'F14', 'SRS nextWord() weights overdue missed words higher than unseen words', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Learner' },
      seed: {
        'piupiu.customPacks': JSON.stringify([
          {
            id: 'c_srs',
            name: 'SRS Test Pack',
            words: Array.from({ length: 30 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}${i}`),
            createdAt: Date.now(),
          },
        ]),
        'piupiu.pack': 'custom:c_srs',
        'piupiu.srs.v1': JSON.stringify({
          p1: {
            worda0: { seen: 6, hit: 0, miss: 6, help: 2, dueAt: 0, box: 0 },
            wordb1: { seen: 6, hit: 0, miss: 6, help: 2, dueAt: 0, box: 0 },
          },
        }),
      },
    });
    try {
      await selectMode(page, 'fill');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .fill-word').length >= 10, { timeout: 6000 });
      const drawn = await getVisibleWords(page);
      const words = drawn.map((d) => d.word.toLowerCase());
      assert.ok(words.includes('worda0') || words.includes('wordb1'), 'Due missed words must be prioritized into drawn board');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F14-05', 'F14', 'Virtual Missed Words review pack appears in #packSheet & is playable', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Learner' },
      seed: {
        'piupiu.srs.v1': JSON.stringify({
          p1: {
            apple: { seen: 3, hit: 0, miss: 3, help: 1, dueAt: 0, box: 0 },
            banana: { seen: 3, hit: 0, miss: 3, help: 0, dueAt: 0, box: 0 },
            tiger: { seen: 2, hit: 0, miss: 2, help: 0, dueAt: 0, box: 0 },
            ocean: { seen: 2, hit: 0, miss: 2, help: 0, dueAt: 0, box: 0 },
          },
        }),
      },
    });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      const missedCat = await page.eval(() =>
        Boolean(document.querySelector('#packCategoryGrid [data-category-id="missed"]'))
      );
      if (!missedCat) {
        // Check custom/education tabs if placed under a specific tab
        for (const grp of ['themes', 'custom', 'education']) {
          await page.click(`#packTabs [data-pack-group="${grp}"]`);
          const found = await page.eval(() =>
            Boolean(document.querySelector('#packCategoryGrid [data-category-id="missed"]'))
          );
          if (found) break;
        }
      }
      await page.waitForSelector('#packCategoryGrid [data-category-id="missed"]', { timeout: 3000 });
      await page.click('#packCategoryGrid [data-category-id="missed"]');
      await page.click('#packDone');
      await startRound(page);
      const visible = await getVisibleWords(page);
      assert.ok(visible.length > 0);
      assert.ok(
        visible.some((w) => ['apple', 'banana', 'tiger', 'ocean'].includes(w.word.toLowerCase())),
        'Virtual missed pack round must spawn missed words'
      );
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #15: Poetry real-time word highlight & listen-along (P2)
  // =========================================================================
  add('T1-F15-01', 'F15', 'Poetry lines tokenize words into .poem-word spans', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await setupShortPoemAndPlay(page, 'traveling-together-97');
      const words = await page.eval(() =>
        Array.from(document.querySelectorAll('#poemLines .poem-line.is-current .poem-word')).map((el) =>
          el.textContent.trim()
        )
      );
      assert.deepEqual(words, ['a', 'plane', 'of', 'strangers']);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F15-02', 'F15', 'interimResults progressively highlights spoken .poem-word spans', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await setupShortPoemAndPlay(page, 'traveling-together-97');
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitSpeech('a plane', false));
      await sleep(80);
      const highlight = await page.eval(() => {
        const spans = Array.from(document.querySelectorAll('#poemLines .poem-line.is-current .poem-word'));
        const matched = spans.filter((s) => s.classList.contains('is-spoken') || s.classList.contains('is-matched') || s.classList.contains('is-lit'));
        const lineRead = document.querySelector('#poemLines .poem-line[data-line-index="0"]')?.classList.contains('is-read');
        return { matchedCount: matched.length, lineRead };
      });
      assert.equal(highlight.matchedCount, 2, 'First 2 .poem-word spans must highlight during interim speech');
      assert.equal(highlight.lineRead, false, 'Line must remain unread until full line matches');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F15-03', 'F15', 'Final matching line marks all words & advances to next line', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await setupShortPoemAndPlay(page, 'traveling-together-97');
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitSpeech('a plane of strangers', true));
      await page.waitFor(() => document.querySelector('#poemLines .poem-line[data-line-index="0"]')?.classList.contains('is-read'));
      const progress = await page.eval(() => ({
        prog: document.getElementById('poemProgress')?.textContent?.trim(),
        currentIdx: document.querySelector('#poemLines .poem-line.is-current')?.dataset.lineIndex,
      }));
      assert.equal(progress.prog, '1 / 3');
      assert.equal(progress.currentIdx, '1');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F15-04', 'F15', '#poemListenAll plays sequential full-poem listen-along', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 120 },
    });
    try {
      await setupShortPoemAndPlay(page, 'traveling-together-97');
      await page.waitForSelector('#poemListenAll');
      await page.click('#poemListenAll');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 3, {
        timeout: 4000,
        message: 'All 3 poem lines spoken sequentially',
      });
      const spoken = await page.eval(() => window.__E2E_MOCK__.spoken.map((s) => s.text));
      assert.equal(spoken.length, 3);
      assert.match(spoken[0], /plane of strangers/i);
      assert.match(spoken[2], /become a bird/i);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F15-05', 'F15', 'Tapping #poemListenAll again stops listen-along cleanly', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 1500 },
    });
    try {
      await setupShortPoemAndPlay(page, 'traveling-together-97');
      await page.click('#poemListenAll');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);
      await page.click('#poemListenAll');
      await sleep(300);
      const state = await page.eval(() => ({
        cancelled: window.__E2E_MOCK__.cancelledCount,
        spokenCount: window.__E2E_MOCK__.spoken.length,
        activeAttr: document.getElementById('poemListenAll')?.getAttribute('aria-pressed'),
      }));
      assert.ok(state.cancelled >= 1, 'Stopping listen-along must call speechSynthesis.cancel()');
      assert.equal(state.spokenCount, 1, 'No further lines should queue after stopping listen-along');
      assert.equal(state.activeAttr, 'false');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #16: Live mic volume/speech indicator & no-speech guidance (P2)
  // =========================================================================
  add('T1-F16-01', 'F16', '#micBtn renders equalizer bars structure when mic enabled', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      const eq = await page.eval(() => {
        const btn = document.getElementById('micBtn');
        return {
          listening: btn?.classList.contains('listening'),
          bars: btn ? btn.querySelectorAll('.mic-eq i, .mic-eq span, .mic-bar').length : 0,
        };
      });
      assert.equal(eq.listening, true);
      assert.ok(eq.bars >= 3, `Expected >= 3 equalizer bars inside #micBtn, got ${eq.bars}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F16-02', 'F16', 'Non-iOS AnalyserNode drives live mic volume bar levels', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.setMicLevel(0.85));
      await sleep(250);
      const stats = await page.eval(() => ({
        audio: window.__E2E_MOCK__.getAudioStats(),
        levelVar: document.getElementById('micBtn')?.style.getPropertyValue('--mic-level') || '',
        hasActiveClass: document.getElementById('micBtn')?.classList.contains('is-speaking') ||
          parseFloat(document.getElementById('micBtn')?.style.getPropertyValue('--mic-level') || '0') > 0.1,
      }));
      assert.ok(stats.audio.analyserReads > 0, 'AnalyserNode must be polled while mic is active');
      assert.equal(stats.hasActiveClass, true, 'Live mic indicator must respond to elevated AnalyserNode level');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F16-03', 'F16', 'onspeechstart fallback pulses indicator without AnalyserNode', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { failGetUserMedia: true },
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitSpeechStart());
      await sleep(50);
      const speaking = await page.eval(() =>
        document.getElementById('micBtn')?.classList.contains('is-speaking') ||
        document.getElementById('micBtn')?.dataset.speaking === 'true'
      );
      assert.equal(speaking, true, 'onspeechstart fallback must trigger active speech visual state');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F16-04', 'F16', '2 consecutive no-speech events surface gentle guidance', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitNoSpeech());
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      await page.eval(() => window.__E2E_MOCK__.emitNoSpeech());
      await sleep(100);
      const guidance = await page.eval(() => {
        const tip = document.getElementById('micTip');
        if (!tip || tip.classList.contains('is-hidden') || tip.classList.contains('hidden') || getComputedStyle(tip).display === 'none') {
          return '';
        }
        return tip.textContent.trim();
      });
      assert.ok(guidance.length > 0, '2 consecutive no-speech events must show visible #micTip guidance');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F16-05', 'F16', 'Successful speech hit resets noSpeechStreak & clears guidance', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitNoSpeech());
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      await page.eval(() => window.__E2E_MOCK__.emitNoSpeech());
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      const beforeHit = await page.eval(() => {
        const tip = document.getElementById('micTip');
        return {
          streak: window.__PIU__?.state?.noSpeechStreak,
          tipVisible: Boolean(
            tip && !tip.classList.contains('is-hidden') && !tip.classList.contains('hidden') && getComputedStyle(tip).display !== 'none'
          ),
        };
      });
      assert.equal(typeof beforeHit.streak, 'number', 'window.__PIU__.state.noSpeechStreak must be a number');
      assert.equal(beforeHit.streak, 2, 'noSpeechStreak must equal 2 after two consecutive no-speech events');
      assert.equal(beforeHit.tipVisible, true, '#micTip must be visible after 2nd no-speech before hit');

      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const w = (await getVisibleWords(page))[0].word;
      await page.eval((word) => window.__E2E_MOCK__.emitSpeech(word, true), w);
      await sleep(100);
      const state = await page.eval(() => {
        const tip = document.getElementById('micTip');
        return {
          streak: window.__PIU__?.state?.noSpeechStreak,
          tipHidden: Boolean(tip && (tip.classList.contains('is-hidden') || tip.classList.contains('hidden') || getComputedStyle(tip).display === 'none')),
        };
      });
      assert.strictEqual(state.streak, 0, 'noSpeechStreak must reset to 0 after successful hit');
      assert.equal(state.tipHidden, true, '#micTip must hide after successful hit');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #17: Pack search, 12-word preview, mastery progress & JSON backup (P2)
  // =========================================================================
  add('T1-F17-01', 'F17', '#packSearch filters pack cartridges live across tabs', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      await page.waitForSelector('#packSearch');
      await page.type('#packSearch', 'ani');
      await sleep(80);
      const visibleIds = await page.eval(() =>
        Array.from(document.querySelectorAll('#packCategoryGrid [data-category-id]'))
          .filter((el) => !el.classList.contains('is-hidden') && getComputedStyle(el).display !== 'none')
          .map((el) => el.dataset.categoryId)
      );
      assert.ok(visibleIds.includes('animals'), `Expected animals in filtered results, got ${JSON.stringify(visibleIds)}`);
      assert.equal(visibleIds.includes('food'), false, 'Non-matching food pack must be filtered out');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F17-02', 'F17', 'Selecting a pack shows 12-word preview chips', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packCategoryGrid [data-category-id="animals"]');
      const previewWords = await page.eval(() =>
        Array.from(document.querySelectorAll('#packWordPreview .pack-word-chip, #packWordPreview span, #packWordPreview button'))
          .map((el) => el.textContent.trim())
          .filter(Boolean)
      );
      assert.ok(previewWords.length > 0 && previewWords.length <= 12, `Expected up to 12 preview chips, got ${previewWords.length}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F17-03', 'F17', 'Pack cards & preview display mastered / total SRS progress', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Scholar' },
      seed: {
        'piupiu.srs.v1': JSON.stringify({
          p1: {
            cat: { seen: 3, hit: 3, miss: 0, help: 0, dueAt: Date.now() + 99999, box: 2 },
            dog: { seen: 3, hit: 3, miss: 0, help: 0, dueAt: Date.now() + 99999, box: 2 },
            lion: { seen: 3, hit: 3, miss: 0, help: 0, dueAt: Date.now() + 99999, box: 2 },
            tiger: { seen: 3, hit: 3, miss: 0, help: 0, dueAt: Date.now() + 99999, box: 2 },
            bear: { seen: 3, hit: 3, miss: 0, help: 0, dueAt: Date.now() + 99999, box: 2 },
          },
        }),
      },
    });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packCategoryGrid [data-category-id="animals"]');
      const cardText = await page.eval(() => ({
        card: document.querySelector('#packCategoryGrid [data-category-id="animals"]')?.textContent || '',
        preview: document.getElementById('packSheet')?.textContent || '',
      }));
      assert.match(cardText.card, /\b5\s*\//, `Animals card must show 5 / total mastery progress, got "${cardText.card}"`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F17-04', 'F17', 'Parent Settings JSON backup export produces valid snapshot', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Exporter', total: 88 },
      seed: {
        'piupiu.customPacks': JSON.stringify([{ id: 'c_exp', name: 'ExportPack', words: ['alpha', 'bravo', 'charlie', 'delta'], createdAt: 1000 }]),
        'piupiu.pets.v1': JSON.stringify({ p1: { kitty: { count: 1, firstAt: 1000 } } }),
        'piupiu.srs.v1': JSON.stringify({ p1: { alpha: { seen: 2, hit: 1, miss: 1, help: 0, dueAt: 2000, box: 1 } } }),
      },
    });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.waitForSelector('#backupExportBtn');
      await page.click('#backupExportBtn');
      await page.waitFor(() => window.__E2E_MOCK__.downloads.length > 0 && window.__E2E_MOCK__.downloads[0].text, {
        timeout: 4000,
      });
      const rawJson = await page.eval(() => window.__E2E_MOCK__.downloads[0].text);
      const parsed = JSON.parse(rawJson);
      const payload = parsed.data || parsed;
      assert.ok(payload['piupiu.profiles'], 'Exported JSON must include piupiu.profiles');
      assert.ok(payload['piupiu.customPacks'], 'Exported JSON must include piupiu.customPacks');
      assert.ok(payload['piupiu.pets.v1'], 'Exported JSON must include piupiu.pets.v1');
      assert.ok(payload['piupiu.srs.v1'], 'Exported JSON must include piupiu.srs.v1');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T1-F17-05', 'F17', 'Parent Settings JSON backup import restores full state into UI & storage', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const backupPayload = JSON.stringify({
        version: 1,
        app: 'piupiu',
        data: {
          'piupiu.profiles': JSON.stringify([makeTestProfile({ id: 'p_restored', name: 'RestoredKid', total: 420 })]),
          'piupiu.user': 'p_restored',
          'piupiu.customPacks': JSON.stringify([{ id: 'c_r1', name: 'RestoredPack', words: ['moon', 'star', 'comet', 'orbit'], createdAt: 1000 }]),
          'piupiu.pets.v1': JSON.stringify({ p_restored: { kitty: { count: 1, firstAt: 1000 }, fluff: { count: 1, firstAt: 1000 } } }),
          'piupiu.srs.v1': JSON.stringify({ p_restored: { moon: { seen: 2, hit: 2, miss: 0, help: 0, dueAt: 9999999999999, box: 2 } } }),
          'piupiu.theme': 'cream',
        },
      });
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.uploadFile('#backupFile', { name: 'piupiu-backup.json', content: backupPayload });
      await page.waitFor(() => {
        const profiles = JSON.parse(localStorage.getItem('piupiu.profiles') || '[]');
        return profiles.some((p) => p.name === 'RestoredKid');
      }, { timeout: 5000 });
      assert.equal(await page.eval(() => document.getElementById('playerName')?.textContent?.trim()), 'RestoredKid');
      assert.equal(await page.eval(() => document.documentElement.dataset.theme), 'cream');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  return tests;
}
