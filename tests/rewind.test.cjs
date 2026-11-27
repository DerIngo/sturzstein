"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Sim = require("../js/simulation.js");
const Replay = require("../js/replay.js");
const { RewindHistory } = require("../js/rewind.js");
const pack = require("../levels/einstieg.json");
const solution = require("../replays/sturzstein-einstieg/erste-schritte.json");

function session(source = pack) {
  let state = Sim.createState(source, solution.levelId);
  const recorder = new Replay.Recorder(source, solution.levelId);
  const history = new RewindHistory(state);
  return {
    recorder, history, get state() { return state; },
    step(direction = null, grab = false) {
      const input = recorder.record({ direction, grab });
      Sim.step(state, input);
      history.push(state, input);
      return state;
    },
    back() {
      const restored = history.back();
      if (restored) {
        state = restored;
        recorder.truncate(state.tick);
      }
      return restored;
    },
  };
}

test("Vorwärts/rückwärts/vorwärts stellt jeden vollständigen Zustand wieder her und behält die Laufkennzeichnung", () => {
  const run = session();
  const snapshots = [structuredClone(run.state)];
  for (const input of solution.inputs) {
    for (let tick = 0; tick < input.ticks; tick++) {
      snapshots.push(structuredClone(run.step(input.direction, input.grab)));
    }
  }
  const won = snapshots.at(-1);
  for (let tick = won.tick - 1; tick >= 0; tick--) {
    assert.deepEqual(run.back(), snapshots[tick]);
    assert.equal(run.recorder.ticks, tick);
    assert.equal(run.recorder.replay.usedRewind, true);
  }
  assert.equal(run.back(), null);
  assert.equal(run.recorder.replay.usedRewind, true);
  assert.deepEqual(run.recorder.replay.inputs, []);
  for (const input of solution.inputs) {
    for (let tick = 0; tick < input.ticks; tick++) run.step(input.direction, input.grab);
  }
  assert.deepEqual(run.state, won);
  assert.deepEqual(Replay.play(pack, run.recorder.replay).state, won);
  assert.equal(run.recorder.replay.usedRewind, true);
});

test("Verzweigung entfernt alte Zukunft und kürzt Replayblöcke auch mitten im Halten", () => {
  const run = session();
  for (let tick = 0; tick < 15; tick++) run.step();
  for (let tick = 0; tick < 3; tick++) run.step("right");
  for (let tick = 0; tick < 5; tick++) run.back();
  assert.deepEqual(run.recorder.replay.inputs, [{ ticks: 13, direction: null, grab: false }]);
  run.step("down", true);
  run.step("down");
  assert.equal(run.state.tick, 15);
  assert.deepEqual(Replay.play(pack, run.recorder.replay, { requireWin: false }).state, run.state);
  const fork = structuredClone(run.state);
  run.back();
  run.step("down");
  assert.deepEqual(run.state, fork);
  assert.deepEqual(Replay.play(pack, run.recorder.replay, { requireWin: false }).state, fork);
});

test("Tod und Zeitablauf werden rückgängig; nach dem Loslassen ist eine andere Zukunft möglich", () => {
  const run = session();
  for (const direction of ["right", "down", "down", "down", "down", "right", "down", null]) run.step(direction);
  assert.equal(run.state.status, "lost");
  assert.match(run.state.reason, /Fels/);
  run.back();
  assert.equal(run.state.status, "playing");
  run.step("left");
  assert.equal(run.state.status, "playing");
  assert.deepEqual(Replay.play(pack, run.recorder.replay, { requireWin: false }).state, run.state);
  const timeout = session();
  for (let tick = 0; tick < 1200; tick++) timeout.step();
  assert.equal(timeout.state.remainingTicks, 0);
  assert.match(timeout.state.reason, /Zeit/);
  timeout.back();
  assert.equal(timeout.state.remainingTicks, 1);
  assert.equal(timeout.state.status, "playing");
  timeout.step();
  assert.equal(timeout.state.status, "lost");
});

test("Lange Partie behält mindestens 100 Ticks bei höchstens elf Snapshots und 109 Eingaben", () => {
  const source = structuredClone(pack);
  Object.assign(source.levels[0], { width: 5, height: 5, timeLimit: 3600, seed: 0,
    map: ["#####", "#@..#", "#...#", "#..X#", "#####"] });
  const run = session(source);
  const snapshots = new Map();
  for (let tick = 1; tick <= 36000; tick++) {
    run.step(tick % 2 ? "left" : "up");
    if (tick >= 35900) snapshots.set(tick, structuredClone(run.state));
    assert.ok(run.history.checkpoints.length <= 11);
    assert.ok(run.history.inputs.length <= 109);
    if (tick >= 100) assert.ok(run.history.availableTicks >= 100);
  }
  for (let tick = 35999; tick >= 35900; tick--) assert.deepEqual(run.back(), snapshots.get(tick));
  assert.equal(run.history.availableTicks, 0);
  assert.equal(run.back(), null);
  assert.equal(run.state.rngState, 0);
});

test("Snapshots kopieren den gesamten JSON-Zustand ohne geteilte Referenzen", () => {
  const state = Sim.createState(pack, solution.levelId);
  state.extraMechanism = { counter: 4, cells: [{ timer: 9 }] };
  const expected = structuredClone(state);
  const history = new RewindHistory(state);
  const input = { direction: null, grab: false };
  Sim.step(state, input);
  history.push(state, input);
  state.extraMechanism.cells[0].timer = 0;
  assert.deepEqual(history.back(), expected);
  expected.board[1].type = "empty";
  assert.notDeepEqual(JSON.parse(history.checkpoints[0].json), expected);
});

test("Leerer Verlauf und Neustart sind neutral; ungültige Tickfolgen werden abgewiesen", () => {
  const run = session();
  assert.equal(run.back(), null);
  run.recorder.truncate(0);
  assert.equal(run.recorder.replay.usedRewind, false);
  assert.throws(() => run.recorder.truncate(-1), /Rückspulziel/);
  assert.throws(() => run.recorder.truncate(1), /Rückspulziel/);
  assert.throws(() => run.history.push(run.state, { direction: null, grab: false }), /Aufeinanderfolgender Tick/);
  run.step();
  run.back();
  assert.equal(run.recorder.replay.usedRewind, true);
  const restarted = session();
  assert.equal(restarted.history.availableTicks, 0);
  assert.equal(restarted.recorder.replay.usedRewind, false);
  assert.deepEqual(restarted.state, run.state);
});
