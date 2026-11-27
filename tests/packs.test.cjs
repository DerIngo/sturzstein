"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Packs = require("../js/packs");
const Levels = require("../js/levels");
const Storage = require("../js/storage");
const Sim = require("../js/simulation");
const Replay = require("../js/replay");
const builtin = require("../levels/einstieg.json");
const custom = () => Levels.validatePack({ ...structuredClone(builtin), id: "zusatz" });
function setup() {
  let text = null;
  const disk = { getItem: () => text, setItem: (key, value) => { text = value; } };
  return { disk, load: () => new Storage.SaveStore(() => disk, [builtin], () => {}) };
}
test("Import, Fortsetzen, kompatibles Ersetzen und Entfernen bleiben gemeinsam gespeichert", () => {
  const env = setup();
  let store = env.load();
  const pack = custom();
  assert.equal(store.importPack(pack), true);
  assert.equal(store.data.progress.filter((p) => p.packId === pack.id && p.unlocked).length, 5);
  const state = Sim.createState(pack, pack.levels[0].id);
  const recorder = new Replay.Recorder(pack, state.levelId);
  Sim.step(state, recorder.record({ direction: "right", grab: false }));
  store.capture(pack, state, recorder);
  store = env.load();
  assert.deepEqual(store.restored.state, state);
  const reordered = structuredClone(pack);
  reordered.revision++;
  reordered.levels.reverse();
  store.importPack(reordered);
  assert.deepEqual(env.load().restored.state, state);
  const changed = structuredClone(reordered);
  changed.revision++;
  const level = changed.levels.find((l) => l.id === state.levelId);
  level.revision++; level.seed++;
  store.importPack(changed);
  assert.equal(env.load().restored, null);
  store.removePack(pack.id);
  assert.equal(env.load().packs.length, 1);
  assert.equal(env.load().data.progress.some((p) => p.packId === pack.id), false);
});
test("Schutz integrierter Packs, Revisionen und Sammlungsgrenzen", () => {
  const env = setup(), store = env.load(), pack = custom();
  assert.throws(() => store.importPack(builtin), /geschützt/);
  assert.throws(() => store.removePack(builtin.id), /geschützt/);
  store.importPack(pack);
  const bad = structuredClone(pack);
  bad.levels[0].seed++;
  bad.revision++;
  assert.throws(() => store.importPack(bad), /Levelrevision/);
  assert.throws(() => Packs.validateCollection([pack, pack], [builtin]), /Doppelte/);
  assert.throws(() => Packs.validateCollection(Array(21).fill(pack), [builtin]), /20/);
  assert.throws(() => Packs.replacement(pack, {...pack, title:"neu"}), /Packrevision/);
});
test("Speicherfehler lassen Import temporär nutzbar und schützen vorhandene Daten", () => {
  const env = setup(), store = env.load();
  store.persist();
  const old = env.disk.getItem();
  env.disk.setItem = () => { throw new Error("voll"); };
  assert.equal(store.importPack(custom()), false);
  assert.equal(store.packs.length, 2);
  assert.equal(env.disk.getItem(), old);
  assert.match(store.message, /Nicht gespeichert/);
});
test("Datei- und Sammlungsvalidierung weisen fremde Versionen, doppelte IDs und übergroße Daten ab", () => {
  const pack = custom();
  assert.throws(() => Levels.parsePack(JSON.stringify({...pack, formatVersion: 9}), "falsch.json"), /falsch.json.*Version/);
  assert.throws(() => Levels.parsePack(" ".repeat(Levels.limits.bytes + 1), "gross.json"), /gross.json.*1 MiB/);
  const duplicates = structuredClone(pack);
  duplicates.levels.push(duplicates.levels[0]);
  assert.throws(() => Packs.validateCollection([duplicates], [builtin]), /Doppelte Level-ID/);
  const large = structuredClone(pack);
  large.levels = Array.from({length:4}, (_,i) => ({...large.levels[0],id:"gross-"+i,width:128,height:128,
    map:Array.from({length:128},(_,y)=>y===0||y===127?"#".repeat(128):y===1?"#@X"+".".repeat(124)+"#":"#"+".".repeat(126)+"#")}));
  assert.throws(() => Packs.validateCollection([large,{...large,id:"zweites"},{...large,id:"drittes"}], [builtin]), /131.072/);
});
test("Beschädigte gespeicherte Sammlung sperrt Schreiben und bewahrt die Originaldaten", () => {
  const env = setup(), store = env.load();
  store.importPack(custom());
  const bad = JSON.parse(env.disk.getItem());
  bad.importedPacks.push(bad.importedPacks[0]);
  env.disk.setItem(Storage.KEY, JSON.stringify(bad));
  const original = env.disk.getItem();
  const warn = console.warn;
  console.warn = () => {};
  try {
    const loaded = env.load();
    assert.equal(loaded.blocked, true);
    assert.equal(loaded.persist(), false);
    assert.equal(env.disk.getItem(), original);
  } finally { console.warn = warn; }
});
