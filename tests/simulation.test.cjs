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

function arena(placements) {
  const map = Array.from({ length: 9 }, (_, y) => Array.from({ length: 9 }, (_, x) =>
    x === 0 || y === 0 || x === 8 || y === 8 ? "#" : "."));
  for (const [x, y, symbol] of [[1, 1, "@"], [7, 7, "X"], ...placements]) map[y][x] = symbol;
  return state(map.map((row) => row.join("")), { quota: 0 });
}

test("Beide Wandfolgen respektieren alle Startorientierungen und vier Prioritäten; eingesperrte Gegner drehen nicht", () => {
  for (const [symbol, order] of [
    ["u", ["left", "up", "right", "down"]], ["r", ["up", "right", "down", "left"]],
    ["d", ["right", "down", "left", "up"]], ["l", ["down", "left", "up", "right"]],
    ["U", ["right", "up", "left", "down"]], ["R", ["down", "right", "up", "left"]],
    ["D", ["left", "down", "right", "up"]], ["L", ["up", "left", "down", "right"]],
  ]) {
    for (let blocked = 0; blocked <= 4; blocked++) {
      const placements = order.slice(blocked).map((direction) => {
        const [dx, dy] = Sim.directions[direction];
        return [4 + dx, 4 + dy, " "];
      });
      const s = arena([[4, 4, symbol], ...placements]);
      const initial = structuredClone(cell(s, 4, 4));
      go(s);
      const index = s.board.findIndex((entry) => entry.id === initial.id);
      const direction = order[blocked] || initial.direction;
      const [dx, dy] = blocked < 4 ? Sim.directions[direction] : [0, 0];
      assert.equal(index, (4 + dy) * s.width + 4 + dx, `${symbol}, ${blocked} blockiert`);
      assert.equal(s.board[index].direction, direction);
    }
  }
});

test("Nur orthogonaler Gegnerkontakt explodiert: nach Spieleraktion und nach Gegnerbewegung", () => {
  const diagonal = arena([[1, 1, "."], [2, 2, "@"], [3, 3, "u"]]);
  go(diagonal);
  assert.equal(diagonal.status, "playing");
  go(diagonal, "right");
  assert.equal(diagonal.status, "lost");
  assert.match(diagonal.reason, /Gegnerexplosion/);
  assert.equal(diagonal.board[diagonal.playerIndex].type, "explosion");
  const approaching = arena([[1, 1, "."], [2, 2, "@"], [3, 2, " "], [4, 2, "u"]]);
  go(approaching);
  assert.equal(approaching.status, "lost");
  const escaping = arena([[1, 1, "."], [2, 2, "@"], [3, 2, "U"], [4, 2, " "]]);
  go(escaping, "left");
  assert.equal(escaping.status, "playing");
});

for (const symbol of ["O", "*"]) test(`${symbol} explodiert nur beim fallenden Treffer; Stahl und Ausgang bleiben geschützt`, () => {
  const make = () => arena([[4, 3, symbol], [4, 4, "U"], [3, 3, "#"], [5, 3, "X"],
    [7, 7, "."], [3, 4, "+"], [5, 4, "*"], [4, 5, "O"], [5, 5, " "]]);
  const resting = make();
  go(resting);
  assert.equal(resting.board.filter(Sim.isEnemy).length, 1);
  assert.equal(resting.board.some((entry) => entry.type === "explosion"), false);
  const hit = make();
  cell(hit, 4, 3).falling = true;
  const steel = structuredClone(cell(hit, 3, 3));
  const exit = structuredClone(cell(hit, 5, 3));
  go(hit);
  assert.deepEqual(cell(hit, 3, 3), steel);
  assert.deepEqual(cell(hit, 5, 3), exit);
  for (const [x, y] of [[4, 3], [3, 4], [4, 4], [5, 4], [3, 5], [4, 5], [5, 5]]) {
    assert.equal(cell(hit, x, y).type, "explosion");
    assert.equal(cell(hit, x, y).result, "gem");
    assert.equal(cell(hit, x, y).remainingTicks, 3);
  }
});

