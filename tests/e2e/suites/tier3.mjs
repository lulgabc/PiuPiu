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
  assert.ok(lineText, `Expected poem line ${index}`);
  await typeAnswer(page, lineText);
  await page.waitFor(
    (idx) => document.querySelector(`#poemLines .poem-line[data-line-index="${idx}"]`)?.classList.contains('is-read'),
    { args: [index], timeout: 4000 }
  );
  return lineText;
}

export function getTier3Tests() {
  const tests = [];
  const add = (id, feature, title, run, extra = {}) => tests.push({ id, tier: 3, feature, title, run, ...extra });

  add('T3-PW-01', 'PW', 'Theme (daylight) x Language (fr) x Mobile (390x844) A11y & luminance', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.mobile,
      withPlayer: true,
      seed: { 'piupiu.theme': 'daylight', 'piupiu.lang': 'fr' },
    });
    try {
      assert.equal(await page.eval(() => document.documentElement.lang), 'fr');
      await auditThemeTokens(page, 'daylight');
      await auditViewportA11y(page, { require16pxInputs: true, label: 'T3-PW-01-home' });
      await startRound(page);
      await auditViewportA11y(page, { require16pxInputs: true, label: 'T3-PW-01-play' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-02', 'PW', 'Theme (bubblegum) x Mode (paint) x Tablet Rotate (768x1024 -> 1024x768)', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.tablet_p,
      withPlayer: true,
      seed: { 'piupiu.theme': 'bubblegum' },
    });
    try {
      await selectMode(page, 'paint');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .paint-word').length >= 3, { timeout: 6000 });
      const words = await getVisibleWords(page);
      for (const w of words.slice(0, 3)) await typeAnswer(page, w.word);
      await sleep(200);
      await page.setViewport(VIEWPORTS.tablet_l);
      await sleep(200);
      await auditThemeTokens(page, 'bubblegum');
      await auditViewportA11y(page, { require16pxInputs: true, label: 'T3-PW-02-landscape' });
      assert.equal(await page.eval(() => document.querySelectorAll('.paint-splat').length), 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-03', 'PW', 'Theme (cream) x Mode (fill) x Custom Pack (4 words) completion & pet unlock', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'CreamKid' },
      seed: {
        'piupiu.theme': 'cream',
        'piupiu.customPacks': JSON.stringify([{ id: 'c_4', name: 'Mini', words: ['sun', 'moon', 'star', 'sky'], createdAt: 1 }]),
        'piupiu.pack': 'custom:c_4',
      },
    });
    try {
      await auditThemeTokens(page, 'cream');
      await selectMode(page, 'fill');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .fill-word').length === 4, { timeout: 5000 });
      for (const w of ['sun', 'moon', 'star', 'sky']) await typeAnswer(page, w);
      await page.waitFor(() => !document.getElementById('overPanel')?.classList.contains('hidden'), { timeout: 5000 });
      const pets = await readJsonStorage(page, 'piupiu.pets.v1', {});
      assert.ok(Object.keys(pets.p1 || {}).length >= 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-04', 'PW', 'Mode (poem) x Dynamic speakHelp (>4.5s) x markPoemLine profile credit', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Poet', total: 0 },
      seed: { 'piupiu.poetry.selected': 'breakfast-160' },
      mockOptions: { utteranceStartDelayMs: 100, utteranceDelayMs: 4700 },
    });
    try {
      await selectMode(page, 'poem');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length > 0, { timeout: 6000 });
      await ensureMicRunning(page);
      await page.click('#poemListen');
      await sleep(4150);
      assert.equal(await page.eval(() => window.__E2E_MOCK__.isRunning()), false, 'Guard must hold past 4s');
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      await clearPoemLine(page, 0);
      const p1 = (await readJsonStorage(page, 'piupiu.profiles', [])).find((p) => p.id === 'p1');
      assert.equal(p1.total, 10);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-05', 'PW', 'Lazy Loader (education) x Offline SW (piupiu-data-v1)', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      await page.eval(() => navigator.serviceWorker.ready);
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="education"]');
      await page.waitFor(() => document.querySelectorAll('#packCategoryGrid [data-category-id]').length > 0, { timeout: 6000 });
      await page.click('#packCategoryGrid [data-category-id="dolch"]');
      await page.click('#packDone');
      await page.reload();
      await page.waitFor(() => Boolean(navigator.serviceWorker.controller), { timeout: 5000 });
      await page.setOffline(true);
      await page.reload();
      await page.waitForSelector('#startBtn', { timeout: 6000 });
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0, { timeout: 5000 });
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-06', 'PW', 'Instant Play Guest x Round 1 x Post-Round Rename x Pet Unlock', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1' });
    try {
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      await quitRoundToOver(page);
      await page.waitForSelector('#guestRenameInput', { timeout: 4000 });
      await page.type('#guestRenameInput', 'Sunny');
      await page.click('#guestRenameSave, #guestRenameBanner button[type="submit"], #guestRenameBanner .primary-btn');
      const profiles = await readJsonStorage(page, 'piupiu.profiles', []);
      const pets = await readJsonStorage(page, 'piupiu.pets.v1', {});
      assert.equal(profiles[0].name, 'Sunny');
      assert.ok(Object.keys(pets[profiles[0].id] || {}).length >= 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-07', 'PW', 'Multi-Profile Quick-Switch x SRS Notebook x Leaderboard isolation', async ({ browser }) => {
    const pA = makeTestProfile({ id: 'pA', name: 'Ava', total: 20 });
    const pB = makeTestProfile({ id: 'pB', name: 'Ben', total: 50 });
    const page = await openApp(browser, {
      seed: {
        'piupiu.profiles': JSON.stringify([pA, pB]),
        'piupiu.user': 'pA',
        'piupiu.srs.v1': JSON.stringify({ pA: { apple: { seen: 3, hit: 0, miss: 3, help: 0, dueAt: 0, box: 0 } } }),
      },
    });
    try {
      await page.click('#homePlayerChips [data-switch-player="pB"], #homePlayerChips [data-player-id="pB"], #homePlayerChips button:nth-child(2)');
      const srs = await readJsonStorage(page, 'piupiu.srs.v1', {});
      assert.equal(Boolean(srs.pB?.apple), false);
      await openDialog(page, '#boardBtn', '#boardSheet');
      const boardText = await page.eval(() => document.getElementById('boardList')?.textContent || '');
      assert.ok(boardText.includes('Ben') && boardText.includes('Ava'));
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-08', 'PW', 'Word Rain Tap-Word x Echo Guard x SRS help Counter', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Tapper' },
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 700 },
    });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await ensureMicRunning(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const word = await page.eval(() => {
        const el = document.querySelector('#wordLayer .word');
        el.dataset.e2eTap = '1';
        return (el.dataset.word || el.textContent || '').trim();
      });
      await page.click('#wordLayer .word[data-e2e-tap="1"]');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 1);
      await page.eval((w) => window.__E2E_MOCK__.emitSpeech(w, true, [], { force: true }), word);
      await sleep(100);
      assert.equal(await page.eval(() => document.getElementById('score')?.textContent?.trim()), '0');
      const srs = await readJsonStorage(page, 'piupiu.srs.v1', {});
      assert.ok((srs?.p1?.[word.toLowerCase()]?.help || 0) >= 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-09', 'PW', 'Settlement Missed Chips x Practice Missed Words x Pet Collection', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: { id: 'p1', name: 'Practicer' } });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      await page.eval(() => {
        window.__PIU__.state.missedWords.push('eagle', 'river', 'cloud');
      });
      await quitRoundToOver(page);
      await page.click('#missedList button');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 1);
      await page.click('#practiceMissedBtn');
      await page.waitFor(() => document.body.classList.contains('phase-playing'), { timeout: 5000 });
      await quitRoundToOver(page);
      const pets = await readJsonStorage(page, 'piupiu.pets.v1', {});
      assert.ok(Object.keys(pets.p1 || {}).length >= 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-10', 'PW', 'Poetry interimResults Highlight x #poemListenAll x Next Poem', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      seed: { 'piupiu.poetry.selected': 'traveling-together-97' },
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 300 },
    });
    try {
      await selectMode(page, 'poem');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length === 3, { timeout: 6000 });
      await page.click('#poemListenAll');
      await sleep(100);
      await page.click('#poemListenAll');
      await ensureMicRunning(page);
      await page.eval(() => window.__E2E_MOCK__.emitSpeech('a plane', false));
      await sleep(80);
      await clearPoemLine(page, 0);
      await clearPoemLine(page, 1);
      await clearPoemLine(page, 2);
      await page.waitForSelector('#overNextPoemBtn', { timeout: 6000 });
      await page.click('#overNextPoemBtn');
      await page.waitFor(() => document.body.classList.contains('phase-playing'));
      assert.notEqual(await readStorage(page, 'piupiu.poetry.selected'), 'traveling-together-97');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-11', 'PW', 'Live Mic Indicator x 2x no-speech Streak x Keyboard Fallback', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
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
      assert.equal(typeof beforeHit.streak, 'number', 'noSpeechStreak must be a number');
      assert.equal(beforeHit.streak, 2, 'noSpeechStreak must reach 2 after 2x no-speech');
      assert.equal(beforeHit.tipVisible, true, '#micTip must be visible after 2x no-speech');

      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      await sleep(100);
      const afterHit = await page.eval(() => {
        const tip = document.getElementById('micTip');
        return {
          streak: window.__PIU__?.state?.noSpeechStreak,
          tipHidden: Boolean(tip && (tip.classList.contains('is-hidden') || tip.classList.contains('hidden') || getComputedStyle(tip).display === 'none')),
        };
      });
      assert.strictEqual(afterHit.streak, 0, 'noSpeechStreak must reset to 0 after hit');
      assert.equal(afterHit.tipHidden, true, '#micTip must hide after hit');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-12', 'PW', '#packSearch x Mastery Progress x Difficulty Filter (1/2/3)', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Searcher' },
      seed: {
        'piupiu.srs.v1': JSON.stringify({
          p1: { cat: { seen: 3, hit: 3, miss: 0, help: 0, dueAt: Date.now() + 99999, box: 2 } },
        }),
      },
    });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      await page.type('#packSearch', 'ani');
      await page.click('#packCategoryGrid [data-category-id="animals"]');
      await page.click('#diffGroup [data-level="1"]');
      const c1 = await page.eval(() => document.getElementById('packCount')?.textContent || '');
      await page.click('#diffGroup [data-level="3"]');
      const c3 = await page.eval(() => document.getElementById('packCount')?.textContent || '');
      assert.ok(c1.length > 0 && c3.length > 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-13', 'PW', 'Native <dialog> playerSheet x 2-Step Delete Timeout x Focus Restoration', async ({ browser }) => {
    const p1 = makeTestProfile({ id: 'p1', name: 'One' });
    const p2 = makeTestProfile({ id: 'p2', name: 'Two' });
    const page = await openApp(browser, {
      seed: { 'piupiu.profiles': JSON.stringify([p1, p2]), 'piupiu.user': 'p1' },
    });
    try {
      await page.focus('#playerBtn');
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.click('[data-delete-player="p2"]');
      await sleep(3150);
      assert.notEqual(
        await page.eval(() => document.querySelector('[data-delete-player="p2"]')?.getAttribute('data-confirm-armed')),
        'true'
      );
      await page.click('[data-delete-player="p2"]');
      await page.click('[data-delete-player="p2"]');
      await closeByEscape(page, '#playerSheet');
      assert.equal(await page.eval(() => document.activeElement?.id), 'playerBtn');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-14', 'PW', 'JSON Backup Export -> Wipe -> Import preserves Custom Packs, Pets & SRS', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: { id: 'p1', name: 'Migrator', total: 120 },
      seed: {
        'piupiu.customPacks': JSON.stringify([{ id: 'c_mig', name: 'MigPack', words: ['fern', 'moss', 'pine', 'reed'], createdAt: 100 }]),
        'piupiu.pets.v1': JSON.stringify({ p1: { kitty: { count: 1, firstAt: 100 } } }),
        'piupiu.srs.v1': JSON.stringify({ p1: { fern: { seen: 2, hit: 0, miss: 2, help: 0, dueAt: 0, box: 0 } } }),
      },
    });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.click('#backupExportBtn');
      await page.waitFor(() => window.__E2E_MOCK__.downloads.length > 0 && window.__E2E_MOCK__.downloads[0].text);
      const exported = await page.eval(() => window.__E2E_MOCK__.downloads[0].text);

      await page.eval(() => localStorage.clear());
      await page.reload();
      await page.waitForSelector('#setupBtn');
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv2 = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv2 === false) await page.click('#setupAdvanced summary');
      await page.uploadFile('#backupFile', { name: 'backup.json', content: exported });
      await page.waitFor(
        () => JSON.parse(localStorage.getItem('piupiu.profiles') || '[]').some((p) => p.name === 'Migrator'),
        { timeout: 5000 }
      );
      assert.equal((await readJsonStorage(page, 'piupiu.customPacks', [])).length, 1);
      assert.ok((await readJsonStorage(page, 'piupiu.pets.v1', {})).p1?.kitty);
      assert.ok((await readJsonStorage(page, 'piupiu.srs.v1', {})).p1?.fern);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-15', 'PW', 'Speed (turbo) x Matter.js Pile x Meteor Sweep (5 clears)', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.click('#speedBtn');
      await page.click('#speedBtn');
      assert.equal(await page.eval(() => document.getElementById('speedBtn')?.dataset.speed), 'turbo');

      await page.waitFor(() => document.querySelectorAll('#wordLayer .word:not(.settled)').length > 0, { timeout: 6000 });
      await page.eval(() => {
        const w = window.__PIU__.state.words[0];
        if (w) window.__PIU__.settleWord(w);
      });
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word.settled').length >= 1, { timeout: 3000 });

      for (let i = 0; i < 5; i++) {
        await page.waitFor(
          () => document.querySelectorAll('#wordLayer .word:not(.exploding):not(.settled)').length > 0,
          { timeout: 6000 }
        );
        const w = await page.eval(() => {
          const el = document.querySelector('#wordLayer .word:not(.exploding):not(.settled)');
          return el ? (el.dataset.word || el.textContent || '').trim() : '';
        });
        assert.ok(w, 'Expected falling word to clear');
        await typeAnswer(page, w);
        await sleep(60);
      }
      await page.waitFor(
        () => document.getElementById('rewardCount')?.textContent?.trim() === '0/5',
        { timeout: 3000, message: 'rewardCount resets to 0/5 after 5-clear reward sweep' }
      );
      assert.ok(Number(await page.eval(() => document.getElementById('score')?.textContent?.trim())) >= 50);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  }, { timeoutMs: 35000 });

  add('T3-PW-16', 'PW', 'WebGL Context Loss in Rain x Mode Switch (rain -> fill -> paint)', async ({ browser }) => {
    const page = await openApp(browser, { path: '/?debug=1', withPlayer: true });
    try {
      await selectMode(page, 'rain');
      await startRound(page);
      await page.waitFor(() => Boolean(document.querySelector('#pixiAmbient canvas')), { timeout: 6000 });
      await page.eval(() => {
        document.querySelector('#pixiAmbient canvas')?.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      });
      await quitRoundToOver(page);
      await page.click('#homeBtn');
      await selectMode(page, 'fill');
      await startRound(page);
      await quitRoundToOver(page);
      await page.click('#homeBtn');
      await selectMode(page, 'paint');
      await startRound(page);
      await page.waitFor(() => Boolean(document.querySelector('#paintLayer canvas')), { timeout: 5000 });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-17', 'PW', 'Poetry Import in Parent Settings x #poetrySheet Search x Poem Round', async ({ browser }) => {
    const page = await openApp(browser, { withPlayer: true });
    try {
      const customLibrary = JSON.stringify({
        version: 1,
        source: 'E2E Custom Anthology',
        categories: [{ id: 'customcat', name: 'E2E Poems', hue: 200, icon: 'book' }],
        poems: [
          {
            id: 'e2e-custom-poem',
            category: 'customcat',
            title: 'Starlight Test',
            author: 'Tester',
            lines: ['twinkle bright star', 'shine over sea'],
            stanzaStarts: [0],
          },
        ],
      });
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.uploadFile('#poetryFile', { name: 'custom-poems.json', content: customLibrary });
      await page.waitFor(() => Boolean(localStorage.getItem('piupiu.poetry.library.v1')), { timeout: 4000 });
      await closeByEscape(page, '#setupSheet');

      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.type('#poetrySearch', 'Starlight');
      await page.waitForSelector('#poetryList [data-poem-id="e2e-custom-poem"]');
      await page.click('#poetryList [data-poem-id="e2e-custom-poem"]');
      await page.click('#poetryDone');
      await startRound(page);
      await clearPoemLine(page, 0);
      await clearPoemLine(page, 1);
      await page.waitFor(() => !document.getElementById('overPanel')?.classList.contains('hidden'), { timeout: 5000 });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-18', 'PW', 'PWA Update Notice x Active Poem Round x Offline Reload', async ({ browser }) => {
    const page = await openApp(browser, {
      withPlayer: true,
      seed: { 'piupiu.poetry.selected': 'traveling-together-97' },
    });
    try {
      await page.eval(() => navigator.serviceWorker.ready);
      await selectMode(page, 'poem');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length === 3, { timeout: 6000 });
      const swBody = await page.eval(async () => (await fetch('./sw.js')).text());
      page.setRequestOverrides(new Map([['/sw.js', { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8' }, body: swBody.replace(/VERSION\s*=\s*["']([^"']+)["']/, 'VERSION = "$1-t3"') }]]));
      await page.eval(async () => (await navigator.serviceWorker.getRegistration())?.update());
      await sleep(300);
      await clearPoemLine(page, 0);
      await page.setOffline(true);
      await page.reload();
      await page.waitForSelector('#startBtn', { timeout: 6000 });
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-19', 'PW', 'Tablet Landscape (1024x768) x Poetry Mode x Language (en) A11y', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.tablet_l,
      withPlayer: true,
      seed: { 'piupiu.lang': 'en' },
    });
    try {
      await selectMode(page, 'poem');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length > 0, { timeout: 6000 });
      await auditViewportA11y(page, { require16pxInputs: true, label: 'T3-PW-19-poem-tablet_l' });
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T3-PW-20', 'PW', 'Corrupt LocalStorage Recovery x Instant Play x Backup Import', async ({ browser }) => {
    const page = await openApp(browser, {
      seed: {
        'piupiu.profiles': '{corrupt',
        'piupiu.srs.v1': '[invalid',
        'piupiu.pets.v1': '12345',
        'piupiu.customPacks': 'badjson',
      },
    });
    try {
      await sleep(500);
      const guestProfiles = await readJsonStorage(page, 'piupiu.profiles', []);
      assert.equal(guestProfiles.length, 1, 'Corrupt profiles must recover via Instant Play guest profile');
      const playerAutoOpened = await page.eval(() => {
        const d = document.getElementById('playerSheet');
        return d ? (d.tagName === 'DIALOG' ? d.open : !d.classList.contains('is-hidden')) : false;
      });
      assert.equal(playerAutoOpened, false, 'Instant Play must not auto-open #playerSheet');

      await startRound(page);
      assert.equal(await page.eval(() => document.body.classList.contains('phase-playing')), true);
      await page.click('#pauseBtn');
      await page.waitForSelector('#quitBtn');
      await page.click('#quitBtn');
      await page.waitFor(() => document.body.classList.contains('phase-menu'), { timeout: 4000 });

      const backupPayload = JSON.stringify({
        version: 1,
        app: 'piupiu',
        data: {
          'piupiu.profiles': JSON.stringify([makeTestProfile({ id: 'p_rec', name: 'RecoveredKid', total: 150 })]),
          'piupiu.user': 'p_rec',
          'piupiu.pets.v1': JSON.stringify({ p_rec: { kitty: { count: 1, firstAt: 1000 } } }),
        },
      });
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.uploadFile('#backupFile', { name: 'recover-backup.json', content: backupPayload });
      await page.waitFor(
        () => JSON.parse(localStorage.getItem('piupiu.profiles') || '[]').some((p) => p.name === 'RecoveredKid'),
        { timeout: 5000, message: 'Backup import restores RecoveredKid after corrupt recovery' }
      );
      assert.equal(await page.eval(() => document.getElementById('playerName')?.textContent?.trim()), 'RecoveredKid');
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  return tests;
}
