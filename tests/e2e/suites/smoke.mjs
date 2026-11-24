import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveStaticAsset } from '../server.mjs';
import { getMockInitScript } from '../mocks.mjs';
import { TARGET_VIEWPORT_LIST, VIEWPORTS, openApp } from '../assertions.mjs';

export function getSmokeTests({ rootDir, viewports = TARGET_VIEWPORT_LIST } = {}) {
  return [
    {
      id: 'SMOKE-01',
      tier: 'smoke',
      feature: 'harness',
      title: 'Static asset resolver serves PiuPiu assets & blocks traversal',
      async run() {
        const root = path.resolve(rootDir || process.cwd());
        const idx = resolveStaticAsset('/?v=2.32.1', root);
        assert.equal(idx.status, 200);
        assert.match(idx.headers['Content-Type'], /^text\/html/);
        assert.equal(idx.headers['Cache-Control'], 'no-store');
        assert.ok(idx.body.toString('utf8').includes('id="startPanel"'));

        const js = resolveStaticAsset('/js/pets.js?v=123', root);
        assert.equal(js.status, 200);
        assert.match(js.headers['Content-Type'], /javascript/);

        const trav = resolveStaticAsset('/../etc/passwd', root);
        assert.equal(trav.status, 403);

        const missing = resolveStaticAsset('/does-not-exist-e2e.json', root);
        assert.equal(missing.status, 404);
      },
    },

    {
      id: 'SMOKE-02',
      tier: 'smoke',
      feature: 'browser',
      title: 'Chrome CDP + WebGL2 + Home boot across all target viewports (0 errors)',
      async run({ browser }) {
        const viewportResults = [];
        for (const vp of viewports) {
          const page = await openApp(browser, {
            viewport: vp,
            path: '/?debug=1',
            withPlayer: true,
          });
          try {
            const info = await page.eval(() => {
              const canvas = document.createElement('canvas');
              const gl2 = Boolean(canvas.getContext('webgl2'));
              const gl1 = Boolean(canvas.getContext('webgl'));
              const startBtn = document.getElementById('startBtn');
              const modeOptions = document.querySelectorAll('#modeSwitch [data-mode]').length;
              return {
                hasApp: Boolean(document.getElementById('app')),
                hasStart: Boolean(startBtn),
                modeOptions,
                hasDebug: Boolean(window.__PIU__),
                gl2,
                gl1,
                innerWidth: window.innerWidth,
                docScrollWidth: document.documentElement.scrollWidth,
                bodyScrollWidth: document.body.scrollWidth,
              };
            });

            assert.equal(info.hasApp, true, `${vp.id}: #app missing`);
            assert.equal(info.hasStart, true, `${vp.id}: #startBtn missing`);
            assert.equal(info.modeOptions, 4, `${vp.id}: expected 4 mode buttons`);
            assert.equal(info.hasDebug, true, `${vp.id}: window.__PIU__ missing with ?debug=1`);
            assert.equal(info.gl2, true, `${vp.id}: WebGL2 context unavailable`);
            assert.ok(
              info.docScrollWidth <= info.innerWidth && info.bodyScrollWidth <= info.innerWidth,
              `${vp.id}: horizontal overflow ${info.docScrollWidth}/${info.bodyScrollWidth} > ${info.innerWidth}`
            );

            const errs = page.getAllErrors();
            assert.deepEqual(errs, [], `${vp.id}: uncaught errors: ${JSON.stringify(errs)}`);
            viewportResults.push({ viewport: vp.id, ...info });
          } finally {
            await page.close();
          }
        }
        return { viewports: viewportResults };
      },
    },

    {
      id: 'SMOKE-03',
      tier: 'smoke',
      feature: 'capabilities',
      title: 'Advisory M1-M3 capability probe (non-failing baseline telemetry)',
      async run({ browser }) {
        const page = await openApp(browser, {
          viewport: VIEWPORTS.desktop,
          path: '/?debug=1',
        });
        try {
          // Wait briefly past baseline 420ms maybeShowPlayerPicker to observe Instant Play vs baseline
          await new Promise((r) => setTimeout(r, 550));
          const capabilities = await page.eval(async () => {
            const moduleScripts = document.querySelectorAll('script[type="module"]').length;
            const daylightChoice = Boolean(document.querySelector('[data-theme-choice="daylight"]'));
            const dialogs = ['installSheet', 'playerSheet', 'boardSheet', 'packSheet', 'poetrySheet', 'setupSheet'];
            const nativeDialogCount = dialogs.filter((id) => {
              const el = document.getElementById(id);
              return el && el.tagName === 'DIALOG';
            }).length;
            const hasPetSheet = Boolean(document.getElementById('petSheet'));
            const hasPackSearch = Boolean(document.getElementById('packSearch'));
            const hasPaintCanvas = Boolean(document.getElementById('paintCanvas'));
            const profiles = (() => {
              try { return JSON.parse(localStorage.getItem('piupiu.profiles') || '[]'); } catch { return []; }
            })();
            const playerSheetEl = document.getElementById('playerSheet');
            const playerPickerAutoOpened = playerSheetEl
              ? (playerSheetEl.tagName === 'DIALOG' ? playerSheetEl.open : !playerSheetEl.classList.contains('is-hidden'))
              : false;
            return {
              hasEsModules: moduleScripts > 0,
              hasDaylightTheme: daylightChoice,
              nativeDialogCount,
              hasNativeDialogs: nativeDialogCount === 6,
              hasPetSheet,
              hasPackSearch,
              hasPaintCanvas,
              hasInstantPlay: profiles.length >= 1 && !playerPickerAutoOpened,
            };
          });
          const errs = page.getAllErrors();
          assert.deepEqual(errs, [], `Uncaught errors during capability probe: ${JSON.stringify(errs)}`);
          return { capabilities };
        } finally {
          await page.close();
        }
      },
    },

    {
      id: 'SMOKE-04',
      tier: 'smoke',
      feature: 'mocks',
      title: 'Deterministic SpeechRecognition, speechSynthesis & AudioContext mocks wire cleanly',
      async run({ browser }) {
        const page = await openApp(browser, {
          viewport: VIEWPORTS.desktop,
          withPlayer: true,
        });
        try {
          const mockProbe = await page.eval(() => {
            const micBtn = document.getElementById('micBtn');
            const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = ctx.createAnalyser();
            return {
              hasMock: Boolean(window.__E2E_MOCK__),
              micDisabled: micBtn ? micBtn.disabled : null,
              voiceCount: voices.length,
              hasSpeechRecPhrase: typeof window.SpeechRecognitionPhrase === 'function',
              analyserBins: analyser.frequencyBinCount,
            };
          });
          assert.equal(mockProbe.hasMock, true);
          assert.equal(mockProbe.micDisabled, false, '#micBtn should be enabled with mocked SpeechRecognition');
          assert.equal(mockProbe.voiceCount, 5);
          assert.equal(mockProbe.hasSpeechRecPhrase, true);
          assert.equal(mockProbe.analyserBins, 128);
          assert.deepEqual(page.getAllErrors(), []);
        } finally {
          await page.close();
        }
      },
    },
  ];
}
