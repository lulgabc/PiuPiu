import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveStaticAsset, startStaticServer } from './server.mjs';

export const DEFAULT_CHROME_PATH =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const CHROME_BASE_FLAGS = Object.freeze([
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-component-update',
  '--autoplay-policy=no-user-gesture-required',
  '--use-gl=angle',
  '--use-angle=swiftshader-webgl',
  '--enable-webgl',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
]);

const activeCleanups = new Set();
let processHooksRegistered = false;

function registerGlobalProcessHooks() {
  if (processHooksRegistered) return;
  processHooksRegistered = true;

  const runAllCleanupsSync = () => {
    for (const fn of Array.from(activeCleanups)) {
      try {
        fn();
      } catch {}
    }
  };

  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(sig, () => {
      runAllCleanupsSync();
      process.exit(sig === 'SIGINT' ? 130 : 143);
    });
  }
  process.on('exit', runAllCleanupsSync);
}

const KEY_DEFS = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  ' ': { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  End: { key: 'End', code: 'End', keyCode: 35 },
};

function createKeySpec(key) {
  if (KEY_DEFS[key]) return KEY_DEFS[key];
  if (typeof key === 'string' && key.length === 1) {
    const upper = key.toUpperCase();
    const code = /[A-Z]/.test(upper)
      ? `Key${upper}`
      : /[0-9]/.test(upper)
        ? `Digit${upper}`
        : '';
    return { key, code, keyCode: upper.charCodeAt(0), text: key };
  }
  return { key: String(key), code: String(key), keyCode: 0 };
}

function serializeEvalExpression(fnOrExpr, args) {
  if (typeof fnOrExpr === 'string') {
    if (!args.length) return fnOrExpr;
    return `((...__args) => (${fnOrExpr})(...__args))(${args.map((a) => JSON.stringify(a)).join(',')})`;
  }
  if (typeof fnOrExpr === 'function') {
    const serializedArgs = args.map((a) => (a === undefined ? 'undefined' : JSON.stringify(a))).join(',');
    return `(${fnOrExpr.toString()})(${serializedArgs})`;
  }
  throw new TypeError('eval expects a function or expression string');
}

