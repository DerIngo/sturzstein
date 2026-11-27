"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const Sim = require("../js/simulation.js");
const Replay = require("../js/replay.js");
const pack = require("../levels/einstieg.json");
const solution = require("../replays/sturzstein-einstieg/erste-schritte.json");
const root = path.join(__dirname, "..");

test("Beispielreplay erreicht den Sieg mit berichteten Ticks und Restzeit", () => {
  const { state, ticks, remainingSeconds } = Replay.play(pack, solution);
  assert.equal(state.status, "won");
  assert.equal(ticks, 38);
  assert.equal(remainingSeconds, 116.2);
  assert.equal(state.collected, 3);
});

test("Aufzeichnung, JSON-Rundlauf und wiederholte Wiedergabe stimmen an jeder Tickgrenze vollständig überein", () => {
  const source = structuredClone(pack);
  const recorder = new Replay.Recorder(pack, solution.levelId);
  const state = Sim.createState(pack, solution.levelId);
  const snapshots = [];
  for (const input of [
    { ticks: 3, direction: null, grab: false },
    { ticks: 1, direction: "right", grab: true },
    ...solution.inputs,
  ]) {
    for (let tick = 0; tick < input.ticks; tick++) {
      const command = recorder.record({ direction: input.direction, grab: input.grab, rewind: false });
      Sim.step(state, command);
      snapshots.push(structuredClone(state));
    }
  }
  assert.equal(recorder.ticks, snapshots.length);
  assert.deepEqual(recorder.replay.inputs[0], { ticks: 3, direction: null, grab: false });
  const replay = Replay.parseReplay("\uFEFF" + Replay.stringifyReplay(recorder.replay));
  assert.deepEqual(replay, recorder.replay);
  for (let run = 0; run < 3; run++) {
    let tick = 0;
    const result = Replay.play(pack, replay, { onTick(actual) { assert.deepEqual(actual, snapshots[tick++]); } });
    assert.equal(tick, snapshots.length);
    assert.deepEqual(result.state, state);
  }
  assert.deepEqual(pack, source);
});

test("Pack-/Levelidentität, Revision, Regelversion und Anfangsseed werden nicht still ersetzt", () => {
  for (const [field, value, message] of [
    ["packId", "anderes-pack", /Pack-ID/],
    ["levelId", "fehlt", /Unbekanntes Level/],
    ["levelRevision", 2, /levelRevision.*inkompatibel/],
    ["ruleVersion", 2, /ruleVersion.*Version/],
    ["formatVersion", 3, /formatVersion.*Version/],
    ["seed", 0, /seed.*inkompatibel/],
  ]) {
    assert.throws(() => Replay.play(pack, { ...solution, [field]: value }), message);
  }
  const extended = structuredClone(pack);
  extended.revision++;
  extended.levels.unshift({ ...extended.levels[0], id: "zweites-level" });
  assert.deepEqual(Replay.play(extended, solution), Replay.play(pack, solution));
});

test("Ungültige Replaydaten und übergroße Eingaben liefern genaue Fehler", () => {
  for (const [change, message] of [
    [{ surprise: true }, /Unbekanntes Feld/],
    [{ packId: "../pack" }, /packId.*ID/],
    [{ inputs: {} }, /inputs/],
    [{ inputs: [{ ticks: 0, direction: null, grab: false }] }, /ticks/],
    [{ inputs: [{ ticks: 1.5, direction: null, grab: false }] }, /ticks/],
    [{ inputs: [{ ticks: 1, direction: "diagonal", grab: false }] }, /direction/],
    [{ inputs: [{ ticks: 1, direction: null, grab: 0 }] }, /grab/],
    [{ inputs: [{ ticks: 1, direction: null, grab: false, rewind: true }] }, /Unbekanntes Feld/],
    [{ inputs: [{ ticks: 36000, direction: null, grab: false }, { ticks: 1, direction: null, grab: false }] }, /überschreitet/],
    [{ seed: 4294967296 }, /seed/],
  ]) assert.throws(() => Replay.validateReplay({ ...solution, ...change }), message);
  assert.throws(() => Replay.parseReplay("{}", "defekt.json"), /defekt.json.*Pflichtfeld/);
  assert.throws(() => Replay.parseReplay("{", "defekt.json"), /defekt.json.*JSON/);
  assert.throws(() => Replay.parseReplay(" ".repeat(Replay.limits.bytes + 1)), /4 MiB/);
  const recorder = new Replay.Recorder(pack, solution.levelId);
  assert.throws(() => recorder.record({ direction: "diagonal", grab: false }), /Tick-Eingabe/);
  assert.equal(recorder.ticks, 0);
  for (let tick = 0; tick < 1200; tick++) recorder.record({ direction: null, grab: false });
  assert.throws(() => recorder.record({ direction: null, grab: false }), /Maximale Tickzahl/);
});

