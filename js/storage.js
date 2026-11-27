(function (root) {
  "use strict";
  const Simulation = root.Sturzstein?.Simulation ?? require("./simulation.js");
  const Replay = root.Sturzstein?.Replay ?? require("./replay.js");
  const KEY = "sturzstein.save";
  const limits = Object.freeze({ bytes: 8 * 1024 * 1024, entries: 10000 });
  const fresh = () => ({ formatVersion: 1, settings: { showHints: true }, progress: [], bests: [], session: null });
  const identity = (entry) => `${entry.packId}/${entry.levelId}`;
  const bestIdentity = (entry) => `${identity(entry)}/${entry.levelRevision}/${entry.ruleVersion}/${entry.seed}/${entry.usedRewind}`;
  function fail(path, message) { throw new Error(`Speicherdaten: ${path}: ${message}`); }
  function object(value, path, fields) {
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "Objekt erwartet.");
    for (const key of fields) if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, "Pflichtfeld fehlt.");
    for (const key of Object.keys(value)) if (!fields.includes(key)) fail(`${path}.${key}`, "Unbekanntes Feld.");
  }
  function integer(value, path, min, max) {
    if (!Number.isInteger(value) || value < min || value > max) fail(path, `Ganze Zahl zwischen ${min} und ${max} erwartet.`);
  }
  function boolean(value, path) { if (typeof value !== "boolean") fail(path, "Boolescher Wert erwartet."); }
  function id(value, path) {
    if (typeof value !== "string" || value.length > 64 || !/^[a-z0-9][a-z0-9-]*$/.test(value)) fail(path, "Ungültige ID.");
  }
  function validateData(value) {
    object(value, "Profil", ["formatVersion", "settings", "progress", "bests", "session"]);
    if (value.formatVersion !== 1) fail("formatVersion", "Nicht unterstützte Version.");
    object(value.settings, "settings", ["showHints"]);
    boolean(value.settings.showHints, "settings.showHints");
    for (const name of ["progress", "bests"]) {
      if (!Array.isArray(value[name]) || value[name].length > limits.entries) fail(name, `Höchstens ${limits.entries} Einträge erwartet.`);
      const seen = new Set();
      for (const entry of value[name]) {
        const fields = name === "progress" ? ["unlocked", "solved"]
          : ["levelRevision", "ruleVersion", "seed", "usedRewind", "score", "ticks"];
        object(entry, name, ["packId", "levelId", ...fields]);
        id(entry.packId, `${name}.packId`);
        id(entry.levelId, `${name}.levelId`);
        if (name === "progress") {
          boolean(entry.unlocked, "progress.unlocked");
          boolean(entry.solved, "progress.solved");
          if (entry.solved && !entry.unlocked) fail(name, "Gelöstes Level muss freigeschaltet sein.");
        } else {
          integer(entry.levelRevision, "bests.levelRevision", 1, 2147483647);
          integer(entry.ruleVersion, "bests.ruleVersion", 1, 2147483647);
          integer(entry.seed, "bests.seed", 0, 4294967295);
          boolean(entry.usedRewind, "bests.usedRewind");
          integer(entry.score, "bests.score", 0, 2147483647);
          integer(entry.ticks, "bests.ticks", 1, Replay.limits.ticks);
        }
        const key = name === "progress" ? identity(entry) : bestIdentity(entry);
        if (seen.has(key)) fail(name, "Doppelter Eintrag.");
        seen.add(key);
      }
    }
    return structuredClone(value);
  }
  function restoreSession(value, packs) {
    object(value, "Partie", ["state", "replay"]);
    const replay = Replay.validateReplay(value.replay);
    const pack = packs.find((entry) => entry.id === replay.packId);
    if (!pack) fail("Partie", `Levelpack ${replay.packId} ist nicht verfügbar.`);
    const recorder = Replay.Recorder.fromReplay(pack, replay);
    const initial = Simulation.createState(pack, replay.levelId);
    const state = value.state;
    object(state, "Zustand", Object.keys(initial));
    for (const key of ["stateVersion", "packId", "levelId", "levelRevision", "ruleVersion", "width", "height", "exitIndex", "quota"]) {
      if (state[key] !== initial[key]) fail(`Zustand.${key}`, "Passt nicht zum aktuellen Level.");
    }
    integer(state.tick, "Zustand.tick", 0, initial.remainingTicks);
    if (state.tick !== recorder.ticks) fail("Zustand.tick", "Passt nicht zur Replaylänge.");
    if (state.remainingTicks !== initial.remainingTicks - state.tick) fail("Zustand.remainingTicks", "Passt nicht zur Tickzahl.");
    if (!["playing", "lost"].includes(state.status)) fail("Zustand.status", "Laufende oder verlorene Partie erwartet.");
    if (state.status === "playing" && (state.remainingTicks === 0 || state.reason !== null)) fail("Zustand", "Widersprüchlicher Spielstatus.");
    if (state.status === "lost" && (typeof state.reason !== "string" || !state.reason || state.reason.length > 500)) fail("Zustand.reason", "Niederlagenursache fehlt.");
    integer(state.rngState, "Zustand.rngState", 0, 4294967295);
    integer(state.collected, "Zustand.collected", 0, 65536);
    if (state.score !== state.collected * 10) fail("Zustand.score", "Passt nicht zum Edelsteinzähler.");
    integer(state.playerIndex, "Zustand.playerIndex", 0, initial.board.length - 1);
    integer(state.nextId, "Zustand.nextId", initial.nextId, 2147483647);
    object(state.parameters, "Zustand.parameters", Object.keys(initial.parameters));
    for (const key of Object.keys(initial.parameters)) {
      if (state.parameters[key] !== initial.parameters[key]) fail(`Zustand.parameters.${key}`, "Passt nicht zum aktuellen Level.");
    }
    if (Object.hasOwn(initial, "wallActivatedAt") && state.wallActivatedAt !== null) {
      integer(state.wallActivatedAt, "Zustand.wallActivatedAt", 2, state.tick);
    }
    if (!Array.isArray(state.board) || state.board.length !== initial.board.length) fail("Zustand.board", "Falsche Rastergröße.");
    const ids = new Set();
    let players = 0;
    let amoebas = 0;
    for (const [index, cell] of state.board.entries()) {
      const path = `Zustand.board[${index}]`;
      const falling = cell?.type === "rock" || cell?.type === "gem";
      const enemy = cell && Simulation.isEnemy(cell);
      const explosion = cell?.type === "explosion";
      object(cell, path, ["type", "id", ...(falling ? ["falling"] : []),
        ...(enemy ? ["direction"] : []), ...(explosion ? ["remainingTicks", "result"] : []),
        ...(cell?.type === "magicWall" ? ["blockedAt"] : [])]);
      if (!["empty", "earth", "steel", "wall", "rock", "gem", "player", "exit", "beetle", "butterfly", "explosion", "amoeba", "magicWall"].includes(cell.type)) fail(path, "Unbekannter Zelltyp.");
      integer(cell.id, `${path}.id`, cell.type === "empty" ? 0 : 1, cell.type === "empty" ? 0 : state.nextId - 1);
      if (cell.id && ids.has(cell.id)) fail(path, "Doppelte Objekt-ID.");
      if (cell.id) ids.add(cell.id);
      if (falling) boolean(cell.falling, `${path}.falling`);
      if (enemy && (typeof cell.direction !== "string" || !Object.hasOwn(Simulation.directions, cell.direction))) fail(`${path}.direction`, "Ungültige Gegnerrichtung.");
      if (explosion) {
        integer(cell.remainingTicks, `${path}.remainingTicks`, 0, 3);
        if (!["empty", "gem"].includes(cell.result)) fail(`${path}.result`, "Ungültiges Explosionsergebnis.");
        if (state.tick === 0) fail(path, "Explosion vor dem ersten Tick.");
      }
      const start = initial.board[index];
      if (start.type === "steel" || start.type === "magicWall" || cell.type === "steel" || cell.type === "magicWall") {
        if (cell.type !== start.type || cell.id !== start.id) fail(path, "Unzerstörbare Wand wurde verändert.");
      }
      if (cell.type === "magicWall" && cell.blockedAt !== null) {
        if (state.wallActivatedAt === null) fail(path, "Blockierte Ausgabe vor Wandaktivierung.");
        const lastActive = state.wallActivatedAt + state.parameters.magicWallTicks - 1;
        integer(cell.blockedAt, `${path}.blockedAt`, state.wallActivatedAt, Math.min(state.tick, lastActive));
      }
      if (cell.type === "amoeba") amoebas++;
      if (state.tick === 0 && (cell.type === "amoeba" || start.type === "amoeba")
        && (cell.type !== start.type || cell.id !== start.id)) fail(path, "Amöbe passt nicht zum Anfangsraster.");
      if (cell.type === "player") {
        players++;
        if (index !== state.playerIndex) fail(path, "Spielerposition widerspricht dem Raster.");
      }
      if (cell.type === "exit" && index !== state.exitIndex) fail(path, "Falsche Ausgangsposition.");
    }
    if (amoebas && !initial.board.some((cell) => cell.type === "amoeba")) fail("Zustand.board", "Amöbe ohne Anfangsbestand.");
    if (state.tick > 0 && amoebas > state.parameters.amoebaMaxCells) fail("Zustand.board", "Amöbe über der Wachstumsgrenze.");
    const lateExit = state.status === "lost" && state.remainingTicks === 0
      && state.playerIndex === state.exitIndex && state.board[state.exitIndex].type === "player";
    if (state.board[state.exitIndex].type !== "exit" && !lateExit) fail("Zustand.exitIndex", "Ausgang fehlt.");
    if (lateExit && state.collected < state.quota) fail("Zustand.exitIndex", "Geschlossener Ausgang wurde betreten.");
    if ((state.status === "playing" && players !== 1) || players > 1) fail("Zustand.board", "Ungültige Spieleranzahl.");
    if (!players && !["rock", "gem", "explosion"].includes(state.board[state.playerIndex].type)) fail("Zustand.playerIndex", "Trefferobjekt fehlt.");
    if (state.status === "lost" && players === 1 && state.remainingTicks !== 0) fail("Zustand", "Niederlage ohne Treffer oder Zeitablauf.");
    if (state.push !== null) {
      object(state.push, "Zustand.push", ["index", "direction", "ticks"]);
      if (!["left", "right"].includes(state.push.direction)) fail("Zustand.push.direction", "Horizontale Richtung erwartet.");
      integer(state.push.index, "Zustand.push.index", 0, state.board.length - 1);
      integer(state.push.ticks, "Zustand.push.ticks", 1, 1);
      if (state.push.index !== state.playerIndex + (state.push.direction === "left" ? -1 : 1)) fail("Zustand.push.index", "Schubziel nicht neben der Figur.");
    }
    return { pack, state: structuredClone(state), recorder };
  }
  function syncProgress(data, pack) {
    let slots = 3;
    for (const level of pack.levels) {
      let entry = data.progress.find((item) => item.packId === pack.id && item.levelId === level.id);
      if (!entry) {
        entry = { packId: pack.id, levelId: level.id, unlocked: false, solved: false };
        data.progress.push(entry);
      }
      if (entry.solved) entry.unlocked = true;
      else if (slots-- > 0) entry.unlocked = true;
    }
  }
  function bestFor(data, pack, level, usedRewind) {
    return data.bests.find((entry) => entry.packId === pack.id && entry.levelId === level.id
      && entry.levelRevision === level.revision && entry.ruleVersion === level.ruleVersion
      && entry.seed === level.seed && entry.usedRewind === usedRewind) || null;
  }
  class SaveStore {
    constructor(access, packs, onStatus) {
      this.access = access;
      this.onStatus = onStatus;
      this.data = fresh();
      this.restored = null;
      this.blocked = false;
      this.storage = null;
      this.lastText = null;
      this.message = null;
      try {
        this.storage = access();
        const text = this.storage.getItem(KEY);
        this.lastText = text;
        if (text !== null) {
          if (text.length > limits.bytes || new TextEncoder().encode(text).length > limits.bytes) fail("Datei", "Größer als 8 MiB.");
          this.data = validateData(JSON.parse(text));
          if (this.data.session !== null) this.restored = restoreSession(this.data.session, packs);
        }
        this.report(this.restored ? "Partie geladen. Erst bewusst fortsetzen; Offlinezeit wird nicht abgezogen." : "Lokaler Speicher bereit. Gespeichert wird nur in diesem Browser.");
      } catch (error) {
        this.blocked = true;
        this.report(`Speicher nicht geladen (${error.name}): ${error.message} Browserdaten bleiben unverändert; vorerst nur temporäres Spielen.`, error);
      }
      for (const pack of packs) syncProgress(this.data, pack);
    }
    report(message, error) {
      if (message === this.message) return;
      this.message = message;
      if (error) console.warn("Lokale Speicherung:", error);
      this.onStatus(message);
    }
    persist(replace = false) {
      if (this.blocked && !replace) return false;
      try {
        const text = JSON.stringify(this.data);
        if (this.data.progress.length > limits.entries || this.data.bests.length > limits.entries
          || text.length > limits.bytes || new TextEncoder().encode(text).length > limits.bytes) fail("Profil", "Speichergrenze überschritten.");
        this.storage = this.access();
        if (!replace && this.storage.getItem(KEY) !== this.lastText) {
          this.blocked = true;
          this.report("Browserdaten wurden außerhalb dieser Partie geändert. Bitte neu laden; bis dahin nur temporäres Spielen, kein Überschreiben.");
          return false;
        }
        this.storage.setItem(KEY, text);
        this.lastText = text;
        this.blocked = false;
        this.report("Lokal gespeichert. Gilt nur für diesen Browser und diese Adresse.");
        return true;
      } catch (error) {
        this.report(`Nicht gespeichert (${error.name}): ${error.message} Bisherige Browserdaten bleiben unverändert; das Spiel läuft weiter.`, error);
        return false;
      }
    }
    capture(pack, state, recorder) {
      if (state.status === "won") {
        syncProgress(this.data, pack);
        this.data.progress.find((entry) => entry.packId === pack.id && entry.levelId === state.levelId).solved = true;
        syncProgress(this.data, pack);
        const level = pack.levels.find((entry) => entry.id === state.levelId);
        const best = bestFor(this.data, pack, level, recorder.replay.usedRewind);
        if (!best) this.data.bests.push({
          packId: pack.id, levelId: level.id, levelRevision: level.revision, ruleVersion: level.ruleVersion,
          seed: level.seed, usedRewind: recorder.replay.usedRewind, score: state.score, ticks: state.tick,
        });
        else if (state.score > best.score || (state.score === best.score && state.tick < best.ticks)) {
          best.score = state.score;
          best.ticks = state.tick;
        }
        this.data.session = null;
      } else {
        this.data.session = { state: structuredClone(state), replay: Replay.validateReplay(recorder.replay) };
      }
      return this.persist();
    }
    reset() {
      const previous = this.data.session;
      this.data.session = null;
      if (this.persist(true)) {
        this.restored = null;
        return true;
      }
      this.data.session = previous;
      return false;
    }
  }
  const api = Object.freeze({ KEY, limits, validateData, restoreSession, syncProgress, bestFor, SaveStore });
  (root.Sturzstein ??= {}).Storage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
