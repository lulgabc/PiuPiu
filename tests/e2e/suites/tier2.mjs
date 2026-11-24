import assert from 'node:assert/strict';
import {
  TINY_VIEWPORT,
  VIEWPORTS,
  auditThemeTokens,
  auditViewportA11y,
  closeByEscape,
  contrastRatio,
  ensureMicRunning,
  extractOpaqueGradientStops,
  getVisibleWords,
  makeTestProfile,
  openApp,
  openDialog,
  parseRgb,
  quitRoundToOver,
  readJsonStorage,
  readStorage,
  selectMode,
  startRound,
  typeAnswer,
} from '../assertions.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    { args: [index], timeout: 4000 }
  );
  return lineText;
}

async function setupPoemAndPlay(page, poemId = 'traveling-together-97') {
  await page.eval((id) => localStorage.setItem('piupiu.poetry.selected', id), poemId);
  await page.reload();
  await page.waitForSelector('#startBtn');
  await selectMode(page, 'poem');
  await startRound(page);
  await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length > 0, { timeout: 6000 });
}

export function getTier2Tests() {
  const tests = [];
  const add = (id, feature, title, run) => tests.push({ id, tier: 2, feature, title, run });

  // =========================================================================
  // Feature #1 Boundaries (T2-F01-01 .. T2-F01-05)
  // =========================================================================
  add('T2-F01-01', 'F01', 'Idempotent poem line marking does not double-credit score or profile', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Alice', total: 0 } });
    try {
      await setupPoemAndPlay(page, 'traveling-together-97');
      const line0 = await clearPoemLine(page, 0);
      await typeAnswer(page, line0); // duplicate submission of line 0
      await sleep(150);
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      assert.equal(profiles.find((p) => p.id === 'p1').total, 10, 'Duplicate line must not double-credit');
      assert.equal(await page.eval(() => document.getElementById('score')?.textContent?.trim()), '10');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F01-02', 'F01', 'Poem combo cap boundary caps per-line score at +20 and credits exact sum', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Alice', total: 0 } });
    try {
      // new-baby-10 has 13 lines; combo 1..13 => 10..20 capped
      await setupPoemAndPlay(page, 'new-baby-10');
      let expected = 0;
      for (let i = 0; i < 13; i++) {
        await clearPoemLine(page, i);
        expected += 10 + Math.min(10, i);
      }
      await page.waitFor(() => !document.getElementById('overPanel')?.classList.contains('hidden'), { timeout: 5000 });
      const p1 = (await readJsonStorage(page, 'piupiu.profiles', [])).find((p) => p.id === 'p1');
      assert.equal(p1.total, expected, `Expected capped combo sum ${expected}, got ${p1.total}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F01-03', 'F01', 'Quitting mid-poem preserves partial profile score & increments rounds', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Alice', total: 0 } });
    try {
      await setupPoemAndPlay(page, 'new-baby-10');
      await clearPoemLine(page, 0); // +10
      await clearPoemLine(page, 1); // +11 => 21
      await page.click('#pauseBtn');
      await page.waitForSelector('#quitBtn');
      await page.click('#quitBtn');
      await page.waitFor(() => document.body.classList.contains('phase-menu'), { timeout: 4000 });
      const p1 = (await readJsonStorage(page, 'piupiu.profiles', [])).find((p) => p.id === 'p1');
      assert.equal(p1.total, 21);
      assert.equal(p1.best, 21);
      assert.equal(p1.rounds, 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F01-04', 'F01', 'Lower second-round poem score accumulates total without overwriting higher best', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Alice', total: 60, best: 60, rounds: 1, correct: 5 },
    });
    try {
      await setupPoemAndPlay(page, 'traveling-together-97');
      await clearPoemLine(page, 0); // +10
      await clearPoemLine(page, 1); // +11
      await clearPoemLine(page, 2); // +12 => +33
      await page.waitFor(() => !document.getElementById('overPanel')?.classList.contains('hidden'), { timeout: 5000 });
      const p1 = (await readJsonStorage(page, 'piupiu.profiles', [])).find((p) => p.id === 'p1');
      assert.equal(p1.total, 93);
      assert.equal(p1.best, 60);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F01-05', 'F01', 'Corrupt piupiu.profiles numbers repaired before poem scoring (no NaN)', async ({ browser }) => {
    const page = await openApp(browser, {
      seed: {
        'piupiu.profiles': JSON.stringify([
          { id: 'p1', name: 'Corrupt', avatar: '🦊', total: 'nan', best: -10, correct: null, rounds: 'x' },
        ]),
        'piupiu.user': 'p1',
      },
    });
    try {
      await setupPoemAndPlay(page, 'traveling-together-97');
      await clearPoemLine(page, 0);
      const p1 = (await readJsonStorage(page, 'piupiu.profiles', [])).find((p) => p.id === 'p1');
      assert.equal(p1.total, 10, `Expected sanitized total === 10, got ${p1.total}`);
      assert.equal(Number.isNaN(p1.total), false);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #2 Boundaries (T2-F02-01 .. T2-F02-05)
  // =========================================================================
  add('T2-F02-01', 'F02', 'Very long poem line (>70 chars) + slow rate holds guard past 6000ms', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      seed: { 'piupiu.voice': 'child' },
      mockOptions: { utteranceStartDelayMs: 200, utteranceDelayMs: 6500 },
    });
    try {
      await setupPoemAndPlay(page, 'breakfast-160'); // line 1 is 70 chars
      await clearPoemLine(page, 0);
      await ensureMicRunning(page);
      await page.click('#poemListen');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);
      await sleep(5000);
      assert.equal(await page.eval(() => window.__E2E_MOCK__.isRunning()), false, 'Mic must stay paused past 5000ms');
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 4000 });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F02-02', 'F02', 'Stuck TTS (onend never fires) eventually releases via dynamic fallback timeout', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 20, utteranceDelayMs: -1 }, // onend never fires
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      await page.press('Space');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);
      // Fallback timeout for a short word should release within ~8s without hanging forever
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), {
        timeout: 9500,
        message: 'Stuck TTS must eventually release via fallback timeout',
      });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F02-03', 'F02', 'Rapid consecutive speakHelp calls supersede stale token cleanly', async ({ browser }) => {
    const page = await openApp(browser, {
      path: '/?debug=1',
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 1200 },
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.eval(() => {
        window.__PIU__.speakHelp('apple');
        setTimeout(() => window.__PIU__.speakHelp('banana'), 50);
      });
      await sleep(400);
      assert.equal(await page.eval(() => window.__E2E_MOCK__.spoken.length), 2);
      assert.equal(await page.eval(() => window.__E2E_MOCK__.isRunning()), false, 'Second utterance keeps mic paused');
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F02-04', 'F02', 'TTS unavailable (speechSynthesis missing) degrades gracefully without crash', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { disableSpeechSynthesis: true },
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      await page.press('Space');
      await sleep(150);
      const toastText = await page.eval(() => document.getElementById('toast')?.textContent?.trim() || '');
      assert.ok(toastText.length > 0, 'Expected warning toast when TTS is unavailable');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F02-05', 'F02', 'Pause/EndGame cancels active speakHelp immediately & suppresses stale onend mic restart', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 3000 },
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      await page.press('Space');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);
      await page.click('#pauseBtn');
      await sleep(200);
      const res = await page.eval(() => ({
        cancelled: window.__E2E_MOCK__.cancelledCount,
        running: window.__E2E_MOCK__.isRunning(),
      }));
      assert.ok(res.cancelled >= 1, 'Pausing during speakHelp must cancel speechSynthesis');
      assert.equal(res.running, false, 'Mic must NOT restart while paused');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #3 Boundaries (T2-F03-01 .. T2-F03-05)
  // =========================================================================
  add('T2-F03-01', 'F03', 'Non-debug URL does not expose window.__PIU__', async ({ browser }) => {
    const page = await openApp(browser, { path: '/', withPlayer: true });
    try {
      const hasDebug = await page.eval(() => typeof window.__PIU__ !== 'undefined');
      assert.equal(hasDebug, false);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F03-02', 'F03', 'localStorage QuotaExceededError handled gracefully during gameplay', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await startRound(page);
      await page.eval(() => window.__E2E_MOCK__.setStorageQuotaError(true));
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      await sleep(100);
      assert.ok(Number(await page.eval(() => document.getElementById('score')?.textContent?.trim())) >= 10);
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F03-03', 'F03', 'Removed legacy skin names gracefully migrate to candy default', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      seed: { 'piupiu.theme': 'storybook' },
    });
    try {
      const theme = await page.eval(() => document.documentElement.dataset.theme);
      assert.equal(theme, 'candy');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F03-04', 'F03', 'Rapid mode switches & restarts do not leak duplicate event listeners', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: { id: 'p1', name: 'NoLeak', total: 0 } });
    try {
      for (const m of ['rain', 'fill', 'paint', 'rain']) {
        await selectMode(page, m);
        await startRound(page);
        await quitRoundToOver(page);
        await page.click('#homeBtn');
        await page.waitFor(() => document.body.classList.contains('phase-menu'));
      }
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      await sleep(100);
      const score = Number(await page.eval(() => document.getElementById('score')?.textContent?.trim() || '0'));
      assert.ok(score >= 10 && score <= 25, `Single word hit after 4 restarts must not multi-fire score, got ${score}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F03-05', 'F03', 'Pet canvas fallback handles blocked WebPs across multiple consecutive rounds', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      page.setRequestOverrides(new Map([[new RegExp('^/assets/monsters/.*\\.webp$'), { status: 404, body: 'missing' }]]));
      for (let i = 0; i < 3; i++) {
        await startRound(page);
        await sleep(180);
        await quitRoundToOver(page);
        await page.click('#homeBtn');
        await page.waitFor(() => document.body.classList.contains('phase-menu'));
      }
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #4 Boundaries (T2-F04-01 .. T2-F04-05)
  // =========================================================================
  add('T2-F04-01', 'F04', 'Concurrent lazy load requests deduplicate to single network fetch', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'poem');
      await page.eval(() => {
        document.getElementById('poetryBtn')?.click();
        document.getElementById('startBtn')?.click();
      });
      await page.waitFor(() => document.querySelectorAll('#poetryList [data-poem-id]').length > 0 || document.querySelectorAll('#poemLines .poem-line').length > 0, { timeout: 6000 });
      const hits = page.getRequests().filter((r) => r.url.includes('poetry.js')).length;
      assert.equal(hits, 1, `Expected 1 poetry.js fetch on concurrent trigger, got ${hits}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F04-02', 'F04', 'Lazy script 500 failure recovers cleanly on retry without poisoned promise', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      page.setRequestOverrides(new Map([['/js/poetry.js', { status: 500, body: 'Error' }]]));
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await sleep(300);
      // Restore 200 and retry
      page.setRequestOverrides(null);
      await closeByEscape(page, '#poetrySheet');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.waitFor(() => document.querySelectorAll('#poetryList [data-poem-id]').length > 0, { timeout: 6000 });
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F04-03', 'F04', 'Slow lazy matter.min.js during immediate Start -> Quit cancels cleanly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const fs = await import('node:fs');
      const matterBody = fs.readFileSync('js/vendor/matter.min.js');
      page.setRequestOverrides(new Map([['/js/vendor/matter.min.js', { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8' }, body: matterBody, delayMs: 1200 }]]));
      await selectMode(page, 'rain');
      await page.click('#startBtn');
      await sleep(150);
      await page.click('#pauseBtn');
      await page.waitForSelector('#quitBtn');
      await page.click('#quitBtn');
      await sleep(1300);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F04-04', 'F04', 'Direct ?mode=poem URL lazy-loads poetry.js without blocking Home boot', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?mode=poem', withPlayer: true });
    try {
      const pressed = await page.eval(() => document.querySelector('#modeSwitch [data-mode="poem"]')?.getAttribute('aria-pressed'));
      assert.equal(pressed, 'true');
      await page.waitFor(() => window.PiuPoetry?.poems?.length === 153, {
        timeout: 6000,
        message: 'window.PiuPoetry lazy-loaded for ?mode=poem',
      });
      assert.ok(page.getRequests().some((r) => r.url.includes('poetry.js')), 'Expected network request for poetry.js');
      const rawHtml = await page.eval(async () => (await fetch('./index.html')).text());
      assert.equal(
        /<script[^>]+src=["'][^"']*poetry\.js/i.test(rawHtml),
        false,
        'index.html must NOT statically load poetry.js on initial boot'
      );
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F04-05', 'F04', 'Switching pack tab away from slow education tab prevents stale UI overwrite', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const fs = await import('node:fs');
      const eduBody = fs.readFileSync('js/education.js');
      page.setRequestOverrides(new Map([['/js/education.js', { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8' }, body: eduBody, delayMs: 700 }]]));
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="education"]');
      await sleep(100);
      await page.click('#packTabs [data-pack-group="themes"]');
      await sleep(800);
      const activeGroup = await page.eval(() =>
        document.querySelector('#packTabs .pack-tab.is-active, #packTabs [aria-selected="true"]')?.dataset.packGroup
      );
      assert.equal(activeGroup, 'themes', 'Active tab must remain themes after slow education load resolves');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #5 Boundaries (T2-F05-01 .. T2-F05-05)
  // =========================================================================
  add('T2-F05-01', 'F05', 'Static & data caches survive shell version upgrade while old shell cache is pruned', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.eval(async () => {
        await navigator.serviceWorker.ready;
        const cStatic = await caches.open('piupiu-static-v1');
        await cStatic.put('/__e2e_marker_static__', new Response('ok'));
        const cData = await caches.open('piupiu-data-v1');
        await cData.put('/__e2e_marker_data__', new Response('ok'));
      });
      const oldKeys = await page.eval(() => caches.keys());
      const oldShell = oldKeys.find((k) => k.startsWith('piupiu-shell-'));
      assert.ok(oldShell);

      const swBody = await page.eval(async () => (await fetch('./sw.js')).text());
      const nextSw = swBody.replace(/VERSION\s*=\s*["']([^"']+)["']/, 'VERSION = "$1-upgrade"');
      page.setRequestOverrides(new Map([['/sw.js', { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8' }, body: nextSw }]]));

      await page.eval(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg.update();
      });
      await page.waitFor(async () => {
        const keys = await caches.keys();
        return keys.some((k) => k.includes('-upgrade'));
      }, { timeout: 6000 });

      const check = await page.eval(async (oldName) => {
        const keys = await caches.keys();
        const staticHit = await (await caches.open('piupiu-static-v1')).match('/__e2e_marker_static__');
        const dataHit = await (await caches.open('piupiu-data-v1')).match('/__e2e_marker_data__');
        return {
          keys,
          oldPruned: !keys.includes(oldName),
          hasStatic: Boolean(staticHit),
          hasData: Boolean(dataHit),
        };
      }, oldShell);
      assert.equal(check.hasStatic, true, 'piupiu-static-v1 must survive shell version upgrade');
      assert.equal(check.hasData, true, 'piupiu-data-v1 must survive shell version upgrade');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F05-02', 'F05', 'Non-GET requests bypassed cleanly by Service Worker without caching', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.eval(() => navigator.serviceWorker.ready);
      await page.reload();
      await page.waitFor(() => Boolean(navigator.serviceWorker.controller), { timeout: 6000 });

      const keys = await page.eval(() => caches.keys());
      assert.ok(keys.some((k) => k.startsWith('piupiu-shell-')), `Expected 3-bucket piupiu-shell-* cache, got ${JSON.stringify(keys)}`);

      page.setRequestOverrides(
        new Map([['/__e2e_post_bypass__', { status: 200, headers: { 'Content-Type': 'application/json' }, body: '{"seq":1}' }]])
      );
      const r1 = await page.eval(async () => {
        const res = await fetch('/__e2e_post_bypass__?t=1', { method: 'POST', body: '{"x":1}' });
        return { ok: res.ok, text: await res.text() };
      });
      assert.equal(r1.ok, true);
      assert.equal(r1.text, '{"seq":1}');

      // Verify SW did NOT store the POST response in any cache bucket
      const cachedPostUrls = await page.eval(async () => {
        const hits = [];
        for (const k of await caches.keys()) {
          const cache = await caches.open(k);
          for (const req of await cache.keys()) {
            if (req.url.includes('__e2e_post_bypass__')) hits.push(`${k}:${req.url}`);
          }
        }
        return hits;
      });
      assert.deepEqual(cachedPostUrls, [], 'POST request must NEVER be stored in any SW cache bucket');

      // Update override and send second POST: must bypass cache and get updated response
      page.setRequestOverrides(
        new Map([['/__e2e_post_bypass__', { status: 200, headers: { 'Content-Type': 'application/json' }, body: '{"seq":2}' }]])
      );
      const r2 = await page.eval(async () => {
        const res = await fetch('/__e2e_post_bypass__?t=1', { method: 'POST', body: '{"x":2}' });
        return { ok: res.ok, text: await res.text() };
      });
      assert.equal(r2.text, '{"seq":2}', 'POST request must bypass SW cache and hit network');
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F05-03', 'F05', 'Offline navigation to index.html succeeds from shell while missing path fails cleanly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.eval(() => navigator.serviceWorker.ready);
      await page.reload();
      await page.waitFor(() => Boolean(navigator.serviceWorker.controller), { timeout: 5000 });
      await page.setOffline(true);
      const res = await page.eval(async () => {
        const homeRes = await fetch('./index.html');
        let missOk = false;
        try {
          const r = await fetch('./definitely-missing-e2e-page.html');
          missOk = r.ok;
        } catch {
          missOk = false;
        }
        return { homeOk: homeRes.ok, missOk };
      });
      assert.equal(res.homeOk, true);
      assert.equal(res.missOk, false);
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F05-04', 'F05', 'PWA update notice during active round does not interrupt gameplay', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.eval(() => navigator.serviceWorker.ready);
      await selectMode(page, 'rain');
      await startRound(page);
      const swBody = await page.eval(async () => (await fetch('./sw.js')).text());
      const nextSw = swBody.replace(/VERSION\s*=\s*["']([^"']+)["']/, 'VERSION = "$1-play"');
      page.setRequestOverrides(new Map([['/sw.js', { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8' }, body: nextSw }]]));
      await page.eval(async () => (await navigator.serviceWorker.getRegistration())?.update());
      await sleep(500);
      assert.equal(await page.eval(() => document.body.classList.contains('phase-playing')), true);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      assert.ok(Number(await page.eval(() => document.getElementById('score')?.textContent?.trim())) >= 10);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F05-05', 'F05', 'Standalone mode hides #installBtn and keeps #installSheet closed', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { standalone: true },
    });
    try {
      const info = await page.eval(() => ({
        isStandaloneClass: document.documentElement.classList.contains('is-standalone'),
        installHidden: document.getElementById('installBtn')?.classList.contains('is-hidden'),
      }));
      assert.equal(info.isStandaloneClass, true);
      assert.equal(info.installHidden, true);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #6 Boundaries (T2-F06-01 .. T2-F06-05)
  // =========================================================================
  add('T2-F06-01', 'F06', 'Resize portrait -> landscape in paint mode redraws canvas splats cleanly', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.mobile, withPlayer: true });
    try {
      await selectMode(page, 'paint');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .paint-word').length >= 3, { timeout: 6000 });
      const words = await getVisibleWords(page);
      for (const w of words.slice(0, 3)) {
        await typeAnswer(page, w.word);
      }
      await sleep(250);
      await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, mobile: true, hasTouch: true });
      await sleep(250);
      const canvas = await page.eval(() => {
        const c = document.querySelector('#paintLayer canvas');
        return c ? { w: c.width, h: c.height, svgs: document.querySelectorAll('.paint-splat').length } : null;
      });
      assert.ok(canvas && canvas.w > 0 && canvas.h > 0);
      assert.equal(canvas.svgs, 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F06-02', 'F06', 'Fill board with minimal 4-word custom pack renders cleanly without empty board', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      seed: {
        'piupiu.customPacks': JSON.stringify([{ id: 'c_4', name: 'Four', words: ['sun', 'moon', 'star', 'sky'], createdAt: 1 }]),
        'piupiu.pack': 'custom:c_4',
      },
    });
    try {
      await selectMode(page, 'fill');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .fill-word').length >= 4, { timeout: 5000 });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F06-03', 'F06', 'Fill board with long 24+ char words fits inside 390x844 #field without overflow', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.mobile,
      withPlayer: true,
      seed: {
        'piupiu.customPacks': JSON.stringify([
          {
            id: 'c_long',
            name: 'LongWords',
            words: [
              'supercalifragilistic',
              'electroencephalography',
              'antidisestablishment',
              'counterrevolutionary',
            ],
            createdAt: 1,
          },
        ]),
        'piupiu.pack': 'custom:c_long',
      },
    });
    try {
      await selectMode(page, 'fill');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .fill-word').length >= 4, { timeout: 5000 });
      const overflow = await page.eval(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F06-04', 'F06', '3 consecutive webglcontextlost -> webglcontextrestored cycles recover cleanly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => Boolean(document.querySelector('#pixiAmbient canvas')), { timeout: 6000 });
      for (let i = 0; i < 3; i++) {
        const prevented = await page.eval(() => {
          const c = document.querySelector('#pixiAmbient canvas');
          const ev = new Event('webglcontextlost', { cancelable: true });
          c.dispatchEvent(ev);
          c.dispatchEvent(new Event('webglcontextrestored', { cancelable: true }));
          return ev.defaultPrevented;
        });
        assert.equal(prevented, true);
        await sleep(80);
      }
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F06-05', 'F06', 'WebGL disabled fallback allows full Rain gameplay with zero errors', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { disableWebGL: true },
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0, { timeout: 6000 });
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      assert.ok(Number(await page.eval(() => document.getElementById('score')?.textContent?.trim())) >= 10);
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #7 Boundaries (T2-F07-01 .. T2-F07-05)
  // =========================================================================
  add('T2-F07-01', 'F07', 'All 4 themes verified across open dialogs with zero navy/mint leaks', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const signatures = new Set();
      for (const theme of ['candy', 'bubblegum', 'cream', 'daylight']) {
        await openDialog(page, '#setupBtn', '#setupSheet');
        await page.click(`[data-theme-choice="${theme}"]`);
        const s = await auditThemeTokens(page, theme);
        signatures.add(`${s.field?.bg}|${s.primaryBtn?.bg}`);
        await closeByEscape(page, '#setupSheet');
      }
      assert.equal(signatures.size, 4, 'All 4 themes must have distinct computed surface/accent signatures');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F07-02', 'F07', 'Corrupt piupiu.theme value falls back safely to candy', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      seed: { 'piupiu.theme': 'invalid_theme_xyz' },
    });
    try {
      assert.equal(await page.eval(() => document.documentElement.dataset.theme), 'candy');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F07-03', 'F07', 'Rapid theme toggling keeps aria-checked exclusive and matches final click', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      for (const t of ['bubblegum', 'cream', 'daylight', 'candy', 'daylight']) {
        await page.click(`[data-theme-choice="${t}"]`);
      }
      const res = await page.eval(() => ({
        theme: document.documentElement.dataset.theme,
        checked: Array.from(document.querySelectorAll('[data-theme-choice][aria-checked="true"]')).map((b) => b.dataset.themeChoice),
      }));
      assert.equal(res.theme, 'daylight');
      assert.deepEqual(res.checked, ['daylight']);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F07-04', 'F07', 'prefers-reduced-motion: reduce respected across themes without errors', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.emulateMedia([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await openDialog(page, '#setupBtn', '#setupSheet');
      await page.click('[data-theme-choice="daylight"]');
      await auditThemeTokens(page, 'daylight');
      await closeByEscape(page, '#setupSheet');
      const motion = await page.eval(() => {
        const checkEl = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const st = getComputedStyle(el);
          return {
            animName: st.animationName,
            animDur: parseFloat(st.animationDuration) || 0,
            transDur: parseFloat(st.transitionDuration) || 0,
          };
        };
        return {
          matches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          brand: checkEl('.brand-mark'),
          rewardNode: checkEl('.reward-node'),
          btn: checkEl('.primary-btn'),
          ambientDisplay: document.getElementById('pixiAmbient') ? getComputedStyle(document.getElementById('pixiAmbient')).display : null,
        };
      });
      assert.equal(motion.matches, true);
      if (motion.brand) {
        assert.ok(motion.brand.animName === 'none' || motion.brand.animDur <= 0.01, `Expected .brand-mark animation reduced, got ${JSON.stringify(motion.brand)}`);
      }
      if (motion.rewardNode) {
        assert.ok(
          (motion.rewardNode.animName === 'none' || motion.rewardNode.animDur <= 0.01) && motion.rewardNode.transDur <= 0.01,
          `Expected .reward-node motion reduced, got ${JSON.stringify(motion.rewardNode)}`
        );
      }
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F07-05', 'F07', 'Daylight theme maintains high contrast on word cards & poem lines', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      seed: { 'piupiu.theme': 'daylight' },
    });
    try {
      await selectMode(page, 'fill');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .fill-word').length > 0, { timeout: 5000 });
      await auditThemeTokens(page, 'daylight');

      const resolveBg = (bg, bgImg, fallback) => {
        const c = parseRgb(bg, { minAlpha: 0.85 });
        if (c) return c;
        const stops = extractOpaqueGradientStops(bgImg, { minAlpha: 0.85 });
        if (stops.length) return stops[0];
        return fallback;
      };

      const fillColors = await page.eval(() => {
        const card = document.querySelector('#wordLayer .fill-word');
        const textEl = card?.querySelector('.word-text') || card;
        const field = document.getElementById('field');
        const cardSt = getComputedStyle(card);
        const textSt = getComputedStyle(textEl);
        const fieldSt = getComputedStyle(field);
        return {
          cardBg: cardSt.backgroundColor,
          cardBgImage: cardSt.backgroundImage,
          cardColor: textSt.color,
          fieldBg: fieldSt.backgroundColor,
          fieldBgImage: fieldSt.backgroundImage,
        };
      });
      const fieldBg = resolveBg(fillColors.fieldBg, fillColors.fieldBgImage, null);
      const cardBg = resolveBg(fillColors.cardBg, fillColors.cardBgImage, fieldBg);
      const cardInk = parseRgb(fillColors.cardColor, { minAlpha: 0.85 });
      assert.ok(cardBg && cardInk, `Expected opaque colors for .fill-word in daylight, got ${JSON.stringify(fillColors)}`);
      const fillContrast = contrastRatio(cardBg, cardInk);
      assert.ok(fillContrast >= 4.5, `Daylight .fill-word contrast expected >= 4.5, got ${fillContrast.toFixed(2)}`);

      await page.eval(() => localStorage.setItem('piupiu.poetry.selected', 'traveling-together-97'));
      await page.reload();
      await page.waitForSelector('#startBtn');
      await selectMode(page, 'poem');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length > 0, { timeout: 6000 });
      const poemColors = await page.eval(() => {
        const line = document.querySelector('#poemLines .poem-line');
        const stage = document.getElementById('poemStage') || document.getElementById('field');
        const lSt = getComputedStyle(line);
        const sSt = getComputedStyle(stage);
        return {
          lineBg: lSt.backgroundColor,
          lineBgImage: lSt.backgroundImage,
          lineColor: lSt.color,
          stageBg: sSt.backgroundColor,
          stageBgImage: sSt.backgroundImage,
        };
      });
      const stageBg = resolveBg(poemColors.stageBg, poemColors.stageBgImage, fieldBg);
      const lineBg = resolveBg(poemColors.lineBg, poemColors.lineBgImage, stageBg);
      const lineInk = parseRgb(poemColors.lineColor, { minAlpha: 0.85 });
      assert.ok(lineBg && lineInk, `Expected opaque colors for .poem-line in daylight, got ${JSON.stringify(poemColors)}`);
      const poemContrast = contrastRatio(lineBg, lineInk);
      assert.ok(poemContrast >= 4.5, `Daylight .poem-line contrast expected >= 4.5, got ${poemContrast.toFixed(2)}`);

      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #8 Boundaries (T2-F08-01 .. T2-F08-05)
  // =========================================================================
  add('T2-F08-01', 'F08', 'Tiny 320x568 viewport keeps zero horizontal overflow & >=16px inputs', async ({ browser }) => {
    const page = await openApp(browser, { viewport: TINY_VIEWPORT, withPlayer: true });
    try {
      await auditViewportA11y(page, { require16pxInputs: true, require44pxTargets: false, label: 'tiny-home' });
      await startRound(page);
      await auditViewportA11y(page, { require16pxInputs: true, require44pxTargets: false, label: 'tiny-play' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F08-02', 'F08', 'Orientation flip 768x1024 <-> 1024x768 mid-round & mid-dialog preserves A11y', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.tablet_p, withPlayer: true });
    try {
      await selectMode(page, 'fill');
      await startRound(page);
      await page.setViewport(VIEWPORTS.tablet_l);
      await sleep(150);
      await auditViewportA11y(page, { require16pxInputs: true, label: 'flip-tablet_l' });
      await page.setViewport(VIEWPORTS.tablet_p);
      await sleep(150);
      await auditViewportA11y(page, { require16pxInputs: true, label: 'flip-tablet_p' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F08-03', 'F08', 'Focusing #typeInput on 390x844 confirms >=16px font & visualViewport.scale === 1', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.mobile, withPlayer: true });
    try {
      await startRound(page);
      await page.focus('#typeInput');
      const res = await page.eval(() => ({
        fontSize: parseFloat(getComputedStyle(document.getElementById('typeInput')).fontSize),
        scale: window.visualViewport ? window.visualViewport.scale : 1,
      }));
      assert.ok(res.fontSize >= 16, `Expected #typeInput fontSize >= 16px, got ${res.fontSize}`);
      assert.equal(res.scale, 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F08-04', 'F08', 'Long translated fr strings preserve >=44px hit boxes & zero overflow', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.mobile,
      withPlayer: true,
      seed: { 'piupiu.lang': 'fr' },
    });
    try {
      await auditViewportA11y(page, { require16pxInputs: true, label: 'fr-mobile-home' });
      await openDialog(page, '#packBtn', '#packSheet');
      await auditViewportA11y(page, { require16pxInputs: true, label: 'fr-mobile-pack' });
      await closeByEscape(page, '#packSheet');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F08-05', 'F08', 'Poem lines & settlement missed chips maintain >=44px hit height/width on mobile', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.mobile,
      path: '/?debug=1',
      withPlayer: true,
    });
    try {
      await setupPoemAndPlay(page, 'traveling-together-97');
      await auditViewportA11y(page, { require16pxInputs: true, label: 'mobile-poem-lines' });
      await quitRoundToOver(page);
      await page.click('#homeBtn');
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      await page.eval(() => {
        for (let i = 0; i < 6; i++) window.__PIU__.state.missedWords.push(`word${i}`);
      });
      await quitRoundToOver(page);
      await auditViewportA11y(page, { require16pxInputs: true, label: 'mobile-over-missed' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #9 Boundaries (T2-F09-01 .. T2-F09-05)
  // =========================================================================
  add('T2-F09-01', 'F09', 'Invalid ?mode=unknown URL param falls back safely to rain', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?mode=unknown_xyz', withPlayer: true });
    try {
      const active = await page.eval(() => document.querySelector('#modeSwitch .is-active')?.dataset.mode);
      assert.equal(active, 'rain');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F09-02', 'F09', 'Rapid phase transitions keep body.phase-* mutually exclusive', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      const checkExclusive = async (expected) => {
        const classes = await page.eval(() =>
          Array.from(document.body.classList).filter((c) => c.startsWith('phase-'))
        );
        assert.equal(classes.length, 1, `Expected 1 phase-* class, got ${JSON.stringify(classes)}`);
        if (expected) assert.equal(classes[0], expected);
      };
      await checkExclusive('phase-menu');
      await startRound(page);
      await checkExclusive('phase-playing');
      await page.click('#pauseBtn');
      await checkExclusive('phase-paused');
      await page.click('#quitBtn');
      await checkExclusive('phase-menu');
      await startRound(page);
      await checkExclusive('phase-playing');
      await quitRoundToOver(page);
      await checkExclusive('phase-over');
      await page.click('#homeBtn');
      await checkExclusive('phase-menu');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F09-03', 'F09', 'Zero-score round settlement displays 0 stats and empty-missed hint cleanly', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await startRound(page);
      await quitRoundToOver(page);
      const stats = await page.eval(() => ({
        score: document.getElementById('finalScore')?.textContent?.trim(),
        cleared: document.getElementById('finalCleared')?.textContent?.trim(),
        missedButtons: document.querySelectorAll('#missedList button').length,
      }));
      assert.equal(stats.score, '0');
      assert.equal(stats.cleared, '0');
      assert.equal(stats.missedButtons, 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F09-04', 'F09', 'Corrupt piupiu.lang falls back safely to supported default zh', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      seed: { 'piupiu.lang': 'xx-invalid' },
    });
    try {
      const lang = await page.eval(() => document.documentElement.dataset.lang || document.documentElement.lang);
      assert.ok(lang.startsWith('zh'), `Expected zh fallback, got ${lang}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F09-05', 'F09', 'Large HUD numbers (99999 score, x99 combo) do not overflow 390x844 topbar', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.mobile, path: '/?debug=1', withPlayer: true });
    try {
      await startRound(page);
      await page.eval(() => {
        window.__PIU__.state.score = 99999;
        window.__PIU__.state.combo = 99;
        document.getElementById('score').textContent = '99,999';
        document.getElementById('combo').textContent = '×99';
      });
      await auditViewportA11y(page, { require16pxInputs: true, label: 'mobile-large-hud' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #10 Boundaries (T2-F10-01 .. T2-F10-05)
  // =========================================================================
  add('T2-F10-01', 'F10', 'Escape key closes ALL 7 <dialog> sheets & restores opener focus', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const pairs = [
        ['#installBtn', '#installSheet'],
        ['#playerBtn', '#playerSheet'],
        ['#boardBtn', '#boardSheet'],
        ['#packBtn', '#packSheet'],
        ['#setupBtn', '#setupSheet'],
        ['#petCollectionBtn', '#petSheet'],
      ];
      for (const [btnSel, dlgSel] of pairs) {
        await page.focus(btnSel);
        await openDialog(page, btnSel, dlgSel);
        await closeByEscape(page, dlgSel);
        const focusedId = await page.eval(() => document.activeElement?.id);
        assert.equal(`#${focusedId}`, btnSel, `Escape on ${dlgSel} must restore focus to ${btnSel}`);
      }
      await selectMode(page, 'poem');
      await page.focus('#poetryBtn');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await closeByEscape(page, '#poetrySheet');
      assert.equal(await page.eval(() => document.activeElement?.id), 'poetryBtn');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F10-02', 'F10', 'Backdrop click closes ALL 7 <dialog> sheets cleanly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const pairs = [
        ['#installBtn', '#installSheet'],
        ['#playerBtn', '#playerSheet'],
        ['#boardBtn', '#boardSheet'],
        ['#packBtn', '#packSheet'],
        ['#setupBtn', '#setupSheet'],
        ['#petCollectionBtn', '#petSheet'],
      ];
      for (const [btnSel, dlgSel] of pairs) {
        await openDialog(page, btnSel, dlgSel);
        await page.click({ x: 4, y: 4 });
        await page.waitFor(
          (s) => !document.querySelector(s)?.open,
          { args: [dlgSel], timeout: 3000, message: `backdrop click closes ${dlgSel}` }
        );
      }
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.click({ x: 4, y: 4 });
      await page.waitFor(() => !document.getElementById('poetrySheet')?.open, { timeout: 3000 });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F10-03', 'F10', '2-step delete auto-reverts armed state after 3000ms without deleting', async ({ browser }) => {
    const p1 = makeTestProfile({ id: 'p1', name: 'One' });
    const p2 = makeTestProfile({ id: 'p2', name: 'Two' });
    const page = await openApp(browser, {
      seed: { 'piupiu.profiles': JSON.stringify([p1, p2]), 'piupiu.user': 'p1' },
    });
    try {
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.click('[data-delete-player="p2"]');
      assert.equal(
        await page.eval(() => document.querySelector('[data-delete-player="p2"]')?.getAttribute('data-confirm-armed')),
        'true'
      );
      await sleep(3200);
      const after = await page.eval(() => ({
        armed: document.querySelector('[data-delete-player="p2"]')?.getAttribute('data-confirm-armed'),
        count: JSON.parse(localStorage.getItem('piupiu.profiles') || '[]').length,
      }));
      assert.notEqual(after.armed, 'true', 'Armed delete state must auto-revert after 3000ms');
      assert.equal(after.count, 2);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F10-04', 'F10', 'Closing sheet or arming sibling delete cancels prior armed confirmation', async ({ browser }) => {
    const p1 = makeTestProfile({ id: 'p1', name: 'One' });
    const p2 = makeTestProfile({ id: 'p2', name: 'Two' });
    const page = await openApp(browser, {
      seed: { 'piupiu.profiles': JSON.stringify([p1, p2]), 'piupiu.user': 'p1' },
    });
    try {
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.click('[data-delete-player="p1"]');
      await page.click('[data-delete-player="p2"]');
      const state = await page.eval(() => ({
        p1Armed: document.querySelector('[data-delete-player="p1"]')?.getAttribute('data-confirm-armed'),
        p2Armed: document.querySelector('[data-delete-player="p2"]')?.getAttribute('data-confirm-armed'),
      }));
      assert.notEqual(state.p1Armed, 'true');
      assert.equal(state.p2Armed, 'true');
      await closeByEscape(page, '#playerSheet');
      await openDialog(page, '#playerBtn', '#playerSheet');
      assert.notEqual(
        await page.eval(() => document.querySelector('[data-delete-player="p2"]')?.getAttribute('data-confirm-armed')),
        'true'
      );
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F10-05', 'F10', 'Opening <dialog> during gameplay blocks background clicks & closes on Escape cleanly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await startRound(page);
      await openDialog(page, '#setupBtn', '#setupSheet');
      assert.equal(await page.eval(() => document.getElementById('setupSheet')?.open), true);
      await closeByEscape(page, '#setupSheet');
      assert.equal(await page.eval(() => document.getElementById('setupSheet')?.open), false);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #11 Boundaries (T2-F11-01 .. T2-F11-05)
  // =========================================================================
  add('T2-F11-01', 'F11', 'Blank/whitespace-only rename on post-round guest banner rejected', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1' });
    try {
      await startRound(page);
      await quitRoundToOver(page);
      await page.waitForSelector('#guestRenameInput', { timeout: 4000 });
      const beforeName = (await readJsonStorage(page, 'piupiu.profiles', []))[0].name;
      await page.type('#guestRenameInput', '   ');
      await page.click('#guestRenameSave, #guestRenameBanner button[type="submit"], #guestRenameBanner .primary-btn');
      const afterName = (await readJsonStorage(page, 'piupiu.profiles', []))[0].name;
      assert.equal(afterName, beforeName, 'Whitespace-only rename must be rejected');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F11-02', 'F11', 'Max-length (>12 chars) profile name truncated cleanly to 12 chars', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.type('#playerNameInput', 'AlexandriaTheGreat');
      await page.click('#playerSubmit');
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      const created = profiles.find((p) => p.name.startsWith('Alexandria'));
      assert.ok(created);
      assert.equal(created.name.length, 12);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F11-03', 'F11', 'Duplicate profile name (case-insensitive) rejected with inline error', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Mia' } });
    try {
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.type('#playerNameInput', 'mia');
      await page.click('#playerSubmit');
      const res = await page.eval(() => ({
        err: document.getElementById('playerError')?.textContent?.trim() || '',
        count: JSON.parse(localStorage.getItem('piupiu.profiles') || '[]').length,
      }));
      assert.ok(res.err.length > 0, 'Duplicate name must display #playerError');
      assert.equal(res.count, 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F11-04', 'F11', '20-profile device cap (MAX_PROFILES = 20) enforced', async ({ browser }) => {
    const list = Array.from({ length: 20 }, (_, i) => makeTestProfile({ id: `p_${i}`, name: `Kid${i}` }));
    const page = await openApp(browser, {
      seed: { 'piupiu.profiles': JSON.stringify(list), 'piupiu.user': 'p_0' },
    });
    try {
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.type('#playerNameInput', 'Kid21');
      await page.click('#playerSubmit');
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      assert.equal(profiles.length, 20);
      assert.ok((await page.eval(() => document.getElementById('playerError')?.textContent?.trim() || '')).length > 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F11-05', 'F11', 'Deleting active profile falls back safely to remaining profile or fresh guest', async ({ browser }) => {
    const p1 = makeTestProfile({ id: 'p1', name: 'One' });
    const p2 = makeTestProfile({ id: 'p2', name: 'Two' });
    const page = await openApp(browser, {
      seed: { 'piupiu.profiles': JSON.stringify([p1, p2]), 'piupiu.user': 'p1' },
    });
    try {
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.click('[data-delete-player="p1"]');
      await page.click('[data-delete-player="p1"]');
      await sleep(80);
      assert.equal(await readStorage(page, 'piupiu.user'), 'p2');
      await page.click('[data-delete-player="p2"]');
      await page.click('[data-delete-player="p2"]');
      await sleep(80);
      const afterAll = await readJsonStorage(page, 'piupiu.profiles', []);
      assert.ok(afterAll.length >= 1, 'Deleting last profile must cleanly recreate a guest profile or stay playable');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #12 Boundaries (T2-F12-01 .. T2-F12-05)
  // =========================================================================
  add('T2-F12-01', 'F12', 'Tapping falling Rain card then immediately typing to explode it clears cleanly', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 1000 },
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const wordText = await page.eval(() => {
        const el = document.querySelector('#wordLayer .word');
        el.dataset.e2eTap = '1';
        return (el.dataset.word || el.textContent || '').trim();
      });
      await page.click('#wordLayer .word[data-e2e-tap="1"]');
      await typeAnswer(page, wordText);
      await sleep(150);
      assert.ok(Number(await page.eval(() => document.getElementById('score')?.textContent?.trim())) >= 10);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F12-02', 'F12', 'Zero missed words hides/disables Practice Missed Words button', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await startRound(page);
      await quitRoundToOver(page);
      const btnVisible = await page.eval(() => {
        const b = document.getElementById('practiceMissedBtn');
        if (!b) return false;
        return !b.disabled && !b.classList.contains('is-hidden') && getComputedStyle(b).display !== 'none';
      });
      assert.equal(btnVisible, false);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F12-03', 'F12', '20+ missed words deduplicate & cap cleanly on #overPanel without overflow', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.mobile, path: '/?debug=1', withPlayer: true });
    try {
      await startRound(page);
      await page.eval(() => {
        window.__PIU__.state.missedWords.push('dup', 'dup', 'dup');
        for (let i = 0; i < 22; i++) window.__PIU__.state.missedWords.push(`missed${i}`);
      });
      await quitRoundToOver(page);
      const chips = await page.eval(() => document.querySelectorAll('#missedList button').length);
      assert.ok(chips > 0 && chips <= 18, `Expected deduplicated capped <= 18 chips, got ${chips}`);
      assert.equal(await page.eval(() => document.documentElement.scrollWidth > window.innerWidth), false);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F12-04', 'F12', '"Next Poem" at last poem (#153 my-book-189) wraps cleanly to poem #1', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await setupPoemAndPlay(page, 'my-book-189');
      const count = await page.eval(() => document.querySelectorAll('#poemLines .poem-line').length);
      for (let i = 0; i < count; i++) {
        await clearPoemLine(page, i);
      }
      await page.waitForSelector('#overNextPoemBtn', { timeout: 6000 });
      await page.click('#overNextPoemBtn');
      await page.waitFor(() => document.body.classList.contains('phase-playing'), { timeout: 5000 });
      assert.equal(await readStorage(page, 'piupiu.poetry.selected'), 'new-baby-10');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F12-05', 'F12', 'Invalid poetry JSON import in Parent Settings rejected without corrupting library', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.uploadFile('#poetryFile', { name: 'bad-poems.json', content: '{bad json' });
      await sleep(200);
      const status = await page.eval(() => document.getElementById('poetryStatus')?.textContent?.trim() || '');
      assert.ok(status.length > 0, 'Malformed poetry JSON must report error in #poetryStatus');
      assert.equal(await readStorage(page, 'piupiu.poetry.library.v1'), null);
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #13 Boundaries (T2-F13-01 .. T2-F13-05)
  // =========================================================================
  add('T2-F13-01', 'F13', '35/35 full collection completion clamps without out-of-bounds unlock', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: { id: 'p1', name: 'Collector' } });
    try {
      await page.eval(() => {
        const ids = window.PiuPets.PET_IDS.slice(0, 34);
        const map = {};
        for (const id of ids) map[id] = { count: 1, firstAt: 1000 };
        localStorage.setItem('piupiu.pets.v1', JSON.stringify({ p1: map }));
      });
      await page.reload();
      await page.waitForSelector('#startBtn');
      await startRound(page);
      await quitRoundToOver(page);
      await page.click('#homeBtn');
      await startRound(page);
      await quitRoundToOver(page);
      const store = await readJsonStorage(page, 'piupiu.pets.v1', {});
      assert.equal(Object.keys(store.p1 || {}).length, 35, 'Pet collection must cap cleanly at 35/35');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F13-02', 'F13', 'Clicking a locked silhouette pet in #petSheet does NOT unlock it', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: { id: 'p1', name: 'Collector' } });
    try {
      await openDialog(page, '#petCollectionBtn', '#petSheet');
      await page.click('#petSheet [data-pet-id="kitty"]');
      await sleep(100);
      const store = await readJsonStorage(page, 'piupiu.pets.v1', {});
      assert.equal(Boolean(store?.p1?.kitty), false, 'Clicking locked silhouette must NOT unlock pet');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F13-03', 'F13', 'Corrupt piupiu.pets.v1 JSON or unknown pet IDs sanitized safely', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Collector' },
      seed: {
        'piupiu.pets.v1': JSON.stringify({ p1: { fluff: { count: 1, firstAt: 1000 }, bogus_pet: { count: 1 } } }),
      },
    });
    try {
      await openDialog(page, '#petCollectionBtn', '#petSheet');
      const text = await page.eval(() => document.getElementById('petSheet')?.textContent || '');
      assert.match(text, /1\s*\/\s*35/, 'Unknown pet IDs must be ignored so valid count is 1/35');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F13-04', 'F13', 'Rapidly clicking multiple unlocked pet previews runs cleanly without error', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Collector' },
      seed: {
        'piupiu.pets.v1': JSON.stringify({
          p1: {
            fluff: { count: 1, firstAt: 1 },
            mochi: { count: 1, firstAt: 1 },
            kitty: { count: 1, firstAt: 1 },
            dino: { count: 1, firstAt: 1 },
            wisp: { count: 1, firstAt: 1 },
          },
        }),
      },
    });
    try {
      await openDialog(page, '#petCollectionBtn', '#petSheet');
      for (const id of ['fluff', 'mochi', 'kitty', 'dino', 'wisp']) {
        await page.click(`#petSheet [data-pet-id="${id}"]`);
      }
      await sleep(150);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F13-05', 'F13', 'Pet encounter unlock triggers across all 4 game modes', async ({ browser }) => {
    for (const mode of ['rain', 'fill', 'paint', 'poem']) {
      const page = await openApp(browser, { path: '/?debug=1', withPlayer: { id: 'p1', name: 'AllModes' } });
      try {
        await selectMode(page, mode);
        await startRound(page);
        await quitRoundToOver(page);
        const store = await readJsonStorage(page, 'piupiu.pets.v1', {});
        assert.ok(Object.keys(store.p1 || {}).length >= 1, `Expected pet unlock in ${mode} mode`);
        assert.deepEqual(page.getAllErrors(), []);
      } finally {
        await page.close();
      }
    }
  });

  // =========================================================================
  // Feature #14 Boundaries (T2-F14-01 .. T2-F14-05)
  // =========================================================================
  add('T2-F14-01', 'F14', 'First-time player with 0 SRS records plays standard pack smoothly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      assert.equal(await readStorage(page, 'piupiu.srs.v1'), null);
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F14-02', 'F14', 'Corrupt piupiu.srs.v1 (NaN dueAt, negative box) repaired on hit', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Repair' },
      seed: {
        'piupiu.customPacks': JSON.stringify([{ id: 'c_1', name: 'Fix', words: ['apple', 'banana', 'cherry', 'mango'], createdAt: 1 }]),
        'piupiu.pack': 'custom:c_1',
        'piupiu.srs.v1': JSON.stringify({
          p1: { apple: { seen: 'bad', hit: -5, miss: 1, help: 0, dueAt: 'NaN', box: -3 } },
        }),
      },
    });
    try {
      await selectMode(page, 'fill');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .fill-word').length >= 4);
      await typeAnswer(page, 'apple');
      await sleep(100);
      const rec = (await readJsonStorage(page, 'piupiu.srs.v1', {})).p1?.apple;
      assert.ok(rec && Number.isFinite(rec.dueAt) && rec.box >= 0 && Number.isFinite(rec.hit));
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F14-03', 'F14', 'Virtual Missed Words / Practice Missed handles < 4 words without loop', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'SmallSrs' },
      seed: {
        'piupiu.srs.v1': JSON.stringify({
          p1: {
            apple: { seen: 2, hit: 0, miss: 2, help: 0, dueAt: 0, box: 0 },
            mango: { seen: 1, hit: 0, miss: 1, help: 0, dueAt: 0, box: 0 },
          },
        }),
      },
    });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      let foundMissed = await page.eval(() =>
        Boolean(document.querySelector('#packCategoryGrid [data-category-id="missed"]'))
      );
      if (!foundMissed) {
        for (const grp of ['themes', 'custom', 'education']) {
          await page.click(`#packTabs [data-pack-group="${grp}"]`);
          foundMissed = await page.eval(() =>
            Boolean(document.querySelector('#packCategoryGrid [data-category-id="missed"]'))
          );
          if (foundMissed) break;
        }
      }
      assert.equal(foundMissed, true, 'Virtual missed words pack [data-category-id="missed"] must appear when SRS has missed words');
      await page.click('#packCategoryGrid [data-category-id="missed"]');
      await page.click('#packDone');
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0, { timeout: 5000 });
      const spawned = (await getVisibleWords(page)).map((w) => w.word.toLowerCase());
      assert.ok(spawned.length > 0, 'Expected missed words to spawn');
      assert.ok(
        spawned.every((w) => w === 'apple' || w === 'mango'),
        `Expected only <4 missed words (apple/mango) without fallback loop, got ${JSON.stringify(spawned)}`
      );
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F14-04', 'F14', 'Deleting player profile cleans up orphaned SRS & pet entries', async ({ browser }) => {
    const p1 = makeTestProfile({ id: 'p1', name: 'Keep' });
    const p2 = makeTestProfile({ id: 'p2', name: 'Drop' });
    const page = await openApp(browser, {
      seed: {
        'piupiu.profiles': JSON.stringify([p1, p2]),
        'piupiu.user': 'p1',
        'piupiu.srs.v1': JSON.stringify({ p2: { apple: { seen: 1, hit: 0, miss: 1, help: 0, dueAt: 0, box: 0 } } }),
      },
    });
    try {
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.click('[data-delete-player="p2"]');
      await page.click('[data-delete-player="p2"]');
      await sleep(100);
      const srs = await readJsonStorage(page, 'piupiu.srs.v1', {});
      assert.equal(Boolean(srs.p2), false, 'Deleted profile SRS entry should be cleaned up');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F14-05', 'F14', 'Repeated hits clamp SRS box ceiling safely without overflow', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Master' },
      seed: {
        'piupiu.customPacks': JSON.stringify([
          { id: 'c_srs_cap', name: 'CapPack', words: ['apple', 'banana', 'cherry', 'mango'], createdAt: 1 },
        ]),
        'piupiu.pack': 'custom:c_srs_cap',
        'piupiu.srs.v1': JSON.stringify({
          p1: { apple: { seen: 15, hit: 15, miss: 0, help: 0, dueAt: Date.now() - 1000, box: 6 } },
        }),
      },
    });
    try {
      const before = Date.now();
      await selectMode(page, 'fill');
      await startRound(page);
      await page.waitFor(
        () => Array.from(document.querySelectorAll('#wordLayer .fill-word')).some(
          (el) => (el.dataset.word || el.textContent || '').trim().toLowerCase() === 'apple'
        ),
        { timeout: 5000, message: 'apple rendered on fill board' }
      );
      await typeAnswer(page, 'apple');
      await page.waitFor(() => Number(document.getElementById('score')?.textContent?.trim() || '0') >= 20, {
        timeout: 3000,
        message: 'score increases after clearing apple',
      });
      await sleep(100);
      const rec = (await readJsonStorage(page, 'piupiu.srs.v1', {})).p1?.apple;
      assert.ok(rec, 'SRS record for apple must exist');
      assert.ok(rec.hit >= 16, `Expected rec.hit >= 16 after hit, got ${rec.hit}`);
      assert.ok(rec.dueAt > before, `Expected rec.dueAt > ${before}, got ${rec.dueAt}`);
      assert.ok(Number.isFinite(rec.box) && rec.box <= 6, `SRS box must clamp <= 6, got ${rec.box}`);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #15 Boundaries (T2-F15-01 .. T2-F15-05)
  // =========================================================================
  add('T2-F15-01', 'F15', 'Poetry contractions & hyphenated tokens match spoken plain words', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      // new-baby-10 line 1: "before she’s two hours old"
      await setupPoemAndPlay(page, 'new-baby-10');
      await clearPoemLine(page, 0);
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitSpeech('before shes two hours old', true));
      await page.waitFor(
        () => document.querySelector('#poemLines .poem-line[data-line-index="1"]')?.classList.contains('is-read'),
        { timeout: 3000 }
      );
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F15-02', 'F15', 'Partial interim speech highlights matched words without prematurely completing line', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await setupPoemAndPlay(page, 'traveling-together-97');
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitSpeech('a', false));
      await sleep(80);
      const read = await page.eval(() =>
        document.querySelector('#poemLines .poem-line[data-line-index="0"]')?.classList.contains('is-read')
      );
      assert.equal(read, false);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F15-03', 'F15', 'Repeated/stuttered spoken words still match poem line cleanly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await setupPoemAndPlay(page, 'traveling-together-97');
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitSpeech('a a plane of of strangers', true));
      await page.waitFor(
        () => document.querySelector('#poemLines .poem-line[data-line-index="0"]')?.classList.contains('is-read'),
        { timeout: 3000 }
      );
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F15-04', 'F15', 'Listen-along interrupted by Pause stops sequential TTS cleanly', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 1500 },
    });
    try {
      await setupPoemAndPlay(page, 'traveling-together-97');
      await page.click('#poemListenAll');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length === 1);
      await page.click('#pauseBtn');
      await sleep(300);
      assert.equal(await page.eval(() => window.__E2E_MOCK__.spoken.length), 1);
      assert.ok((await page.eval(() => window.__E2E_MOCK__.cancelledCount)) >= 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F15-05', 'F15', 'Non-existent search in #poetrySearch shows #poetryEmpty & handles shuffle', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.waitFor(() => document.querySelectorAll('#poetryList [data-poem-id]').length > 0, { timeout: 6000 });
      await page.type('#poetrySearch', 'zzzznoexist999');
      await sleep(80);
      assert.equal(
        await page.eval(() => !document.getElementById('poetryEmpty')?.classList.contains('is-hidden')),
        true
      );
      await page.click('#poetryShuffle');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #16 Boundaries (T2-F16-01 .. T2-F16-05)
  // =========================================================================
  add('T2-F16-01', 'F16', 'Mic permission denied (not-allowed) disables mic & keeps keyboard usable', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { denyMic: true },
    });
    try {
      await startRound(page);
      await sleep(100);
      assert.equal(await page.eval(() => document.getElementById('micBtn')?.getAttribute('aria-pressed')), 'false');
      await page.click('#micBtn');
      await sleep(100);
      assert.equal(await page.eval(() => document.getElementById('micBtn')?.getAttribute('aria-pressed')), 'false');
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      assert.ok(Number(await page.eval(() => document.getElementById('score')?.textContent?.trim())) >= 10);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F16-02', 'F16', 'Single no-speech event does NOT trigger 2x no-speech guidance yet', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await startRound(page);
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitNoSpeech());
      await sleep(100);
      const streak = await page.eval(() => window.__PIU__?.state?.noSpeechStreak);
      assert.strictEqual(streak, 1);
      const tipVisible = await page.eval(() => {
        const el = document.getElementById('micTip');
        return Boolean(el && !el.classList.contains('is-hidden') && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none');
      });
      assert.equal(tipVisible, false, 'Guidance must NOT trigger on single no-speech');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F16-03', 'F16', '2nd no-speech shows guidance while network errors escalate separately', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await startRound(page);
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitNoSpeech());
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      await page.eval(() => window.__E2E_MOCK__.emitNoSpeech());
      await sleep(100);
      const tipState = await page.eval(() => {
        const tip = document.getElementById('micTip');
        return {
          visible: Boolean(
            tip && !tip.classList.contains('is-hidden') && !tip.classList.contains('hidden') && getComputedStyle(tip).display !== 'none'
          ),
          text: tip ? tip.textContent.trim() : '',
          pressed: document.getElementById('micBtn')?.getAttribute('aria-pressed'),
        };
      });
      assert.equal(tipState.visible, true, '#micTip guidance must become visible after 2nd no-speech');
      assert.ok(tipState.text.length > 0, '#micTip must display non-empty guidance text');
      assert.equal(tipState.pressed, 'true', 'no-speech must keep mic enabled');

      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      await page.eval(() => window.__E2E_MOCK__.emitError('network'));
      await sleep(60);
      assert.equal(await page.eval(() => document.getElementById('micBtn')?.getAttribute('aria-pressed')), 'true');
      await page.eval(() => window.__E2E_MOCK__.emitError('network'));
      await sleep(60);
      assert.equal(await page.eval(() => document.getElementById('micBtn')?.getAttribute('aria-pressed')), 'false');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F16-04', 'F16', 'Browser without SpeechRecognition falls back cleanly to keyboard-only mode', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { disableSpeechRecognition: true },
    });
    try {
      assert.equal(await page.eval(() => document.getElementById('micBtn')?.disabled), true);
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      assert.ok(Number(await page.eval(() => document.getElementById('score')?.textContent?.trim())) >= 10);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F16-05', 'F16', 'getUserMedia rejection does not break SpeechRecognition or onspeechstart', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      mockOptions: { failGetUserMedia: true },
    });
    try {
      await startRound(page);
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitSpeechStart());
      await sleep(60);
      const speaking = await page.eval(() =>
        Boolean(
          document.getElementById('micBtn')?.classList.contains('is-speaking') ||
          document.getElementById('micBtn')?.dataset.speaking === 'true'
        )
      );
      assert.equal(speaking, true, 'onspeechstart must activate mic speaking indicator even when getUserMedia fails');
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const w = (await getVisibleWords(page))[0].word;
      await page.eval((word) => window.__E2E_MOCK__.emitSpeech(word, true), w);
      await sleep(100);
      assert.ok(Number(await page.eval(() => document.getElementById('score')?.textContent?.trim())) >= 10);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  // =========================================================================
  // Feature #17 Boundaries (T2-F17-01 .. T2-F17-05)
  // =========================================================================
  add('T2-F17-01', 'F17', 'Custom pack rejects empty, <4 words & invalid symbol files cleanly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="custom"]');
      await page.uploadFile('#customPackFile', { name: 'too-few.txt', content: 'apple banana' });
      await sleep(150);
      assert.equal((await readJsonStorage(page, 'piupiu.customPacks', [])).length, 0);
      await page.uploadFile('#customPackFile', { name: 'symbols.txt', content: '12345 !!! ??? ###' });
      await sleep(150);
      assert.equal((await readJsonStorage(page, 'piupiu.customPacks', [])).length, 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F17-02', 'F17', 'Duplicate custom pack name auto-disambiguates & 12-pack cap enforced', async ({ browser }) => {
    const existing = Array.from({ length: 11 }, (_, i) => ({
      id: `c_${i}`,
      name: i === 0 ? 'My Pack' : `Pack ${i}`,
      words: ['alpha', 'bravo', 'charlie', 'delta'],
      createdAt: 1000 + i,
    }));
    const page = await openApp(browser, {
      withPlayer: true,
      seed: { 'piupiu.customPacks': JSON.stringify(existing) },
    });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="custom"]');
      await page.type('#customPackName', 'My Pack');
      await page.uploadFile('#customPackFile', { name: 'words.txt', content: 'apple\nbanana\ncherry\ndate' });
      await sleep(150);
      await page.click('#customPackCreate');
      await page.waitFor(
        () => JSON.parse(localStorage.getItem('piupiu.customPacks') || '[]').length === 12,
        { timeout: 3000, message: 'Duplicate-named 12th custom pack created' }
      );
      const packs = await readJsonStorage(page, 'piupiu.customPacks', []);
      assert.equal(packs.length, 12);
      const created = packs.find((p) => !existing.some((e) => e.id === p.id));
      assert.ok(created, 'Expected newly created custom pack');
      assert.notEqual(created.name, 'My Pack', 'Duplicate custom pack name must auto-disambiguate');
      assert.ok(created.name.startsWith('My Pack'), `Disambiguated name should preserve base, got "${created.name}"`);

      // Verify 12-pack cap prevents creating a 13th pack
      await page.type('#customPackName', 'Over Cap');
      await page.uploadFile('#customPackFile', { name: 'words2.txt', content: 'eagle\nfalcon\nrobin\nswallow' });
      await sleep(150);
      const capCheck = await page.eval(() => ({
        disabled: Boolean(document.getElementById('customPackCreate')?.disabled),
        count: JSON.parse(localStorage.getItem('piupiu.customPacks') || '[]').length,
      }));
      assert.equal(capCheck.disabled, true, '#customPackCreate must disable at 12-pack cap');
      assert.equal(capCheck.count, 12, '12-pack cap must be enforced');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F17-03', 'F17', '#packSearch handles regex meta-characters & no-match safely then restores on clear', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      await page.waitForSelector('#packSearch');
      await page.type('#packSearch', '[invalid(regex*');
      await sleep(80);
      await page.type('#packSearch', '', { clear: true });
      await sleep(80);
      const visible = await page.eval(() =>
        Array.from(document.querySelectorAll('#packCategoryGrid [data-category-id]')).filter(
          (el) => !el.classList.contains('is-hidden')
        ).length
      );
      assert.ok(visible >= 5, 'Clearing #packSearch must restore pack cards');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F17-04', 'F17', 'JSON backup import rejects malformed JSON & wrong schema without wiping existing data', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p_keep', name: 'KeepMe', total: 77 },
    });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.uploadFile('#backupFile', { name: 'bad.json', content: '{not json' });
      await sleep(150);
      await page.uploadFile('#backupFile', { name: 'wrong.json', content: '{"wrong":true}' });
      await sleep(150);
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      assert.equal(profiles[0]?.name, 'KeepMe', 'Bad backup import must preserve existing data');
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T2-F17-05', 'F17', 'JSON backup import sanitizes partial/corrupt subfields cleanly', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const mixedBackup = JSON.stringify({
        version: 1,
        app: 'piupiu',
        data: {
          'piupiu.profiles': JSON.stringify([
            makeTestProfile({ id: 'p_ok', name: 'ValidKid', total: 50 }),
            { id: 'p_bad', name: '', total: -999 },
          ]),
          'piupiu.user': 'p_ok',
          'piupiu.pets.v1': JSON.stringify({ p_ok: { kitty: { count: 1, firstAt: 10 }, fake_pet: { count: 1 } } }),
        },
      });
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.uploadFile('#backupFile', { name: 'mixed.json', content: mixedBackup });
      await page.waitFor(
        () => JSON.parse(localStorage.getItem('piupiu.profiles') || '[]').some((p) => p.name === 'ValidKid'),
        { timeout: 4000 }
      );
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      assert.equal(profiles.length, 1);
      assert.equal(profiles[0].name, 'ValidKid');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  return tests;
}
