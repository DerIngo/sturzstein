"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Sim = require("../js/simulation.js");
const Replay = require("../js/replay.js");
const { RewindHistory } = require("../js/rewind.js");
const Storage = require("../js/storage.js");
const pack = require("../levels/einstieg.json");
const solution = require("../replays/sturzstein-einstieg/erste-schritte.json");

function memory(text = null) {
  return {
    text, error: null,
    getItem(key) { assert.equal(key, Storage.KEY); return this.text; },
    setItem(key, value) { assert.equal(key, Storage.KEY); if (this.error) throw this.error; this.text = value; },
  };
}
function store(memory, packs = [pack]) {
  const messages = [];
  const save = new Storage.SaveStore(() => memory, packs, (message) => messages.push(message));
  return { save, messages };
}
function run(source = pack, inputs = [{ ticks: 2, direction: "right", grab: false }]) {
  const state = Sim.createState(source, solution.levelId);
  const recorder = new Replay.Recorder(source, solution.levelId);
  for (const input of inputs) for (let tick = 0; tick < input.ticks; tick++) {
    Sim.step(state, recorder.record(input));
  }
  return { state, recorder };
}

test("Partie wird vollständig geladen; Schubzustand, Seed 0 und Replay laufen identisch weiter", () => {
  const source = structuredClone(pack);
  Object.assign(source.levels[0], { width: 7, height: 5, seed: 0,
    map: ["#######", "#@O ..#", "#.....#", "#....X#", "#######"] });
  const { state, recorder } = run(source, [{ ticks: 1, direction: "right", grab: false }]);
  assert.notEqual(state.push, null);
  const disk = memory();
  const { save } = store(disk, [source]);
  save.data.settings.showHints = false;
  assert.equal(save.capture(source, state, recorder), true);
  const loaded = store(disk, [source]).save;
  assert.equal(loaded.blocked, false);
  assert.deepEqual(loaded.restored.state, state);
  assert.deepEqual(loaded.restored.recorder.replay, recorder.replay);
  assert.equal(loaded.data.settings.showHints, false);
  assert.equal(new RewindHistory(loaded.restored.state).availableTicks, 0);
  const input = { direction: "right", grab: false };
  Sim.step(state, recorder.record(input));
  Sim.step(loaded.restored.state, loaded.restored.recorder.record(input));
  assert.deepEqual(loaded.restored.state, state);
  assert.deepEqual(Replay.play(source, loaded.restored.recorder.replay, { requireWin: false }).state, state);
});

test("Rückspulkennzeichnung überlebt Laden und weiteres Rückspulen", () => {
  const { state, recorder } = run();
  const history = new RewindHistory(state);
  Sim.step(state, recorder.record({ direction: "down", grab: false }));
  history.push(state, { direction: "down", grab: false });
  const restored = history.back();
  recorder.truncate(restored.tick);
  const disk = memory();
  store(disk).save.capture(pack, restored, recorder);
  const loaded = store(disk).save.restored;
  assert.equal(loaded.recorder.replay.usedRewind, true);
  assert.deepEqual(loaded.state, restored);
  assert.equal(loaded.state.remainingTicks, 1198);
});

test("Gelöste Level und getrennte Bestwerte bleiben stabil; schlechtere Läufe ersetzen nichts", () => {
  const disk = memory();
  const { save } = store(disk);
  const normal = run(pack, solution.inputs);
  save.capture(pack, normal.state, normal.recorder);
  assert.equal(save.data.session, null);
  const assisted = run(pack, [{ ticks: 20, direction: null, grab: false }, ...solution.inputs]);
  assisted.recorder.replay.usedRewind = true;
  save.capture(pack, assisted.state, assisted.recorder);
  const slow = run(pack, [{ ticks: 30, direction: null, grab: false }, ...solution.inputs]);
  save.capture(pack, slow.state, slow.recorder);
  const loaded = store(disk).save;
  assert.equal(loaded.data.progress[0].solved, true);
  assert.equal(loaded.data.bests.length, 2);
  assert.equal(Storage.bestFor(loaded.data, pack, pack.levels[0], false).score, normal.state.score);
  assert.equal(Storage.bestFor(loaded.data, pack, pack.levels[0], true).score, assisted.state.score);
});

