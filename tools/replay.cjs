"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Levels = require("../js/levels.js");
const Replay = require("../js/replay.js");
const root = path.join(__dirname, "..");

function check(pack, filename, levelId) {
  const replay = Replay.parseReplay(fs.readFileSync(filename, "utf8"), filename);
  if (levelId && replay.levelId !== levelId) throw new Error(`${filename}: Falsche Level-ID; erwartet ${levelId}.`);
  const result = Replay.play(pack, replay);
  console.log(`SIEG ${replay.packId}/${replay.levelId}: ${result.ticks} Ticks, ${result.remainingSeconds.toFixed(1)} Sekunden Restzeit, ${result.state.score} Punkte.`);
}

try {
  const args = process.argv.slice(2);
  if (args.length === 2) {
    const pack = Levels.parsePack(fs.readFileSync(args[0], "utf8"), args[0]);
    check(pack, args[1]);
  } else if (args.length === 0) {
    const files = fs.readdirSync(path.join(root, "levels")).filter((name) => name.endsWith(".json")).sort();
    if (!files.length) throw new Error("Keine mitgelieferten Levelpacks gefunden.");
    for (const name of files) {
      const pack = Levels.parsePack(fs.readFileSync(path.join(root, "levels", name), "utf8"), name);
      for (const level of pack.levels) {
        const filename = path.join(root, "replays", pack.id, `${level.id}.json`);
        check(pack, filename, level.id);
      }
    }
  } else {
    throw new Error("Aufruf: node tools/replay.cjs [PACK.json REPLAY.json]");
  }
} catch (error) {
  console.error(`Replay-Prüfung fehlgeschlagen: ${error.message}`);
  process.exitCode = 1;
}
