"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { decode, GamepadInput } = require("../js/gamepad.js");
const { InputManager } = require("../js/input.js");
function pad(index = 0) {
  return {
    index, connected: true, mapping: "standard", axes: [0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  };
}
function button(p, index, down = true) {
  p.buttons[index] = { pressed: down, value: Number(down) };
}
function competitionPad(index = 0) {
  return { ...pad(index), id: "USB 2A4K GamePad (Vendor: 040b Product: 6533)", mapping: "",
    buttons: Array.from({ length: 4 }, () => ({ pressed: false, value: 0 })) };
}

test("Competition Pro erkennt Chromium-/Firefox-IDs und bildet digitale Achsen sowie alle Knöpfe ab", () => {
  for (const id of ["USB 2A4K GamePad (Vendor: 040b Product: 6533)", "040b-6533-USB 2A4K GamePad"]) {
    const p = competitionPad();
    p.id = id;
    for (const [axes, direction] of [
      [[-1, 0], "left"], [[1, 0], "right"], [[0, -1], "up"], [[0, 1], "down"], [[0, 0], null],
    ]) {
      p.axes = axes;
      assert.equal(decode(p).direction, direction);
    }
    for (const [index, action] of [[0, "grab"], [1, "rewind"], [2, "restart"], [3, "pause"]]) {
      button(p, index);
      assert.deepEqual(decode(p), { direction: null, grab: false, rewind: false,
        restart: false, pause: false, [action]: true });
      button(p, index, false);
    }
    p.mapping = "standard";
    button(p, 3);
    assert.equal(decode(p).restart, true);
    assert.equal(decode(p).pause, false);
  }
});

test("Competition-Pro-Profil akzeptiert keine bloßen Namen, anderen IDs oder unvollständigen Geräte", () => {
  const { input, setPads, statuses } = controller();
  for (const change of [
    { id: "USB 2A4K GamePad" }, { id: "USB 2A4K GamePad (Vendor: 040b Product: 6534)" },
    { id: "040b-65330-USB 2A4K GamePad" }, { id: "040c-6533-USB 2A4K GamePad" },
    { axes: [0] }, { buttons: [] }, { mapping: "xr-standard" },
  ]) {
    const p = { ...competitionPad(), ...change };
    if (p.buttons.length) button(p, 0);
    setPads([p]);
    assert.equal(input.poll("menu").command, null);
    assert.equal(input.sample().grab, false);
    assert.match(statuses.at(-1), /kein unterstütztes Geräteprofil/);
  }
});

test("Standard-Mapping erfasst A/B/Y/Start und Steuerkreuz", () => {
  const p = pad();
  for (const index of [0, 1, 3, 9, 15]) button(p, index);
  assert.deepEqual(decode(p), { direction: "right", grab: true, rewind: true, restart: true, pause: true });
  button(p, 14);
  assert.equal(decode(p).direction, null);
});

test("Stick-Deadzone mit Hysterese; eindeutige Diagonale; Steuerkreuz vor Stick", () => {
  const p = pad();
  p.axes = [0.34, 0.1];
  assert.equal(decode(p).direction, null);
  p.axes = [0.4, 0.1];
  const previous = decode(p);
  assert.equal(previous.direction, "right");
  p.axes = [0.28, 0.1];
  assert.equal(decode(p, previous).direction, "right");
  p.axes = [0.24, 0.1];
  assert.equal(decode(p, previous).direction, null);
  p.axes = [0.7, -0.7];
  assert.equal(decode(p).direction, "up");
  assert.equal(decode(p, previous).direction, "right");
  button(p, 13);
  assert.equal(decode(p, previous).direction, "down");
});

function controller() {
  const p = pad();
  let pads = [p];
  let disconnects = 0;
  const statuses = [];
  const input = new GamepadInput(() => pads, (message) => statuses.push(message), () => disconnects++);
  return { p, input, statuses, remove: () => { pads = []; }, setPads: (next) => { pads = next; }, disconnects: () => disconnects };
}
test("A bestätigt nur im Menü, hält im Spiel die Grabeaktion; B ist kontextabhängig", () => {
  const { p, input } = controller();
  button(p, 0);
  assert.equal(input.poll("menu").command, "confirm");
  assert.equal(input.poll("menu").command, null);
  input.clear();
  assert.deepEqual(input.sample(), { direction: null, grab: false, rewind: false });
  assert.equal(input.poll("play"), null);
  button(p, 0, false);
  input.poll("play");
  button(p, 0);
  button(p, 15);
  assert.equal(input.poll("play").command, null);
  assert.deepEqual(input.sample(), { direction: "right", grab: true, rewind: false });
  button(p, 1);
  assert.equal(input.poll("play").command, "rewind");
  assert.equal(input.sample().rewind, true);
  button(p, 1, false);
  input.poll("menu");
  button(p, 1);
  assert.equal(input.poll("menu").command, "escape");
});

test("Start/Y werden flankengesteuert; Bildschirmwechsel verlangt erst Loslassen", () => {
  const { p, input } = controller();
  button(p, 9);
  assert.equal(input.poll("play").command, "pause");
  input.clear();
  for (let i = 0; i < 10; i++) assert.equal(input.poll("menu"), null);
  button(p, 9, false);
  input.poll("menu");
  button(p, 9);
  assert.equal(input.poll("menu").command, "pause");
  button(p, 9, false);
  button(p, 3);
  assert.equal(input.poll("play").command, "restart");
  assert.equal(input.poll("play").command, null);
});

test("Kurze Controllerbewegung bleibt bis zum Simulationstick gepuffert", () => {
  const { p, input } = controller();
  button(p, 14);
  input.poll("play");
  button(p, 14, false);
  input.poll("play");
  assert.equal(input.sample().direction, "left");
  assert.equal(input.sample().direction, null);
});

test("Aktiver Controllerverlust meldet einmal und leert alle Aktionen", () => {
  const { p, input, remove, disconnects } = controller();
  button(p, 15);
  input.poll("play");
  remove();
  input.poll("play");
  input.poll("play");
  assert.equal(disconnects(), 1);
  assert.deepEqual(input.sample(), { direction: null, grab: false, rewind: false });
});

test("Andere Controller trennen pausiert nicht; neue Geräte funktionieren ohne Neuladen", () => {
  const { p, input, setPads, disconnects } = controller();
  const second = pad(2);
  setPads([p, null, second]);
  button(second, 0);
  input.poll("menu");
  input.disconnect(0);
  assert.equal(disconnects(), 0);
  setPads([]);
  input.poll("menu");
  assert.equal(disconnects(), 1);
  setPads([p]);
  button(p, 0);
  assert.equal(input.poll("menu").command, "confirm");
});

test("Unbekanntes Mapping und fehlende API werden sichtbar erklärt, ohne Eingabe zu liefern", () => {
  const { p, input, statuses } = controller();
  p.mapping = "";
  button(p, 0);
  input.poll("menu");
  assert.match(statuses.at(-1), /kein Standard-Mapping/);
  assert.equal(input.sample().direction, null);
  const messages = [];
  const missing = new GamepadInput(null, (text) => messages.push(text), () => {});
  missing.poll("menu");
  missing.poll("menu");
  assert.equal(messages.length, 1);
  assert.match(messages[0], /nicht verfügbar.*Tastatur/);
});

test("Blockierte API meldet den Fehler statt Erfolg; trennt aktiven Controller", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  let fail = false;
  let disconnects = 0;
  const p = pad();
  const messages = [];
  const input = new GamepadInput(() => {
    if (fail) { const error = new Error("blocked"); error.name = "SecurityError"; throw error; }
    return [p];
  }, (text) => messages.push(text), () => disconnects++);
  button(p, 0);
  input.poll("menu");
  fail = true;
  input.poll("menu");
  input.poll("menu");
  assert.match(messages.at(-1), /SecurityError.*Webserver/);
  assert.equal(warn.mock.calls.length, 1);
  assert.equal(disconnects, 1);
});

