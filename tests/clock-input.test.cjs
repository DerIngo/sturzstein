"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const FixedClock = require("../js/clock.js");
const Input = require("../js/input.js");
const Sim = require("../js/simulation.js");
const pack = require("../levels/einstieg.json");

test("Verschiedene Renderintervalle erzeugen dieselben Tickzustände", () => {
  function run(intervals) {
    const state = Sim.createState(pack, pack.levels[0].id);
    const clock = new FixedClock(() => Sim.step(state, { direction: "right", grab: false }), () => assert.fail("Unerwartete Pause"));
    let time = 0;
    for (const delta of intervals) { time += delta; clock.frame(time, true); }
    return state;
  }
  const expected = run(Array(60).fill(100));
  assert.deepEqual(run(Array(600).fill(10)), expected);
  assert.deepEqual(run(Array(150).fill([13, 27]).flat()), expected);
});

test("Pause und Unterbrechung holen keine alten Simulationsticks nach", () => {
  let ticks = 0;
  let interruptions = 0;
  const clock = new FixedClock(() => ticks++, () => interruptions++);
  clock.frame(90, true);
  clock.frame(10000, false);
  clock.reset(11000);
  clock.frame(11010, true);
  assert.equal(ticks, 0);
  clock.frame(11100, true);
  assert.equal(ticks, 1);
  clock.frame(16000, true);
  assert.equal(ticks, 1);
  assert.equal(interruptions, 1);
});

function keyboard() {
  const handlers = {};
  const commands = [];
  const input = new Input({ addEventListener: (name, handler) => { handlers[name] = handler; } }, (command) => commands.push(command));
  function event(code, extra = {}) {
    return { code, preventDefault() { this.prevented = true; }, ...extra };
  }
  return { input, handlers, commands, event };
}
test("Kurzer Tastendruck wird gepuffert; gehaltene Richtungen sind eindeutig", () => {
  const { input, handlers, event } = keyboard();
  handlers.keydown(event("KeyD"));
  handlers.keyup(event("KeyD"));
  assert.deepEqual(input.sample(), { direction: "right", grab: false });
  assert.deepEqual(input.sample(), { direction: null, grab: false });
  handlers.keydown(event("ArrowLeft"));
  handlers.keydown(event("ArrowUp"));
  assert.equal(input.sample().direction, "up");
  handlers.keyup(event("ArrowUp"));
  assert.equal(input.sample().direction, "left");
  input.clear();
  assert.equal(input.sample().direction, null);
});
test("Aktionskombination, nicht wiederholte Menüaktionen und ungestörte Eingabefelder", () => {
  const { input, handlers, commands, event } = keyboard();
  handlers.keydown(event("ShiftLeft"));
  handlers.keydown(event("KeyD"));
  assert.deepEqual(input.sample(), { direction: "right", grab: true });
  handlers.keydown(event("KeyP"));
  handlers.keydown(event("KeyP", { repeat: true }));
  assert.deepEqual(commands, ["pause"]);
  const typing = event("KeyR", { target: { closest: () => true } });
  handlers.keydown(typing);
  assert.equal(typing.prevented, undefined);
  assert.deepEqual(commands, ["pause"]);
});
