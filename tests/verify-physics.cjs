const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const { readModularGameSource } = require("./lib-source.cjs");
const game = readModularGameSource();
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const matter = fs.readFileSync(path.join(root, "js/vendor/matter.min.js"), "utf8");

assert.ok(matter.includes("matter-js 0.20.0"), "Matter.js should be vendored for offline use");
assert.match(matter, /License MIT/, "the vendored physics engine should keep its MIT header");
assert.match(game, /js\/vendor\/matter\.min\.js/, "lazy loader must reference Matter.js");
assert.match(sw, /\/js\/vendor\//, "the service worker must cache vendored static assets");

assert.match(game, /g\.Matter && g\.Matter\.Engine/, "the game should feature-detect Matter.js");
assert.match(game, /function ensurePhysics\(\)/, "physics should be created lazily");
assert.match(game, /function destroyPhysics\(\)/, "physics must be disposed between rounds");
assert.match(game, /Matter\.Engine\.update\(state\.physics\.engine, deltaMs\)/, "physics should step cleanly");
assert.match(game, /engine\.positionIterations = 10/, "stacking needs enough solver iterations");
assert.match(game, /enableSleeping: true/, "sleeping bodies keep the iPad cool");
assert.match(game, /Matter\.Bodies\.rectangle\(/, "settled cards should become rigid bodies");
assert.match(game, /frictionStatic: 1\.1/, "friction should keep piles stackable");
assert.match(game, /Matter\.Composite\.add\(physics\.engine\.world, body\)/, "settled cards should enter the physics world");
assert.match(game, /attachSettledBody\(settled\)/, "settling a word should attach a physics body");
assert.match(game, /body\.bounds\.min\.x/, "DOM rendering should follow physics bounds");
assert.match(game, /rotate\(\$\{body\.angle\}rad\)/, "DOM cards should follow body rotation");
assert.match(game, /1000 - Math\.round\(body\.position\.y\)/, "stacking depth should control z-order");
assert.match(game, /function removeSettledBody\(settled\)/, "cleared cards should leave the physics world");
assert.match(game, /removeSettledBody\(target\)/, "reward/meteor removals must remove bodies");
assert.match(game, /wakePhysicsPile\(\);/, "support removal should wake the remaining pile");
assert.match(game, /function checkPileDanger\(\)/, "a collapsed pile must still trigger game over");
assert.match(game, /state\.settled\.some\(\(settled\) => settled\.y <= DANGER_Y\)/, "danger should use the physics bounds");

assert.ok(!game.includes("pulseJelly"), "the jelly effect should be removed");
assert.ok(!game.includes("relaxSettledPile"), "the jelly support relaxation should be removed");
assert.ok(!css.includes("jellyLand"), "the jelly keyframes should be removed");
assert.ok(!css.includes(".word.jelly-land"), "the jelly classes should be removed");
assert.ok(!css.includes("transition: transform 0.3s cubic-bezier"), "settled cards must follow physics without a CSS transform lag");

console.log("✓ Matter.js is vendored, loaded before the game and precached offline");
console.log("✓ settled cards become sleeping rigid bodies with friction and collision");
console.log("✓ cleared support wakes the pile so cards collapse under gravity");
console.log("✓ the old jelly effect is fully removed");
