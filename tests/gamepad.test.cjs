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

function manager() {
  const handlers = {};
  const p = pad();
  const commands = [];
  const devices = [];
  let disconnects = 0;
  const input = new InputManager({ addEventListener: (type, handler) => { handlers[type] = handler; } },
    { getGamepads: () => [p] }, {
      onCommand: (...args) => commands.push(args),
      onDevice: (device) => devices.push(device), onStatus() {}, onDisconnect: () => disconnects++,
    });
  const key = (code) => handlers.keydown({ code, preventDefault() {} });
  return { input, p, handlers, commands, devices, key, disconnects: () => disconnects };
}
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