function manager(pads = [pad()]) {
  const handlers = {};
  const p = pads[0];
  const commands = [];
  const devices = [];
  const profiles = [];
  let disconnects = 0;
  const input = new InputManager({ addEventListener: (type, handler) => { handlers[type] = handler; } },
    { getGamepads: () => pads }, {
      onCommand: (...args) => commands.push(args),
      onDevice: (device, profile) => { devices.push(device); profiles.push(profile); },
      onStatus() {}, onDisconnect: () => disconnects++,
    });
  const key = (code) => handlers.keydown({ code, preventDefault() {} });
  return { input, p, handlers, commands, devices, profiles, key, disconnects: () => disconnects };
}
test("Profilhinweise wechseln zwischen Competition Pro und Standard-Gamepad ohne Geräteklassenwechsel", () => {
  const standard = pad();
  const competition = competitionPad(1);
  const { input, profiles, commands } = manager([standard, competition]);
  button(standard, 0);
  input.update(0);
  assert.equal(profiles.at(-1), "standard");
  button(standard, 0, false);
  input.update(16);
  button(competition, 0);
  input.update(32);
  assert.equal(profiles.at(-1), "competition-pro");
  assert.deepEqual(commands, [["confirm"], ["confirm"]]);
  button(competition, 0, false);
  input.update(48);
  button(standard, 0);
  input.update(64);
  assert.equal(profiles.at(-1), "standard");
});
test("Gerätewechsel verhindert klemmende Tasten und überlässt Tastatur/Maus die Kontrolle", () => {
  const { input, p, key, devices, handlers } = manager();
  input.setContext("play");
  key("ArrowLeft");
  assert.equal(input.sample().direction, "left");
  button(p, 15);
  input.update(0);
  assert.equal(input.sample().direction, "right");
  assert.equal(devices.at(-1), "gamepad");
  key("ArrowUp");
  input.update(16);
  assert.equal(input.sample().direction, "up");
  assert.equal(devices.at(-1), "keyboard");
  handlers.pointerdown();
  assert.equal(input.sample().direction, null);
  assert.equal(devices.at(-1), "mouse");
});

