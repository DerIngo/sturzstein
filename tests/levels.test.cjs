"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { parsePack, validatePack } = require("../js/levels.js");
const original = require("../levels/einstieg.json");
const copy = () => structuredClone(original);

test("normalisiert ein eigenes Pack ohne die Quelle zu verändern; Quote kann höher als Startbestand sein", () => {
  const pack = copy();
  pack.levels[0].quota = 200;
  const result = parsePack(JSON.stringify(pack), "beispiel.json");
  assert.equal(result.levels[0].parameters.amoebaGrowthTicks, 10);
  assert.equal(result.levels[0].quota, 200);
  assert.equal(pack.levels[0].parameters, undefined);
  result.levels[0].map[1] = "anders";
  assert.equal(pack.levels[0].map[1], original.levels[0].map[1]);
});

for (const [name, change, error] of [
  ["Version", (p) => { p.formatVersion = 2; }, /formatVersion/],
  ["Regelversion", (p) => { p.levels[0].ruleVersion = 2; }, /ruleVersion/],
  ["doppelte ID", (p) => { p.levels.push(structuredClone(p.levels[0])); }, /Doppelte Level-ID/],
  ["Rasterbreite", (p) => { p.levels[0].map[1] += "."; }, /map\[1\]/],
  ["Kartenrand", (p) => { p.levels[0].map[0] = "." + p.levels[0].map[0].slice(1); }, /Zeile 1, Spalte 1.*Kartenrand/],
  ["unbekanntes Zeichen", (p) => { p.levels[0].map[1] = p.levels[0].map[1].replace(".", "?"); }, /Unbekanntes Symbol/],
  ["zweiter Start", (p) => { p.levels[0].map[1] = p.levels[0].map[1].replace(".", "@"); }, /Genau ein Start/],
  ["fehlender Ausgang", (p) => { p.levels[0].map[9] = p.levels[0].map[9].replace("X", "."); }, /Genau ein Start/],
  ["NaN", (p) => { p.levels[0].seed = NaN; }, /seed/],
  ["falscher Parameter", (p) => { p.levels[0].parameters = { magicWallTicks: 0 }; }, /magicWallTicks/],
  ["Wachstumstakt", (p) => { p.levels[0].parameters = { amoebaGrowthTicks: 601 }; }, /amoebaGrowthTicks/],
  ["Wachstumsgrenze", (p) => { p.levels[0].parameters = { amoebaMaxCells: 0 }; }, /amoebaMaxCells/],
  ["unbekanntes Feld", (p) => { p.levels[0].timelimit = 40; }, /Unbekanntes Feld/],
  ["null statt Parameter", (p) => { p.levels[0].parameters = null; }, /Objekt erwartet/],
  ["zu viele Level", (p) => { p.levels = Array(101).fill(p.levels[0]); }, /100 Level/],
  ["zu große Karte", (p) => { p.levels[0].width = 129; }, /width/],
]) {
  test(`weist ${name} mit Herkunft zurück`, () => {
    const pack = copy();
    change(pack);
    assert.throws(() => validatePack(pack, "probe.json"), (e) => /probe.json/.test(e.message) && error.test(e.message));
  });
}

test("begrenzt gesamte Kartenzellen vor Rastervalidierung", () => {
  const pack = copy();
  const level = pack.levels[0];
  level.width = level.height = 128;
  level.map = Array.from({ length: 128 }, (_, y) => y === 0 || y === 127 ? "#".repeat(128) : "#" + ".".repeat(126) + "#");
  level.map[1] = "#@X" + ".".repeat(124) + "#";
  pack.levels = Array.from({ length: 5 }, (_, i) => ({ ...structuredClone(level), id: `level-${i}` }));
  assert.throws(() => validatePack(pack), /Kartenzellen/);
});

test("begrenzt UTF-8-Bytes und meldet JSON-Fehler", () => {
  assert.throws(() => parsePack(" ".repeat(1048577)), /1 MiB/);
  assert.throws(() => parsePack("ä".repeat(600000)), /1 MiB/);
  assert.throws(() => parsePack("{", "defekt.json"), /defekt.json.*Ungültiges JSON/);
  assert.equal(parsePack("\uFEFF" + JSON.stringify(original)).id, original.id);
});