test("Freischaltungen und Fortschritt überstehen Umsortieren/Ergänzen; Bestwerte sind revisionsgebunden", () => {
  const source = structuredClone(pack);
  source.levels = Array.from({ length: 5 }, (_, i) => ({ ...source.levels[0], id: i === 0 ? solution.levelId : `level-${i}` }));
  const disk = memory();
  const { save } = store(disk, [source]);
  assert.deepEqual(save.data.progress.map((entry) => entry.unlocked), [true, true, true, false, false]);
  const won = run(source, solution.inputs);
  save.capture(source, won.state, won.recorder);
  assert.equal(save.data.progress.find((entry) => entry.levelId === "level-3").unlocked, true);
  const changed = structuredClone(source);
  changed.revision++;
  changed.levels.reverse();
  changed.levels.unshift({ ...changed.levels[0], id: "neu" });
  changed.levels.find((entry) => entry.id === solution.levelId).revision++;
  const loaded = store(disk, [changed]).save;
  for (const entry of save.data.progress.filter((item) => item.unlocked)) {
    assert.equal(loaded.data.progress.find((item) => item.levelId === entry.levelId).unlocked, true);
  }
  assert.equal(loaded.data.progress.find((entry) => entry.levelId === solution.levelId).solved, true);
  assert.equal(Storage.bestFor(loaded.data, changed, changed.levels.find((entry) => entry.id === solution.levelId), false), null);
  assert.equal(loaded.data.bests.length, 1);
});

test("Inkompatible Partie bleibt auf dem Datenträger, bis Ersetzen ausdrücklich aufgerufen wird", (t) => {
  t.mock.method(console, "warn", () => {});
  const disk = memory();
  const { state, recorder } = run();
  store(disk).save.capture(pack, state, recorder);
  const original = disk.text;
  for (const change of ["packId", "levelId", "levelRevision", "ruleVersion", "seed"]) {
    const data = JSON.parse(original);
    if (change === "packId" || change === "levelId") data.session.replay[change] = "fehlt";
    else data.session.replay[change]++;
    disk.text = JSON.stringify(data);
    const preserved = disk.text;
    const { save, messages } = store(disk);
    assert.equal(save.blocked, true, change);
    assert.equal(save.restored, null);
    save.capture(pack, state, recorder);
    assert.equal(disk.text, preserved);
    assert.match(messages.at(-1), /unverändert.*temporär/);
    assert.equal(save.reset(), true);
    assert.equal(JSON.parse(disk.text).session, null);
  }
});

test("Beschädigte Zustände werden nicht als gültige Partien geladen", (t) => {
  t.mock.method(console, "warn", () => {});
  const disk = memory();
  const { state, recorder } = run();
  store(disk).save.capture(pack, state, recorder);
  const valid = disk.text;
  for (const corrupt of [
    (s) => { s.stateVersion = 2; },
    (s) => { s.board.pop(); },
    (s) => { s.board[0].type = "empty"; },
    (s) => { s.board[s.playerIndex].id = s.board[0].id; },
    (s) => { s.board[s.playerIndex].type = "earth"; },
    (s) => { s.remainingTicks--; },
    (s) => { s.rngState = -1; },
    (s) => { s.score++; },
    (s) => { s.tick++; },
    (s) => { s.extra = true; },
  ]) {
    const data = JSON.parse(valid);
    corrupt(data.session.state);
    disk.text = JSON.stringify(data);
    const original = disk.text;
    const { save } = store(disk);
    assert.equal(save.blocked, true);
    assert.equal(save.restored, null);
    assert.equal(save.persist(), false);
    assert.equal(disk.text, original);
  }
});

test("Defekte Profile/JSON/Versionen werden geschützt und nicht durch Defaults überschrieben", (t) => {
  t.mock.method(console, "warn", () => {});
  const valid = store(memory()).save.data;
  for (const text of [
    "{", JSON.stringify({ ...valid, formatVersion: 2 }),
    JSON.stringify({ ...valid, settings: { showHints: 1 } }),
    JSON.stringify({ ...valid, progress: [...valid.progress, valid.progress[0]] }),
    JSON.stringify({ ...valid, session: {} }),
  ]) {
    const disk = memory(text);
    const { save } = store(disk);
    assert.equal(save.blocked, true);
    save.data.settings.showHints = false;
    assert.equal(save.persist(), false);
    assert.equal(disk.text, text);
  }
});

test("Verweigerter Zugriff und Quota-Fehler sind sichtbar, atomar und nach Behebung erneut speicherbar", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const messages = [];
  const denied = new Storage.SaveStore(() => { throw new DOMException("Test", "SecurityError"); }, [pack], (message) => messages.push(message));
  assert.equal(denied.blocked, true);
  assert.match(messages.at(-1), /SecurityError/);
  assert.equal(denied.reset(), false);
  const disk = memory();
  const { save } = store(disk);
  const { state, recorder } = run();
  save.capture(pack, state, recorder);
  const original = disk.text;
  disk.error = new DOMException("Test", "QuotaExceededError");
  save.data.settings.showHints = false;
  assert.equal(save.persist(), false);
  assert.equal(disk.text, original);
  assert.match(save.message, /Nicht gespeichert.*QuotaExceededError/);
  disk.error = null;
  assert.equal(save.persist(), true);
  assert.equal(store(disk).save.data.settings.showHints, false);
  assert.ok(warn.mock.calls.length >= 2);
});

