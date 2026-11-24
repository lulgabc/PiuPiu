const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

const MODULE_DIRS = [
  "js/core",
  "js/data",
  "js/modes",
  "js/systems",
  "js/ui",
];

function readModularGameSource() {
  const parts = [];
  const mainPath = path.join(ROOT, "js/main.js");
  if (fs.existsSync(mainPath)) {
    parts.push(`// === js/main.js ===\n${fs.readFileSync(mainPath, "utf8")}`);
  }
  for (const relDir of MODULE_DIRS) {
    const absDir = path.join(ROOT, relDir);
    if (!fs.existsSync(absDir)) continue;
    const files = fs.readdirSync(absDir).filter((f) => f.endsWith(".js")).sort();
    for (const file of files) {
      parts.push(`// === ${relDir}/${file} ===\n${fs.readFileSync(path.join(absDir, file), "utf8")}`);
    }
  }
  return parts.join("\n\n");
}

module.exports = { readModularGameSource };
