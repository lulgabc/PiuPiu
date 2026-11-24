import assert from 'node:assert/strict';
import {
  VIEWPORTS,
  auditThemeTokens,
  auditViewportA11y,
  closeByEscape,
  ensureMicRunning,
  getVisibleWords,
  openApp,
  openDialog,
  quitRoundToOver,
  readJsonStorage,
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

export function getTier4Tests() {
  const tests = [];
  const add = (id, feature, title, run, extra = {}) => tests.push({ id, tier: 4, feature, title, run, ...extra });

  add('T4-RW-01', 'RW', 'First-Time Child Onboarding (390x844): Instant Play -> tap word -> speech 5 words -> rename -> 1/35 pet', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.mobile, path: '/?debug=1' });
    try {
      await auditViewportA11y(page, { require16pxInputs: true, label: 'RW01-home' });
      await startRound(page);
      await ensureMicRunning(page);

      // Tap falling word to hear pronunciation
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0, { timeout: 6000 });
      await page.eval(() => {
        const el = document.querySelector('#wordLayer .word');
        if (el) el.dataset.e2eFirst = '1';
      });
      await page.click('#wordLayer .word[data-e2e-first="1"]');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 1, { timeout: 3000 });
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });

      // Speak 5 words to hit Meteor / reward cycle
      for (let i = 0; i < 5; i++) {
        await page.waitFor(() => document.querySelectorAll('#wordLayer .word:not(.exploding)').length > 0, { timeout: 6000 });
        const w = (await getVisibleWords(page))[0].word;
        await page.eval((word) => window.__E2E_MOCK__.emitSpeech(word, true), w);
        await sleep(80);
      }

      await quitRoundToOver(page);
      await page.waitForSelector('#guestRenameInput', { timeout: 4000 });
      await page.type('#guestRenameInput', 'Leo');
      await page.click('#guestRenameSave, #guestRenameBanner button[type="submit"], #guestRenameBanner .primary-btn');
      await page.click('#homeBtn');
      await page.waitFor(() => document.body.classList.contains('phase-menu'));

      const petBtnText = await page.eval(() => document.getElementById('petCollectionBtn')?.textContent || '');
      assert.match(petBtnText, /1\s*\/\s*35/);
      assert.equal(await page.eval(() => document.getElementById('playerName')?.textContent?.trim()), 'Leo');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  }, { timeoutMs: 35000 });

  add('T4-RW-02', 'RW', 'Two-Sibling Family Sharing (768x1024): Mia (fill) vs Sam (poem) with separate pets & leaderboard', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.tablet_p, path: '/?debug=1' });
    try {
      // Rename guest to Mia via playerSheet
      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.click('[data-edit-player]');
      await page.type('#playerNameInput', 'Mia');
      await page.click('#playerSubmit');
      await page.type('#playerNameInput', 'Sam');
      await page.click('#playerSubmit');
      await closeByEscape(page, '#playerSheet');

      // Switch to Mia via quick-switch chips & play fill
      await page.click('#homePlayerChips button:first-child');
      await selectMode(page, 'fill');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .fill-word').length >= 4, { timeout: 5000 });
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      await quitRoundToOver(page);
      await page.click('#homeBtn');

      // Switch to Sam & play poem
      await page.click('#homePlayerChips button:nth-child(2)');
      await page.eval(() => localStorage.setItem('piupiu.poetry.selected', 'traveling-together-97'));
      await page.reload();
      await page.waitForSelector('#startBtn');
      await selectMode(page, 'poem');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length === 3, { timeout: 6000 });
      await clearPoemLine(page, 0);
      await quitRoundToOver(page);

      await openDialog(page, '#overBoardBtn', '#boardSheet');
      const boardText = await page.eval(() => document.getElementById('boardList')?.textContent || '');
      assert.ok(boardText.includes('Mia') && boardText.includes('Sam'));
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  }, { timeoutMs: 35000 });

  add('T4-RW-03', 'RW', 'Evening Eye-Care Poetry Session (1280x800): daylight + en + Crocodile + listenAll + Next Poem', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.desktop,
      withPlayer: { id: 'p1', name: 'ParentReader', total: 0 },
      mockOptions: { utteranceStartDelayMs: 10, utteranceDelayMs: 100 },
    });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      await page.click('[data-theme-choice="daylight"]');
      await auditThemeTokens(page, 'daylight');
      await closeByEscape(page, '#setupSheet');

      await page.eval(() => {
        const s = document.getElementById('langSelect');
        s.value = 'en';
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.waitFor(() => document.querySelectorAll('#poetryList [data-poem-id]').length > 0, { timeout: 6000 });
      await page.type('#poetrySearch', 'Crocodile');
      await page.waitForSelector('#poetryList [data-poem-id="the-crocodile-66"]');
      await page.click('#poetryList [data-poem-id="the-crocodile-66"]');
      await page.click('#poetryDone');

      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length === 8, { timeout: 6000 });
      await page.click('#poemListenAll');
      await sleep(180);
      await page.click('#poemListenAll');

      for (let i = 0; i < 8; i++) {
        await clearPoemLine(page, i);
      }
      await page.waitForSelector('#overNextPoemBtn', { timeout: 6000 });
      const p1 = (await readJsonStorage(page, 'piupiu.profiles', [])).find((p) => p.id === 'p1');
      assert.ok(p1.total > 0, 'All poem lines must credit profile total');
      await page.click('#overNextPoemBtn');
      await page.waitFor(() => document.body.classList.contains('phase-playing'));
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  }, { timeoutMs: 35000 });

  add('T4-RW-04', 'RW', 'ESL Teacher Custom Pack + Missed-Word Loop (1024x768)', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.tablet_l,
      path: '/?debug=1',
      withPlayer: { id: 'p1', name: 'Student' },
    });
    try {
      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="custom"]');
      await page.type('#customPackName', 'ESL Unit 1');
      await page.uploadFile('#customPackFile', {
        name: 'esl.txt',
        content: 'apple\nbanana\ncherry\ndragon\neagle\nfalcon',
      });
      await sleep(150);
      await page.click('#customPackCreate');
      await page.waitFor(() => document.querySelectorAll('#customPackList li').length === 1, { timeout: 3000 });
      await page.click('#packDone');

      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .word').length > 0);
      await page.eval(() => {
        window.__PIU__.state.missedWords.push('apple', 'banana', 'cherry');
      });
      await quitRoundToOver(page);
      await page.click('#missedList button');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 1);
      await page.click('#practiceMissedBtn');
      await page.waitFor(() => document.body.classList.contains('phase-playing'), { timeout: 5000 });
      for (const word of ['apple', 'banana', 'cherry']) {
        await typeAnswer(page, word);
      }
      await sleep(150);
      const srs = await readJsonStorage(page, 'piupiu.srs.v1', {});
      assert.ok((srs?.p1?.apple?.hit || 0) >= 1);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T4-RW-05', 'RW', 'Device Migration via JSON Backup (1280x800): export -> wipe -> reload -> import', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.desktop,
      withPlayer: { id: 'p1', name: 'Traveler', total: 333 },
      seed: {
        'piupiu.theme': 'cream',
        'piupiu.customPacks': JSON.stringify([{ id: 'c_t', name: 'TripWords', words: ['train', 'plane', 'ship', 'bike'], createdAt: 100 }]),
        'piupiu.pets.v1': JSON.stringify({ p1: { kitty: { count: 1, firstAt: 100 }, fluff: { count: 1, firstAt: 100 }, mochi: { count: 1, firstAt: 100 } } }),
      },
    });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.click('#backupExportBtn');
      await page.waitFor(() => window.__E2E_MOCK__.downloads.length > 0 && window.__E2E_MOCK__.downloads[0].text);
      const snapshot = await page.eval(() => window.__E2E_MOCK__.downloads[0].text);

      // Simulate new device
      await page.eval(() => localStorage.clear());
      await page.reload();
      await page.waitForSelector('#setupBtn');
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv2 = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv2 === false) await page.click('#setupAdvanced summary');
      await page.uploadFile('#backupFile', { name: 'migration.json', content: snapshot });
      await page.waitFor(
        () => JSON.parse(localStorage.getItem('piupiu.profiles') || '[]').some((p) => p.name === 'Traveler'),
        { timeout: 5000 }
      );
      await closeByEscape(page, '#setupSheet');
      await openDialog(page, '#petCollectionBtn', '#petSheet');
      assert.match(await page.eval(() => document.getElementById('petSheet')?.textContent || ''), /3\s*\/\s*35/);
      assert.equal(await page.eval(() => document.documentElement.dataset.theme), 'cream');
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T4-RW-06', 'RW', 'Offline Commute / Airplane PWA Mode (390x844): precache -> offline reload -> play all 4 modes', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.mobile, path: '/?debug=1', withPlayer: true });
    try {
      await page.eval(() => navigator.serviceWorker.ready);
      // Warm poetry & education into piupiu-data-v1
      await selectMode(page, 'poem');
      await openDialog(page, '#poetryBtn', '#poetrySheet');
      await page.waitFor(() => document.querySelectorAll('#poetryList [data-poem-id]').length > 0, { timeout: 6000 });
      await closeByEscape(page, '#poetrySheet');

      await page.reload();
      await page.waitFor(() => Boolean(navigator.serviceWorker.controller), { timeout: 5000 });
      await page.setOffline(true);
      await page.reload();
      await page.waitForSelector('#startBtn', { timeout: 6000 });

      for (const m of ['rain', 'fill', 'paint', 'poem']) {
        await selectMode(page, m);
        await startRound(page);
        await sleep(120);
        await quitRoundToOver(page);
        await page.click('#homeBtn');
        await page.waitFor(() => document.body.classList.contains('phase-menu'));
      }
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  }, { timeoutMs: 35000 });

  add('T4-RW-07', 'RW', 'Keyboard-Only Accessibility Journey (1280x800): Tab/Enter/Space/Escape end-to-end', async ({ browser }) => {
    const page = await openApp(browser, { viewport: VIEWPORTS.desktop, withPlayer: true });
    try {
      await page.focus('#packBtn');
      await page.press('Enter');
      await page.waitFor(() => Boolean(document.getElementById('packSheet')?.open));
      await page.type('#packSearch', 'food');
      await page.press('Escape');
      await page.waitFor(() => !document.getElementById('packSheet')?.open);
      assert.equal(await page.eval(() => document.activeElement?.id), 'packBtn');

      await page.focus('#modeSwitch [data-mode="fill"]');
      await page.press('Enter');
      await page.focus('#startBtn');
      await page.press('Enter');
      await page.waitFor(() => document.body.classList.contains('phase-playing'));
      await page.waitFor(() => document.querySelectorAll('#wordLayer .fill-word').length >= 4, { timeout: 5000 });

      await page.press('Space');
      await page.waitFor(() => window.__E2E_MOCK__.spoken.length >= 1);
      const w = (await getVisibleWords(page))[0].word;
      await typeAnswer(page, w);
      assert.ok(Number(await page.eval(() => document.getElementById('score')?.textContent?.trim())) >= 10);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  });

  add('T4-RW-08', 'RW', 'Quiet/Noisy Room Speech Recovery (390x844): 2x no-speech -> onspeechstart -> long speakHelp (>4.5s)', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.mobile,
      withPlayer: true,
      mockOptions: { utteranceStartDelayMs: 50, utteranceDelayMs: 4600 },
    });
    try {
      await selectMode(page, 'poem');
      await page.eval(() => localStorage.setItem('piupiu.poetry.selected', 'breakfast-160'));
      await page.reload();
      await page.waitForSelector('#startBtn');
      await selectMode(page, 'poem');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#poemLines .poem-line').length > 0, { timeout: 6000 });
      await ensureMicRunning(page);

      await page.eval(() => window.__E2E_MOCK__.emitNoSpeech());
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      await page.eval(() => window.__E2E_MOCK__.emitNoSpeech());
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });

      await page.eval(() => window.__E2E_MOCK__.emitSpeechStart());
      await page.click('#poemListen');
      await sleep(4150);
      assert.equal(await page.eval(() => window.__E2E_MOCK__.isRunning()), false, 'Long line TTS guard must not expire at 4s');
      await page.waitFor(() => window.__E2E_MOCK__.isRunning(), { timeout: 3000 });
      await clearPoemLine(page, 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  }, { timeoutMs: 35000 });

  add('T4-RW-09', 'RW', 'Paintball Marathon & Orientation Flip (768x1024 <-> 1024x768) + WebGL loss', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.tablet_p,
      withPlayer: true,
      seed: { 'piupiu.theme': 'bubblegum' },
    });
    try {
      await selectMode(page, 'paint');
      await startRound(page);
      await page.waitFor(() => document.querySelectorAll('#wordLayer .paint-word').length >= 10, { timeout: 6000 });
      const words = await getVisibleWords(page);
      for (const item of words.slice(0, 6)) {
        await typeAnswer(page, item.word);
      }
      await page.setViewport(VIEWPORTS.tablet_l);
      await sleep(200);
      await page.waitFor(() => Boolean(document.querySelector('#pixiAmbient canvas')), { timeout: 6000 });
      const webglRes = await page.eval(() => {
        const c = document.querySelector('#pixiAmbient canvas');
        if (!c) return { hasCanvas: false, defaultPrevented: false };
        const evLost = new Event('webglcontextlost', { cancelable: true });
        c.dispatchEvent(evLost);
        c.dispatchEvent(new Event('webglcontextrestored', { cancelable: true }));
        return { hasCanvas: true, defaultPrevented: evLost.defaultPrevented };
      });
      assert.ok(webglRes.hasCanvas, '#pixiAmbient canvas must exist in paint mode');
      assert.equal(webglRes.defaultPrevented, true, 'webglcontextlost must call preventDefault()');
      for (const item of words.slice(6, 10)) {
        await typeAnswer(page, item.word);
      }
      await auditViewportA11y(page, { require16pxInputs: true, label: 'RW09-paint-landscape' });
      assert.equal(await page.eval(() => document.querySelectorAll('.paint-splat').length), 0);
      assert.deepEqual(page.getAllErrors(), []);
    } finally {
      await page.close();
    }
  }, { timeoutMs: 35000 });

  add('T4-RW-10', 'RW', 'Parent Cleanup & Destructive Guard Journey (1280x800): zero window.confirm()', async ({ browser }) => {
    const page = await openApp(browser, {
      viewport: VIEWPORTS.desktop,
      seed: {
        'piupiu.profiles': JSON.stringify([
          { id: 'p1', name: 'KeepKid', avatar: '🦊', total: 50, best: 50, correct: 5, rounds: 1, createdAt: 1, updatedAt: 1 },
          { id: 'p2', name: 'RemoveKid', avatar: '🐼', total: 10, best: 10, correct: 1, rounds: 1, createdAt: 2, updatedAt: 2 },
        ]),
        'piupiu.user': 'p1',
        'piupiu.customPacks': JSON.stringify([
          { id: 'c_rm', name: 'TempPack', words: ['one', 'two', 'three', 'four'], createdAt: 1 },
        ]),
      },
    });
    try {
      await openDialog(page, '#setupBtn', '#setupSheet');
      const adv = await page.eval(() => document.getElementById('setupAdvanced')?.open);
      if (adv === false) await page.click('#setupAdvanced summary');
      await page.uploadFile('#backupFile', { name: 'corrupt.json', content: '{bad' });
      await sleep(150);
      await closeByEscape(page, '#setupSheet');

      await openDialog(page, '#playerBtn', '#playerSheet');
      await page.click('[data-delete-player="p2"]');
      await sleep(3150); // verify auto-revert
      assert.equal((await readJsonStorage(page, 'piupiu.profiles', [])).length, 2);
      await page.click('[data-delete-player="p2"]');
      await page.click('[data-delete-player="p2"]');
      await closeByEscape(page, '#playerSheet');

      await openDialog(page, '#packBtn', '#packSheet');
      await page.click('#packTabs [data-pack-group="custom"]');
      await page.click('[data-delete-pack="c_rm"]');
      await page.click('[data-delete-pack="c_rm"]');
      await closeByEscape(page, '#packSheet');

      assert.equal((await readJsonStorage(page, 'piupiu.profiles', [])).length, 1);
      assert.equal((await readJsonStorage(page, 'piupiu.customPacks', [])).length, 0);
      assert.equal(await page.eval(() => window.__E2E_MOCK__.confirmCalls.length), 0);
      assert.deepEqual(page.getPageErrors(), []);
    } finally {
      await page.close();
    }
  });

  return tests;
}
