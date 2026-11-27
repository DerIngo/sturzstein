(function (root) {
  "use strict";

  const limits = Object.freeze({ bytes: 1048576, levels: 100, side: 128, cells: 65536 });
  const symbols = " .#+@O*XurdlURDLAM";
  const supported = " .#+@O*XurdlURDL";
  const defaults = Object.freeze({ amoebaGrowthTicks: 10, amoebaMaxCells: 200, magicWallTicks: 200 });

  function validatePack(value, source = "Levelpack") {
    function fail(path, message) {
      throw new Error(`${source}: ${path}: ${message}`);
    }
    function object(item, path, required, optional = []) {
      if (!item || typeof item !== "object" || Array.isArray(item)) fail(path, "Objekt erwartet.");
      for (const key of required) {
        if (!Object.hasOwn(item, key)) fail(`${path}.${key}`, "Pflichtfeld fehlt.");
      }
      for (const key of Object.keys(item)) {
        if (!required.includes(key) && !optional.includes(key)) fail(`${path}.${key}`, "Unbekanntes Feld.");
      }
    }
    function integer(number, path, min, max) {
      if (!Number.isInteger(number) || number < min || number > max) {
        fail(path, `Ganze Zahl zwischen ${min} und ${max} erwartet.`);
      }
      return number;
    }
    function text(string, path, max = 500) {
      if (typeof string !== "string" || !string.trim() || string.length > max) {
        fail(path, `Nicht leerer Text mit höchstens ${max} Zeichen erwartet.`);
      }
      return string;
    }
    function id(string, path) {
      text(string, path, 64);
      if (!/^[a-z0-9][a-z0-9-]*$/.test(string)) fail(path, "Ungültige ID.");
      return string;
    }
    function version(number, path) {
      if (number !== 1) fail(path, "Nicht unterstützte Version; erwartet wird 1.");
      return number;
    }
    object(value, "Pack", ["formatVersion", "id", "title", "author", "revision", "source", "license", "levels"]);
    const pack = {
      formatVersion: version(value.formatVersion, "Pack.formatVersion"),
      id: id(value.id, "Pack.id"),
      title: text(value.title, "Pack.title", 100),
      author: text(value.author, "Pack.author", 100),
      revision: integer(value.revision, "Pack.revision", 1, 2147483647),
      source: text(value.source, "Pack.source"),
      license: text(value.license, "Pack.license"),
      levels: [],
    };
    if (!Array.isArray(value.levels) || value.levels.length < 1 || value.levels.length > limits.levels) {
      fail("Pack.levels", `1 bis ${limits.levels} Level erwartet.`);
    }
    const ids = new Set();
    let cells = 0;
    for (const [position, raw] of value.levels.entries()) {
      const path = `Level ${position + 1}`;
      object(raw, path, ["id", "revision", "ruleVersion", "name", "description", "difficulty", "width", "height", "timeLimit", "quota", "seed", "map"], ["parameters"]);
      const levelId = id(raw.id, `${path}.id`);
      const label = `Level ${levelId}`;
      if (ids.has(levelId)) fail(label, "Doppelte Level-ID.");
      ids.add(levelId);
      const width = integer(raw.width, `${label}.width`, 5, limits.side);
      const height = integer(raw.height, `${label}.height`, 5, limits.side);
      cells += width * height;
      if (cells > limits.cells) fail(label, `Pack überschreitet ${limits.cells} Kartenzellen.`);
      const parameters = { ...defaults };
      if (Object.hasOwn(raw, "parameters")) {
        object(raw.parameters, `${label}.parameters`, [], Object.keys(defaults));
        for (const [key, maximum] of [["amoebaGrowthTicks", 600], ["amoebaMaxCells", 16384], ["magicWallTicks", 36000]]) {
          if (Object.hasOwn(raw.parameters, key)) {
            parameters[key] = integer(raw.parameters[key], `${label}.parameters.${key}`, 1, maximum);
          }
        }
      }
      const level = {
        id: levelId,
        revision: integer(raw.revision, `${label}.revision`, 1, 2147483647),
        ruleVersion: version(raw.ruleVersion, `${label}.ruleVersion`),
        name: text(raw.name, `${label}.name`, 100),
        description: text(raw.description, `${label}.description`),
        difficulty: integer(raw.difficulty, `${label}.difficulty`, 1, 5),
        width, height,
        timeLimit: integer(raw.timeLimit, `${label}.timeLimit`, 10, 3600),
        quota: integer(raw.quota, `${label}.quota`, 0, limits.cells),
        seed: integer(raw.seed, `${label}.seed`, 0, 4294967295),
        map: [],
        parameters,
      };
      if (!Array.isArray(raw.map) || raw.map.length !== height) fail(`${label}.map`, "Falsche Zeilenanzahl.");
      let starts = 0;
      let exits = 0;
      for (let y = 0; y < height; y++) {
        const row = raw.map[y];
        if (typeof row !== "string" || row.length !== width) fail(`${label}.map[${y}]`, `Genau ${width} Zeichen erwartet.`);
        for (let x = 0; x < width; x++) {
          const symbol = row[x];
          const cell = `${label}, Zeile ${y + 1}, Spalte ${x + 1}`;
          if (!symbols.includes(symbol)) fail(cell, `Unbekanntes Symbol ${JSON.stringify(symbol)}.`);
          if (!supported.includes(symbol)) fail(cell, `Mechanik ${JSON.stringify(symbol)} ist noch nicht implementiert.`);
          if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && symbol !== "#") {
            fail(cell, "Kartenrand muss vollständig aus Stahl (#) bestehen.");
          }
          if (symbol === "@") starts++;
          if (symbol === "X") exits++;
        }
        level.map.push(row);
      }
      if (starts !== 1 || exits !== 1) fail(label, "Genau ein Start (@) und ein Ausgang (X) erforderlich.");
      pack.levels.push(level);
    }
    return pack;
  }

  function parsePack(text, source = "Levelpack") {
    if (typeof text !== "string") throw new Error(`${source}: UTF-8-Text erwartet.`);
    if (text.length > limits.bytes || new TextEncoder().encode(text).length > limits.bytes) {
      throw new Error(`${source}: Datei überschreitet 1 MiB.`);
    }
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch (error) {
      throw new Error(`${source}: Ungültiges JSON: ${error.message}`);
    }
    return validatePack(parsed, source);
  }

  const api = Object.freeze({ parsePack, validatePack, limits, symbols });
  (root.Sturzstein ??= {}).Levels = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
