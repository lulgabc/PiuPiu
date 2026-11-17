const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "pixi-demo.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/pixi-demo.css"), "utf8");
const js = fs.readFileSync(path.join(root, "js/pixi-ambient-demo.js"), "utf8");
const vendorPath = path.join(root, "js/vendor/pixi.min.js");
const licensePath = path.join(root, "js/vendor/pixi.LICENSE.txt");

assert.ok(fs.existsSync(vendorPath), "vendored PixiJS is missing");
const vendor = fs.readFileSync(vendorPath, "utf8");
assert.ok(vendor.length > 500_000, "vendored PixiJS looks truncated");
assert.ok(vendor.includes("PIXI="), "vendored PixiJS does not expose the PIXI global");
assert.ok(fs.existsSync(licensePath), "PixiJS license file is missing");
assert.match(fs.readFileSync(licensePath, "utf8"), /MIT License/i, "PixiJS license must stay MIT");

for (const href of ["css/pixi-demo.css", "js/vendor/pixi.min.js", "js/pixi-ambient-demo.js"]) {
  assert.ok(html.includes(href), `pixi-demo.html is missing ${href}`);
}
for (const id of ["stage", "dock", "autoBtn", "sceneTitle", "sceneKicker", "sceneDesc"]) {
  assert.match(html, new RegExp(`id="${id}"`), `pixi-demo.html is missing #${id}`);
}

for (const scene of ["spring", "summer", "autumn", "winter", "rain"]) {
  assert.match(js, new RegExp(`\\b${scene}:`), `missing Pixi scene: ${scene}`);
}
assert.match(js, /PIXI\.Application/, "demo must use a Pixi Application");
assert.match(js, /preference:\s*"webgl"/, "demo should request WebGL explicitly");
assert.match(js, /prefers-reduced-motion/, "demo should respect reduced motion");
assert.match(js, /blendMode\s*=\s*"add"/, "demo should use additive glow blending");
assert.doesNotMatch(
  js,
  /\p{Extended_Pictographic}/u,
  "the Pixi demo must stay free of emoji assets",
);

for (const marker of [".stage", ".dock", ".scene-btn", "prefers-reduced-motion"]) {
  assert.ok(css.includes(marker), `pixi-demo.css is missing ${marker}`);
}

console.log("✓ PixiJS 8 is vendored locally with its MIT license");
console.log("✓ preview page loads the stage, dock and scene controller");
console.log("✓ five procedural scenes are wired (spring, summer, autumn, winter, rain)");
console.log("✓ WebGL init, additive blending and reduced-motion handling are present");
console.log("✓ the Pixi preview contains no emoji assets");