test("Niederlage und Zeitablauf auf dem Ausgang bleiben ladbar, ohne Rückspularchiv", () => {
  const dead = run(pack, [
    { ticks: 1, direction: "right", grab: false }, { ticks: 4, direction: "down", grab: false },
    { ticks: 1, direction: "right", grab: false }, { ticks: 1, direction: "down", grab: false },
    { ticks: 1, direction: null, grab: false },
  ]);
  const disk = memory();
  store(disk).save.capture(pack, dead.state, dead.recorder);
  assert.deepEqual(store(disk).save.restored.state, dead.state);
  const source = structuredClone(pack);
  Object.assign(source.levels[0], { width: 5, height: 5, timeLimit: 10, quota: 0,
    map: ["#####", "#@X.#", "#...#", "#...#", "#####"] });
  const late = run(source, [{ ticks: 99, direction: null, grab: false }, { ticks: 1, direction: "right", grab: false }]);
  assert.equal(late.state.status, "lost");
  store(memory(), [source]).save.capture(source, late.state, late.recorder);
  const restored = Storage.restoreSession({ state: late.state, replay: late.recorder.replay }, [source]);
  assert.deepEqual(restored.state, late.state);
});

test("Änderungen einer anderen Registerkarte werden vor dem Schreiben erkannt und geschützt", () => {
  const disk = memory();
  const first = store(disk).save;
  const second = store(disk).save;
  second.data.settings.showHints = false;
  second.persist();
  const latest = disk.text;
  const { state, recorder } = run();
  assert.equal(first.capture(pack, state, recorder), false);
  assert.equal(first.blocked, true);
  assert.match(first.message, /außerhalb dieser Partie geändert/);
  assert.equal(disk.text, latest);
});

for (const [levelId, expectedPhases] of [
  ["glutkaefer-tor", [3, 2, 1, 0]], ["kristallkette", [3, 2, 1, 0]],
  ["gruene-kammer", []], ["drei-schaechte", []],
]) {
  test(`${levelId}: Replay, Speicherfortsetzung und Rückspulen stimmen an jeder Tickgrenze überein`, () => {
    const solution = require(`../replays/sturzstein-einstieg/${levelId}.json`);
    const state = Sim.createState(pack, levelId);
    const recorder = new Replay.Recorder(pack, levelId);
    const history = new RewindHistory(state);
    const snapshots = [structuredClone(state)];
    const disk = memory();
    let save = store(disk).save;
    let continued = null;
    const explosionPhases = new Set();
    for (const block of solution.inputs) for (let tick = 0; tick < block.ticks; tick++) {
      const input = recorder.record(block);
      Sim.step(state, input);
      history.push(state, input);
      snapshots.push(structuredClone(state));
      if (continued) {
        Sim.step(continued.state, continued.recorder.record(input));
        assert.deepEqual(continued.state, state);
      }
      for (const cell of state.board) if (cell.type === "explosion") explosionPhases.add(cell.remainingTicks);
      save.capture(pack, state, recorder);
      save = store(disk).save;
      assert.equal(save.blocked, false);
      if (state.status === "playing") {
        continued = save.restored;
        assert.deepEqual(continued.state, state);
        assert.deepEqual(continued.recorder.replay, recorder.replay);
      }
    }
    assert.equal(state.status, "won");
    assert.deepEqual([...explosionPhases], expectedPhases);
    assert.deepEqual(Replay.play(pack, recorder.replay).state, state);
    assert.ok(save.data.progress.find((entry) => entry.levelId === levelId).solved);
    for (let tick = state.tick - 1; tick >= 0; tick--) {
      const restored = history.back();
      recorder.truncate(tick);
      assert.deepEqual(restored, snapshots[tick]);
      assert.deepEqual(Replay.play(pack, recorder.replay, { requireWin: false }).state, restored);
    }
  });
}

