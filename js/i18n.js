(function (global) {
  "use strict";

  const SUPPORTED = ["zh", "fr", "en"];
  const STORAGE_KEY = "piupiu.lang";
  const HTML_LANG = { zh: "zh-CN", fr: "fr", en: "en" };

  const TRANSLATIONS = {
    zh: {
      "app.title": "PiuPiu · 英语单词爆破",
      "app.description": "PiuPiu — 读出下落的英语单词，读对就爆炸。500 个常用名词与动词。",
      "hud.aria": "游戏数据",
      "hud.score": "得分",
      "hud.combo": "连击",
      "hud.level": "等级",
      "hud.pile": "堆积",
      "hud.time": "时间",
      "danger.line": "危险线",
      "gauge.label": "堆积",
      "lang.aria": "界面语言",
      "lang.title": "切换语言",
      "mute.title": "音效开关",
      "mute.off": "关闭音效",
      "mute.on": "开启音效",
      "pause.pause": "暂停",
      "pause.resume": "继续",
      "pause.pauseTitle": "暂停 (Esc)",
      "pause.resumeTitle": "继续 (Esc)",
      "start.eyebrow": "英语单词爆破",
      "start.tagline": "读出来，让它爆炸。",
      "start.step1": "单词从屏幕顶部随机落下",
      "start.step2": "对着麦克风大声读出这个英语单词",
      "start.step3": "读对立即爆破，没接住就会堆在底部",
      "start.rule1": "单词堆到屏幕顶端，游戏结束。",
      "start.rule2": "500 个常用名词 / 动词 · 没有麦克风也能直接打字。",
      "start.cta": "开始游戏",
      "start.best": "最高分：{score}",
      "speech.note.initial": "语音识别需要 Chrome / Edge / Safari，并允许麦克风权限。",
      "speech.note.ok": "语音识别需要允许麦克风权限；也可以随时改用下方输入框。",
      "speech.note.unsupported":
        "当前浏览器不支持语音识别，请直接输入单词来玩。推荐 Chrome / Edge / Safari。",
      "pause.eyebrow": "休息一下",
      "pause.title": "已暂停",
      "pause.tagline": "单词们正在半空中等你。",
      "pause.cta": "继续游戏",
      "pause.quit": "结束本局",
      "over.eyebrow": "堆积到顶了",
      "over.title": "游戏结束",
      "over.tagline": "单词堆到屏幕顶端了。",
      "over.score": "得分",
      "over.cleared": "爆破",
      "over.combo": "最高连击",
      "over.time": "坚持",
      "over.missedTitle": "漏掉的单词",
      "over.emptyMissed": "一个都没漏掉，漂亮！",
      "over.record": "🏆 新纪录！",
      "over.best": "最高分：{score}",
      "over.cta": "再来一局",
      "over.home": "回到主页",
      "footer.placeholder": "也可以输入单词，按 Enter 爆破…",
      "footer.send": "发射",
      "footer.hint": "读出单词 · 读对即爆破",
      "footer.inputAria": "输入单词",
      "mic.ready": "语音就绪",
      "mic.listening": "聆听中…",
      "mic.connecting": "语音连接中",
      "mic.paused": "语音已暂停",
      "mic.off": "语音已关",
      "mic.error": "麦克风不可用",
      "mic.keyboard": "键盘模式",
      "mic.toggle": "麦克风开关",
      "heard.prefix": "听到：{text}",
      "heard.correct": "✓ {word}",
      "toast.start": "大声读出下落的单词！",
      "toast.levelUp": "等级 {level} · 单词下落加速",
      "toast.micDenied": "麦克风未授权 · 可以直接输入单词来玩",
      "toast.noMic": "没有找到麦克风 · 已切换到键盘模式",
      "toast.speechNetwork": "语音服务不稳定，正在重连…",
      "toast.speechOffline": "语音服务连接失败 · 已切换到键盘模式",
      "toast.speechOff": "语音已关闭 · 现在可以用键盘输入",
      "toast.speechOn": "语音识别已开启",
      "toast.unsupported": "当前浏览器不支持语音识别 · 请直接输入单词",
      "toast.notOnScreen": "屏幕上没有 “{word}”",
      "toast.startFirst": "先按「开始游戏」",
      "toast.continueFirst": "先继续游戏，再输入单词",
      "toast.gameOverFirst": "本局已结束，点「再来一局」重新开始",
      "toast.wordBank": "单词库加载失败",
    },

    fr: {
      "app.title": "PiuPiu · Jeu de prononciation anglaise",
      "app.description":
        "PiuPiu — lis les mots anglais qui tombent et fais-les exploser. 500 noms et verbes courants.",
      "hud.aria": "Données de jeu",
      "hud.score": "Score",
      "hud.combo": "Combo",
      "hud.level": "Niveau",
      "hud.pile": "Pile",
      "hud.time": "Temps",
      "danger.line": "LIGNE CRITIQUE",
      "gauge.label": "PILE",
      "lang.aria": "Langue de l'interface",
      "lang.title": "Changer de langue",
      "mute.title": "Son",
      "mute.off": "Couper le son",
      "mute.on": "Activer le son",
      "pause.pause": "Pause",
      "pause.resume": "Reprendre",
      "pause.pauseTitle": "Pause (Échap)",
      "pause.resumeTitle": "Reprendre (Échap)",
      "start.eyebrow": "PRONONCIATION ANGLAISE",
      "start.tagline": "Lis-le. Fais-le exploser.",
      "start.step1": "Les mots tombent du haut de l'écran, au hasard.",
      "start.step2": "Lis le mot anglais à voix haute dans le micro.",
      "start.step3": "Bonne lecture : explosion. Sinon, il s'empile en bas.",
      "start.rule1": "Quand la pile atteint le haut de l'écran, la partie se termine.",
      "start.rule2": "500 noms et verbes courants · le clavier fonctionne aussi.",
      "start.cta": "Jouer",
      "start.best": "Meilleur score : {score}",
      "speech.note.initial":
        "La reconnaissance vocale nécessite Chrome / Edge / Safari et l'accès au micro.",
      "speech.note.ok":
        "La reconnaissance vocale demande l'accès au micro ; le champ de saisie reste disponible.",
      "speech.note.unsupported":
        "La reconnaissance vocale n'est pas disponible dans ce navigateur. Tape les mots pour jouer. Chrome / Edge / Safari recommandés.",
      "pause.eyebrow": "UNE PAUSE",
      "pause.title": "En pause",
      "pause.tagline": "Les mots t'attendent en plein vol.",
      "pause.cta": "Reprendre",
      "pause.quit": "Quitter la partie",
      "over.eyebrow": "LA PILE EST PLEINE",
      "over.title": "Partie terminée",
      "over.tagline": "Les mots ont atteint le haut de l'écran.",
      "over.score": "Score",
      "over.cleared": "Explosés",
      "over.combo": "Meilleur combo",
      "over.time": "Durée",
      "over.missedTitle": "Mots manqués",
      "over.emptyMissed": "Aucun mot manqué, bravo !",
      "over.record": "🏆 Nouveau record !",
      "over.best": "Meilleur score : {score}",
      "over.cta": "Rejouer",
      "over.home": "Accueil",
      "footer.placeholder": "Ou tape un mot puis Entrée…",
      "footer.send": "Tirer",
      "footer.hint": "Lis le mot · bonne lecture = explosion",
      "footer.inputAria": "Saisir un mot",
      "mic.ready": "Micro prêt",
      "mic.listening": "À l'écoute…",
      "mic.connecting": "Connexion…",
      "mic.paused": "Micro en pause",
      "mic.off": "Micro coupé",
      "mic.error": "Sans micro",
      "mic.keyboard": "Mode clavier",
      "mic.toggle": "Micro",
      "heard.prefix": "Entendu : {text}",
      "heard.correct": "✓ {word}",
      "toast.start": "Lis les mots qui tombent à voix haute !",
      "toast.levelUp": "Niveau {level} · les mots accélèrent",
      "toast.micDenied": "Micro non autorisé · tu peux taper les mots",
      "toast.noMic": "Aucun micro détecté · mode clavier activé",
      "toast.speechNetwork": "Service vocal instable, reconnexion…",
      "toast.speechOffline": "Service vocal indisponible · mode clavier activé",
      "toast.speechOff": "Reconnaissance vocale coupée · utilise le clavier",
      "toast.speechOn": "Reconnaissance vocale activée",
      "toast.unsupported": "Ce navigateur ne gère pas la reconnaissance vocale · tape les mots",
      "toast.notOnScreen": "« {word} » n'est pas à l'écran",
      "toast.startFirst": "Appuie d'abord sur « Jouer »",
      "toast.continueFirst": "Reprends la partie avant de taper un mot",
      "toast.gameOverFirst": "La partie est finie, appuie sur « Rejouer »",
      "toast.wordBank": "Impossible de charger les mots",
    },

    en: {
      "app.title": "PiuPiu · English Word Blast",
      "app.description":
        "PiuPiu — read the falling English words and blast them. 500 common nouns and verbs.",
      "hud.aria": "Game stats",
      "hud.score": "Score",
      "hud.combo": "Combo",
      "hud.level": "Level",
      "hud.pile": "Pile",
      "hud.time": "Time",
      "danger.line": "DANGER LINE",
      "gauge.label": "PILE",
      "lang.aria": "Interface language",
      "lang.title": "Change language",
      "mute.title": "Sound",
      "mute.off": "Mute",
      "mute.on": "Unmute",
      "pause.pause": "Pause",
      "pause.resume": "Resume",
      "pause.pauseTitle": "Pause (Esc)",
      "pause.resumeTitle": "Resume (Esc)",
      "start.eyebrow": "ENGLISH WORD BLAST",
      "start.tagline": "Read it. Blast it.",
      "start.step1": "Words fall from random spots at the top.",
      "start.step2": "Say the English word out loud into your mic.",
      "start.step3": "Correct reading = explosion. Missed words pile up below.",
      "start.rule1": "When the pile reaches the top of the screen, the game ends.",
      "start.rule2": "500 common nouns / verbs · keyboard input works too.",
      "start.cta": "Start game",
      "start.best": "Best score: {score}",
      "speech.note.initial":
        "Speech recognition needs Chrome / Edge / Safari and microphone permission.",
      "speech.note.ok":
        "Speech recognition asks for mic access; the text field below always works.",
      "speech.note.unsupported":
        "Speech recognition isn't available in this browser. Type the words to play. Chrome / Edge / Safari recommended.",
      "pause.eyebrow": "TAKE A BREATH",
      "pause.title": "Paused",
      "pause.tagline": "The words are waiting mid-air.",
      "pause.cta": "Resume",
      "pause.quit": "Quit game",
      "over.eyebrow": "THE PILE IS FULL",
      "over.title": "Game over",
      "over.tagline": "The words reached the top of the screen.",
      "over.score": "Score",
      "over.cleared": "Blasted",
      "over.combo": "Best combo",
      "over.time": "Time",
      "over.missedTitle": "Missed words",
      "over.emptyMissed": "Nothing missed — nice!",
      "over.record": "🏆 New record!",
      "over.best": "Best score: {score}",
      "over.cta": "Play again",
      "over.home": "Back home",
      "footer.placeholder": "Or type a word and press Enter…",
      "footer.send": "Fire",
      "footer.hint": "Read the word · hit it to blast",
      "footer.inputAria": "Type a word",
      "mic.ready": "Mic ready",
      "mic.listening": "Listening…",
      "mic.connecting": "Connecting mic",
      "mic.paused": "Mic paused",
      "mic.off": "Mic off",
      "mic.error": "Mic unavailable",
      "mic.keyboard": "Keyboard mode",
      "mic.toggle": "Microphone",
      "heard.prefix": "Heard: {text}",
      "heard.correct": "✓ {word}",
      "toast.start": "Read the falling words out loud!",
      "toast.levelUp": "Level {level} · words are speeding up",
      "toast.micDenied": "Microphone not allowed · type the words instead",
      "toast.noMic": "No microphone found · keyboard mode on",
      "toast.speechNetwork": "Speech service is unstable, reconnecting…",
      "toast.speechOffline": "Speech service failed · keyboard mode on",
      "toast.speechOff": "Speech recognition off · use the keyboard",
      "toast.speechOn": "Speech recognition on",
      "toast.unsupported": "This browser doesn't support speech recognition · type the words",
      "toast.notOnScreen": "“{word}” isn't on screen",
      "toast.startFirst": "Press “Start game” first",
      "toast.continueFirst": "Resume the game before typing a word",
      "toast.gameOverFirst": "The game is over, press “Play again”",
      "toast.wordBank": "Couldn't load the word bank",
    },
  };

  let current = "zh";

  function normalize(value) {
    const code = String(value || "")
      .toLowerCase()
      .slice(0, 2);
    return SUPPORTED.includes(code) ? code : null;
  }

  function detectLanguage() {
    try {
      const saved = normalize(global.localStorage && global.localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch {
      /* localStorage may be blocked */
    }

    if (typeof navigator !== "undefined") {
      const languages = Array.isArray(navigator.languages) ? navigator.languages.slice() : [];
      if (navigator.language) languages.push(navigator.language);
      for (const candidate of languages) {
        const code = normalize(candidate);
        if (code) return code;
      }
    }

    return "zh";
  }

  function interpolate(template, vars) {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (match, key) =>
      vars[key] !== undefined ? String(vars[key]) : match,
    );
  }

  function t(key, vars) {
    const table = TRANSLATIONS[current] || TRANSLATIONS.zh;
    const template = table[key] ?? TRANSLATIONS.zh[key] ?? key;
    return interpolate(template, vars);
  }

  function apply(root) {
    if (typeof document === "undefined") return;
    const scope = root && typeof root.querySelectorAll === "function" ? root : document;

    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });

    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });

    scope.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });

    document.documentElement.lang = HTML_LANG[current];
    document.documentElement.dataset.lang = current;
    document.title = t("app.title");

    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", t("app.description"));

    const select = document.getElementById("langSelect");
    if (select) select.value = current;
  }

  function setLang(next) {
    const code = normalize(next);
    if (!code || code === current) return current;
    current = code;
    try {
      global.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore blocked storage */
    }
    if (typeof document !== "undefined") {
      apply();
      document.dispatchEvent(new CustomEvent("piupiu:langchange", { detail: { lang: code } }));
    }
    return current;
  }

  function init() {
    current = detectLanguage();
    apply();

    const select = document.getElementById("langSelect");
    if (select) {
      select.value = current;
      select.addEventListener("change", () => setLang(select.value));
    }
  }

  const api = {
    t,
    getLang: () => current,
    setLang,
    apply,
    supported: SUPPORTED.slice(),
    translations: TRANSLATIONS,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PiuI18n = api;
  if (typeof document !== "undefined") init();
})(typeof window !== "undefined" ? window : globalThis);
