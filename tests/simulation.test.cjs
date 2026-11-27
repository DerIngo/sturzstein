"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Sim = require("../js/simulation.js");
const original = require("../levels/einstieg.json");

function state(map, changes = {}) {
  const pack = structuredClone(original);
  Object.assign(pack.levels[0], { width: map[0].length, height: map.length, map, quota: 1 }, changes);
  return Sim.createState(pack, pack.levels[0].id);
}
const go = (s, direction = null, grab = false) => Sim.step(s, { direction, grab });
const cell = (s, x, y) => s.board[y * s.width + x];

test("Bewegung, Graben, Sammeln und Ausgangsquote; Zustand ist komplett JSON-serialisierbar", () => {
  const s = state(["#######", "#@.*X.#", "#.....#", "#.....#", "#######"]);
  go(s, "right");
  assert.equal(s.playerIndex, 9);
  go(s, "right");
  assert.equal(s.score, 10);
  assert.equal(s.collected, 1);
  go(s, "right");
  assert.equal(s.status, "won");
  assert.equal(s.score, 129);
  const won = structuredClone(s);
  go(s, "left");
  assert.deepEqual(s, won);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});

test("Ausgang ist bei unzureichender Quote gesperrt; Graben bewegt die Figur nicht", () => {
  const s = state(["#######", "#@X...#", "#.*...#", "#.....#", "#######"]);
  go(s, "right");
  assert.equal(s.playerIndex, 8);
  go(s, "down", true);
  assert.equal(cell(s, 1, 2).type, "empty");
  assert.equal(s.playerIndex, 8);
  go(s, "down");
  go(s, "right", true);
  assert.equal(s.collected, 1);
  assert.equal(s.playerIndex, 15);
});

for (const symbol of ["O", "*"]) {
  test(`${symbol} fällt ohne Eingabe nur ein Feld pro Tick und stoppt auf flacher Unterlage`, () => {
    const s = state(["#######", `#@.${symbol}..#`, "#.. ..#", "#.. ..#", "#..+X.#", "#######"]);
    const id = cell(s, 3, 1).id;
    go(s);
    assert.equal(cell(s, 3, 2).id, id);
    go(s);
    assert.equal(cell(s, 3, 3).id, id);
    go(s);
    assert.equal(cell(s, 3, 3).id, id);
    assert.equal(cell(s, 3, 3).falling, false);
    assert.equal(s.remainingTicks, 1197);
  });
}

test("Ruhender Fels über der Figur ist ungefährlich; fallender Fels tötet", () => {
  const map = ["#######", "#..O..#", "#..@..#", "#....X#", "#######"];
  const s = state(map);
  go(s);
  assert.equal(s.status, "playing");
  const hit = state(map);
  cell(hit, 3, 1).falling = true;
  hit.remainingTicks = 1;
  go(hit);
  assert.equal(hit.status, "lost");
  assert.match(hit.reason, /Fels/);
  const terminal = structuredClone(hit);
  go(hit);
  assert.deepEqual(hit, terminal);
});

test("Figur kann vor dem fallenden Fels seitlich ausweichen", () => {
  const s = state(["#######", "#..O..#", "#..@..#", "#....X#", "#######"]);
  cell(s, 3, 1).falling = true;
  go(s, "right");
  assert.equal(s.status, "playing");
  assert.equal(cell(s, 3, 2).type, "rock");
});

test("Fallender Edelstein trifft ebenfalls; vorheriges Einsammeln ist möglich", () => {
  const map = ["#######", "#..*..#", "#..@..#", "#....X#", "#######"];
  const hit = state(map);
  cell(hit, 3, 1).falling = true;
  go(hit);
  assert.match(hit.reason, /Edelstein/);
  const saved = state(map);
  cell(saved, 3, 1).falling = true;
  go(saved, "up", true);
  assert.equal(saved.collected, 1);
  assert.equal(saved.status, "playing");
});

test("Abrollen bevorzugt links, braucht zwei freie Felder und verarbeitet nie zweimal", () => {
  const s = state(["########", "#@ O  .#", "#  O  .#", "#......#", "#....X.#", "########"]);
  const id = cell(s, 3, 1).id;
  go(s);
  assert.equal(cell(s, 2, 2).id, id);
  assert.equal(cell(s, 2, 2).falling, true);
  assert.equal(cell(s, 3, 2).type, "rock");
  const blocked = state(["########", "#@.O  .#", "# .O  .#", "#......#", "#....X.#", "########"]);
  go(blocked);
  assert.equal(cell(blocked, 4, 2).type, "rock");
});

