(function (global) {
  "use strict";

  const SEASONS = ["spring", "summer", "autumn", "winter"];
  const FEATURES = ["birds", "garden", "land", "ocean", "space", "sky", "blooms"];
  const KINDS = ["fly", "walk", "swim", "space", "sky", "bloom"];

  const weather = (id, seasons, duration = [8, 12]) => ({ id, kind: id, seasons, duration });

  const WEATHERS = [
    weather("rain", ["spring", "summer", "autumn"]),
    weather("snow", ["winter"], [9, 14]),
    weather("leaves", ["autumn"]),
    weather("petals", ["spring"]),
    weather("wind", ["spring", "autumn", "winter"], [7, 11]),
    weather("fog", ["spring", "autumn", "winter"], [9, 13]),
    weather("thunder", ["summer", "autumn"], [7, 11]),
    weather("fireflies", ["summer"]),
    weather("bubbles", ["summer"]),
    weather("meteors", ["any"], [7, 11]),
    weather("rainbow", ["spring", "summer"]),
    weather("aurora", ["winter"], [9, 13]),
    weather("sunbeams", ["spring", "summer"]),
    weather("frost", ["winter"]),
    weather("hail", ["winter", "spring"], [6, 10]),
  ];

  const entry = (id, emoji, feature, kind, seasons = ["any"], options = {}) => ({
    id,
    emoji,
    feature,
    kind,
    seasons,
    size: options.size || [20, 34],
    group: options.group || [1, 1],
    duration: options.duration || [7, 11],
    ...(options.special ? { special: options.special } : {}),
  });

  const ELEMENTS = [
    // birds
    entry("bird", "🐦", "birds", "fly", ["any"], { group: [1, 4] }),
    entry("dove", "🕊️", "birds", "fly", ["spring", "summer"], { group: [1, 3] }),
    entry("eagle", "🦅", "birds", "fly", ["any"], { group: [1, 2], size: [24, 38] }),
    entry("duck", "🦆", "birds", "fly", ["spring", "summer"], { group: [1, 3] }),
    entry("swan", "🦢", "birds", "fly", ["spring"], { group: [1, 2], size: [24, 36] }),
    entry("flamingo", "🦩", "birds", "fly", ["spring", "summer"], { group: [1, 2] }),
    entry("parrot", "🦜", "birds", "fly", ["spring", "summer"], { group: [1, 2] }),
    entry("owl", "🦉", "birds", "fly", ["autumn", "winter"], { group: [1, 2] }),

    // garden and small creatures
    entry("butterfly", "🦋", "garden", "fly", ["spring", "summer"], { group: [2, 5], size: [16, 27], duration: [6, 9] }),
    entry("bee", "🐝", "garden", "fly", ["spring", "summer"], { group: [2, 5], size: [15, 24], duration: [6, 9] }),
    entry("ladybug", "🐞", "garden", "fly", ["spring", "summer"], { group: [1, 3], size: [15, 23], duration: [6, 9] }),
    entry("snail", "🐌", "garden", "walk", ["spring", "autumn"], { group: [1, 2], size: [18, 28], duration: [9, 14] }),
    entry("caterpillar", "🐛", "garden", "walk", ["spring", "summer"], { group: [1, 3], size: [16, 25], duration: [8, 12] }),
    entry("mushroom", "🍄", "garden", "bloom", ["autumn"], { group: [3, 6], size: [16, 26], duration: [8, 12] }),

    // land animals
    entry("squirrel", "🐿️", "land", "walk", ["autumn", "winter"], { group: [1, 2], size: [22, 34], duration: [8, 13] }),
    entry("rabbit", "🐇", "land", "walk", ["spring", "summer"], { group: [1, 2], size: [22, 34] }),
    entry("fox", "🦊", "land", "walk", ["autumn", "winter"], { group: [1, 1], size: [24, 36] }),
    entry("deer", "🦌", "land", "walk", ["autumn", "winter"], { group: [1, 1], size: [26, 40] }),
    entry("hedgehog", "🦔", "land", "walk", ["autumn"], { group: [1, 2], size: [20, 30] }),
    entry("frog", "🐸", "land", "walk", ["spring", "summer"], { group: [1, 2], size: [18, 28] }),
    entry("turtle", "🐢", "land", "walk", ["spring", "summer"], { group: [1, 2], size: [20, 31] }),
    entry("cat", "🐈", "land", "walk", ["any"], { group: [1, 2], size: [20, 32] }),
    entry("dog", "🐕", "land", "walk", ["any"], { group: [1, 2], size: [22, 34] }),

    // ocean
    entry("fish", "🐟", "ocean", "swim", ["summer"], { group: [2, 5], size: [18, 28], duration: [8, 12] }),
    entry("tropical-fish", "🐠", "ocean", "swim", ["summer"], { group: [2, 4], size: [18, 28] }),
    entry("pufferfish", "🐡", "ocean", "swim", ["summer"], { group: [1, 2], size: [20, 30] }),
    entry("shark", "🦈", "ocean", "swim", ["summer"], { group: [1, 1], size: [28, 42] }),
    entry("dolphin", "🐬", "ocean", "swim", ["summer", "any"], { group: [1, 2], size: [26, 40] }),
    entry("whale", "🐳", "ocean", "swim", ["any"], { group: [1, 1], size: [32, 48], duration: [10, 16] }),
    entry("blue-whale", "🐋", "ocean", "swim", ["any"], { group: [1, 1], size: [32, 50], duration: [10, 16] }),
    entry("octopus", "🐙", "ocean", "swim", ["summer"], { group: [1, 1], size: [24, 36] }),
    entry("squid", "🦑", "ocean", "swim", ["summer"], { group: [1, 2], size: [22, 34] }),
    entry("crab", "🦀", "ocean", "swim", ["summer"], { group: [1, 2], size: [18, 28] }),
    entry("lobster", "🦞", "ocean", "swim", ["summer"], { group: [1, 1], size: [20, 30] }),
    entry("jellyfish", "🪼", "ocean", "swim", ["summer"], { group: [1, 3], size: [20, 32], duration: [9, 14] }),

    // space visitors
    entry("alien", "👽", "space", "space", ["any"], { group: [1, 2], size: [24, 36], duration: [9, 15] }),
    entry("alien-monster", "👾", "space", "space", ["any"], { group: [1, 2], size: [24, 36] }),
    entry("ufo", "🛸", "space", "space", ["any"], { group: [1, 1], size: [34, 48], duration: [12, 18], special: "ufo" }),
    entry("rocket", "🚀", "space", "space", ["any"], { group: [1, 2], size: [24, 36] }),
    entry("satellite", "🛰️", "space", "space", ["any"], { group: [1, 2], size: [22, 34] }),
    entry("comet", "☄️", "space", "space", ["any"], { group: [1, 2], size: [22, 34] }),
    entry("planet", "🪐", "space", "space", ["any"], { group: [1, 1], size: [28, 44] }),
    entry("shooting-star", "🌠", "space", "space", ["any"], { group: [1, 2], size: [22, 34] }),

    // sky scenery
    entry("cloud", "☁️", "sky", "sky", ["any"], { group: [1, 2], size: [34, 56], duration: [9, 14] }),
    entry("rainbow", "🌈", "sky", "sky", ["spring", "summer"], { group: [1, 1], size: [40, 60] }),
    entry("sun", "☀️", "sky", "sky", ["spring", "summer"], { group: [1, 1], size: [32, 48] }),
    entry("sun-cloud", "🌤️", "sky", "sky", ["spring", "summer"], { group: [1, 2], size: [34, 52] }),
    entry("moon", "🌙", "sky", "sky", ["autumn", "winter"], { group: [1, 1], size: [30, 46] }),
    entry("star", "⭐", "sky", "sky", ["any"], { group: [1, 2], size: [20, 30] }),
    entry("glowing-star", "🌟", "sky", "sky", ["any"], { group: [1, 2], size: [22, 34] }),
    entry("sparkles", "✨", "sky", "sky", ["any"], { group: [1, 2], size: [22, 34] }),

    // flowers
    entry("cherry-blossom", "🌸", "blooms", "bloom", ["spring"], { group: [3, 6], size: [16, 26] }),
    entry("daisy", "🌼", "blooms", "bloom", ["spring", "summer"], { group: [3, 6], size: [16, 26] }),
    entry("tulip", "🌷", "blooms", "bloom", ["spring"], { group: [3, 6], size: [16, 26] }),
    entry("rose", "🌹", "blooms", "bloom", ["any"], { group: [2, 5], size: [18, 28] }),
    entry("hibiscus", "🌺", "blooms", "bloom", ["summer"], { group: [3, 6], size: [18, 28] }),
    entry("sunflower", "🌻", "blooms", "bloom", ["summer"], { group: [2, 5], size: [20, 30] }),
    entry("rosette", "🏵️", "blooms", "bloom", ["any"], { group: [3, 6], size: [16, 26] }),
    entry("bouquet", "💐", "blooms", "bloom", ["any"], { group: [1, 2], size: [24, 36] }),
    entry("sprout", "🌱", "blooms", "bloom", ["spring"], { group: [3, 6], size: [16, 26] }),
    entry("herb", "🌿", "blooms", "bloom", ["any"], { group: [3, 6], size: [16, 26] }),
  ];

  const Y_RANGES = {
    fly: [10, 55],
    walk: [70, 88],
    swim: [48, 78],
    space: [6, 36],
    sky: [8, 28],
    bloom: [70, 90],
  };

  const BOB_DURATIONS = { fly: 1.1, walk: 0.45, swim: 0.9, space: 1.6, bloom: 2.4 };

  let field = null;
  let ambientLayer = null;
  let weatherLayer = null;
  let season = "spring";
  let running = false;
  let seasonTimer = 0;
  let weatherTimer = 0;
  let weatherEndTimer = 0;
  let eventTimer = 0;
  let weatherBag = [];
  let featureBag = [];

  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randRange = (range) => range[0] + Math.random() * (range[1] - range[0]);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function seasonAllowed(item) {
    return item.seasons.includes("any") || item.seasons.includes(season);
  }

  function currentSeasonFromMonth() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 7) return "summer";
    if (month >= 8 && month <= 10) return "autumn";
    return "winter";
  }

  function setSeason(next) {
    if (!SEASONS.includes(next)) next = "spring";
    season = next;
    weatherBag = [];
    featureBag = [];
    if (!field) return;
    for (const item of SEASONS) field.classList.toggle(`season-${item}`, item === next);
    field.dataset.season = next;
  }

  function cycleSeason() {
    if (!running) return;
    const next = SEASONS[(SEASONS.indexOf(season) + 1) % SEASONS.length];
    setSeason(next);
    seasonTimer = window.setTimeout(cycleSeason, 36000);
  }

  function pickWeather() {
    const pool = WEATHERS.filter(seasonAllowed);
    if (!pool.length) return WEATHERS[0];
    if (!weatherBag.length) weatherBag = shuffle(pool.slice());
    return weatherBag.pop();
  }

  function pickFeature() {
    if (!featureBag.length) featureBag = shuffle(FEATURES.slice());
    return featureBag.pop();
  }

  function addAmbientNode(node) {
    node.setAttribute("aria-hidden", "true");
    node.addEventListener("animationend", () => node.remove(), { once: true });
    ambientLayer.appendChild(node);
  }

  function addWeatherNode(node) {
    node.setAttribute("aria-hidden", "true");
    weatherLayer.appendChild(node);
  }

  function spawnMover(element, options) {
    const node = document.createElement("span");
    node.className = `ambient ambient-mover ambient-${element.kind}`;
    node.style.setProperty("--y", `${options.y}%`);
    node.style.setProperty("--size", `${options.size}px`);
    node.style.setProperty("--dur", `${options.duration}s`);
    node.style.setProperty("--delay", `${options.delay}s`);
    node.style.setProperty("--sx", `${options.startX}px`);
    node.style.setProperty("--ex", `${options.endX}px`);
    node.style.setProperty("--bob-dur", `${BOB_DURATIONS[element.kind] || 1.2}s`);

    if (element.special === "ufo") {
      const scene = document.createElement("span");
      scene.className = "ufo-scene";
      const ship = document.createElement("span");
      ship.className = "ufo-ship";
      ship.textContent = element.emoji;
      const beam = document.createElement("span");
      beam.className = "ufo-beam";
      const aliens = document.createElement("span");
      aliens.className = "ufo-aliens";
      aliens.textContent = "👽 👾";
      scene.append(ship, beam, aliens);
      node.appendChild(scene);
    } else {
      const face = document.createElement("span");
      face.className = "ambient-bob";
      face.textContent = element.emoji;
      node.appendChild(face);
    }
    addAmbientNode(node);
  }

  function spawnSky(element) {
    const node = document.createElement("span");
    node.className = "ambient ambient-sky";
    node.textContent = element.emoji;
    const size = randInt(element.size[0], element.size[1]);
    const duration = randRange(element.duration);
    node.style.setProperty("--x", `${randInt(8, 92)}%`);
    node.style.setProperty("--y", `${randRange(Y_RANGES.sky)}%`);
    node.style.setProperty("--size", `${size}px`);
    node.style.setProperty("--dur", `${duration}s`);
    node.style.setProperty("--delay", `${Math.random() * 1.2}s`);
    addAmbientNode(node);
  }

  function spawnBloom(element) {
    const node = document.createElement("span");
    node.className = "ambient ambient-bloom";
    node.style.setProperty("--x", `${randInt(4, 96)}%`);
    node.style.setProperty("--y", `${randRange(Y_RANGES.bloom)}%`);
    node.style.setProperty("--size", `${randInt(element.size[0], element.size[1])}px`);
    node.style.setProperty("--dur", `${randRange(element.duration)}s`);
    node.style.setProperty("--delay", `${Math.random() * 1.8}s`);
    const face = document.createElement("span");
    face.className = "bloom-face";
    face.textContent = element.emoji;
    node.appendChild(face);
    addAmbientNode(node);
  }

  function spawnElement(element) {
    if (!element) return;
    if (ambientLayer.childElementCount > 12) return;
    const [minCount, maxCount] = element.group || [1, 1];
    const count = randInt(minCount, maxCount);

    if (element.kind === "sky") {
      for (let i = 0; i < count && i < 2; i++) spawnSky(element);
      return;
    }
    if (element.kind === "bloom") {
      for (let i = 0; i < count && i < 6; i++) spawnBloom(element);
      return;
    }

    const width = field.clientWidth || 800;
    const direction = Math.random() < 0.5 ? 1 : -1;
    const baseY = randRange(Y_RANGES[element.kind] || [15, 70]);

    for (let i = 0; i < count && i < 5; i++) {
      const size = randInt(element.size[0], element.size[1]);
      const duration = randRange(element.duration);
      const y = clamp(baseY + (Math.random() - 0.5) * 12, 4, 92);
      const startX = direction > 0 ? -size - 24 : width + size + 24;
      const endX = direction > 0 ? width + size + 24 : -size - 24;
      spawnMover(element, {
        y,
        size,
        duration,
        delay: Math.random() * 1.1,
        startX,
        endX,
      });
    }
  }

  function addWeatherRain(count = 26) {
    for (let i = 0; i < count; i++) {
      const drop = document.createElement("div");
      drop.className = "weather-drop";
      drop.style.setProperty("--x", `${randRange([0, 100])}%`);
      drop.style.setProperty("--dur", `${randRange([0.55, 1.1])}s`);
      drop.style.setProperty("--delay", `${-Math.random() * 1.2}s`);
      addWeatherNode(drop);
    }
  }

  function addWeatherSnow(count = 28) {
    const flakeChars = ["❄️", "❅", "❆", "✦"];
    for (let i = 0; i < count; i++) {
      const flake = document.createElement("span");
      flake.className = "weather-flake";
      flake.textContent = flakeChars[randInt(0, flakeChars.length - 1)];
      flake.style.setProperty("--x", `${randRange([0, 100])}%`);
      flake.style.setProperty("--size", `${randInt(8, 18)}px`);
      flake.style.setProperty("--dur", `${randRange([5, 10])}s`);
      flake.style.setProperty("--delay", `${-Math.random() * 10}s`);
      flake.style.setProperty("--drift", `${randInt(-60, 60)}px`);
      addWeatherNode(flake);
    }
  }

  function addWeatherFalling(count, chars, className = "weather-fall", duration = [6, 11]) {
    for (let i = 0; i < count; i++) {
      const node = document.createElement("span");
      node.className = className;
      node.textContent = chars[randInt(0, chars.length - 1)];
      node.style.setProperty("--x", `${randRange([0, 100])}%`);
      node.style.setProperty("--size", `${randInt(14, 26)}px`);
      node.style.setProperty("--dur", `${randRange(duration)}s`);
      node.style.setProperty("--delay", `${-Math.random() * 8}s`);
      node.style.setProperty("--drift", `${randInt(-80, 80)}px`);
      node.style.setProperty("--rot", `${randInt(-260, 260)}deg`);
      addWeatherNode(node);
    }
  }

  function addWeatherWind() {
    for (let i = 0; i < 16; i++) {
      const streak = document.createElement("div");
      streak.className = "weather-wind";
      streak.style.setProperty("--y", `${randRange([8, 82])}%`);
      streak.style.setProperty("--dur", `${randRange([1.2, 2.3])}s`);
      streak.style.setProperty("--delay", `${-Math.random() * 2}s`);
      streak.style.setProperty("--len", `${randInt(35, 110)}px`);
      addWeatherNode(streak);
    }
  }

  function addWeatherOverlay(className) {
    const node = document.createElement("div");
    node.className = className;
    addWeatherNode(node);
    return node;
  }

  function runWeather(item, scheduleNext = false) {
    if (!item) return;
    window.clearTimeout(weatherEndTimer);
    weatherEndTimer = 0;
    weatherLayer.replaceChildren();
    if (!field) return;
    const duration = randRange(item.duration);

    if (item.kind === "rain") {
      addWeatherRain(28);
    } else if (item.kind === "snow") {
      addWeatherSnow(30);
    } else if (item.kind === "leaves") {
      addWeatherFalling(20, ["🍁", "🍂", "🍃"]);
    } else if (item.kind === "petals") {
      addWeatherFalling(22, ["🌸", "🌼", "💮", "🌺"], "weather-petal");
    } else if (item.kind === "wind") {
      addWeatherWind();
    } else if (item.kind === "fog") {
      addWeatherOverlay("weather-fog");
    } else if (item.kind === "thunder") {
      addWeatherRain(20);
      for (let i = 0; i < 3; i++) {
        const flash = addWeatherOverlay("weather-flash");
        flash.style.animationDelay = `${0.7 + i * 2.1}s`;
        const bolt = document.createElement("span");
        bolt.className = "weather-bolt";
        bolt.textContent = "⚡";
        bolt.style.left = `${randInt(12, 88)}%`;
        bolt.style.top = `${randInt(4, 34)}%`;
        bolt.style.animationDelay = `${0.7 + i * 2.1}s`;
        addWeatherNode(bolt);
      }
    } else if (item.kind === "fireflies") {
      for (let i = 0; i < 16; i++) {
        const fly = document.createElement("span");
        fly.className = "weather-firefly";
        fly.style.setProperty("--x", `${randRange([6, 94])}%`);
        fly.style.setProperty("--y", `${randRange([20, 82])}%`);
        fly.style.setProperty("--dur", `${randRange([1.8, 3.4])}s`);
        fly.style.setProperty("--delay", `${-Math.random() * 3}s`);
        addWeatherNode(fly);
      }
    } else if (item.kind === "bubbles") {
      for (let i = 0; i < 20; i++) {
        const bubble = document.createElement("span");
        bubble.className = "weather-bubble";
        bubble.style.setProperty("--x", `${randRange([3, 97])}%`);
        bubble.style.setProperty("--size", `${randInt(8, 24)}px`);
        bubble.style.setProperty("--dur", `${randRange([5, 9])}s`);
        bubble.style.setProperty("--delay", `${-Math.random() * 8}s`);
        addWeatherNode(bubble);
      }
    } else if (item.kind === "meteors") {
      for (let i = 0; i < 8; i++) {
        const meteor = document.createElement("span");
        meteor.className = "weather-meteor";
        meteor.style.setProperty("--x", `${randRange([10, 90])}%`);
        meteor.style.setProperty("--y", `${randRange([2, 28])}%`);
        meteor.style.setProperty("--dur", `${randRange([1.3, 2.4])}s`);
        meteor.style.setProperty("--delay", `${-Math.random() * 2}s`);
        addWeatherNode(meteor);
      }
    } else if (item.kind === "rainbow") {
      const rainbow = addWeatherOverlay("weather-rainbow");
      rainbow.textContent = "🌈";
    } else if (item.kind === "aurora") {
      addWeatherOverlay("weather-aurora");
    } else if (item.kind === "sunbeams") {
      addWeatherOverlay("weather-sunbeam");
    } else if (item.kind === "frost") {
      addWeatherOverlay("weather-frost");
      addWeatherSnow(12);
    } else if (item.kind === "hail") {
      for (let i = 0; i < 24; i++) {
        const hail = document.createElement("span");
        hail.className = "weather-hail";
        hail.style.setProperty("--x", `${randRange([0, 100])}%`);
        hail.style.setProperty("--dur", `${randRange([0.8, 1.6])}s`);
        hail.style.setProperty("--delay", `${-Math.random() * 2}s`);
        addWeatherNode(hail);
      }
    }

    weatherEndTimer = window.setTimeout(() => {
      weatherLayer.replaceChildren();
      weatherEndTimer = 0;
    }, duration * 1000);

    if (scheduleNext) {
      scheduleWeather(duration * 1000 + randRange([7000, 12000]));
    }
  }

  function spawnFeature() {
    if (!running || !ambientLayer) return;
    if (ambientLayer.childElementCount > 12) return;

    const feature = pickFeature();
    const pool = ELEMENTS.filter((item) => item.feature === feature && seasonAllowed(item));
    if (pool.length) {
      spawnElement(pool[randInt(0, pool.length - 1)]);
      return;
    }
    const fallback = ELEMENTS.filter(seasonAllowed);
    if (fallback.length) spawnElement(fallback[randInt(0, fallback.length - 1)]);
  }

  function scheduleWeather(delay) {
    window.clearTimeout(weatherTimer);
    weatherTimer = window.setTimeout(() => {
      if (!running) return;
      runWeather(pickWeather(), true);
    }, delay);
  }

  function scheduleEvent(delay) {
    window.clearTimeout(eventTimer);
    eventTimer = window.setTimeout(() => {
      if (!running) return;
      spawnFeature();
      scheduleEvent(randRange([5500, 10000]));
    }, delay);
  }

  function start() {
    if (!field || running) return;
    running = true;
    scheduleWeather(1400);
    scheduleEvent(1900);
    window.clearTimeout(seasonTimer);
    seasonTimer = window.setTimeout(cycleSeason, 36000);
  }

  function stop() {
    running = false;
    window.clearTimeout(seasonTimer);
    window.clearTimeout(weatherTimer);
    window.clearTimeout(weatherEndTimer);
    window.clearTimeout(eventTimer);
    seasonTimer = 0;
    weatherTimer = 0;
    weatherEndTimer = 0;
    eventTimer = 0;
    if (weatherLayer) weatherLayer.replaceChildren();
    if (ambientLayer) ambientLayer.replaceChildren();
  }

  function init() {
    field = document.getElementById("field");
    ambientLayer = document.getElementById("ambientLayer");
    weatherLayer = document.getElementById("weatherLayer");
    if (!field || !ambientLayer || !weatherLayer) return;

    setSeason(currentSeasonFromMonth());

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    start();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
    window.addEventListener("beforeunload", stop);
  }

  const api = {
    SEASONS,
    FEATURES,
    ELEMENTS,
    WEATHERS,
    start,
    stop,
    setSeason,
    spawnElementById: (id) => spawnElement(ELEMENTS.find((item) => item.id === id)),
    runWeatherById: (id) => runWeather(WEATHERS.find((item) => item.id === id), false),
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PiuAmbient = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