test("Gemischte Kette und gleichzeitige Treffer: freies Ergebnis gewinnt; neue Edelsteine warten einen Tick", () => {
  const s = arena([[3, 3, "O"], [5, 3, "*"], [3, 4, "u"], [4, 4, "U"]]);
  cell(s, 3, 3).falling = cell(s, 5, 3).falling = true;
  go(s);
  assert.equal(s.board.filter(Sim.isEnemy).length, 0);
  assert.equal(s.board.filter((entry) => entry.type === "explosion").length, 12);
  for (let y = 3; y <= 5; y++) for (let x = 2; x <= 5; x++) {
    assert.equal(cell(s, x, y).result, x === 5 ? "gem" : "empty");
  }
  for (const remaining of [2, 1, 0]) {
    go(s);
    assert.equal(cell(s, 3, 4).type, "explosion");
    assert.equal(cell(s, 3, 4).remainingTicks, remaining);
  }
  go(s);
  for (let y = 3; y <= 5; y++) {
    assert.equal(cell(s, 4, y).type, "empty");
    assert.equal(cell(s, 5, y).type, "gem");
    assert.equal(cell(s, 5, y).falling, false);
  }
  const gem = cell(s, 5, 3).id;
  go(s);
  assert.equal(cell(s, 4, 4).id, gem);
});

test("Spätere Überlappungen verlängern keine Explosion und bevorzugen freies Ergebnis in beiden Reihenfolgen", () => {
  for (const symbols of [["u", "U"], ["U", "u"]]) {
    const s = arena([[3, 3, "O"], [5, 3, "O"], [3, 4, symbols[0]], [5, 4, symbols[1]]]);
    cell(s, 3, 3).falling = true;
    go(s);
    const overlap = structuredClone(cell(s, 4, 4));
    cell(s, 5, 3).falling = true;
    go(s);
    assert.equal(cell(s, 4, 4).id, overlap.id);
    assert.equal(cell(s, 4, 4).remainingTicks, 2);
    assert.equal(cell(s, 4, 4).result, "empty");
    assert.equal(cell(s, 5, 4).remainingTicks, 3);
  }
});

test("Explosionen respektieren Kartenrand und schützen die Figur im offenen Ausgang", () => {
  const edge = arena([[1, 1, "u"], [1, 2, "@"]]);
  const border = edge.board.map((entry) => structuredClone(entry));
  go(edge);
  assert.equal(edge.status, "lost");
  assert.equal(edge.board.length, border.length);
  border.forEach((entry, index) => {
    if (entry.type === "steel") assert.deepEqual(edge.board[index], entry);
  });
  const s = arena([[1, 1, "."], [3, 3, "@"], [4, 3, "X"], [7, 7, "."],
    [4, 4, "U"], [5, 4, "u"], [5, 3, "O"]]);
  cell(s, 5, 3).falling = true;
  go(s, "right");
  assert.equal(s.status, "won");
  assert.equal(s.board[s.exitIndex].type, "player");
  assert.equal(cell(s, 4, 4).type, "explosion");
});

test("Große Ketten werden ohne Rekursion vollständig und reproduzierbar abgewickelt", () => {
  const map = Array.from({ length: 40 }, (_, y) => y === 0 || y === 39
    ? "#".repeat(40) : "#" + "u".repeat(38) + "#");
  map[1] = "#@" + "u".repeat(37) + "#";
  map[38] = "#" + "u".repeat(37) + "X#";
  const a = state(map);
  const b = structuredClone(a);
  const nextId = a.nextId;
  go(a);
  go(b);
  assert.deepEqual(a, b);
  assert.equal(a.board.filter(Sim.isEnemy).length, 0);
  assert.equal(a.board.filter((entry) => entry.type === "explosion").length, 38 * 38 - 1);
  assert.equal(a.nextId - nextId, 38 * 38 - 1);
});

test("Neue Höhlen starten ungefährlich und erlauben sicheres Warten am Auslösepunkt in jeder Patrouillenphase", () => {
  for (const levelId of ["glutkaefer-tor", "kristallkette"]) {
    const solution = require(`../replays/sturzstein-einstieg/${levelId}.json`);
    for (let delay = 0; delay < 8; delay++) {
      const s = Sim.createState(original, levelId);
      for (let tick = 0; tick < 80 + delay; tick++) go(s);
      assert.equal(s.status, "playing");
      for (const input of solution.inputs.slice(0, 4)) {
        for (let tick = 0; tick < input.ticks; tick++) go(s, input.direction, input.grab);
      }
      for (let tick = 0; tick < 30; tick++) go(s);
      assert.equal(s.status, "playing", `${levelId}, Patrouillenphase ${delay}`);
      assert.equal(s.playerIndex, 2 * s.width + 6);
    }
  }
});
