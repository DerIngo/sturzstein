"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parsePack } = require("../js/levels.js");
const root = path.join(__dirname, "..");
const files = fs.readdirSync(path.join(root, "levels")).filter((name) => name.endsWith(".json")).sort();
if (!files.length) throw new Error("Keine Levelpacks gefunden.");
const packs = files.map((name) => parsePack(fs.readFileSync(path.join(root, "levels", name), "utf8"), name));
if (new Set(packs.map((pack) => pack.id)).size !== packs.length) throw new Error("Doppelte Pack-ID.");
const contents = `"use strict";\n// Generiert mit npm run bundle; Quelldaten: levels/*.json.\n(globalThis.Sturzstein ??= {}).packs = ${JSON.stringify(packs, null, 2)};\n`;
const destination = path.join(root, "js", "level-bundle.js");
if (process.argv.includes("--check")) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, "utf8") !== contents) {
    throw new Error("Levelbundle fehlt oder ist veraltet. Bitte npm run bundle ausführen.");
  }
  console.log("Levelbundle entspricht den Quelldaten.");
} else {
  fs.writeFileSync(destination, contents);
  console.log(`${packs.length} Levelpack(s) gebündelt.`);
}
