const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const store = new Map();
global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const profiles = require("../js/profiles.js");
const { translations } = require("../js/i18n.js");
const game = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");

assert.equal(profiles.MAX_NAME, 12);
assert.ok(profiles.AVATARS.length >= 6, "a child-friendly avatar palette is required");

// ---------- creation ----------
let list = [];
assert.deepEqual(profiles.create(list, "   ", "🦊"), { error: "empty" });
assert.equal(list.length, 0);

const mia = profiles.create(list, "  Mia  ", "🐼").profile;
assert.ok(mia && mia.id, "a profile needs an id");
assert.equal(mia.name, "Mia", "names should be trimmed");
assert.equal(mia.avatar, "🐼");
assert.equal(mia.total, 0);
assert.equal(mia.best, 0);
assert.equal(list.length, 1);

assert.deepEqual(profiles.create(list, "mia", "🐯"), { error: "duplicate" });
assert.equal(profiles.create(list, "", "🐯").error, "empty");
const longName = profiles.create([], "abcdefghijklmnop", "🐸").profile;
assert.equal(longName.name.length, 12, "names should be capped at 12 characters");

// ---------- points and rounds ----------
profiles.addPoints(list, mia.id, 30, 1);
profiles.addPoints(list, mia.id, 20, 1);
profiles.addPoints(list, mia.id, 0, 1);
assert.equal(mia.total, 50);
assert.equal(mia.correct, 2);
assert.equal(profiles.addPoints(list, "missing", 10), null);

profiles.finishRound(list, mia.id, 60);
assert.equal(mia.best, 60);
assert.equal(mia.rounds, 1);
profiles.finishRound(list, mia.id, 40);
assert.equal(mia.best, 60, "a lower round must not replace the best");
assert.equal(mia.rounds, 2);

const leo = profiles.create(list, "Leo", "🐯").profile;
profiles.addPoints(list, leo.id, 80, 3);
profiles.finishRound(list, leo.id, 70);
assert.deepEqual(profiles.rank(list).map((p) => p.name), ["Leo", "Mia"]);

// ---------- persistence ----------
assert.ok(profiles.save(list));
assert.deepEqual(profiles.load().map((p) => p.name), ["Mia", "Leo"]);
assert.equal(profiles.getActiveId(list), "");
profiles.setActiveId(leo.id);
assert.equal(profiles.getActiveId(list), leo.id);
profiles.setActiveId("missing");
assert.equal(profiles.getActiveId(list), "");

const stored = JSON.parse(store.get(profiles.KEY));
assert.equal(stored.length, 2);
assert.equal(stored[1].total, 80);

// Corrupt entries, duplicate ids/names and negative numbers must not break the app.
store.set(
  profiles.KEY,
  JSON.stringify([
    { id: "a", name: "Ava", total: -5, best: "x", avatar: "not-an-avatar" },
    { id: "a", name: "Copy", total: 3 },
    { id: "b", name: "ava", total: 9 },
    { id: "c", name: "", total: 1 },
    null,
    { id: "d", name: "Bo", total: "12", correct: 2, rounds: 1 },
  ]),
);
const cleaned = profiles.load();
assert.deepEqual(cleaned.map((p) => p.name), ["Ava", "Bo"]);
assert.equal(cleaned[0].total, 0);
assert.equal(cleaned[0].best, 0);
assert.ok(profiles.AVATARS.includes(cleaned[0].avatar), "bad avatars fall back to the palette");
assert.equal(cleaned[1].total, 12);

// ---------- deletion and migration options ----------
assert.deepEqual(profiles.remove(list, mia.id).map((p) => p.name), ["Leo"]);
assert.equal(profiles.create([], "Old best", "🦊", { best: 123 }).profile.best, 123);

// ---------- game wiring ----------
for (const key of [
  "player.title",
  "player.subtitle",
  "player.openAria",
  "player.create",
  "player.errorEmpty",
  "player.errorDuplicate",
  "player.created",
  "player.deleteConfirm",
  "player.need",
  "board.open",
  "board.title",
  "board.subtitle",
  "board.empty",
  "board.total",
  "board.best",
  "board.correct",
  "over.session",
]) {
  for (const lang of ["zh", "fr", "en"]) {
    assert.ok(translations[lang][key], `${key} missing from ${lang}`);
  }
}

assert.match(game, /window\.PiuProfiles/, "game.js must use the profile store");
assert.match(game, /addProfilePoints\(points\)/, "each cleared word adds to the player total");
assert.match(game, /Profiles\.addPoints\(state\.profiles, profile\.id, points, 1\)/, "profile points are recorded");
assert.match(game, /finishProfileRound\(\)/, "round best and count are recorded at the end");
assert.match(game, /state\.roundRecorded = true/, "a new round should arm score recording");
assert.match(game, /Profiles && !currentProfile\(\)/, "start should require a player");
assert.match(game, /player\.need/, "the missing-player message should be translated");
assert.match(game, /playerSheet|boardSheet/, "player and board sheets should be wired");
assert.match(game, /renderBoard\(\)/, "the leaderboard should render from profiles");
assert.match(game, /Profiles\.rank\(state\.profiles\)/, "leaderboard order comes from the shared rank helper");
assert.match(html, /id="playerBtn"/, "the start screen needs a player shortcut");
assert.match(html, /id="playerSheet"/, "the player picker dialog is required");
assert.match(html, /id="boardSheet"/, "the leaderboard dialog is required");
assert.match(html, /id="sessionTotal"/, "the end panel should show the running total");
assert.match(html, /js\/profiles\.js/, "index.html must load profiles.js");
assert.match(sw, /\.\/js\/profiles\.js/, "the service worker must precache profiles.js");

console.log("✓ profiles create, dedupe, accumulate points and record rounds");
console.log("✓ leaderboard ranks by total, then best, then name");
console.log("✓ corrupt storage is repaired and avatars fall back safely");
console.log("✓ player picker, leaderboard and running total are wired in three languages");
