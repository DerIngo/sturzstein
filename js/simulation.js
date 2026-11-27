(function (root) {
  "use strict";

  const Levels = root.Sturzstein?.Levels ?? require("./levels.js");
  const TICK_MS = 100;
  const directions = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });
  const types = Object.freeze({
    " ": "empty", ".": "earth", "#": "steel", "+": "wall",
    "@": "player", O: "rock", "*": "gem", X: "exit",
  });
  const empty = () => ({ type: "empty", id: 0 });
  const rounded = (cell) => cell.type === "rock" || cell.type === "gem";

  function createState(pack, levelId) {
    const validated = Levels.validatePack(pack);
    const level = validated.levels.find((entry) => entry.id === levelId);
    if (!level) throw new Error(`Unbekanntes Level: ${levelId}`);
    let nextId = 1;
    const board = [...level.map.join("")].map((symbol) => {
      const type = types[symbol];
      if (type === "empty") return empty();
      const cell = { type, id: nextId++ };
      if (rounded(cell)) cell.falling = false;
      return cell;
    });
    return {
      stateVersion: 1,
      packId: validated.id,
      levelId: level.id,
      levelRevision: level.revision,
      ruleVersion: level.ruleVersion,
      width: level.width,
      height: level.height,
      board,
      nextId,
      playerIndex: board.findIndex((cell) => cell.type === "player"),
      exitIndex: board.findIndex((cell) => cell.type === "exit"),
      tick: 0,
      remainingTicks: level.timeLimit * 1000 / TICK_MS,
      collected: 0,
      quota: level.quota,
      score: 0,
      status: "playing",
      reason: null,
      rngState: level.seed,
      parameters: { ...level.parameters },
      push: null,
    };
  }

  function neighbor(state, index, dx, dy) {
    const x = index % state.width + dx;
    const y = Math.floor(index / state.width) + dy;
    return x < 0 || y < 0 || x >= state.width || y >= state.height ? -1 : y * state.width + x;
  }

  function nextRandom(state) {
    state.rngState = (Math.imul(1664525, state.rngState) + 1013904223) >>> 0;
    return state.rngState;
  }

  function move(state, from, to) {
    state.board[to] = state.board[from];
    state.board[from] = empty();
  }

  function step(state, input = { direction: null, grab: false }) {
    if (state.status !== "playing") return state;
    if (!input || !(input.direction === null || Object.hasOwn(directions, input.direction)) || typeof input.grab !== "boolean") {
      throw new Error("Ungültige Tick-Eingabe: direction und grab erwartet.");
    }
    state.tick++;
    const moved = new Set();
    let enteredExit = false;
    const previousPush = state.push;
    state.push = null;
    if (input.direction) {
      const [dx, dy] = directions[input.direction];
      const target = neighbor(state, state.playerIndex, dx, dy);
      if (target >= 0) {
        const cell = state.board[target];
        const collectible = cell.type === "gem";
        const diggable = cell.type === "earth";
        if (input.grab) {
          if (collectible || diggable) {
            if (collectible) { state.collected++; state.score += 10; }
            state.board[target] = empty();
          }
        } else if (collectible || diggable || cell.type === "empty" || (cell.type === "exit" && state.collected >= state.quota)) {
          if (collectible) { state.collected++; state.score += 10; }
          enteredExit = cell.type === "exit";
          move(state, state.playerIndex, target);
          state.playerIndex = target;
        } else if (cell.type === "rock" && !cell.falling && dy === 0) {
          const beyond = neighbor(state, target, dx, 0);
          if (beyond >= 0 && state.board[beyond].type === "empty") {
            const ticks = previousPush?.index === target && previousPush.direction === input.direction ? previousPush.ticks + 1 : 1;
            state.push = { index: target, direction: input.direction, ticks };
            if (ticks >= 2) {
              moved.add(cell.id);
              move(state, target, beyond);
              move(state, state.playerIndex, target);
              state.playerIndex = target;
              state.push = null;
            }
          }
        }
      }
    }

    // IDs aus der Momentaufnahme verhindern Mehrfachverarbeitung nach Fall/Abrollen.
    const objects = state.board.flatMap((cell, index) => rounded(cell) ? [{ index, id: cell.id }] : []);
    for (const { index, id } of objects) {
      const cell = state.board[index];
      if (cell.id !== id || moved.has(id)) continue;
      const below = neighbor(state, index, 0, 1);
      if (below < 0) { cell.falling = false; continue; }
      const support = state.board[below];
      if (support.type === "empty") {
        cell.falling = true;
        move(state, index, below);
        continue;
      }
      if (support.type === "player" && below !== state.exitIndex && cell.falling) {
        state.status = "lost";
        state.reason = cell.type === "rock" ? "Ein fallender Fels hat dich getroffen." : "Ein fallender Edelstein hat dich getroffen.";
        move(state, index, below);
        continue;
      }
      if (rounded(support)) {
        let rolled = false;
        for (const dx of [-1, 1]) {
          const side = neighbor(state, index, dx, 0);
          const diagonal = neighbor(state, index, dx, 1);
          if (side >= 0 && diagonal >= 0 && state.board[side].type === "empty" && state.board[diagonal].type === "empty") {
            cell.falling = true;
            move(state, index, diagonal);
            rolled = true;
            break;
          }
        }
        if (rolled) continue;
      }
      cell.falling = false;
    }
    state.remainingTicks--;
    if (state.status === "lost") return state;
    if (state.remainingTicks <= 0) {
      state.status = "lost";
      state.reason = "Die Zeit ist abgelaufen.";
    } else if (enteredExit) {
      state.status = "won";
      state.score += Math.floor(state.remainingTicks * TICK_MS / 1000);
    }
    return state;
  }

  const api = Object.freeze({ TICK_MS, directions, createState, step, nextRandom });
  (root.Sturzstein ??= {}).Simulation = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