test("Gegner-/Explosionsdaten werden strikt validiert; Explosionstod bleibt fortsetzbar und rückspulbar", () => {
  const levelId = "kristallkette";
  const source = structuredClone(pack);
  source.levels.find((entry) => entry.id === levelId).map[3] = "#...... +.....#";
  const solution = require("../replays/sturzstein-einstieg/kristallkette.json");
  let state = Sim.createState(source, levelId);
  const recorder = new Replay.Recorder(source, levelId);
  const history = new RewindHistory(state);
  for (const block of solution.inputs.slice(0, 4)) for (let tick = 0; tick < block.ticks; tick++) {
    const input = recorder.record(block);
    Sim.step(state, input);
    history.push(state, input);
  }
  const before = structuredClone(state);
  const enterDanger = recorder.record({ direction: "down", grab: false });
  Sim.step(state, enterDanger);
  history.push(state, enterDanger);
  assert.equal(state.status, "lost");
  const session = { state, replay: recorder.replay };
  assert.deepEqual(Storage.restoreSession(session, [source]).state, state);
  for (const corrupt of [
    (s) => { s.board.find(Sim.isEnemy).direction = "diagonal"; },
    (s) => { s.board.find(Sim.isEnemy).direction = ["up"]; },
    (s) => { s.board.find((cell) => cell.type === "explosion").remainingTicks = 4; },
    (s) => { s.board.find((cell) => cell.type === "explosion").remainingTicks = -1; },
    (s) => { s.board.find((cell) => cell.type === "explosion").result = "rock"; },
  ]) {
    const broken = structuredClone(session);
    corrupt(broken.state);
    assert.throws(() => Storage.restoreSession(broken, [source]), /Speicherdaten/);
  }
  state = history.back();
  recorder.truncate(state.tick);
  assert.deepEqual(state, before);
  Sim.step(state, recorder.record({ direction: "left", grab: false }));
  assert.equal(state.status, "playing");
  assert.deepEqual(Storage.restoreSession({ state, replay: recorder.replay }, [source]).state, state);
  assert.deepEqual(Replay.play(source, recorder.replay, { requireWin: false }).state, state);
});

test("Wandtimer, blockierte Ausgaben und feste Wandpositionen werden strikt geprüft", () => {
  const levelId = "drei-schaechte";
  const state = Sim.createState(pack, levelId);
  const recorder = new Replay.Recorder(pack, levelId);
  for (let tick = 0; tick < 15; tick++) Sim.step(state, recorder.record({ direction: "right", grab: false }));
  for (let tick = 0; tick < 30; tick++) Sim.step(state, recorder.record({ direction: null, grab: false }));
  const outlet = (s) => s.board.find((c) => c.type === "magicWall" && c.blockedAt !== null);
  assert.equal(state.wallActivatedAt, 7);
  assert.equal(outlet(state).blockedAt, 15);
  assert.deepEqual(Storage.restoreSession({ state, replay: recorder.replay }, [pack]).state, state);
  for (const corrupt of [
    (s) => { delete s.wallActivatedAt; },
    (s) => { s.wallActivatedAt = 1; },
    (s) => { s.wallActivatedAt = s.tick + 1; },
    (s) => { s.wallActivatedAt = null; },
    (s) => { outlet(s).blockedAt = 6; },
    (s) => { outlet(s).blockedAt = 42; },
    (s) => { delete outlet(s).blockedAt; },
    (s) => { const index = s.board.indexOf(outlet(s)); [s.board[index], s.board[index + 1]] = [s.board[index + 1], s.board[index]]; },
    (s) => { s.board.find((c) => c.type === "earth").type = "amoeba"; },
  ]) {
    const broken = structuredClone(state);
    corrupt(broken);
    assert.throws(() => Storage.restoreSession({ state: broken, replay: recorder.replay }, [pack]), /Speicherdaten/);
  }
});

test("Alte Zustandsform ohne Wandtimer bleibt ladbar, zusätzliche Timer und übergroße Amöben werden abgewiesen", () => {
  const { state, recorder } = run();
  assert.equal(Object.hasOwn(state, "wallActivatedAt"), false);
  assert.deepEqual(Storage.restoreSession({ state, replay: recorder.replay }, [pack]).state, state);
  state.wallActivatedAt = null;
  assert.throws(() => Storage.restoreSession({ state, replay: recorder.replay }, [pack]), /Unbekanntes Feld/);

  const levelId = "gruene-kammer";
  const green = Sim.createState(pack, levelId);
  const recording = new Replay.Recorder(pack, levelId);
  Sim.step(green, recording.record({ direction: null, grab: false }));
  const soil = green.board.filter((c) => c.type === "earth");
  for (const cell of soil.slice(0, green.parameters.amoebaMaxCells)) cell.type = "amoeba";
  assert.throws(() => Storage.restoreSession({ state: green, replay: recording.replay }, [pack]), /Wachstumsgrenze/);
});
