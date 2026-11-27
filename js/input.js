(function (root) {
  "use strict";
  const directions = {
    ArrowUp: "up", KeyW: "up", ArrowRight: "right", KeyD: "right",
    ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left",
  };
  class KeyboardInput {
    constructor(target, onCommand) {
      this.clear();
      this.down = (event) => {
        if (event.target?.closest?.("input, textarea, select, [contenteditable=true]") || event.ctrlKey || event.metaKey || event.altKey) return;
        const code = event.code;
        const command = { Escape: "escape", KeyP: "pause", KeyR: "restart", Enter: "confirm" }[code];
        if ((code === "Enter" || code === "Space") && event.target?.closest?.("button, a")) return;
        if (!directions[code] && !command && !["Space", "ShiftLeft", "ShiftRight"].includes(code)) return;
        event.preventDefault();
        if (event.repeat) return;
        this.keys.delete(code);
        this.keys.set(code, true);
        if (directions[code]) this.queued = { direction: directions[code], grab: this.grabbing() };
        if (command) onCommand(command);
      };
      this.up = (event) => { this.keys.delete(event.code); };
      target.addEventListener("keydown", this.down);
      target.addEventListener("keyup", this.up);
    }
    clear() { this.keys = new Map(); this.queued = null; }
    grabbing() { return ["Space", "ShiftLeft", "ShiftRight"].some((key) => this.keys.has(key)); }
    sample() {
      if (this.queued) {
        const input = this.queued;
        this.queued = null;
        return input;
      }
      const key = [...this.keys.keys()].reverse().find((code) => directions[code]);
      return { direction: key ? directions[key] : null, grab: this.grabbing() };
    }
  }
  (root.Sturzstein ??= {}).KeyboardInput = KeyboardInput;
  if (typeof module !== "undefined" && module.exports) module.exports = KeyboardInput;
})(globalThis);