test("Abbruch, Niederlage, Zeitablauf und Eingaben nach Spielende sind keine gültigen Lösungen", () => {
  const idle = (ticks) => ({ ...solution, inputs: [{ ticks, direction: null, grab: false }] });
  assert.throws(() => Replay.play(pack, { ...solution, inputs: [] }), /Kein Sieg.*0 Ticks/);
  assert.throws(() => Replay.play(pack, idle(1)), /Kein Sieg.*Eingaben enden/);
  assert.throws(() => Replay.play(pack, idle(1200)), /Zeit ist abgelaufen/);
  assert.throws(() => Replay.play(pack, idle(1201)), /Levelzeitlimit/);
  const loss = { ...solution, inputs: [
    { ticks: 1, direction: "right", grab: false }, { ticks: 4, direction: "down", grab: false },
    { ticks: 1, direction: "right", grab: false }, { ticks: 1, direction: "down", grab: false },
    { ticks: 1, direction: null, grab: false },
  ] };
  assert.throws(() => Replay.play(pack, loss), /fallender Fels/);
  for (const replay of [solution, loss]) {
    assert.throws(() => Replay.play(pack, { ...replay, inputs: [...replay.inputs, idle(1).inputs[0]] }), /Überzählige Eingaben/);
  }
  assert.equal(Replay.play(pack, idle(1), { requireWin: false }).state.status, "playing");
  assert.equal(Replay.play(pack, loss, { requireWin: false }).state.status, "lost");
});

test("CLI prüft alle Beispiele oder ein Dateipaar; Fehler ergeben Exitstatus 1", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "sturzstein-replay-"));
  const filename = path.join(directory, "test.json");
  t.after(() => { fs.rmSync(filename, { force: true }); fs.rmdirSync(directory); });
  const run = (args) => spawnSync(process.execPath, ["tools/replay.cjs", ...args], { cwd: root, encoding: "utf8", timeout: 10000 });
  const all = run([]);
  assert.equal(all.status, 0, all.stderr);
  assert.match(all.stdout, /SIEG.*38 Ticks.*116\.2 Sekunden Restzeit/);
  fs.writeFileSync(filename, JSON.stringify(solution));
  assert.equal(run(["levels/einstieg.json", filename]).status, 0);
  for (const value of [
    { ...solution, formatVersion: 3 },
    { ...solution, inputs: [] },
    { ...solution, inputs: [{ ticks: 1200, direction: null, grab: false }] },
  ]) {
    fs.writeFileSync(filename, JSON.stringify(value));
    const result = run(["levels/einstieg.json", filename]);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Replay-Prüfung fehlgeschlagen/);
    assert.doesNotMatch(result.stdout, /SIEG/);
  }
  fs.writeFileSync(filename, "{");
  assert.equal(run(["levels/einstieg.json", filename]).status, 1);
  assert.equal(run(["levels/einstieg.json", path.join(directory, "fehlt.json")]).status, 1);
  assert.equal(run(["nur-ein-argument"]).status, 1);
});

test("Replayformat 2 kennzeichnet Rückspulen; Format 1 wird ohne Rückspulen übernommen", () => {
  const legacy = Replay.validateReplay(solution);
  assert.equal(legacy.formatVersion, 2);
  assert.equal(legacy.usedRewind, false);
  assert.deepEqual(Replay.play(pack, legacy), Replay.play(pack, solution));
  assert.throws(() => Replay.validateReplay({ ...solution, formatVersion: 2 }), /usedRewind.*Pflichtfeld/);
  assert.throws(() => Replay.validateReplay({ ...legacy, usedRewind: "false" }), /usedRewind.*Boolescher/);
  const assisted = { ...legacy, usedRewind: true };
  assert.equal(Replay.play(pack, assisted).usedRewind, true);
  assert.equal(Replay.parseReplay(Replay.stringifyReplay(assisted)).usedRewind, true);
});