test("Menünavigation wiederholt kontrolliert statt pro Renderframe", () => {
  const { input, key, commands, handlers } = manager();
  key("ArrowDown");
  for (const now of [0, 16, 100, 349, 350, 400, 500]) input.update(now);
  assert.deepEqual(commands, Array(3).fill(["navigate", "down"]));
  handlers.keyup({ code: "ArrowDown" });
  input.update(600);
  key("ArrowUp");
  input.update(610);
  assert.deepEqual(commands.at(-1), ["navigate", "up"]);
});

test("Rückspulen/Ton sind abstrakte Aktionen, keine vorgetäuschten Funktionen", () => {
  const { input, key, commands, handlers } = manager();
  input.setContext("play");
  key("KeyZ");
  assert.equal(input.sample().rewind, true);
  handlers.keyup({ code: "KeyZ" });
  key("KeyU");
  key("KeyM");
  assert.deepEqual(commands, [["rewind"], ["rewind"], ["mute"]]);
  input.clear();
  assert.equal(input.sample().rewind, false);
});

test("Fokusunterbrechung verlangt Loslassen, auch bei zuvor neutralem Controller", () => {
  const { input, p, commands } = manager();
  button(p, 0);
  input.update(0);
  button(p, 0, false);
  input.update(16);
  input.suspend();
  button(p, 0);
  input.update(32);
  input.update(48);
  assert.deepEqual(commands, [["confirm"]]);
  button(p, 0, false);
  input.update(64);
  button(p, 0);
  input.update(80);
  assert.deepEqual(commands, [["confirm"], ["confirm"]]);
});
