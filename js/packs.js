(function (root) {
  "use strict";
  const Levels = root.Sturzstein?.Levels ?? require("./levels.js");
  const limits = Object.freeze({ packs: 20, bytes: 2 * 1024 * 1024, cells: 131072 });
  function validateCollection(values, builtins) {
    if (!Array.isArray(values) || values.length > limits.packs) throw new Error("Sammlung: Höchstens 20 Zusatzpacks erlaubt.");
    const ids = new Set(builtins.map((pack) => pack.id));
    const packs = values.map((value) => {
      const pack = Levels.validatePack(value, "Gespeichertes Zusatzpack");
      if (ids.has(pack.id)) throw new Error("Sammlung: Doppelte oder integrierte Pack-ID.");
      ids.add(pack.id);
      return pack;
    });
    const cells = packs.reduce((sum, pack) => sum + pack.levels.reduce((n, level) => n + level.width * level.height, 0), 0);
    if (cells > limits.cells || new TextEncoder().encode(JSON.stringify(packs)).length > limits.bytes) {
      throw new Error("Sammlung: Höchstens 131.072 Zellen und 2 MiB Zusatzpackdaten erlaubt.");
    }
    return packs;
  }
  function replacement(previous, next) {
    if (next.revision < previous.revision) throw new Error("Packrevision darf nicht sinken.");
    if (JSON.stringify(previous) !== JSON.stringify(next) && next.revision === previous.revision) {
      throw new Error("Geändertes Pack benötigt eine höhere Packrevision.");
    }
    for (const old of previous.levels) {
      const level = next.levels.find((entry) => entry.id === old.id);
      if (!level) continue;
      if (level.revision < old.revision) throw new Error(`Level ${old.id}: Revision darf nicht sinken.`);
      if (level.revision === old.revision && JSON.stringify(level) !== JSON.stringify(old)) {
        throw new Error(`Level ${old.id}: Geänderter Inhalt benötigt eine höhere Levelrevision.`);
      }
    }
  }
  function compatible(old, next) {
    return next && JSON.stringify(old) === JSON.stringify(next);
  }
  const api = Object.freeze({ limits, validateCollection, replacement, compatible });
  (root.Sturzstein ??= {}).Packs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
