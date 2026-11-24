export function getMockInitScript(options = {}) {
  const serializedOpts = JSON.stringify({
    disableSpeechRecognition: Boolean(options.disableSpeechRecognition),
    disableSpeechSynthesis: Boolean(options.disableSpeechSynthesis),
    throwSpeechSynthesisOnSpeak: Boolean(options.throwSpeechSynthesisOnSpeak),
    denyMic: Boolean(options.denyMic),
    failGetUserMedia: Boolean(options.failGetUserMedia),
    phrasesSupported: options.phrasesSupported !== false,
    utteranceDelayMs:
      typeof options.utteranceDelayMs === 'number' ? options.utteranceDelayMs : 50,
    utteranceStartDelayMs:
      typeof options.utteranceStartDelayMs === 'number'
        ? options.utteranceStartDelayMs
        : 10,
    disableWebGL: Boolean(options.disableWebGL),
    standalone: Boolean(options.standalone),
    quotaExceededOnSetItem: Boolean(options.quotaExceededOnSetItem),
    seedStorage: options.seedStorage && typeof options.seedStorage === 'object'
      ? options.seedStorage
      : null,
  });

  return `(() => {
    if (window.__E2E_MOCK_INSTALLED__) return;
    window.__E2E_MOCK_INSTALLED__ = true;

    const OPTS = ${serializedOpts};

    // Seed localStorage cleanly before page scripts boot (only once per fresh context/origin load if provided)
    if (OPTS.seedStorage && !window.sessionStorage.getItem('__e2e_seeded__')) {
      try {
        for (const [k, v] of Object.entries(OPTS.seedStorage)) {
          if (v === null || v === undefined) {
            window.localStorage.removeItem(k);
          } else {
            window.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          }
        }
        window.sessionStorage.setItem('__e2e_seeded__', '1');
      } catch {}
    }

    const mockState = {
      utteranceDelayMs: OPTS.utteranceDelayMs,
      utteranceStartDelayMs: OPTS.utteranceStartDelayMs,
      phrasesSupported: OPTS.phrasesSupported,
      denyMic: OPTS.denyMic,
      failGetUserMedia: OPTS.failGetUserMedia,
      ttsBroken: OPTS.throwSpeechSynthesisOnSpeak,
      micLevel: 0,
      quotaError: OPTS.quotaExceededOnSetItem,
      confirmReturnValue: true,
      standalone: OPTS.standalone,
      spoken: [],
      cancelledCount: 0,
      utterances: [],
      assignedPhrases: [],
      instances: [],
      startCount: 0,
      abortCount: 0,
      confirmCalls: [],
      downloads: [],
      audioContextsCreated: 0,
      oscillatorsStarted: 0,
      buffersStarted: 0,
      analyserReads: 0,
      webglLostEvents: 0,
    };

    // 1. Storage quota fault injection hook
    try {
      const origSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (this === window.localStorage && mockState.quotaError) {
          throw new DOMException('QuotaExceededError', 'QuotaExceededError');
        }
        return origSetItem.call(this, key, value);
      };
    } catch {}

    // 2. window.confirm spy (prevents blocking dialogs + tracks zero-confirm compliance)
    window.confirm = function (message) {
      mockState.confirmCalls.push(String(message == null ? '' : message));
      return mockState.confirmReturnValue;
    };

    // 3. Standalone matchMedia override when requested
    if (typeof window.matchMedia === 'function') {
      const origMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = function (query) {
        const q = String(query || '');
        if (q.includes('display-mode') && q.includes('standalone')) {
          return {
            matches: Boolean(mockState.standalone),
            media: q,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() { return true; },
          };
        }
        return origMatchMedia(query);
      };
    }

    // 4. WebGL disable hook when requested
    if (OPTS.disableWebGL && typeof HTMLCanvasElement !== 'undefined') {
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          return null;
        }
        return origGetContext.call(this, type, attrs);
      };
    }

    // 5. Blob / download capture for JSON backup export testing
    const blobUrls = new Map();
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const origCreateObjectURL = URL.createObjectURL.bind(URL);
      URL.createObjectURL = function (obj) {
        const url = origCreateObjectURL(obj);
        if (obj && typeof obj.text === 'function') {
          const entry = { url, type: obj.type || '', size: obj.size || 0, text: null, records: [] };
          blobUrls.set(url, entry);
          obj.text().then((t) => {
            entry.text = t;
            for (const r of entry.records) r.text = t;
          }).catch(() => {});
        }
        return url;
      };
    }
    if (typeof HTMLAnchorElement !== 'undefined') {
      const origAnchorClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.hasAttribute('download') || this.download) {
          const entry = blobUrls.get(this.href) || null;
          const record = {
            filename: this.getAttribute('download') || this.download || 'download',
            href: this.href || '',
            text: entry ? entry.text : null,
            mimeType: entry ? entry.type : '',
            at: Date.now(),
          };
          if (entry && entry.records) entry.records.push(record);
          mockState.downloads.push(record);
          if (!record.text && this.href && this.href.startsWith('data:')) {
            try {
              const comma = this.href.indexOf(',');
              if (comma >= 0) {
                record.text = decodeURIComponent(this.href.slice(comma + 1));
              }
            } catch {}
          }
          return;
        }
        return origAnchorClick.call(this);
      };
    }

    // 6. SpeechRecognition + SpeechRecognitionPhrase
    if (OPTS.disableSpeechRecognition) {
      try {
        delete window.SpeechRecognition;
        delete window.webkitSpeechRecognition;
      } catch {
        window.SpeechRecognition = undefined;
        window.webkitSpeechRecognition = undefined;
      }
    } else {
      class MockSpeechRecognitionPhrase {
        constructor(phrase, boost = 1) {
          this.phrase = String(phrase == null ? '' : phrase);
          this.boost = Number.isFinite(Number(boost)) ? Number(boost) : 1;
        }
      }
      window.SpeechRecognitionPhrase = MockSpeechRecognitionPhrase;

      class MockSpeechRecognition {
        constructor() {
          this.lang = 'en-US';
          this.continuous = false;
          this.interimResults = false;
          this.maxAlternatives = 1;
          this._processLocally = Boolean(mockState.phrasesSupported);
          this._phrases = [];
          this.onstart = null;
          this.onaudiostart = null;
          this.onspeechstart = null;
          this.onspeechend = null;
          this.onresult = null;
          this.onerror = null;
          this.onend = null;
          this._running = false;
          this._speechStarted = false;
          this._startTimer = 0;
          mockState.instances.push(this);
          mockState.active = this;
        }

        get processLocally() {
          return Boolean(mockState.phrasesSupported);
        }
        set processLocally(v) {
          this._processLocally = Boolean(v);
        }

        get phrases() {
          return this._phrases;
        }
        set phrases(val) {
          this._phrases = Array.isArray(val) ? val.slice() : [];
          mockState.assignedPhrases.push(
            this._phrases.map((p) =>
              p && typeof p === 'object' ? { phrase: p.phrase, boost: p.boost } : p
            )
          );
        }

        start() {
          mockState.startCount += 1;
          if (mockState.denyMic) {
            throw new DOMException('Permission denied', 'NotAllowedError');
          }
          if (this._running) {
            throw new DOMException('Already started', 'InvalidStateError');
          }
          this._running = true;
          this._speechStarted = false;
          mockState.active = this;
          this._startTimer = window.setTimeout(() => {
            this._startTimer = 0;
            if (!this._running) return;
            try { this.onstart?.(); } catch {}
            try { this.onaudiostart?.(); } catch {}
          }, 8);
        }

        stop() {
          if (this._startTimer) {
            clearTimeout(this._startTimer);
            this._startTimer = 0;
          }
          if (!this._running) return;
          this._running = false;
          this._speechStarted = false;
          window.setTimeout(() => {
            try { this.onend?.(); } catch {}
          }, 4);
        }

        abort() {
          mockState.abortCount += 1;
          if (this._startTimer) {
            clearTimeout(this._startTimer);
            this._startTimer = 0;
          }
          if (!this._running) return;
          this._running = false;
          this._speechStarted = false;
          window.setTimeout(() => {
            try { this.onend?.(); } catch {}
          }, 4);
        }
      }

      window.SpeechRecognition = MockSpeechRecognition;
      window.webkitSpeechRecognition = MockSpeechRecognition;
    }

    // 7. SpeechSynthesisUtterance + window.speechSynthesis
    if (OPTS.disableSpeechSynthesis) {
      try {
        Object.defineProperty(window, 'speechSynthesis', {
          configurable: true,
          value: undefined,
        });
      } catch {
        window.speechSynthesis = undefined;
      }
      window.SpeechSynthesisUtterance = undefined;
    } else {
      const MOCK_VOICES = [
        { name: 'Samantha', lang: 'en-US', voiceURI: 'Samantha', localService: true, default: true },
        { name: 'Daniel', lang: 'en-GB', voiceURI: 'Daniel', localService: true, default: false },
        { name: 'Junior Kid', lang: 'en-US', voiceURI: 'Junior Kid', localService: true, default: false },
        { name: 'Zarvox', lang: 'en-US', voiceURI: 'Zarvox', localService: true, default: false },
        { name: 'Thomas', lang: 'fr-FR', voiceURI: 'Thomas', localService: true, default: false },
      ];

      class MockSpeechSynthesisUtterance {
        constructor(text = '') {
          this.text = String(text == null ? '' : text);
          this.lang = '';
          this.rate = 1;
          this.pitch = 1;
          this.volume = 1;
          this.voice = null;
          this.onstart = null;
          this.onend = null;
          this.onerror = null;
        }
      }
      window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

      let activeTimers = [];
      let currentUtteranceRecord = null;
      const clearPendingTts = () => {
        for (const id of activeTimers) clearTimeout(id);
        activeTimers = [];
      };

      const mockSynth = {
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        getVoices() {
          return MOCK_VOICES.slice();
        },
        speak(utterance) {
          if (mockState.ttsBroken) {
            throw new Error('speechSynthesis unavailable');
          }
          clearPendingTts();
          if (currentUtteranceRecord && !currentUtteranceRecord.ended) {
            currentUtteranceRecord.cancelled = true;
          }
          const rec = {
            text: utterance.text,
            lang: utterance.lang,
            rate: utterance.rate,
            pitch: utterance.pitch,
            voice: utterance.voice ? utterance.voice.name : null,
            startedAt: performance.now(),
            started: false,
            ended: false,
            cancelled: false,
          };
          currentUtteranceRecord = rec;
          mockState.spoken.push(rec);
          mockState.utterances.push({ utterance, rec });

          this.speaking = true;
          this.pending = false;

          const startDelay = Math.max(0, Number(mockState.utteranceStartDelayMs) || 0);
          const endDelay = Number(mockState.utteranceDelayMs);

          const t1 = window.setTimeout(() => {
            if (rec.cancelled) return;
            rec.started = true;
            try { utterance.onstart?.({ utterance }); } catch {}
          }, startDelay);
          activeTimers.push(t1);

          if (Number.isFinite(endDelay) && endDelay >= 0) {
            const totalEnd = startDelay + endDelay;
            const t2 = window.setTimeout(() => {
              if (rec.cancelled) return;
              rec.ended = true;
              this.speaking = false;
              this.pending = false;
              try { utterance.onend?.({ utterance }); } catch {}
            }, totalEnd);
            activeTimers.push(t2);
          }
        },
        cancel() {
          mockState.cancelledCount += 1;
          clearPendingTts();
          if (currentUtteranceRecord && !currentUtteranceRecord.ended) {
            currentUtteranceRecord.cancelled = true;
          }
          this.speaking = false;
          this.pending = false;
        },
        pause() { this.paused = true; },
        resume() { this.paused = false; },
      };

      try {
        Object.defineProperty(window, 'speechSynthesis', {
          configurable: true,
          writable: true,
          value: mockSynth,
        });
      } catch {
        window.speechSynthesis = mockSynth;
      }
    }

    // 8. AudioContext / AnalyserNode + navigator.mediaDevices.getUserMedia
    class MockAudioContext {
      constructor() {
        this.state = 'running';
        this.sampleRate = 44100;
        this.destination = {};
        mockState.audioContextsCreated += 1;
      }
      get currentTime() {
        return performance.now() / 1000;
      }
      resume() {
        this.state = 'running';
        return Promise.resolve();
      }
      close() {
        this.state = 'closed';
        return Promise.resolve();
      }
      createGain() {
        return {
          gain: {
            value: 1,
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect(dest) { return dest || {}; },
          disconnect() {},
        };
      }
      createDynamicsCompressor() {
        return {
          threshold: { value: -24, setValueAtTime() {} },
          knee: { value: 30, setValueAtTime() {} },
          ratio: { value: 12, setValueAtTime() {} },
          attack: { value: 0.003, setValueAtTime() {} },
          release: { value: 0.25, setValueAtTime() {} },
          connect(dest) { return dest || {}; },
          disconnect() {},
        };
      }
      createOscillator() {
        return {
          type: 'sine',
          frequency: {
            value: 440,
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect(dest) { return dest || {}; },
          disconnect() {},
          start() { mockState.oscillatorsStarted += 1; },
          stop() {},
        };
      }
      createBuffer(channels, length, sampleRate) {
        const bufs = Array.from({ length: channels || 1 }, () => new Float32Array(length || 1));
        return {
          sampleRate: sampleRate || 44100,
          length: length || 1,
          numberOfChannels: channels || 1,
          getChannelData(ch) { return bufs[ch] || bufs[0]; },
        };
      }
      createBufferSource() {
        return {
          buffer: null,
          connect(dest) { return dest || {}; },
          disconnect() {},
          start() { mockState.buffersStarted += 1; },
          stop() {},
        };
      }
      createBiquadFilter() {
        const makeParam = (val) => ({
          value: val,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        });
        return {
          type: 'lowpass',
          frequency: makeParam(350),
          Q: makeParam(1),
          detune: makeParam(0),
          connect(dest) { return dest || {}; },
          disconnect() {},
        };
      }
      createMediaStreamSource() {
        return {
          connect(dest) { return dest || {}; },
          disconnect() {},
        };
      }
      createAnalyser() {
        return {
          fftSize: 256,
          frequencyBinCount: 128,
          smoothingTimeConstant: 0.8,
          getByteTimeDomainData(arr) {
            mockState.analyserReads += 1;
            const amp = Math.round(Math.max(0, Math.min(1, mockState.micLevel)) * 120);
            for (let i = 0; i < arr.length; i++) {
              arr[i] = i % 2 === 0 ? 128 + amp : 128 - amp;
            }
          },
          getByteFrequencyData(arr) {
            mockState.analyserReads += 1;
            const val = Math.round(Math.max(0, Math.min(1, mockState.micLevel)) * 220);
            for (let i = 0; i < arr.length; i++) {
              arr[i] = val;
            }
          },
          connect(dest) { return dest || {}; },
          disconnect() {},
        };
      }
    }
    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;

    const fakeMediaDevices = {
      getUserMedia() {
        if (mockState.failGetUserMedia) {
          return Promise.reject(new DOMException('Requested device not found', 'NotFoundError'));
        }
        if (mockState.denyMic) {
          return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
        }
        const track = { kind: 'audio', enabled: true, stop() {} };
        return Promise.resolve({
          getTracks: () => [track],
          getAudioTracks: () => [track],
        });
      },
    };
    try {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: fakeMediaDevices,
      });
    } catch {
      navigator.mediaDevices = fakeMediaDevices;
    }

    // 9. Public controller on window.__E2E_MOCK__
    window.__E2E_MOCK__ = {
      get spoken() { return mockState.spoken; },
      get cancelledCount() { return mockState.cancelledCount; },
      get assignedPhrases() { return mockState.assignedPhrases; },
      get confirmCalls() { return mockState.confirmCalls; },
      get downloads() { return mockState.downloads; },
      get instances() { return mockState.instances; },
      get activeRecognition() { return mockState.active; },
      clearSpoken() { mockState.spoken.length = 0; },
      clearConfirmCalls() { mockState.confirmCalls.length = 0; },
      clearDownloads() { mockState.downloads.length = 0; },
      setUtteranceDelay(ms) { mockState.utteranceDelayMs = ms; },
      setUtteranceStartDelay(ms) { mockState.utteranceStartDelayMs = ms; },
      setTtsBroken(broken) { mockState.ttsBroken = Boolean(broken); },
      setPhrasesSupported(v) { mockState.phrasesSupported = Boolean(v); },
      setDenyMic(v) { mockState.denyMic = Boolean(v); },
      setMicLevel(level) { mockState.micLevel = Number(level) || 0; },
      setStorageQuotaError(v) { mockState.quotaError = Boolean(v); },
      setConfirmReturnValue(v) { mockState.confirmReturnValue = Boolean(v); },
      setStandalone(v) { mockState.standalone = Boolean(v); },
      getStartCount() { return mockState.startCount; },
      getAbortCount() { return mockState.abortCount; },
      isRunning() { return Boolean(mockState.active && mockState.active._running); },
      getAudioStats() {
        return {
          audioContextsCreated: mockState.audioContextsCreated,
          oscillatorsStarted: mockState.oscillatorsStarted,
          buffersStarted: mockState.buffersStarted,
          analyserReads: mockState.analyserReads,
        };
      },
      emitSpeech(transcript, isFinal = true, alternatives = [], opts = {}) {
        const rec = mockState.active;
        if (!rec) return false;
        if (!rec._running && !opts.force) return false;
        if (!rec._speechStarted) {
          rec._speechStarted = true;
          try { rec.onspeechstart?.(); } catch {}
        }
        const list = [{ transcript: String(transcript), confidence: isFinal ? 0.96 : 0.8 }];
        for (const alt of alternatives || []) {
          if (typeof alt === 'string') {
            list.push({ transcript: alt, confidence: 0.7 });
          } else if (alt && typeof alt === 'object') {
            list.push({
              transcript: String(alt.transcript ?? ''),
              confidence: Number.isFinite(alt.confidence) ? alt.confidence : 0.7,
            });
          }
        }
        list.isFinal = Boolean(isFinal);
        const event = { resultIndex: 0, results: [list] };
        try { rec.onresult?.(event); } catch {}
        if (isFinal) {
          rec._speechStarted = false;
          try { rec.onspeechend?.(); } catch {}
        }
        return true;
      },
      emitSpeechStart() {
        const rec = mockState.active;
        if (!rec) return false;
        rec._speechStarted = true;
        try { rec.onspeechstart?.(); } catch {}
        return true;
      },
      emitNoSpeech() {
        const rec = mockState.active;
        if (!rec) return false;
        try { rec.onerror?.({ error: 'no-speech' }); } catch {}
        rec._running = false;
        rec._speechStarted = false;
        try { rec.onend?.(); } catch {}
        return true;
      },
      emitError(code) {
        const rec = mockState.active;
        if (!rec) return false;
        try { rec.onerror?.({ error: String(code) }); } catch {}
        if (code === 'not-allowed' || code === 'audio-capture' || code === 'service-not-allowed' || code === 'aborted') {
          rec._running = false;
          rec._speechStarted = false;
          try { rec.onend?.(); } catch {}
        }
        return true;
      },
      finishLastSpeechUtterance() {
        const last = mockState.utterances[mockState.utterances.length - 1];
        if (!last || last.rec.ended || last.rec.cancelled) return false;
        last.rec.ended = true;
        if (window.speechSynthesis) {
          window.speechSynthesis.speaking = false;
          window.speechSynthesis.pending = false;
        }
        try { last.utterance.onend?.({ utterance: last.utterance }); } catch {}
        return true;
      },
      triggerBeforeInstallPrompt() {
        const ev = new Event('beforeinstallprompt', { cancelable: true });
        ev.prompt = () => Promise.resolve();
        ev.userChoice = Promise.resolve({ outcome: 'accepted' });
        window.dispatchEvent(ev);
        return true;
      },
    };
  })();`;
}
