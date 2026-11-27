(function (root) {
  "use strict";
  const names = ["empty", "earth", "steel", "wall", "rock", "gem", "exit", "openExit", "playerIdle", "playerWalk", "playerDig",
    "beetle", "butterfly", "beetleStep", "butterflyStep", "explosion3", "explosion2", "explosion1", "explosion0",
    "amoeba", "amoebaPulse", "magicWall", "magicWallActive", "magicWallFlow", "magicWallSpent", "blockedOutlet",
    "titleMark", "titleEye", "gemSpark", "openExitGlow"];
  const clamp = (n, min, max) => Math.max(min, Math.min(n, max));
  class Renderer {
    constructor(canvas, image) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      if (!this.ctx) throw new Error("Canvas-2D wird von diesem Browser nicht unterstützt.");
      this.image = image;
      this.camera = null;
      this.previous = null;
      this.positions = new Map();
      this.target = null;
      this.lastMoveTick = 0;
      this.hasRendered = false;
      this.animationTime = 0;
      this.playerSprite = "playerIdle";
      this.previousPlayerIndex = null;
    }
    reset(state = null) {
      this.camera = null;
      this.previous = null;
      this.target = null;
      this.hasRendered = false;
      this.animationTime = 0;
      this.playerSprite = "playerIdle";
      this.lastMoveTick = state?.tick ?? 0;
      this.previousPlayerIndex = state?.playerIndex ?? null;
    }
    draw(state, previous, alpha, delta = 16) {
      const canvas = this.canvas;
      const ratio = root.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = this.ctx;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#0c1520";
      ctx.fillRect(0, 0, width, height);
      const scale = Math.max(1, Math.floor(Math.min(width / (Math.min(20, state.width) * 16), height / (Math.min(12, state.height) * 16))));
      const tile = 16 * scale;
      const worldWidth = state.width * tile;
      const worldHeight = state.height * tile;
      const playerX = state.playerIndex % state.width;
      const playerY = Math.floor(state.playerIndex / state.width);
      const target = {
        x: clamp((playerX + 0.5) * tile - width / 2, 0, Math.max(0, worldWidth - width)),
        y: clamp((playerY + 0.5) * tile - height / 2, 0, Math.max(0, worldHeight - height)),
      };
      if (!this.camera || this.scale !== scale) this.camera = { ...target };
      this.scale = scale;
      if (!this.target || this.target.x !== target.x || this.target.y !== target.y) {
        this.target = { ...target };
      }
      const elapsed = this.hasRendered ? Math.min(100, Math.max(0, delta)) : 0;
      this.hasRendered = true;
      const playerAlive = state.board[state.playerIndex]?.type === "player";
      if (state.tick < this.lastMoveTick || previous.tick > state.tick) {
        this.lastMoveTick = state.tick;
        this.playerSprite = "playerIdle";
        this.animationTime = 0;
        this.previousPlayerIndex = state.playerIndex;
      } else if (state.tick > this.lastMoveTick) {
        if (playerAlive && this.previousPlayerIndex !== null && this.previousPlayerIndex !== state.playerIndex) {
          const walkedIntoEarth = previous.board[state.playerIndex]?.type === "earth"
            && previous.board[this.previousPlayerIndex]?.type === "player";
          this.playerSprite = walkedIntoEarth ? "playerDig" : "playerWalk";
          this.animationTime = 0;
        }
        this.lastMoveTick = state.tick;
        this.previousPlayerIndex = state.playerIndex;
      }
      if (this.playerSprite !== "playerIdle" && this.lastRenderTime !== null) {
        this.animationTime += elapsed;
        if (this.animationTime >= 140) this.playerSprite = "playerIdle";
      }
      const easing = 1 - Math.exp(-elapsed / 90);
      this.camera.x = clamp(this.camera.x + (target.x - this.camera.x) * easing, 0, Math.max(0, worldWidth - width));
      this.camera.y = clamp(this.camera.y + (target.y - this.camera.y) * easing, 0, Math.max(0, worldHeight - height));
      const ox = Math.round(Math.max(0, (width - worldWidth) / 2) - this.camera.x);
      const oy = Math.round(Math.max(0, (height - worldHeight) / 2) - this.camera.y);
      if (this.previous !== previous) {
        this.previous = previous;
        this.positions = new Map(previous.board.flatMap((cell, index) => cell.id ? [[cell.id, index]] : []));
      }
      const sprite = (type, x, y, direction) => {
        const index = names.indexOf(type);
        if (index < 0) throw new Error(`Grafik für ${type} fehlt.`);
        const px = Math.round(ox + x * tile);
        const py = Math.round(oy + y * tile);
        if (direction) {
          ctx.save();
          ctx.translate(px + tile / 2, py + tile / 2);
          ctx.rotate(["up", "right", "down", "left"].indexOf(direction) * Math.PI / 2);
          ctx.drawImage(this.image, index * 16, 0, 16, 16, -tile / 2, -tile / 2, tile, tile);
          ctx.restore();
        } else ctx.drawImage(this.image, index * 16, 0, 16, 16, px, py, tile, tile);
      };
      const left = Math.max(0, Math.floor(-ox / tile) - 1);
      const top = Math.max(0, Math.floor(-oy / tile) - 1);
      const right = Math.min(state.width, Math.ceil((width - ox) / tile) + 1);
      const bottom = Math.min(state.height, Math.ceil((height - oy) / tile) + 1);
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) sprite("empty", x, y);

      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
        const cell = state.board[y * state.width + x];
        if (cell.type === "empty" || cell.type === "exit") continue;
        const old = this.positions.get(cell.id);
        let px = x;
        let py = y;
        const enemy = root.Sturzstein.Simulation.isEnemy(cell);
        const canInterpolate = old !== undefined && previous.tick < state.tick
          && (["rock", "gem"].includes(cell.type) || enemy
            || cell.type === "player" && previous.board[state.playerIndex]?.type !== "player");
        if (canInterpolate) {
          const oldX = old % state.width;
          const oldY = Math.floor(old / state.width);
          const start = { x: oldX, y: oldY };
          const end = { x, y };
          const safe = this.safePixel(state, oldX, oldY, x, y);
          if (!safe) {
            px = x;
            py = y;
          } else {
            px = start.x + (end.x - start.x) * alpha;
            py = start.y + (end.y - start.y) * alpha;
          }
        }
        let type = cell.type;
        if (type === "explosion") type = `explosion${cell.remainingTicks}`;
        else if (enemy && state.tick % 2) type += "Step";
        else if (type === "player") type = this.playerSprite;
        else if (type === "gem" && Math.floor((state.tick + cell.id) / 2) % 3 === 0) type = "gemSpark";
        else if (type === "amoeba" && Math.floor((state.tick + cell.id) / 3) % 2) type = "amoebaPulse";
        else if (type === "magicWall") {
          const phase = root.Sturzstein.Simulation.magicWallPhase(state);
          if (phase === "spent") type = "magicWallSpent";
          if (phase === "active") type = state.tick % 2 ? "magicWallActive" : "magicWallFlow";
        }
        sprite(type, px, py, enemy ? cell.direction : null);
        if (cell.type === "magicWall" && cell.blockedAt !== null) {
          const age = state.tick - cell.blockedAt;
          if (age < 5 && age !== 2) sprite("blockedOutlet", px, py);
        }
      }
      const exitType = state.collected >= state.quota
        ? state.tick % 2 ? "openExitGlow" : "openExit" : "exit";
      sprite(exitType,
        state.exitIndex % state.width, Math.floor(state.exitIndex / state.width));
    }
    safePixel(state, fromX, fromY, toX, toY) {
      if (fromX === toX && fromY === toY) return true;
      const steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY)) * 4;
      for (let step = 1; step < steps; step++) {
        const x = Math.round(fromX + (toX - fromX) * step / steps);
        const y = Math.round(fromY + (toY - fromY) * step / steps);
        const cell = state.board[y * state.width + x];
        if (cell.type !== "empty") return false;
      }
      return true;
    }
  }
  (root.Sturzstein ??= {}).Renderer = Renderer;
})(globalThis);
