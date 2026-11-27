(function (root) {
  "use strict";
  const directions = {
    ArrowUp: "up", KeyW: "up", ArrowRight: "right", KeyD: "right",
    ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left",
  };
  class KeyboardInput {
    constructor(target, onCommand, onActivity = () => {}) {
      this.clear();
      this.down = (event) => {
        if (event.target?.closest?.("input, textarea, select, [contenteditable=true]") || event.ctrlKey || event.metaKey || event.altKey) return;
        const code = event.code;
        if (code === "Tab") { onActivity(); return; }
        const command = {
          Escape: "escape", KeyP: "pause", KeyR: "restart", Enter: "confirm",
          KeyM: "mute", KeyZ: "rewind", KeyU: "rewind", Space: "action",
        }[code];
        if ((code === "Enter" || code === "Space") && event.target?.closest?.("button, a")) {
          onActivity();
          if (event.repeat) event.preventDefault();
          return;
        }
        if (!directions[code] && !command && !["Space", "ShiftLeft", "ShiftRight"].includes(code)) return;
        event.preventDefault();
        if (event.repeat) return;
        onActivity();
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
    rewinding() { return this.keys.has("KeyZ") || this.keys.has("KeyU"); }
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
  class InputManager {
    constructor(target, navigator, { onCommand, onDevice, onStatus, onDisconnect }) {
      const { GamepadInput } = root.Sturzstein?.Gamepad ?? require("./gamepad.js");
      this.device = "keyboard";
      this.profile = null;
      this.context = "menu";
      this.onCommand = onCommand;
      this.onDevice = onDevice;
      this.menuDirection = null;
      this.nextRepeat = 0;
      this.keyboard = new KeyboardInput(target, (command) => {
        if (command === "action") {
          if (this.context === "menu" || this.context === "lost") onCommand("confirm");
        } else onCommand(command);
      }, () => this.use("keyboard"));
      this.gamepad = new GamepadInput(
        typeof navigator.getGamepads === "function" ? () => navigator.getGamepads() : null,
        onStatus,
        () => {
          if (this.device === "gamepad") {
            this.use("keyboard");
            onDisconnect();
          }
        },
      );
      target.addEventListener("pointerdown", () => this.use("mouse"));
      target.addEventListener("gamepaddisconnected", (event) => this.gamepad.disconnect(event.gamepad.index));
      target.addEventListener("gamepadconnected", () => { this.gamepad.failed = false; });
      onDevice(this.device);
    }
    use(device) {
      const profile = device === "gamepad" ? this.gamepad.profile?.id : null;
      if (this.device === device && this.profile === profile) return;
      this.device = device;
      this.profile = profile;
      this.menuDirection = null;
      if (device !== "keyboard") this.keyboard.clear();
      if (device !== "gamepad") this.gamepad.clear();
      this.onDevice(device, profile);
    }
    clear() {
      this.keyboard.clear();
      this.gamepad.clear();
      this.menuDirection = null;
      this.nextRepeat = 0;
    }
    suspend() {
      this.clear();
      this.gamepad.clear(true);
    }
    setContext(context, { preserveHeld = false } = {}) {
      this.context = context;
      if (!preserveHeld) this.clear();
      else {
        this.keyboard.queued = null;
        this.gamepad.queued = null;
        this.menuDirection = null;
        this.nextRepeat = 0;
      }
    }
    update(now) {
      const result = this.gamepad.poll(this.context);
      if (result?.activity) this.use("gamepad");
      if (result?.command) {
        this.onCommand(result.command);
        return;
      }
      if (this.context !== "menu" && this.context !== "lost") return;
      const { direction } = this.sample();
      if (!direction) { this.menuDirection = null; return; }
      if (direction !== this.menuDirection) {
        this.menuDirection = direction;
        this.nextRepeat = now + 350;
        this.onCommand("navigate", direction);
      } else if (now >= this.nextRepeat) {
        this.nextRepeat = now + 150;
        this.onCommand("navigate", direction);
      }
    }
    sample() {
      if (this.device === "gamepad") return this.gamepad.sample();
      return { ...this.keyboard.sample(), rewind: this.keyboard.rewinding() };
    }
    rewinding() {
      return this.device === "gamepad" ? this.gamepad.rewinding() : this.keyboard.rewinding();
    }
  }
  (root.Sturzstein ??= {}).KeyboardInput = KeyboardInput;
  root.Sturzstein.InputManager = InputManager;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = KeyboardInput;
    module.exports.InputManager = InputManager;
  }
})(globalThis);
