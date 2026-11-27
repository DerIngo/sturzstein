(function (root) {
  "use strict";
  const Simulation = root.Sturzstein?.Simulation ?? require("./simulation.js");
  const interval = 10;
  const capacity = 11;

  class RewindHistory {
    constructor(state) {
      this.originTick = state.tick;
      this.currentTick = state.tick;
      this.checkpoints = [{ tick: state.tick, json: JSON.stringify(state) }];
      this.inputs = [];
    }
    get availableTicks() { return this.currentTick - this.checkpoints[0].tick; }
    push(state, input) {
      if (state.tick !== this.currentTick + 1) throw new Error("Rückspulverlauf: Aufeinanderfolgender Tick erwartet.");
      if (!input || !(input.direction === null || Object.hasOwn(Simulation.directions, input.direction))
        || typeof input.grab !== "boolean") throw new Error("Rückspulverlauf: Ungültige Tick-Eingabe.");
      this.inputs.push({ direction: input.direction, grab: input.grab });
      this.currentTick = state.tick;
      if ((state.tick - this.originTick) % interval === 0) {
        this.checkpoints.push({ tick: state.tick, json: JSON.stringify(state) });
        if (this.checkpoints.length > capacity) {
          this.checkpoints.shift();
          this.inputs.splice(0, interval);
        }
      }
    }
    back() {
      if (!this.availableTicks) return null;
      const target = this.currentTick - 1;
      const checkpoint = this.checkpoints.findLast((entry) => entry.tick <= target);
      const restored = JSON.parse(checkpoint.json);
      const firstTick = this.checkpoints[0].tick;
      for (let tick = checkpoint.tick; tick < target; tick++) {
        Simulation.step(restored, this.inputs[tick - firstTick]);
      }
      this.currentTick = target;
      this.inputs.pop();
      while (this.checkpoints.at(-1).tick > target) this.checkpoints.pop();
      return restored;
    }
  }

  const api = Object.freeze({ RewindHistory, interval, capacity });
  (root.Sturzstein ??= {}).Rewind = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
