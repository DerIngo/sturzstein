(function (root) {
  "use strict";
  const neutral = () => ({ direction: null, grab: false, rewind: false, restart: false, pause: false });
  const active = (state) => state.direction || state.grab || state.rewind || state.restart || state.pause;

  function decode(pad, previous = neutral()) {
    const pressed = (index) => Boolean(pad.buttons[index]?.pressed || pad.buttons[index]?.value > 0.5);
    const dpad = [12, 13, 14, 15].some(pressed);
    const x = dpad ? Number(pressed(15)) - Number(pressed(14)) : pad.axes[0] || 0;
    const y = dpad ? Number(pressed(13)) - Number(pressed(12)) : pad.axes[1] || 0;
    const threshold = previous.direction ? 0.25 : 0.35;
    let direction = null;
    if (Math.max(Math.abs(x), Math.abs(y)) >= threshold) {
      if (Math.abs(x) > Math.abs(y)) direction = x < 0 ? "left" : "right";
      else if (Math.abs(y) > Math.abs(x)) direction = y < 0 ? "up" : "down";
      else direction = [x < 0 ? "left" : "right", y < 0 ? "up" : "down"].includes(previous.direction)
        ? previous.direction : y < 0 ? "up" : "down";
    }
    return { direction, grab: pressed(0), rewind: pressed(1), restart: pressed(3), pause: pressed(9) };
  }

  class GamepadInput {
    constructor(read, onStatus, onDisconnect) {
      this.read = read;
      this.onStatus = onStatus;
      this.onDisconnect = onDisconnect;
      this.history = new Map();
      this.index = null;
      this.current = neutral();
      this.queued = null;
      this.releaseRequired = false;
      this.failed = false;
      this.status = null;
    }
    report(message) {
      if (this.status === message) return;
      this.status = message;
      this.onStatus(message);
    }
    clear(requireRelease = false) {
      this.queued = null;
      this.releaseRequired = requireRelease || Boolean(active(this.current));
    }
    disconnect(index) {
      this.history.delete(index);
      if (index !== this.index) return;
      this.index = null;
      this.current = neutral();
      this.queued = null;
      this.releaseRequired = false;
      this.onDisconnect();
    }
    poll(context) {
      if (!this.read) {
        this.report("Gamepad-API nicht verfügbar. Tastatur bleibt nutzbar; versuche einen aktuellen Browser über HTTP/HTTPS.");
        return null;
      }
      if (this.failed) return null;
      let pads;
      try {
        pads = Array.from(this.read()).filter((pad) => pad && pad.connected !== false);
      } catch (error) {
        this.failed = true;
        this.disconnect(this.index);
        this.report(`Gamepad-Zugriff blockiert (${error.name || "Fehler"}). Tastatur bleibt nutzbar; nutze einen lokalen Webserver oder HTTPS.`);
        console.warn("Gamepad-Zugriff fehlgeschlagen:", error);
        return null;
      }
      const standard = pads.filter((pad) => pad.mapping === "standard");
      this.report(standard.length ? "Standard-Gamepad erkannt. A drücken oder eine Richtung bewegen."
        : pads.length ? "Dieses Gamepad hat kein Standard-Mapping und wird nicht verwendet. Bitte Tastatur oder einen Standard-Controller nutzen."
          : "Gamepad anschließen und eine Taste drücken, damit der Browser es erkennt.");
      const snapshots = new Map(standard.map((pad) => [pad.index, decode(pad, this.history.get(pad.index))]));
      if (this.index !== null && !snapshots.has(this.index)) {
        this.disconnect(this.index);
        this.history = snapshots;
        return null;
      }
      const changes = [...snapshots].filter(([index, state]) => {
        const old = this.history.get(index) || neutral();
        return (state.direction && state.direction !== old.direction)
          || ["grab", "rewind", "restart", "pause"].some((key) => state[key] && !old[key]);
      });
      if (changes.length && !this.releaseRequired) this.index = changes[0][0];
      const old = this.history.get(this.index) || neutral();
      this.current = snapshots.get(this.index) || neutral();
      this.history = snapshots;
      if (this.releaseRequired) {
        if (!active(this.current)) this.releaseRequired = false;
        return null;
      }
      if (this.current.direction && (this.current.direction !== old.direction || this.current.grab !== old.grab)) {
        this.queued = { direction: this.current.direction, grab: this.current.grab };
      }
      const fresh = (key) => this.current[key] && !old[key];
      const command = fresh("pause") ? "pause" : fresh("restart") ? "restart"
        : fresh("rewind") ? (context === "play" ? "rewind" : "escape")
          : fresh("grab") && context !== "play" ? "confirm" : null;
      return { activity: changes.some(([index]) => index === this.index), command };
    }
    sample() {
      if (this.releaseRequired) return { direction: null, grab: false, rewind: false };
      const sample = this.queued || this.current;
      this.queued = null;
      return { direction: sample.direction, grab: sample.grab, rewind: this.current.rewind };
    }
  }

  const api = Object.freeze({ decode, GamepadInput });
  (root.Sturzstein ??= {}).Gamepad = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