for (const support of [".", "+", "#"]) {
  test(`Auf ${support} wird nicht abgerollt`, () => {
    const s = state(["#######", "#@ O  #", `#  ${support}  #`, "#....X#", "#######"]);
    go(s);
    assert.equal(cell(s, 3, 1).type, "rock");
    assert.equal(cell(s, 3, 1).falling, false);
  });
}

test("Schieben braucht zwei ununterbrochene Ticks; geschobener Fels fällt erst später", () => {
  const s = state(["#######", "#@O  .#", "#.. ..#", "#....X#", "#######"]);
  go(s, "right");
  assert.equal(s.playerIndex, 8);
  go(s);
  go(s, "right");
  assert.equal(s.playerIndex, 8);
  go(s, "right");
  assert.equal(s.playerIndex, 9);
  assert.equal(cell(s, 3, 1).type, "rock");
  assert.equal(cell(s, 3, 1).falling, false);
  go(s);
  assert.equal(cell(s, 3, 2).type, "rock");
});

test("Kein vertikales Schieben, Ziehen, Aktionsschieben oder Schieben durch Erde", () => {
  const map = ["#######", "#.O...#", "#.@O..#", "#....X#", "#######"];
  for (const [direction, grab] of [["up", false], ["right", false], ["right", true]]) {
    const s = state(map);
    go(s, direction, grab);
    go(s, direction, grab);
    assert.equal(s.playerIndex, 16);
  }
  const s = state(map);
  go(s, "left");
  assert.equal(cell(s, 3, 2).type, "rock");
});

test("Eine Warteschlange ruhender Objekte erhält die festgelegte Scanfolge", () => {
  const s = state(["#######", "#@.O..#", "#..O..#", "#.. ..#", "#....X#", "#######"]);
  const upper = cell(s, 3, 1).id;
  const lower = cell(s, 3, 2).id;
  go(s);
  assert.equal(cell(s, 3, 1).id, upper);
  assert.equal(cell(s, 3, 3).id, lower);
  go(s);
  assert.equal(cell(s, 3, 2).id, upper);
});

test("Zeitablauf gewinnt gegen Ausgangseintritt, Ausgang schützt vor fallendem Objekt", () => {
  const map = ["#######", "#.O...#", "#@X...#", "#.....#", "#######"];
  const s = state(map, { quota: 0 });
  cell(s, 2, 1).falling = true;
  s.remainingTicks = 2;
  go(s, "right");
  assert.equal(s.status, "won");
  const late = state(map, { quota: 0 });
  late.remainingTicks = 1;
  go(late, "right");
  assert.equal(late.status, "lost");
  assert.match(late.reason, /Zeit/);
});

test("Neustart und gleiche Eingaben sind reproduzierbar, Quelle bleibt unverändert", () => {
  const before = structuredClone(original);
  const a = Sim.createState(original, original.levels[0].id);
  const b = Sim.createState(original, original.levels[0].id);
  for (const direction of ["right", "right", "down", "down", null, "up", "left"]) {
    go(a, direction);
    go(b, direction);
    assert.deepEqual(a, b);
  }
  assert.deepEqual(original, before);
  assert.equal(Sim.createState(original, original.levels[0].id).tick, 0);
  assert.throws(() => go(a, "diagonal"), /Ungültige Tick-Eingabe/);
  assert.throws(() => Sim.createState(original, "fehlt"), /Unbekanntes Level/);
});

test("Zufall wird ausschließlich aus dem expliziten Zustand fortgesetzt, auch bei Seed 0", () => {
  const a = { rngState: 0 };
  assert.equal(Sim.nextRandom(a), 1013904223);
  const saved = JSON.parse(JSON.stringify(a));
  assert.equal(Sim.nextRandom(a), Sim.nextRandom(saved));
});

test("Kartenrand kann nicht betreten oder umgangen werden", () => {
  const s = state(["#######", "#@....#", "#.....#", "#....X#", "#######"]);
  go(s, "up");
  go(s, "left");
  assert.equal(s.playerIndex, 8);
});