export async function launchBrowser({
  chromePath = DEFAULT_CHROME_PATH,
  rootDir = process.cwd(),
  origin = 'http://127.0.0.1:4173',
  transport = 'pipe',
  headless = true,
  overrides = null,
} = {}) {
  registerGlobalProcessHooks();

  if (!fs.existsSync(chromePath)) {
    throw new Error(`Google Chrome not found at: ${chromePath}`);
  }

  const absRoot = path.resolve(rootDir);
  const tmpDir = fs.mkdtempSync(path.join('/tmp', `piupiu-e2e-${process.pid}-`));
  const homeDir = path.join(tmpDir, 'home');
  const profileDir = path.join(tmpDir, 'profile');
  const uploadDir = path.join(tmpDir, 'uploads');
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(profileDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });

  let staticServer = null;
  let effectiveOrigin = origin.replace(/\/+$/, '');
  let browserOverrides = overrides;
  let child = null;
  let ws = null;
  let pipeClosed = false;
  let cleanedUp = false;
  let closePromise = null;
  const pending = new Map();

  function killProcessGroup(signal) {
    if (child && child.pid && process.platform !== 'win32') {
      try {
        process.kill(-child.pid, signal);
      } catch {}
    }
    try {
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill(signal);
      }
    } catch {}
  }

  function removeTmpDirSync() {
    for (let attempt = 0; attempt < 25; attempt++) {
      if (!fs.existsSync(tmpDir)) return true;
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 25 });
      } catch {}
      if (!fs.existsSync(tmpDir)) return true;
      killProcessGroup('SIGKILL');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
    return !fs.existsSync(tmpDir);
  }

  const syncCleanup = () => {
    if (cleanedUp && !fs.existsSync(tmpDir)) return;
    pipeClosed = true;
    for (const [, entry] of pending) {
      entry.reject(new Error('Browser closed'));
    }
    pending.clear();
    try {
      if (ws) ws.close();
    } catch {}
    killProcessGroup('SIGKILL');
    if (removeTmpDirSync()) {
      cleanedUp = true;
    }
    activeCleanups.delete(syncCleanup);
  };

  activeCleanups.add(syncCleanup);

  const sessionListeners = new Map();
  const browserListeners = new Map();
  let nextId = 1;
  let sendRaw;
  let cdpSend;

  const frameToPageState = new Map();
  const contextToPageState = new Map();
  const activePageStates = new Set();
  let lastPageState = null;

  try {
    if (transport === 'ws') {
      staticServer = await startStaticServer({
        rootDir: absRoot,
        host: '127.0.0.1',
        port: 0,
        overrides: browserOverrides,
      });
      effectiveOrigin = staticServer.baseUrl;
    }

    const flags = [
      ...(headless ? ['--headless=new'] : []),
      ...CHROME_BASE_FLAGS,
      `--user-data-dir=${profileDir}`,
      transport === 'pipe' ? '--remote-debugging-pipe' : '--remote-debugging-port=0',
      'about:blank',
    ];

    const stdio =
      transport === 'pipe'
        ? ['ignore', 'pipe', 'pipe', 'pipe', 'pipe']
        : ['ignore', 'pipe', 'pipe'];

    child = spawn(chromePath, flags, {
      stdio,
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        HOME: homeDir,
      },
    });

    let stderrLog = '';
    child.stderr.on('data', (chunk) => {
      stderrLog += chunk.toString('utf8');
      if (stderrLog.length > 16384) stderrLog = stderrLog.slice(-16384);
    });

    function dispatchMessage(raw) {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg.id !== undefined) {
        const entry = pending.get(msg.id);
        if (entry) {
          pending.delete(msg.id);
          if (msg.error) {
            entry.reject(
              new Error(`CDP ${entry.method} failed: ${msg.error.message || JSON.stringify(msg.error)}`)
            );
          } else {
            entry.resolve(msg.result || {});
          }
        }
        return;
      }
      const targetMap = msg.sessionId
        ? sessionListeners.get(msg.sessionId)
        : browserListeners;
      if (targetMap) {
        const handlers = targetMap.get(msg.method);
        if (handlers) {
          for (const fn of Array.from(handlers)) {
            try {
              fn(msg.params || {});
            } catch {}
          }
        }
      }
    }

    function addListener(map, eventName, handler) {
      let set = map.get(eventName);
      if (!set) {
        set = new Set();
        map.set(eventName, set);
      }
      set.add(handler);
      return () => {
        set.delete(handler);
      };
    }

    if (transport === 'pipe') {
      const writePipe = child.stdio[3];
      const readPipe = child.stdio[4];
      let buf = Buffer.alloc(0);

      readPipe.on('data', (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        let idx;
        while ((idx = buf.indexOf(0)) !== -1) {
          const raw = buf.subarray(0, idx).toString('utf8');
          buf = buf.subarray(idx + 1);
          if (raw) dispatchMessage(raw);
        }
      });

      sendRaw = (payload) => {
        if (pipeClosed || writePipe.destroyed) {
          throw new Error('CDP pipe is closed');
        }
        writePipe.write(JSON.stringify(payload) + '\0');
      };
    } else {
      const wsUrl = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timed out waiting for Chrome DevTools WS URL. stderr: ${stderrLog}`));
        }, 10000);
        const onErrData = (chunk) => {
          const text = chunk.toString('utf8');
          const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
          if (match) {
            clearTimeout(timer);
            child.stderr.off('data', onErrData);
            resolve(match[1]);
          }
        };
        child.stderr.on('data', onErrData);
        child.once('exit', (code) => {
          clearTimeout(timer);
          reject(new Error(`Chrome exited prematurely (${code}): ${stderrLog}`));
        });
      });

      ws = new WebSocket(wsUrl);
      await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve, { once: true });
        ws.addEventListener('error', (e) => reject(new Error(`WebSocket error: ${e.message || e}`)), {
          once: true,
        });
      });
      ws.addEventListener('message', (ev) => {
        dispatchMessage(typeof ev.data === 'string' ? ev.data : String(ev.data));
      });
      sendRaw = (payload) => {
        if (pipeClosed || !ws || ws.readyState !== WebSocket.OPEN) {
          throw new Error('CDP WebSocket is closed');
        }
        ws.send(JSON.stringify(payload));
      };
    }

    cdpSend = (method, params = {}, sessionId = undefined) => {
      if (pipeClosed) return Promise.reject(new Error(`Browser closed before ${method}`));
      const id = nextId++;
      const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        try {
          sendRaw(payload);
        } catch (err) {
          pending.delete(id);
          reject(err);
        }
      });
    };

    child.once('exit', () => {
      for (const [, entry] of pending) {
        entry.reject(new Error('Chrome process exited unexpectedly'));
      }
      pending.clear();
    });

    if (transport === 'pipe') {
      const registerTargetInfo = (info) => {
        if (!info || !info.targetId || !info.browserContextId) return;
        const ps = contextToPageState.get(info.browserContextId);
        if (ps) {
          ps.frames.add(info.targetId);
          frameToPageState.set(info.targetId, ps);
        }
      };
      addListener(browserListeners, 'Target.targetCreated', (params) => registerTargetInfo(params.targetInfo));
      addListener(browserListeners, 'Target.targetInfoChanged', (params) => registerTargetInfo(params.targetInfo));
      addListener(browserListeners, 'Target.targetDestroyed', (params) => {
        if (params.targetId) {
          const ps = frameToPageState.get(params.targetId);
          if (ps) {
            ps.frames.delete(params.targetId);
            frameToPageState.delete(params.targetId);
          }
        }
      });

      addListener(browserListeners, 'Fetch.requestPaused', async (params) => {
        const { requestId, request } = params;
        if (pipeClosed) return;
        const pageState =
          (params.frameId && frameToPageState.get(params.frameId)) ||
          (activePageStates.size === 1 ? Array.from(activePageStates)[0] : lastPageState);

        if (pageState) {
          pageState.fetchRequests.push({
            url: request.url,
            method: request.method,
            resourceType: params.resourceType || '',
            at: Date.now(),
          });
        }

        if (pageState && pageState.offline) {
          cdpSend('Fetch.failRequest', {
            requestId,
            errorReason: 'InternetDisconnected',
          }).catch(() => {});
          return;
        }

        let parsed;
        try {
          parsed = new URL(request.url);
        } catch {
          cdpSend('Fetch.continueRequest', { requestId }).catch(() => {});
          return;
        }

        const rawPathWithQuery = parsed.pathname + parsed.search;
        const pageOverride = pageState ? pageState.overrides : null;
        let asset = null;

        if (pageOverride) {
          asset = resolveStaticAsset(rawPathWithQuery, absRoot, pageOverride);
        } else {
          asset = resolveStaticAsset(rawPathWithQuery, absRoot, browserOverrides);
        }

        const fulfillOrFail = () => {
          if (pipeClosed) return;
          if (asset.fail) {
            cdpSend('Fetch.failRequest', {
              requestId,
              errorReason: asset.errorReason || 'InternetDisconnected',
            }).catch(() => {});
            return;
          }
          const responseHeaders = Object.entries(asset.headers || {}).map(([name, value]) => ({
            name,
            value: String(value),
          }));
          cdpSend('Fetch.fulfillRequest', {
            requestId,
            responseCode: asset.status,
            responseHeaders,
            body: asset.body.toString('base64'),
          }).catch(() => {});
        };

        if (asset.delayMs > 0) {
          setTimeout(fulfillOrFail, asset.delayMs);
        } else {
          fulfillOrFail();
        }
      });

      await cdpSend('Target.setDiscoverTargets', { discover: true });
      await cdpSend('Fetch.enable', {
        patterns: [{ urlPattern: `${effectiveOrigin}/*` }],
      });
    }

    // Verify browser connection is responsive
    await cdpSend('Target.getTargets');

    var addPageListener = addListener;
  } catch (err) {
    if (staticServer) {
      try {
        await staticServer.close();
      } catch {}
    }
    syncCleanup();
    throw err;
  }

  async function close() {
    if (closePromise) return closePromise;
    closePromise = (async () => {
      pipeClosed = true;
      for (const [, entry] of pending) {
        entry.reject(new Error('Browser closed'));
      }
      pending.clear();
      try {
        if (ws) ws.close();
      } catch {}
      if (staticServer) {
        try {
          await staticServer.close();
        } catch {}
      }
      try {
        if (child && child.exitCode === null && child.signalCode === null) {
          killProcessGroup('SIGTERM');
          await new Promise((resolve) => {
            const timer = setTimeout(() => {
              killProcessGroup('SIGKILL');
              const killTimer = setTimeout(resolve, 800);
              child.once('exit', () => {
                clearTimeout(killTimer);
                resolve();
              });
            }, 1200);
            child.once('exit', () => {
              clearTimeout(timer);
              resolve();
            });
          });
        }
      } catch {}
      killProcessGroup('SIGKILL');
      for (let attempt = 0; attempt < 30; attempt++) {
        try {
          await fs.promises.rm(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
        } catch {}
        if (!fs.existsSync(tmpDir)) break;
        killProcessGroup('SIGKILL');
        await new Promise((r) => setTimeout(r, 100));
      }
      if (fs.existsSync(tmpDir)) {
        throw new Error(`Failed to remove temporary E2E browser directory: ${tmpDir}`);
      }
      cleanedUp = true;
      activeCleanups.delete(syncCleanup);
    })();
    return closePromise;
  }

  async function newPage({ viewport = null, initScripts = [] } = {}) {
    const { browserContextId } = await cdpSend('Target.createBrowserContext');
    const pageErrors = [];
    const consoleErrors = [];
    const requests = [];
    const fetchRequests = [];
    const dialogs = [];
    const pageState = {
      offline: false,
      overrides: null,
      fetchRequests,
      frames: new Set(),
    };
    contextToPageState.set(browserContextId, pageState);

    let targetId;
    let sessionId;
    try {
      ({ targetId } = await cdpSend('Target.createTarget', {
        url: 'about:blank',
        browserContextId,
      }));
      ({ sessionId } = await cdpSend('Target.attachToTarget', {
        targetId,
        flatten: true,
      }));
    } catch (err) {
      contextToPageState.delete(browserContextId);
      throw err;
    }

    const listeners = new Map();
    sessionListeners.set(sessionId, listeners);

    const send = (method, params = {}) => cdpSend(method, params, sessionId);
    const on = (eventName, fn) => addPageListener(listeners, eventName, fn);

    pageState.frames.add(targetId);
    activePageStates.add(pageState);
    lastPageState = pageState;
    frameToPageState.set(targetId, pageState);

    on('Page.frameAttached', (params) => {
      if (params.frameId) {
        pageState.frames.add(params.frameId);
        frameToPageState.set(params.frameId, pageState);
      }
    });
    on('Page.frameNavigated', (params) => {
      const fid = params.frame?.id;
      if (fid) {
        pageState.frames.add(fid);
        frameToPageState.set(fid, pageState);
      }
    });
    on('Page.frameDetached', (params) => {
      if (params.frameId) {
        pageState.frames.delete(params.frameId);
        if (frameToPageState.get(params.frameId) === pageState) {
          frameToPageState.delete(params.frameId);
        }
      }
    });

    let currentViewport = viewport || {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
      hasTouch: false,
    };

    on('Runtime.exceptionThrown', (params) => {
      const det = params.exceptionDetails || {};
      const desc =
        (det.exception && (det.exception.description || det.exception.value)) ||
        det.text ||
        'Uncaught exception';
      pageErrors.push(String(desc));
    });

    on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const text = (params.args || [])
          .map((a) => (a.value !== undefined ? String(a.value) : a.description || a.type))
          .join(' ');
        consoleErrors.push(text);
      }
    });

    on('Log.entryAdded', (params) => {
      const entry = params.entry || {};
      if (entry.level === 'error') {
        consoleErrors.push(String(entry.text || 'Log error'));
      }
    });

    on('Network.requestWillBeSent', (params) => {
      const req = params.request || {};
      requests.push({
        url: req.url,
        method: req.method,
        type: params.type || '',
        at: Date.now(),
      });
    });

    on('Page.javascriptDialogOpening', (params) => {
      dialogs.push({
        type: params.type,
        message: params.message,
        at: Date.now(),
      });
      send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    });

    await Promise.all([
      send('Page.enable'),
      send('Runtime.enable'),
      send('DOM.enable'),
      send('Network.enable'),
      send('Log.enable'),
      send('ServiceWorker.enable'),
    ]);

    try {
      const { frameTree } = await send('Page.getFrameTree');
      const mainFrameId = frameTree?.frame?.id;
      if (mainFrameId) {
        pageState.frames.add(mainFrameId);
        frameToPageState.set(mainFrameId, pageState);
      }
    } catch {}

    async function setViewport(vp) {
      currentViewport = {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor ?? (vp.mobile ? 2 : 1),
        mobile: Boolean(vp.mobile),
        hasTouch: Boolean(vp.hasTouch),
      };
      await send('Emulation.setDeviceMetricsOverride', {
        width: currentViewport.width,
        height: currentViewport.height,
        deviceScaleFactor: currentViewport.deviceScaleFactor,
        mobile: currentViewport.mobile,
      });
      await send('Emulation.setTouchEmulationEnabled', {
        enabled: currentViewport.hasTouch,
        maxTouchPoints: currentViewport.hasTouch ? 5 : 1,
      });
    }

    await setViewport(currentViewport);

    async function addInitScript(source) {
      const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', { source });
      return identifier;
    }

    for (const script of initScripts) {
      await addInitScript(script);
    }

    async function evalFn(fnOrExpr, ...args) {
      const expression = serializeEvalExpression(fnOrExpr, args);
      const res = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
      });
      if (res.exceptionDetails) {
        const msg =
          (res.exceptionDetails.exception &&
            (res.exceptionDetails.exception.description ||
              res.exceptionDetails.exception.value)) ||
          res.exceptionDetails.text ||
          'Evaluation failed';
        throw new Error(`page.eval error: ${msg}`);
      }
      return res.result ? res.result.value : undefined;
    }

    async function waitFor(fnOrExpr, { timeout = 8000, interval = 40, args = [], message = '' } = {}) {
      const deadline = Date.now() + timeout;
      let lastErr = null;
      while (Date.now() < deadline) {
        try {
          const val = await evalFn(fnOrExpr, ...args);
          if (val) return val;
          lastErr = null;
        } catch (err) {
          lastErr = err;
        }
        await new Promise((r) => setTimeout(r, interval));
      }
      throw new Error(
        `Timed out after ${timeout}ms waiting for condition${message ? `: ${message}` : ''}${lastErr ? ` (last error: ${lastErr.message})` : ''}`
      );
    }

    async function waitForSelector(selector, { visible = true, timeout = 8000 } = {}) {
      return waitFor(
        (sel, vis) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          if (!vis) return true;
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) {
            return false;
          }
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        },
        { timeout, args: [selector, visible], message: `selector ${selector}` }
      );
    }

    async function goto(urlOrPath = '/', { waitUntil = 'load', timeout = 15000 } = {}) {
      const targetUrl = /^https?:\/\//i.test(urlOrPath)
        ? urlOrPath
        : `${effectiveOrigin}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;

      let loadResolve;
      const loadPromise = new Promise((resolve) => {
        loadResolve = resolve;
      });
      const offLoad = on('Page.loadEventFired', () => loadResolve());

      try {
        const navRes = await send('Page.navigate', { url: targetUrl });
        if (navRes.errorText) {
          throw new Error(`Navigation failed (${targetUrl}): ${navRes.errorText}`);
        }
        if (waitUntil === 'load') {
          await Promise.race([
            loadPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Page.loadEventFired timeout for ${targetUrl}`)), timeout)
            ),
          ]);
        }
      } finally {
        offLoad();
      }
    }

    async function reload({ waitUntil = 'load', timeout = 15000 } = {}) {
      let loadResolve;
      const loadPromise = new Promise((resolve) => {
        loadResolve = resolve;
      });
      const offLoad = on('Page.loadEventFired', () => loadResolve());
      try {
        await send('Page.reload', { ignoreCache: false });
        if (waitUntil === 'load') {
          await Promise.race([
            loadPromise,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Page.reload timeout')), timeout)
            ),
          ]);
        }
      } finally {
        offLoad();
      }
    }

    async function getElementCenter(selector) {
      const box = await evalFn((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { missing: true };
        try {
          el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        } catch {
          try { el.scrollIntoView(); } catch {}
        }
        const r = el.getBoundingClientRect();
        return {
          missing: false,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          width: r.width,
          height: r.height,
        };
      }, selector);

      if (!box || box.missing) {
        throw new Error(`Element not found: ${selector}`);
      }
      if (box.width === 0 || box.height === 0) {
        throw new Error(`Element has zero size: ${selector}`);
      }
      return box;
    }

    async function click(target, opts = {}) {
      let x, y;
      if (typeof target === 'string') {
        const box = await getElementCenter(target);
        x = box.x;
        y = box.y;
      } else if (target && typeof target.x === 'number' && typeof target.y === 'number') {
        x = target.x;
        y = target.y;
      } else {
        throw new TypeError('click expects a CSS selector or {x, y}');
      }

      if (opts.touch) {
        await send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y, id: 1 }],
        });
        await send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        });
        return;
      }

      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x,
        y,
      });
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x,
        y,
        button: opts.button || 'left',
        clickCount: opts.clickCount || 1,
      });
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x,
        y,
        button: opts.button || 'left',
        clickCount: opts.clickCount || 1,
      });
    }

    async function tap(selector) {
      return click(selector, { touch: true });
    }

    async function focus(selector) {
      const ok = await evalFn((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.focus();
        return document.activeElement === el;
      }, selector);
      if (!ok) throw new Error(`Could not focus selector: ${selector}`);
    }

    async function press(key, modifiers = 0) {
      const spec = createKeySpec(key);
      await send('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        key: spec.key,
        code: spec.code,
        windowsVirtualKeyCode: spec.keyCode,
        nativeVirtualKeyCode: spec.keyCode,
        modifiers,
      });
      if (spec.text) {
        await send('Input.dispatchKeyEvent', {
          type: 'char',
          text: spec.text,
          key: spec.key,
          code: spec.code,
          windowsVirtualKeyCode: spec.keyCode,
          modifiers,
        });
      }
      await send('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: spec.key,
        code: spec.code,
        windowsVirtualKeyCode: spec.keyCode,
        nativeVirtualKeyCode: spec.keyCode,
        modifiers,
      });
    }

    async function type(selector, text, { clear = true, submit = false } = {}) {
      await click(selector);
      if (clear) {
        await evalFn((sel) => {
          const el = document.querySelector(sel);
          if (el && 'value' in el) {
            el.focus();
            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, selector);
      } else {
        await focus(selector);
      }
      if (text) {
        await send('Input.insertText', { text: String(text) });
      }
      if (submit) {
        await press('Enter');
      }
    }

    async function uploadFile(selector, fileSpec) {
      const list = Array.isArray(fileSpec) ? fileSpec : [fileSpec];
      const filePaths = [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (typeof item === 'string') {
          filePaths.push(path.resolve(item));
        } else if (item && typeof item === 'object') {
          const name = item.name || `upload-${Date.now()}-${i}.txt`;
          const dest = path.join(uploadDir, `${Date.now()}-${i}-${path.basename(name)}`);
          const data = Buffer.isBuffer(item.content)
            ? item.content
            : Buffer.from(String(item.content ?? ''), 'utf8');
          fs.writeFileSync(dest, data);
          filePaths.push(dest);
        }
      }
      const { root } = await send('DOM.getDocument', { depth: -1 });
      const { nodeId } = await send('DOM.querySelector', {
        nodeId: root.nodeId,
        selector,
      });
      if (!nodeId) throw new Error(`File input not found: ${selector}`);
      await send('DOM.setFileInputFiles', { nodeId, files: filePaths });
    }

    async function setOffline(offline) {
      pageState.offline = Boolean(offline);
      await send('Network.emulateNetworkConditions', {
        offline: Boolean(offline),
        latency: 0,
        downloadThroughput: offline ? 0 : -1,
        uploadThroughput: offline ? 0 : -1,
      });
    }

    function setRequestOverrides(nextOverrides) {
      pageState.overrides = nextOverrides;
      if (staticServer) {
        staticServer.setOverrides(nextOverrides);
      }
    }

    async function emulateMedia(features = []) {
      await send('Emulation.setEmulatedMedia', { features });
    }

    async function screenshot(filePath) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(data, 'base64');
      if (filePath) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, buf);
      }
      return buf;
    }

    async function disposePage() {
      sessionListeners.delete(sessionId);
      activePageStates.delete(pageState);
      contextToPageState.delete(browserContextId);
      for (const fid of pageState.frames) {
        if (frameToPageState.get(fid) === pageState) {
          frameToPageState.delete(fid);
        }
      }
      if (lastPageState === pageState) {
        lastPageState = activePageStates.size ? Array.from(activePageStates).pop() : null;
      }
      try {
        await cdpSend('Target.disposeBrowserContext', { browserContextId });
      } catch {}
    }

    return {
      origin: effectiveOrigin,
      sessionId,
      targetId,
      browserContextId,
      send,
      on,
      setViewport,
      emulateMedia,
      addInitScript,
      goto,
      reload,
      eval: evalFn,
      waitFor,
      waitForSelector,
      click,
      tap,
      focus,
      type,
      press,
      uploadFile,
      setOffline,
      setRequestOverrides,
      getConsoleErrors: () => consoleErrors.slice(),
      getPageErrors: () => pageErrors.slice(),
      getAllErrors: () => [...pageErrors, ...consoleErrors],
      clearErrors: () => {
        pageErrors.length = 0;
        consoleErrors.length = 0;
      },
      getRequests: () => (transport === 'pipe' ? fetchRequests.slice() : requests.slice()),
      getNetworkRequests: () => requests.slice(),
      clearRequests: () => {
        requests.length = 0;
        fetchRequests.length = 0;
      },
      getDialogs: () => dialogs.slice(),
      screenshot,
      close: disposePage,
    };
  }

  return {
    origin: effectiveOrigin,
    transport,
    tmpDir,
    newPage,
    setOverrides(nextOverrides) {
      browserOverrides = nextOverrides;
      if (staticServer) staticServer.setOverrides(nextOverrides);
    },
    close,
  };
}
