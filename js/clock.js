(function (root) {
  "use strict";
  class FixedClock {
    constructor(step, onInterruption) {
      this.step = step;
      this.onInterruption = onInterruption;
      this.reset(0);
    }
    reset(now) {
      this.last = now;
      this.accumulator = 0;
    }
    frame(now, active) {
      if (!active) { this.reset(now); return 1; }
      const elapsed = now - this.last;
      this.last = now;
      if (elapsed < 0 || elapsed > 250) {
        this.accumulator = 0;
        this.onInterruption();
        return 1;
      }
      this.accumulator += elapsed;
      while (this.accumulator >= 100) {
        this.accumulator -= 100;
        this.step();
      }
      return this.accumulator / 100;
    }
  }
  (root.Sturzstein ??= {}).FixedClock = FixedClock;
  if (typeof module !== "undefined" && module.exports) module.exports = FixedClock;
})(globalThis);
