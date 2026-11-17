const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ambient = require("../js/ambient.js");

const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../css/style.css"), "utf8");

const { SEASONS, FEATURES, ELEMENTS, WEATHERS } = ambient;
const KINDS = ["fly", "walk", "swim", "space", "sky", "bloom"];
const VALID_SEASONS = new Set([...SEASONS, "any"]);
const ALLOWED_SIZES = (pair, id) => {
  assert.ok(Array.isArray(pair) && pair.length === 2, `${id} needs a two-value range`);
  const [min, max] = pair;
  assert.ok(Number.isFinite(min) && Number.isFinite(max), `${id} range must be numeric`);
  assert.ok(min > 0 && min <= max, `${id} range must be positive and ordered`);
};

// ---------- seasons ----------
assert.deepEqual(
  SEASONS.slice().sort(),
  ["autumn", "spring", "summer", "winter"],
  "four seasons expected",
);

// ---------- catalog size ----------
assert.ok(
  ELEMENTS.length >= 50,
  `expected at least 50 ambient elements, got ${ELEMENTS.length}`,
);
assert.ok(
  WEATHERS.length >= 15,
  `expected at least 15 weather types, got ${WEATHERS.length}`,
);
assert.ok(
  ELEMENTS.length + WEATHERS.length >= 65,
  "combined ambient catalog should be rich",
);

const elementIds = new Set();
for (const element of ELEMENTS) {
  assert.match(element.id, /^[a-z][a-z0-9-]*$/, `bad element id: ${element.id}`);
  assert.ok(!elementIds.has(element.id), `duplicate element id: ${element.id}`);
  elementIds.add(element.id);

  assert.equal(typeof element.emoji, "string", `${element.id} needs an emoji`);
  assert.match(element.emoji, /\p{Extended_Pictographic}/u, `${element.id} emoji is invalid`);
  assert.ok(FEATURES.includes(element.feature), `${element.id} has unknown feature`);
  assert.ok(KINDS.includes(element.kind), `${element.id} has unknown kind`);
  assert.ok(Array.isArray(element.seasons) && element.seasons.length > 0, `${element.id} needs seasons`);
  for (const season of element.seasons) {
    assert.ok(VALID_SEASONS.has(season), `${element.id} has invalid season ${season}`);
  }
  ALLOWED_SIZES(element.size, element.id);
  ALLOWED_SIZES(element.group, element.id);
  ALLOWED_SIZES(element.duration, element.id);
  assert.ok(element.group[1] <= 6, `${element.id} group is too large`);
  if (element.special) assert.equal(element.special, "ufo", `${element.id} has unknown special`);
}

// every feature group must have life in it
for (const feature of FEATURES) {
  const count = ELEMENTS.filter((element) => element.feature === feature).length;
  assert.ok(count >= 3, `feature ${feature} only has ${count} elements`);
}

// the requested families are definitely represented
for (const feature of ["birds", "land", "ocean", "space", "blooms", "sky", "garden"]) {
  assert.ok(FEATURES.includes(feature), `missing feature group: ${feature}`);
}
assert.ok(ELEMENTS.some((element) => element.kind === "swim"), "ocean swimmers missing");
assert.ok(ELEMENTS.some((element) => element.kind === "fly"), "flying animals missing");
assert.ok(ELEMENTS.some((element) => element.kind === "bloom"), "flowers missing");
assert.ok(ELEMENTS.some((element) => element.feature === "space" && element.special === "ufo"), "UFO visit missing");
assert.ok(
  ELEMENTS.some((element) => element.emoji === "👽"),
  "aliens missing",
);

// ---------- weather ----------
const weatherIds = new Set();
for (const item of WEATHERS) {
  assert.match(item.id, /^[a-z][a-z0-9-]*$/, `bad weather id: ${item.id}`);
  assert.ok(!weatherIds.has(item.id), `duplicate weather id: ${item.id}`);
  weatherIds.add(item.id);
  assert.equal(item.kind, item.id, `${item.id} must animate with its own kind`);
  assert.ok(Array.isArray(item.seasons) && item.seasons.length > 0, `${item.id} needs seasons`);
  for (const season of item.seasons) {
    assert.ok(VALID_SEASONS.has(season), `${item.id} has invalid season ${season}`);
  }
  ALLOWED_SIZES(item.duration, item.id);
}

for (const kind of ["rain", "snow", "wind", "thunder", "fog", "hail", "frost", "aurora", "rainbow"]) {
  assert.ok(weatherIds.has(kind), `missing weather type: ${kind}`);
}

// ---------- wiring ----------
for (const id of ["ambientLayer", "weatherLayer", "field"]) {
  assert.match(html, new RegExp(`id="${id}"`), `index.html is missing #${id}`);
}
assert.match(html, /season-wash/, "index.html is missing the season wash layer");
assert.match(html, /js\/ambient\.js/, "index.html does not load the ambient script");
assert.match(css, /\.ambient-layer/, "css is missing ambient layer styling");
assert.match(css, /\.weather-layer/, "css is missing weather layer styling");
assert.match(css, /prefers-reduced-motion[\s\S]*ambient-layer/, "reduced motion must hide ambient life");

// ---------- runtime API ----------
for (const name of ["start", "stop", "setSeason", "spawnElementById", "runWeatherById"]) {
  assert.equal(typeof ambient[name], "function", `ambient API is missing ${name}()`);
}
assert.equal(typeof ambient.setSeason("summer"), "undefined", "setSeason should stay DOM-free in Node");

console.log(`✓ ${ELEMENTS.length} ambient elements across ${FEATURES.length} feature groups`);
console.log(`✓ ${WEATHERS.length} weather types (rain, snow, wind, thunder, fog, aurora …)`);
console.log(`✓ ${elementIds.size + weatherIds.size} unique visual definitions (≥ 50 required)`);
console.log("✓ every element has a valid emoji, feature, kind and season");
console.log("✓ birds, land animals, ocean life, aliens/UFO and flowers are all represented");
console.log("✓ ambient layers are wired into the markup, CSS and reduced-motion rules");
