(function (root) {
  "use strict";

  const Simulation = root.Sturzstein?.Simulation ?? require("./simulation.js");
  const limits = Object.freeze({ bytes: 4 * 1024 * 1024, ticks: 36000 });
  const directions = [null, "up", "right", "down", "left"];

  function validateReplay(value, source = "Replay") {
    function fail(path, message) { throw new Error(`${source}: ${path}: ${message}`); }
    function object(item, path, fields) {
      if (!item || typeof item !== "object" || Array.isArray(item)) fail(path, "Objekt erwartet.");
      for (const key of fields) if (!Object.hasOwn(item, key)) fail(`${path}.${key}`, "Pflichtfeld fehlt.");
      for (const key of Object.keys(item)) if (!fields.includes(key)) fail(`${path}.${key}`, "Unbekanntes Feld.");
    }
    function integer(number, path, min, max) {
      if (!Number.isInteger(number) || number < min || number > max) fail(path, `Ganze Zahl zwischen ${min} und ${max} erwartet.`);
      return number;
    }
    function id(value, path) {
      if (typeof value !== "string" || value.length > 64 || !/^[a-z0-9][a-z0-9-]*$/.test(value)) fail(path, "Ungültige ID.");
      return value;
    }
    object(value, "Replay", ["formatVersion", "packId", "levelId", "levelRevision", "ruleVersion", "seed", "inputs"]);
    for (const key of ["formatVersion", "ruleVersion"]) {
      if (value[key] !== 1) fail(key, "Nicht unterstützte Version; erwartet wird 1.");
    }
    const replay = {
      formatVersion: 1,
      packId: id(value.packId, "packId"),
      levelId: id(value.levelId, "levelId"),
      levelRevision: integer(value.levelRevision, "levelRevision", 1, 2147483647),
      ruleVersion: value.ruleVersion,
      seed: integer(value.seed, "seed", 0, 4294967295),
      inputs: [],
    };
    if (!Array.isArray(value.inputs) || value.inputs.length > limits.ticks) fail("inputs", `Höchstens ${limits.ticks} Eingabeblöcke erwartet.`);
    let total = 0;
    for (const [index, input] of value.inputs.entries()) {
      const path = `inputs[${index}]`;
      object(input, path, ["ticks", "direction", "grab"]);
      if (!directions.includes(input.direction)) fail(`${path}.direction`, "null oder up/right/down/left erwartet.");
      if (typeof input.grab !== "boolean") fail(`${path}.grab`, "Boolescher Wert erwartet.");
      const ticks = integer(input.ticks, `${path}.ticks`, 1, limits.ticks);
      total += ticks;
      if (total > limits.ticks) fail(path, `Replay überschreitet ${limits.ticks} Ticks.`);
      replay.inputs.push({ ticks, direction: input.direction, grab: input.grab });
    }
    return replay;
  }

  function parseReplay(text, source = "Replay") {
    if (typeof text !== "string") throw new Error(`${source}: UTF-8-Text erwartet.`);
    if (text.length > limits.bytes || new TextEncoder().encode(text).length > limits.bytes) {
      throw new Error(`${source}: Datei überschreitet 4 MiB.`);
    }
    let value;
    try { value = JSON.parse(text.replace(/^\uFEFF/, "")); }
    catch (error) { throw new Error(`${source}: Ungültiges JSON: ${error.message}`); }
    return validateReplay(value, source);
  }

  function stringifyReplay(value) {
    return JSON.stringify(validateReplay(value), null, 2) + "\n";
  }

  class Recorder {
    constructor(pack, levelId) {
      const state = Simulation.createState(pack, levelId);
      this.replay = {
        formatVersion: 1, packId: state.packId, levelId: state.levelId,
        levelRevision: state.levelRevision, ruleVersion: state.ruleVersion,
        seed: state.rngState, inputs: [],
      };
      this.ticks = 0;
      this.maxTicks = state.remainingTicks;
    }
    record(input) {
      if (!input || !directions.includes(input.direction) || typeof input.grab !== "boolean") {
        throw new Error("Replay-Aufzeichnung: Ungültige Tick-Eingabe.");
      }
      if (this.ticks >= this.maxTicks || this.ticks >= limits.ticks) {
        throw new Error("Replay-Aufzeichnung: Maximale Tickzahl erreicht.");
      }
      const command = { direction: input.direction, grab: input.grab };
      const previous = this.replay.inputs.at(-1);
      if (previous && previous.direction === command.direction && previous.grab === command.grab) previous.ticks++;
      else this.replay.inputs.push({ ticks: 1, ...command });
      this.ticks++;
      return command;
    }
  }

  function play(pack, value, { requireWin = true, onTick = () => {} } = {}) {
    const replay = validateReplay(value);
    if (pack.id !== replay.packId) throw new Error(`Replay: Pack-ID ${replay.packId} passt nicht zu ${pack.id}.`);
    const state = Simulation.createState(pack, replay.levelId);
    for (const [key, expected] of [
      ["levelRevision", state.levelRevision], ["ruleVersion", state.ruleVersion], ["seed", state.rngState],
    ]) {
      if (replay[key] !== expected) throw new Error(`Replay: ${key} ist inkompatibel (erwartet ${expected}, erhalten ${replay[key]}).`);
    }
    const ticks = replay.inputs.reduce((sum, input) => sum + input.ticks, 0);
    if (ticks > state.remainingTicks) throw new Error("Replay: Eingaben überschreiten das Levelzeitlimit.");
    for (const input of replay.inputs) {
      for (let tick = 0; tick < input.ticks; tick++) {
        if (state.status !== "playing") throw new Error(`Replay: Überzählige Eingaben nach ${state.status} bei Tick ${state.tick}.`);
        Simulation.step(state, { direction: input.direction, grab: input.grab });
        onTick(state);
      }
    }
    if (requireWin && state.status !== "won") {
      throw new Error(`Replay: Kein Sieg nach ${state.tick} Ticks (${state.reason || "Eingaben enden während des Spiels"}).`);
    }
    return { state, ticks: state.tick, remainingSeconds: state.remainingTicks * Simulation.TICK_MS / 1000 };
  }

  const api = Object.freeze({ limits, validateReplay, parseReplay, stringifyReplay, Recorder, play });
  (root.Sturzstein ??= {}).Replay = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
