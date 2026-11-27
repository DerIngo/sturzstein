(function (root) {
  "use strict";

  const Levels = root.Sturzstein?.Levels ?? require("./levels.js");
  const TICK_MS = 100;
  const directions = Object.freeze({ up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] });
  const headings = Object.keys(directions);
  const types = Object.freeze({
    " ": "empty", ".": "earth", "#": "steel", "+": "wall",
    "@": "player", O: "rock", "*": "gem", X: "exit",
    u: "beetle", r: "beetle", d: "beetle", l: "beetle",
    U: "butterfly", R: "butterfly", D: "butterfly", L: "butterfly",
    A: "amoeba", M: "magicWall",
  });
  const empty = () => ({ type: "empty", id: 0 });
  const rounded = (cell) => cell.type === "rock" || cell.type === "gem";
  const isEnemy = (cell) => cell.type === "beetle" || cell.type === "butterfly";

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
      if (isEnemy(cell)) cell.direction = headings["urdl".indexOf(symbol.toLowerCase())];
      if (type === "magicWall") cell.blockedAt = null;
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
      ...(board.some((cell) => cell.type === "magicWall") ? { wallActivatedAt: null } : {}),
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

  function magicWallPhase(state) {
    if (state.wallActivatedAt === null) return "ready";
    return state.tick - state.wallActivatedAt < state.parameters.magicWallTicks ? "active" : "spent";
  }

  function hitMagicWall(state, from, wall) {
    if (state.wallActivatedAt === null) state.wallActivatedAt = state.tick;
    if (magicWallPhase(state) === "spent") {
      state.board[from].falling = false;
      return;
    }
    const result = state.board[from].type === "rock" ? "gem" : "rock";
    state.board[from] = empty();
    const output = wall + state.width;
    if (state.board[output].type === "empty") {
      state.board[output] = { type: result, id: state.nextId++, falling: true };
    } else state.board[wall].blockedAt = state.tick;
  }

  function updateAmoeba(state) {
    const cells = [];
    const front = new Set();
    function addTargets(index) {
      // Der geschlossene Stahlrand hält jede Amöbe im Inneren des Rasters.
      for (const target of [index - state.width, index - 1, index + 1, index + state.width]) {
        const type = state.board[target].type;
        if (type === "earth" || type === "empty") front.add(target);
      }
    }
    for (let index = 0; index < state.board.length; index++) {
      if (state.board[index].type === "amoeba") {
        cells.push(index);
        addTargets(index);
      }
    }
    if (!cells.length) return;
    const { amoebaMaxCells, amoebaGrowthTicks } = state.parameters;
    if (cells.length <= amoebaMaxCells && front.size && state.tick % amoebaGrowthTicks === 0) {
      const sorted = [...front].sort((a, b) => a - b);
      const target = sorted[nextRandom(state) % sorted.length];
      state.board[target] = { type: "amoeba", id: state.nextId++ };
      cells.push(target);
      front.delete(target);
      addTargets(target);
    }
    if (cells.length > amoebaMaxCells || !front.size) {
      const type = cells.length > amoebaMaxCells ? "rock" : "gem";
      for (const index of cells) state.board[index] = { type, id: state.nextId++, falling: false };
    }
  }

  function explode(state, centers) {
    const pending = [];
    const queued = new Set();
    function enqueue(index) {
      const cell = state.board[index];
      if (!isEnemy(cell) || queued.has(cell.id)) return;
      queued.add(cell.id);
      pending.push({ index, result: cell.type === "beetle" ? "empty" : "gem" });
    }
    for (const index of centers) enqueue(index);
    while (pending.length) {
      pending.sort((a, b) => a.index - b.index);
      const { index, result } = pending.shift();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const target = neighbor(state, index, dx, dy);
        if (target < 0 || target === state.exitIndex) continue;
        const cell = state.board[target];
        if (cell.type === "steel" || cell.type === "magicWall") continue;
        if (isEnemy(cell)) enqueue(target);
        if (cell.type === "player" && state.status !== "lost") {
          state.status = "lost";
          state.reason = "Eine Gegnerexplosion hat dich getroffen.";
        }
        if (cell.type === "explosion") {
          if (result === "empty") cell.result = "empty";
        } else {
          state.board[target] = { type: "explosion", id: state.nextId++, remainingTicks: 3, result };
        }
      }
    }
  }

  function enemyContact(state) {
    if (state.playerIndex === state.exitIndex || state.board[state.playerIndex].type !== "player") return;
    const adjacent = Object.values(directions).map(([dx, dy]) => neighbor(state, state.playerIndex, dx, dy))
      .filter((index) => index >= 0 && isEnemy(state.board[index]));
    if (adjacent.length) explode(state, adjacent);
  }

  function step(state, input = { direction: null, grab: false }) {
    if (state.status !== "playing") return state;
    if (!input || !(input.direction === null || Object.hasOwn(directions, input.direction)) || typeof input.grab !== "boolean") {
      throw new Error("Ungültige Tick-Eingabe: direction und grab erwartet.");
    }
    state.tick++;
    const moved = new Set();
    for (const [index, cell] of state.board.entries()) {
      if (cell.type !== "explosion") continue;
      if (cell.remainingTicks > 0) cell.remainingTicks--;
      else if (cell.result === "gem") {
        const gem = { type: "gem", id: state.nextId++, falling: false };
        state.board[index] = gem;
        moved.add(gem.id);
      } else state.board[index] = empty();
    }
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

    enemyContact(state);

    // IDs aus der Momentaufnahme verhindern Mehrfachverarbeitung nach Fall/Abrollen.
    const objects = state.board.flatMap((cell, index) => rounded(cell) ? [{ index, id: cell.id }] : []);
    for (const { index, id } of objects) {
      const cell = state.board[index];
      if (cell.id !== id || moved.has(id)) continue;
      const below = neighbor(state, index, 0, 1);
      if (below < 0) { cell.falling = false; continue; }
      const support = state.board[below];
      if (support.type === "magicWall" && cell.falling) {
        hitMagicWall(state, index, below);
        continue;
      }
      if (isEnemy(support) && cell.falling) {
        explode(state, [below]);
        continue;
      }
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
    const enemies = state.board.flatMap((cell, index) => isEnemy(cell) ? [{ index, id: cell.id }] : []);
    for (const { index, id } of enemies) {
      const cell = state.board[index];
      if (cell.id !== id) continue;
      const facing = headings.indexOf(cell.direction);
      const side = cell.type === "beetle" ? -1 : 1;
      for (const turn of [side, 0, -side, 2]) {
        const direction = headings[(facing + turn + 4) % 4];
        const [dx, dy] = directions[direction];
        const target = neighbor(state, index, dx, dy);
        if (target < 0 || state.board[target].type !== "empty") continue;
        cell.direction = direction;
        move(state, index, target);
        break;
      }
      enemyContact(state);
    }
    updateAmoeba(state);
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

  const api = Object.freeze({ TICK_MS, directions, isEnemy, magicWallPhase, createState, step, nextRandom });
  (root.Sturzstein ??= {}).Simulation = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
