const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const Replay = require("../../js/replay.js");
const Sim = require("../../js/simulation.js");
const { KEY: storageKey } = require("../../js/storage.js");
const pack = require("../../levels/einstieg.json");
const solution = require("../../replays/sturzstein-einstieg/erste-schritte.json");
const root = path.resolve(__dirname, "../..");
let server;
let origin;

async function downloadReplay(page, activate = () => page.locator("#replay-export").click()) {
  const pending = page.waitForEvent("download");
  await activate();
  const download = await pending;
  const replay = Replay.parseReplay(await fs.promises.readFile(await download.path(), "utf8"));
  expect(download.suggestedFilename()).toBe(`${replay.packId}--${replay.levelId}.replay.json`);
  return replay;
}

async function observeSimulation(page) {
  await page.evaluate(() => {
    const original = window.Sturzstein.Simulation;
    window.Sturzstein.Simulation = {
      ...original,
      createState(...args) {
        const state = original.createState(...args);
        window.testState = structuredClone(state);
        return state;
      },
      step(...args) {
        const state = original.step(...args);
        window.testState = structuredClone(state);
        return state;
      },
    };
    const history = window.Sturzstein.Rewind.RewindHistory.prototype;
    const originalBack = history.back;
    history.back = function () {
      const state = originalBack.call(this);
      if (state) window.testState = structuredClone(state);
      return state;
    };
  });
}

async function advanceTicks(page, count, fromTick) {
  const target = (fromTick ?? await page.evaluate(() => window.testState.tick)) + count;
  await page.clock.runFor(Math.max(0, count * 100 - 16));
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await page.evaluate(() => window.testState?.tick) >= target) break;
    await page.clock.runFor(16);
  }
  expect(await page.evaluate(() => window.testState?.tick)).toBe(target);
}

async function rewindTicks(page, count) {
  const target = await page.evaluate(() => window.testState.tick) - count;
  await page.clock.runFor(Math.max(0, count * 100 - 16));
  for (let attempt = 0; attempt < 5; attempt++) {
    if (await page.evaluate(() => window.testState.tick) <= target) break;
    await page.clock.runFor(16);
  }
  expect(await page.evaluate(() => window.testState.tick)).toBe(target);
}

test.beforeAll(async () => {
  server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    const filename = path.resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    if (!filename.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    fs.readFile(filename, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
      response.writeHead(200, { "Content-Type": mime[path.extname(filename)] || "application/octet-stream" }).end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => { await new Promise((resolve) => server.close(resolve)); });

test("Fehler vor dem ersten Simulationszustand bleiben ohne HUD-Folgefehler sichtbar", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/js/level-bundle.js", (route) => route.fulfill({
    contentType: "text/javascript", body: "globalThis.Sturzstein.packs = [{}];",
  }));
  await page.goto(origin);
  await expect(page.locator("#dialog-title")).toHaveText("Start nicht möglich");
  await expect(page.locator("#status")).toContainText("Pflichtfeld fehlt");
  await expect(page.locator("#primary")).toBeDisabled();
  expect(errors).toEqual([]);
});

for (const protocol of ["file", "http"]) {
  test(`startet über ${protocol} ohne externe Anfragen`, async ({ page }) => {
    const errors = [];
    const external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (!r.url().startsWith("file:") && !r.url().startsWith(origin + "/")) external.push(r.url());
    });
    await page.goto(protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin);
    await expect(page.locator("#primary")).toBeEnabled();
    await expect(page.locator("#dialog-title")).toHaveText("Sturzstein");
    await expect(page.locator("#status")).toContainText("Noch 3 Edelsteine");
    await page.locator("#primary").click();
    await expect(page.locator("#overlay")).toBeHidden();
    await expect(page.locator("#board")).toBeFocused();
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });

  test(`Höhle über ${protocol}: Sieg, Tod, Pause und Neustart`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
    await page.goto(protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin);
    await expect(page.locator("#primary")).toBeEnabled();
    await observeSimulation(page);
    await page.locator("#primary").click();
    async function ticks(key, count) {
      if (key) await page.keyboard.down(key);
      await advanceTicks(page, count);
      if (key) await page.keyboard.up(key);
    }

    for (const { direction, ticks: count } of solution.inputs) {
      await ticks({ right: "ArrowRight", down: "ArrowDown", left: "ArrowLeft", up: "ArrowUp" }[direction], count);
    }
    await expect(page.locator("#dialog-title")).toHaveText("Ausgang erreicht!");
    await expect(page.locator("#gems")).toHaveText("3 / 3");
    await expect(page.locator("#progress-status")).toContainText(`1 / ${pack.levels.length} gelöst`);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).bests[0].usedRewind, storageKey)).toBe(false);
    expect(await page.evaluate(() => window.testState.status)).toBe("won");
    const wonReplay = await downloadReplay(page);
    expect(Replay.play(pack, wonReplay).state).toEqual(await page.evaluate(() => window.testState));
    await page.locator("#primary").click();
    expect(await page.evaluate(() => window.testState.tick)).toBe(0);

    await ticks("ArrowRight", 1);
    await ticks("ArrowDown", 4);
    await ticks("ArrowRight", 1);
    await ticks("ArrowDown", 1);
    await ticks(null, 1);
    await expect(page.locator("#dialog-text")).toContainText("fallender Fels");
    expect(await page.evaluate(() => window.testState.status)).toBe("lost");
    await page.keyboard.press("Enter");

    await ticks("ArrowRight", 1);
    await page.keyboard.press("Escape");
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    const paused = await page.evaluate(() => window.testState);
    await page.clock.runFor(5000);
    expect(await page.evaluate(() => window.testState)).toEqual(paused);
    const pausedReplay = await downloadReplay(page);
    expect(Replay.play(pack, pausedReplay, { requireWin: false }).state).toEqual(paused);
    expect(pausedReplay.inputs.reduce((sum, input) => sum + input.ticks, 0)).toBe(paused.tick);
    await page.locator("#primary").click();
    await page.keyboard.press("KeyR");
    await expect(page.locator("#dialog-title")).toHaveText("Neu beginnen?");
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => window.testState)).toEqual(paused);
    await page.keyboard.press("KeyR");
    await page.locator("#primary").click();
    expect(await page.evaluate(() => window.testState.tick)).toBe(0);

    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    const beforeFocus = await page.evaluate(() => window.testState);
    await page.clock.runFor(10000);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    expect(await page.evaluate(() => window.testState)).toEqual(beforeFocus);
    await expect(page.locator("#overlay")).toBeVisible();
    await page.keyboard.press("Enter");
    await ticks(null, 1);
    expect(await page.evaluate(() => window.testState.remainingTicks)).toBe(1199);
    expect(errors).toEqual([]);
  });

  test(`Rückspulen über ${protocol}: zehn Sekunden, Niederlage, Replay-Verzweigung und Fokusverlust`, async ({ page }) => {
    await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
    await page.goto(protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin);
    await expect(page.locator("#primary")).toBeEnabled();
    await observeSimulation(page);
    await page.locator("#primary").click();
    await page.keyboard.down("KeyZ");
    await page.clock.runFor(1000);
    expect(await page.evaluate(() => window.testState.tick)).toBe(0);
    await expect(page.locator("#rewind-status")).toContainText("Ohne Rückspulen");
    await page.keyboard.up("KeyZ");
    await page.clock.runFor(16);
    await advanceTicks(page, 10);
    const early = await page.evaluate(() => window.testState);
    await advanceTicks(page, 100);
    async function move(direction, ticks) {
      const key = { right: "ArrowRight", down: "ArrowDown", left: "ArrowLeft", up: "ArrowUp" }[direction];
      await page.keyboard.down(key);
      await advanceTicks(page, ticks);
      await page.keyboard.up(key);
    }
    await move("right", 3);
    await move("down", 1);
    await expect(page.locator("#gems")).toHaveText("1 / 3");
    await page.keyboard.down("KeyU");
    await rewindTicks(page, 104);
    expect(await page.evaluate(() => window.testState)).toEqual(early);
    await expect(page.locator("#rewind-time")).toHaveText("0,0 s");
    await expect(page.locator("#rewind-status")).toContainText("Mit Rückspulen");
    await page.clock.runFor(500);
    expect(await page.evaluate(() => window.testState)).toEqual(early);
    await page.keyboard.up("KeyU");
    await page.clock.runFor(16);
    for (const input of solution.inputs) await move(input.direction, input.ticks);
    await expect(page.locator("#dialog-title")).toHaveText("Ausgang erreicht!");
    const replay = await downloadReplay(page);
    expect(replay.usedRewind).toBe(true);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).bests[0].usedRewind, storageKey)).toBe(true);
    expect(Replay.play(pack, replay).state).toEqual(await page.evaluate(() => window.testState));
    await page.locator("#primary").click();
    await expect(page.locator("#rewind-status")).toContainText("Ohne Rückspulen");
    await expect(page.locator("#rewind-time")).toHaveText("0,0 s");
    for (const [direction, count] of [["right", 1], ["down", 4], ["right", 1], ["down", 1]]) await move(direction, count);
    const beforeDeath = await page.evaluate(() => window.testState);
    await advanceTicks(page, 1);
    await expect(page.locator("#dialog-title")).toHaveText("Verschüttet?");
    await page.keyboard.down("KeyZ");
    await rewindTicks(page, 1);
    expect(await page.evaluate(() => window.testState)).toEqual(beforeDeath);
    await expect(page.locator("#overlay")).toBeHidden();
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    await page.clock.runFor(2000);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.clock.runFor(200);
    expect(await page.evaluate(() => window.testState)).toEqual(beforeDeath);
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    await page.keyboard.up("KeyZ");
    await page.locator("#primary").click();
    await move("left", 1);
    expect(await page.evaluate(() => window.testState.status)).toBe("playing");
  });

  test(`Gegnerhöhlen über ${protocol}: Wechsel, Explosionskette, Rückspulen, Fortsetzen und Siege`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
    await page.goto(protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin);
    await expect(page.locator("#primary")).toBeEnabled();
    await observeSimulation(page);
    await page.locator("#next-level").click();
    await expect(page.locator("#dialog-title")).toHaveText("Höhle wechseln?");
    await page.locator("#secondary").click();
    await expect(page.locator("#level-name")).toContainText(pack.levels[0].name);
    await expect(page.locator("#dialog-title")).toHaveText("Sturzstein");

    for (const levelId of ["glutkaefer-tor", "kristallkette"]) {
      const solution = require(`../../replays/sturzstein-einstieg/${levelId}.json`);
      const commands = solution.inputs.flatMap((block) => Array.from({ length: block.ticks }, () => ({
        direction: block.direction, grab: block.grab,
      })));
      const level = pack.levels.find((entry) => entry.id === levelId);
      await page.locator("#next-level").click();
      await expect(page.locator("#dialog-text")).toContainText(level.description);
      await page.locator("#primary").click();
      await expect(page.locator("#level-name")).toContainText(level.name);
      async function tick(input) {
        const key = { up: "ArrowUp", right: "ArrowRight", down: "ArrowDown", left: "ArrowLeft" }[input.direction];
        if (input.grab) await page.keyboard.down("Space");
        if (key) await page.keyboard.down(key);
        await advanceTicks(page, 1);
        if (key) await page.keyboard.up(key);
        if (input.grab) await page.keyboard.up("Space");
      }
      for (const input of commands.slice(0, 9)) await tick(input);
      const explosion = await page.evaluate(() => window.testState);
      expect(explosion.board.some((cell) => cell.type === "explosion")).toBe(true);
      await page.keyboard.down("KeyZ");
      await rewindTicks(page, 1);
      expect(await page.evaluate(() => window.testState.board.some((cell) => cell.type === "explosion"))).toBe(false);
      await page.keyboard.up("KeyZ");
      await page.clock.runFor(16);
      await tick(commands[8]);
      expect(await page.evaluate(() => window.testState)).toEqual(explosion);
      await page.keyboard.press("KeyP");
      const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).session, storageKey);
      expect(saved.state).toEqual(explosion);
      expect(saved.replay.usedRewind).toBe(true);
      await page.locator("#next-level").click();
      await page.locator("#secondary").click();
      await expect(page.locator("#dialog-title")).toHaveText("Pause");
      expect(await page.evaluate(() => window.testState)).toEqual(explosion);
      await page.reload();
      await expect(page.locator("#dialog-title")).toHaveText("Partie fortsetzen?");
      await expect(page.locator("#level-name")).toContainText(level.name);
      await expect(page.locator("#rewind-time")).toHaveText("0,0 s");
      await page.locator("#next-level").click();
      await page.locator("#secondary").click();
      await expect(page.locator("#dialog-title")).toHaveText("Partie fortsetzen?");
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).session, storageKey)).toEqual(saved);
      await observeSimulation(page);
      await page.locator("#primary").click();
      await page.clock.runFor(128);
      const expected = structuredClone(explosion);
      Sim.step(expected, commands[9]);
      expect(await page.evaluate(() => window.testState)).toEqual(expected);
      for (const input of commands.slice(10)) await tick(input);
      await expect(page.locator("#dialog-title")).toHaveText("Ausgang erreicht!");
      const replay = await downloadReplay(page);
      expect(replay.levelId).toBe(levelId);
      expect(replay.usedRewind).toBe(true);
      expect(Replay.play(pack, replay).state).toEqual(await page.evaluate(() => window.testState));
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).session, storageKey)).toBe(null);
    }
    await expect(page.locator("#progress-status")).toContainText(`2 / ${pack.levels.length} gelöst`);
    await expect(page.locator("#next-level")).toContainText("Die grüne Kammer");
    expect(errors).toEqual([]);
  });

  test(`Amöbe und Umwandlungswand über ${protocol}: Freischalten, Spielen, Fortsetzen und Replayexport`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const oldLevel = "kristallkette";
    const profile = {
      formatVersion: 1, settings: { showHints: true }, bests: [],
      progress: pack.levels.slice(0, 3).map((l, i) => ({ packId: pack.id, levelId: l.id, solved: i === 0, unlocked: true })),
      session: { state: Sim.createState(pack, oldLevel), replay: new Replay.Recorder(pack, oldLevel).replay },
    };
    await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
    await page.addInitScript(({ key, profile }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(profile));
    }, { key: storageKey, profile });
    await page.goto(protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin);
    await expect(page.locator("#dialog-title")).toHaveText("Partie fortsetzen?");
    await expect(page.locator("#progress-status")).toContainText("4 freigeschaltet");
    await observeSimulation(page);

    async function playBlock({ ticks, direction, grab }) {
      const key = { right: "ArrowRight", left: "ArrowLeft", down: "ArrowDown", up: "ArrowUp" }[direction];
      if (grab) await page.keyboard.down("Space");
      if (key) await page.keyboard.down(key);
      await advanceTicks(page, ticks);
      if (key) await page.keyboard.up(key);
      if (grab) await page.keyboard.up("Space");
    }
    for (const id of ["gruene-kammer", "drei-schaechte"]) {
      const level = pack.levels.find((entry) => entry.id === id);
      const solution = require(`../../replays/sturzstein-einstieg/${id}.json`);
      await page.locator("#next-level").click();
      await expect(page.locator("#dialog-text")).toContainText(level.description);
      await page.locator("#primary").click();
      const [approach, wait, ...finish] = solution.inputs;
      await playBlock(approach);
      // Einen Tick vor der Verwandlung bzw. direkt beim blockierten Auslass anhalten.
      const waitBeforeSave = id === "gruene-kammer" ? wait.ticks - 1 : 0;
      if (waitBeforeSave) await playBlock({ ...wait, ticks: waitBeforeSave });
      const before = await page.evaluate(() => window.testState);
      if (id === "gruene-kammer") expect(before.board.filter((c) => c.type === "amoeba")).toHaveLength(6);
      else expect(before.board.some((c) => c.blockedAt === before.tick)).toBe(true);
      await page.keyboard.press("KeyP");
      await page.reload();
      await expect(page.locator("#dialog-title")).toHaveText("Partie fortsetzen?");
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).session.state, storageKey)).toEqual(before);
      await observeSimulation(page);
      await page.locator("#primary").click();
      await advanceTicks(page, 1, before.tick);
      const expected = structuredClone(before);
      Sim.step(expected, wait);
      expect(await page.evaluate(() => window.testState)).toEqual(expected);
      await page.keyboard.down("KeyZ");
      await rewindTicks(page, 1);
      expect(await page.evaluate(() => window.testState)).toEqual(before);
      await page.keyboard.up("KeyZ");
      await page.clock.runFor(16);
      await playBlock({ ...wait, ticks: wait.ticks - waitBeforeSave });
      for (const block of finish) await playBlock(block);
      await expect(page.locator("#dialog-title")).toHaveText("Ausgang erreicht!");
      const replay = await downloadReplay(page);
      expect(replay).toEqual({ ...solution, usedRewind: true });
      expect(Replay.play(pack, replay).state).toEqual(await page.evaluate(() => window.testState));
    }
    await expect(page.locator("#progress-status")).toContainText("5 freigeschaltet");
    expect(errors).toEqual([]);
  });

  test(`Speicherung über ${protocol}: Neuladen und neuer Tab erhalten Zustand, Replay und Einstellungen ohne Offlinezeit`, async ({ page }) => {
    const url = protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin;
    await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
    await page.goto(url);
    await expect(page.locator("#primary")).toBeEnabled();
    await observeSimulation(page);
    await page.locator("#primary").click();
    await page.keyboard.down("ArrowRight");
    await advanceTicks(page, 2);
    await page.keyboard.up("ArrowRight");
    await advanceTicks(page, 10);
    await page.keyboard.down("KeyZ");
    await rewindTicks(page, 2);
    await page.keyboard.up("KeyZ");
    await page.clock.runFor(16);
    await page.keyboard.press("KeyP");
    await page.locator("#settings").click();
    await page.locator("#toggle-hints").click();
    await page.locator("#secondary").click();
    await expect(page.locator("#input-hints")).toBeHidden();
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    expect(saved.session.state).toEqual(await page.evaluate(() => window.testState));
    expect(saved.session.replay.usedRewind).toBe(true);
    await page.clock.runFor(60000);
    await page.reload();
    await expect(page.locator("#dialog-title")).toHaveText("Partie fortsetzen?");
    await expect(page.locator("#rewind-time")).toHaveText("0,0 s");
    await expect(page.locator("#rewind-status")).toContainText("Mit Rückspulen");
    await expect(page.locator("#input-hints")).toBeHidden();
    await page.clock.runFor(2000);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).session, storageKey)).toEqual(saved.session);
    await page.locator("#secondary").click();
    await expect(page.locator("#dialog-title")).toHaveText("Neu beginnen?");
    await page.locator("#secondary").click();
    await expect(page.locator("#dialog-title")).toHaveText("Partie fortsetzen?");
    await page.close();

    const reopened = await page.context().newPage();
    await reopened.clock.install({ time: new Date("2030-01-03T00:00:00Z") });
    await reopened.clock.pauseAt(new Date("2030-01-03T00:00:01Z"));
    await reopened.goto(url);
    await expect(reopened.locator("#dialog-title")).toHaveText("Partie fortsetzen?");
    await observeSimulation(reopened);
    await reopened.locator("#primary").click();
    await reopened.clock.runFor(128);
    const expected = structuredClone(saved.session.state);
    Sim.step(expected, { direction: null, grab: false });
    expect(await reopened.evaluate(() => window.testState)).toEqual(expected);
    await reopened.keyboard.press("KeyP");
    const continued = await downloadReplay(reopened);
    expect(continued.usedRewind).toBe(true);
    expect(Replay.play(pack, continued, { requireWin: false }).state).toEqual(expected);
    await reopened.locator("#restart").click();
    await reopened.locator("#primary").click();
    for (const [key, count] of [["ArrowRight", 1], ["ArrowDown", 4], ["ArrowRight", 1], ["ArrowDown", 1]]) {
      await reopened.keyboard.down(key);
      await advanceTicks(reopened, count);
      await reopened.keyboard.up(key);
    }
    await advanceTicks(reopened, 1);
    const lost = await reopened.evaluate(() => window.testState);
    await reopened.reload();
    await expect(reopened.locator("#primary")).toHaveText("Letzten Versuch anzeigen");
    await reopened.locator("#primary").click();
    await expect(reopened.locator("#dialog-text")).toContainText("Kein Rückspulverlauf verfügbar");
    expect(Replay.play(pack, await downloadReplay(reopened), { requireWin: false }).state).toEqual(lost);
    await reopened.close();
  });

  for (const profile of ["standard", "competition-pro"]) test(`Simuliertes Gamepad ${profile} über ${protocol}: Spiel, Menüs und Hotplugging`, async ({ page }) => {
    await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
    await page.addInitScript((profile) => {
      window.fakePad = { index: 0, connected: true, mapping: profile === "standard" ? "standard" : "",
        id: "USB 2A4K GamePad (Vendor: 040b Product: 6533)", axes: [0, 0],
        buttons: Array.from({ length: profile === "standard" ? 17 : 4 }, () => ({ pressed: false, value: 0 })) };
      window.fakePads = [window.fakePad];
      Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => window.fakePads });
    }, profile);
    await page.goto(protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin);
    await expect(page.locator("#primary")).toBeEnabled();
    await observeSimulation(page);
    async function setButtons(indices) {
      await page.evaluate(({ indices, profile }) => {
        const competition = profile === "competition-pro";
        const pressed = competition ? indices.map((index) => ({ 0: 0, 1: 1, 3: 2, 9: 3 })[index]) : indices;
        if (competition) window.fakePad.axes = [
          Number(indices.includes(15)) - Number(indices.includes(14)),
          Number(indices.includes(13)) - Number(indices.includes(12)),
        ];
        window.fakePad.buttons = Array.from({ length: competition ? 4 : 17 }, (_, index) => ({
          pressed: pressed.includes(index), value: Number(pressed.includes(index)),
        }));
      }, { indices, profile });
    }
    async function press(indices) {
      await setButtons(indices);
      await page.clock.runFor(32);
    }
    await press([0]);
    await expect(page.locator("#overlay")).toBeHidden();
    await expect(page.locator("#input-hints")).toContainText(profile === "standard" ? "Gamepad" : "Competition Pro");
    if (profile === "competition-pro") {
      await expect(page.locator("#input-hints")).toContainText("Rechts klein Pause");
      await expect(page.locator("#gamepad-status")).toContainText("Competition Pro erkannt");
    }
    await press([]);
    await setButtons([0, 15]);
    await advanceTicks(page, 1);
    expect(await page.evaluate(() => window.testState.playerIndex)).toBe(21);
    expect(await page.evaluate(() => window.testState.board[22].type)).toBe("empty");
    await press([]);

    await press([9]);
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    const paused = await page.evaluate(() => window.testState);
    await page.clock.runFor(1000);
    expect(await page.evaluate(() => window.testState)).toEqual(paused);
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    await press([]);
    await press([1]);
    await expect(page.locator("#overlay")).toBeHidden();
    await press([]);

    const beforeMouseRestart = await page.evaluate(() => window.testState);
    await page.locator("#restart").click();
    await expect(page.locator("#dialog-title")).toHaveText("Neu beginnen?");
    await expect(page.locator("#secondary")).toBeFocused();
    await expect(page.locator("#secondary")).toHaveCSS("outline-width", "3px");
    await press([14]);
    await expect(page.locator("#primary")).toBeFocused();
    await expect(page.locator("#primary")).toHaveCSS("outline-style", "solid");
    await expect(page.locator("#primary")).toHaveCSS("outline-width", "3px");
    await press([]);
    await press([15]);
    await expect(page.locator("#secondary")).toBeFocused();
    await expect(page.locator("#secondary")).toHaveCSS("outline-style", "solid");
    await expect(page.locator("#secondary")).toHaveCSS("outline-width", "3px");
    await press([]);
    await press([0]);
    await expect(page.locator("#overlay")).toBeHidden();
    expect(await page.evaluate(() => window.testState)).toEqual(beforeMouseRestart);
    await press([]);

    await press([3]);
    await expect(page.locator("#dialog-title")).toHaveText("Neu beginnen?");
    await expect(page.locator("#secondary")).toBeFocused();
    await press([]);
    await press([14]);
    await expect(page.locator("#primary")).toBeFocused();
    await press([]);
    await press([0]);
    await expect(page.locator("#overlay")).toBeHidden();
    await page.clock.runFor(500);
    expect(await page.evaluate(() => window.testState.tick)).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.testState.playerIndex)).toBe(21);
    await press([]);

    for (const [direction, count] of [
      [15, 3], [13, 1], [15, 2], [13, 5], [14, 3], [13, 1],
      [15, 3], [12, 1], [15, 8], [12, 3], [13, 5], [15, 3],
    ]) {
      await setButtons([direction]);
      await advanceTicks(page, count);
    }
    await expect(page.locator("#dialog-title")).toHaveText("Ausgang erreicht!");
    await press([]);
    await press([13]);
    await expect(page.locator("#replay-export")).toBeFocused();
    await press([]);
    const recorded = await downloadReplay(page, () => press([0]));
    expect(Replay.play(pack, recorded).state).toEqual(await page.evaluate(() => window.testState));
    await press([]);
    await press([12]);
    await expect(page.locator("#primary")).toBeFocused();
    await press([]);
    await press([0]);
    await press([]);
    await setButtons([15]);
    await advanceTicks(page, 1);
    await page.evaluate(() => {
      window.fakePads = [];
      const event = new Event("gamepaddisconnected");
      Object.defineProperty(event, "gamepad", { value: window.fakePad });
      window.dispatchEvent(event);
    });
    await expect(page.locator("#dialog-text")).toContainText("Controller wurde getrennt");
    const disconnected = await page.evaluate(() => window.testState);
    await page.clock.runFor(2000);
    expect(await page.evaluate(() => window.testState)).toEqual(disconnected);
    await page.evaluate(() => { window.fakePads = [window.fakePad]; });
    await press([]);
    await press([0]);
    await expect(page.locator("#overlay")).toBeHidden();
    await press([]);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await press([0]);
    await page.clock.runFor(500);
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.clock.runFor(64);
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    await press([]);
    await press([0]);
    await expect(page.locator("#overlay")).toBeHidden();
    await press([]);
    await press([1]);
    await page.clock.runFor(120);
    await expect(page.locator("#rewind-status")).toContainText("Mit Rückspulen");
    await press([]);
    await page.keyboard.press("KeyM");
    await expect(page.locator("#feature-notice")).toContainText("S14");
    await expect(page.locator("#input-hints")).toContainText("Tastatur");
    await page.locator("#pause").click();
    await expect(page.locator("#input-hints")).toContainText("Maus");

    await page.locator("#restart").click();
    await page.locator("#primary").click();
    await press([]);
    for (const [direction, count] of [[15, 1], [13, 4], [15, 1], [13, 1]]) {
      await setButtons([direction]);
      await advanceTicks(page, count);
    }
    await setButtons([]);
    await advanceTicks(page, 1);
    await expect(page.locator("#dialog-title")).toHaveText("Verschüttet?");
    await press([]);
    await press([1]);
    await rewindTicks(page, 1);
    await expect(page.locator("#overlay")).toBeHidden();
    expect(await page.evaluate(() => window.testState.status)).toBe("playing");
    await expect(page.locator("#rewind-status")).toContainText("Mit Rückspulen");
    await page.evaluate(() => { window.fakePads = []; });
    await page.clock.runFor(32);
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    const afterRewindDisconnect = await page.evaluate(() => window.testState);
    await page.clock.runFor(500);
    expect(await page.evaluate(() => window.testState)).toEqual(afterRewindDisconnect);
    await page.evaluate(() => { window.fakePads = [window.fakePad]; });
    await page.clock.runFor(200);
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    await press([]);
    await press([0]);
    await expect(page.locator("#overlay")).toBeHidden();
  });
}

for (const mode of ["blocked", "quota", "corrupt", "incompatible"]) {
  test(`Speicherfehler ${mode}: sichtbare Meldung, spielbar und kein stiller Datenverlust`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const text = mode === "corrupt" ? "{" : JSON.stringify({
      formatVersion: 1, settings: { showHints: true }, progress: [], bests: [],
      session: { state: Sim.createState(pack, solution.levelId),
        replay: { ...new Replay.Recorder(pack, solution.levelId).replay, levelRevision: 2 } },
    });
    await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
    await page.addInitScript(({ mode, text, key }) => {
      if (mode === "blocked") Object.defineProperty(window, "localStorage", {
        get() { throw new DOMException("Test", "SecurityError"); },
      });
      else if (mode === "quota") Storage.prototype.setItem = () => { throw new DOMException("Test", "QuotaExceededError"); };
      else if (localStorage.getItem(key) === null) localStorage.setItem(key, text);
    }, { mode, text, key: storageKey });
    await page.goto(origin);
    await expect(page.locator("#primary")).toBeEnabled();
    await observeSimulation(page);
    await page.locator("#primary").click();
    await advanceTicks(page, 2);
    await expect(page.locator("#storage-status")).toContainText(
      mode === "blocked" ? "SecurityError" : mode === "quota" ? "QuotaExceededError" : "unverändert",
    );
    await page.keyboard.press("KeyP");
    if (mode === "corrupt" || mode === "incompatible") {
      await page.locator("#settings").click();
      await page.locator("#toggle-hints").click();
      await page.locator("#secondary").click();
      expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(text);
      await page.locator("#storage-reset").click();
      await page.locator("#secondary").click();
      expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(text);
      await page.locator("#storage-reset").click();
      await page.locator("#primary").click();
      await expect(page.locator("#storage-status")).toContainText("Lokal gespeichert");
      const state = await page.evaluate(() => window.testState);
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).session.state, storageKey)).toEqual(state);
      await page.reload();
      await expect(page.locator("#dialog-title")).toHaveText("Partie fortsetzen?");
      await expect(page.locator("#input-hints")).toBeHidden();
    }
    expect(errors).toEqual([]);
  });
}

for (const mode of ["missing", "blocked", "mapping"]) {
  test(`Gamepad-Einschränkung ${mode} wird erklärt; Tastatur bleibt nutzbar`, async ({ page }) => {
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, "getGamepads", { configurable: true, value: mode === "missing" ? undefined : () => {
        if (mode === "blocked") throw new DOMException("Test", "SecurityError");
        return [{ index: 0, connected: true, mapping: "", axes: [0, 0], buttons: [] }];
      } });
    }, mode);
    await page.goto(pathToFileURL(path.join(root, "index.html")).href);
    await expect(page.locator("#gamepad-status")).toContainText(
      mode === "missing" ? "nicht verfügbar" : mode === "blocked" ? "SecurityError" : "kein Standard-Mapping",
    );
    await page.keyboard.press("Enter");
    await expect(page.locator("#overlay")).toBeHidden();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("KeyP");
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
  });
}

test("Canvas skaliert auf Pixeldichte und zeichnet große Höhlen ohne Zustandsänderung", async ({ page }) => {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href);
  await expect(page.locator("#primary")).toBeEnabled();
  for (const viewport of [{ width: 420, height: 700 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => {
      const canvas = document.getElementById("board");
      return canvas.width === Math.floor(canvas.clientWidth * devicePixelRatio);
    })).toBe(true);
  }
  const result = await page.evaluate(async () => {
    const pack = structuredClone(window.Sturzstein.packs[0]);
    const level = pack.levels[0];
    level.width = 80;
    level.height = 60;
    level.map = Array.from({ length: 60 }, (_, y) => y === 0 || y === 59 ? "#".repeat(80) : "#" + ".".repeat(78) + "#");
    level.map[1] = "#@" + ".".repeat(77) + "#";
    level.map[58] = "#" + ".".repeat(77) + "X#";
    const state = window.Sturzstein.Simulation.createState(pack, level.id);
    const before = JSON.stringify(state);
    const image = new Image();
    image.src = "assets/tiles.png";
    await image.decode();
    const renderer = new window.Sturzstein.Renderer(document.getElementById("board"), image);
    const originalRatio = window.devicePixelRatio;
    for (const ratio of [1, 1.5, 2]) {
      Object.defineProperty(window, "devicePixelRatio", { value: ratio, configurable: true });
      renderer.draw(state, state, 1);
    }
    Object.defineProperty(window, "devicePixelRatio", { value: originalRatio, configurable: true });
    const unchanged = before === JSON.stringify(state);
    const cameraAtStart = { ...renderer.camera };
    state.playerIndex = 58 * 80 + 78;
    renderer.reset();
    renderer.draw(state, state, 1);
    const cameraAtEnd = { ...renderer.camera };
    return { unchanged, cameraAtStart, cameraAtEnd, scale: renderer.scale, smoothing: renderer.ctx.imageSmoothingEnabled };
  });
  expect(result.unchanged).toBe(true);
  expect(result.cameraAtStart).toEqual({ x: 0, y: 0 });
  expect(result.cameraAtEnd.x).toBeGreaterThan(0);
  expect(result.cameraAtEnd.y).toBeGreaterThan(0);
  expect(Number.isInteger(result.scale)).toBe(true);
  expect(result.smoothing).toBe(false);
});

test("Spieleranimation wechselt zwischen Gehen, Graben und neutralem Zustand nach Reset", async ({ page }) => {
  await page.goto(pathToFileURL(path.join(root, "index.html")).href);
  const frames = await page.evaluate(async () => {
    const level = structuredClone(window.Sturzstein.packs[0].levels[0]);
    const pack = structuredClone(window.Sturzstein.packs[0]);
    const state = window.Sturzstein.Simulation.createState(pack, level.id);
    const image = new Image();
    image.src = "assets/tiles.png";
    await image.decode();
    const canvas = document.getElementById("board");
    const renderer = new window.Sturzstein.Renderer(canvas, image);
    const sourceFrames = [];
    const drawImage = renderer.ctx.drawImage.bind(renderer.ctx);
    renderer.ctx.drawImage = (...args) => { sourceFrames.push(args[1]); drawImage(...args); };
    const before = structuredClone(state);
    renderer.reset(before);
    const from = state.playerIndex;
    const to = from + 1;
    before.board[to] = { type: "empty", id: null };
    const player = structuredClone(state.board[from]);
    state.board[from] = { type: "empty", id: null };
    state.board[to] = player;
    state.playerIndex = to;
    state.tick = 1;
    renderer.draw(state, before, 1, 16);
    const walk = sourceFrames.includes(9 * 16);
    sourceFrames.length = 0;
    renderer.reset(state);
    const digging = structuredClone(state);
    const diggingBefore = structuredClone(state);
    const next = to + 1;
    diggingBefore.board[next] = { type: "earth", id: null };
    digging.board[to] = { type: "empty", id: null };
    digging.board[next] = structuredClone(player);
    digging.playerIndex = next;
    digging.tick = 2;
    renderer.draw(digging, diggingBefore, 1, 16);
    const dig = sourceFrames.includes(10 * 16);
    sourceFrames.length = 0;
    renderer.reset(state);
    renderer.draw(state, state, 1, 16);
    const idle = sourceFrames.includes(8 * 16);
    sourceFrames.length = 0;
    const animated = structuredClone(state);
    const gemIndex = animated.board.findIndex(cell => cell.type !== "player");
    animated.board[gemIndex] = { type: "gem", id: 1001 };
    animated.tick = 1;
    animated.collected = animated.quota;
    renderer.reset(animated);
    renderer.draw(animated, animated, 1, 16);
    return { walk, dig, idle, gem: sourceFrames.includes(28 * 16), openExit: sourceFrames.includes(29 * 16) };
  });
  expect(frames).toEqual({ walk: true, dig: true, idle: true, gem: true, openExit: true });
});

for (const protocol of ["file", "http"]) {
  test(`Zusatzpacks über ${protocol}: Import, Neuladen, Ersetzen und Entfernen`, async ({ page }) => {
    const custom = structuredClone(pack);
    custom.id = "eigenes-pack";
    custom.title = "<img src=x onerror=alert(1)>";
    await page.goto(protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin);
    await page.locator("#manage-packs").click();
    async function upload(value) {
      await page.locator("#pack-file").setInputFiles({
        name: "eigenes.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)),
      });
    }
    await upload(pack);
    await expect(page.locator("#dialog-text")).toContainText("geschützt");
    await upload(custom);
    await expect(page.locator("#dialog-title")).toHaveText("Levelpack übernehmen?");
    await page.locator("#secondary").click();
    await expect(page.locator("#pack-list")).not.toContainText(custom.title);
    await upload(custom);
    await page.locator("#primary").click();
    await expect(page.locator("#dialog-text")).toContainText("lokal gespeichert");
    await expect(page.locator("#pack-list img")).toHaveCount(0);
    await page.reload();
    await page.locator("#manage-packs").click();
    await expect(page.locator("#pack-list")).toContainText(custom.title);
    await page.getByRole("button", { name: "Die drei Schächte · Lösbarkeit ungeprüft", exact: true }).click();
    await page.locator("#primary").click();
    await expect(page.locator("#level-name")).toContainText("Die drei Schächte");
    await page.locator("#pause").click();
    await page.reload();
    await expect(page.locator("#dialog-title")).toHaveText("Partie fortsetzen?");
    await expect(page.locator("#level-name")).toContainText("Die drei Schächte");
    await page.locator("#manage-packs").click();
    custom.revision++;
    custom.title = "Überarbeitet";
    await upload(custom);
    await page.locator("#primary").click();
    await page.getByRole("button", { name: "Überarbeitet entfernen …", exact: true }).click();
    await expect(page.locator("#dialog-text")).toContainText("Bestwerte");
    await page.locator("#secondary").click();
    await expect(page.locator("#pack-list")).toContainText("Überarbeitet");
    await page.getByRole("button", { name: "Überarbeitet entfernen …", exact: true }).click();
    await page.locator("#primary").click();
    await page.reload();
    await expect(page.locator("#dialog-title")).toHaveText("Sturzstein");
    await page.locator("#manage-packs").click();
    await expect(page.locator("#pack-list")).not.toContainText("Überarbeitet");
  });
}

test("Import bei voller Speicherquote bleibt sichtbar temporär spielbar", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Test", "QuotaExceededError"); };
  });
  await page.goto(origin);
  await page.locator("#manage-packs").click();
  await page.locator("#pack-file").setInputFiles(path.join(root, "examples/meine-hoehlen.json"));
  await page.locator("#primary").click();
  await expect(page.locator("#dialog-text")).toContainText("temporär");
  await page.getByRole("button", { name: "Der Probegang · Lösbarkeit ungeprüft", exact: true }).click();
  await page.locator("#primary").click();
  await expect(page.locator("#overlay")).toBeHidden();
  await expect(page.locator("#storage-status")).toContainText("QuotaExceededError");
});

for (const protocol of ["file", "http"]) {
  test(`Menüs über ${protocol}: Hilfe, Einstellungen, Hauptmenü und Neues Spiel bewahren angehaltene Partien`, async ({ page }) => {
    await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
    await page.goto(protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin);
    await expect(page.locator("#continue")).toBeDisabled();
    await expect(page.locator("#primary")).toHaveText("Neues Spiel");
    await page.locator("#help").click();
    await expect(page.locator("#level-help")).toContainText(pack.levels[0].description);
    await expect(page.locator("#help-controls")).toContainText("Tastatur");
    await page.keyboard.press("Escape");
    await expect(page.locator("#help")).toBeFocused();
    await page.locator("#settings").click();
    await page.locator("#toggle-hints").click();
    await expect(page.locator("#input-hints")).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(page.locator("#settings")).toBeFocused();
    await observeSimulation(page);
    await page.locator("#primary").click();
    await advanceTicks(page, 4);
    await page.keyboard.press("KeyP");
    const state = await page.evaluate(() => window.testState);
    await page.locator("#help").click();
    await page.evaluate(() => { window.dispatchEvent(new Event("blur")); });
    await page.clock.runFor(2000);
    await page.evaluate(() => { window.dispatchEvent(new Event("focus")); });
    expect(await page.evaluate(() => window.testState)).toEqual(state);
    await expect(page.locator("#dialog-title")).toHaveText("Hilfe");
    await page.keyboard.press("Escape");
    await expect(page.locator("#dialog-title")).toHaveText("Pause");
    await page.locator("#main-menu").click();
    await expect(page.locator("#continue")).toBeEnabled();
    await page.locator("#primary").click();
    await expect(page.locator("#dialog-title")).toHaveText("Neu beginnen?");
    await expect(page.locator("#secondary")).toBeFocused();
    await page.keyboard.press("Escape");
    await page.clock.runFor(2000);
    expect(await page.evaluate(() => window.testState)).toEqual(state);
    await page.locator("#continue").click();
    await advanceTicks(page, 1);
    await page.keyboard.press("KeyP");
    await page.locator("#main-menu").click();
    await page.locator("#primary").click();
    await page.locator("#primary").click();
    expect(await page.evaluate(() => window.testState.tick)).toBe(0);
    expect(await page.evaluate(() => window.testState.levelId)).toBe(pack.levels[0].id);
  });

  test(`Levelauswahl über ${protocol}: 200 Zusatzhöhlen, lange Namen und sichtbarer Tastaturfokus`, async ({ page }) => {
    const small = require("../../examples/meine-hoehlen.json");
    const imports = Array.from({ length: 2 }, (_, p) => ({
      ...small, id: "viele-" + p, title: "Höhlensammlung " + p,
      levels: Array.from({ length: 100 }, (_, i) => ({ ...small.levels[0], id: "hoehle-" + i,
        name: "Höhle " + p + "-" + i + " " + "LangerName".repeat(8) })),
    }));
    await page.addInitScript(({ imports, key }) => localStorage.setItem(key, JSON.stringify({
      formatVersion: 2, importedPacks: imports, settings: { showHints: true }, progress: [], bests: [], session: null,
    })), { imports, key: storageKey });
    await page.goto(protocol === "file" ? pathToFileURL(path.join(root, "index.html")).href : origin);
    await page.locator("#manage-packs").click();
    await expect(page.locator("#pack-list button")).toHaveCount(207);
    const locked = page.locator("#pack-list button").filter({ hasText: "Die grüne Kammer" });
    await expect(locked).toBeDisabled();
    await expect(locked).toContainText("gesperrt");
    const last = page.locator("#pack-list button").filter({ hasText: "Höhle 1-99" });
    await last.focus();
    await expect(last).toBeInViewport();
    await expect(last).toHaveCSS("outline-width", "3px");
    expect(await page.locator("#pack-list").evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    await page.keyboard.press("Enter");
    await expect(page.locator("#dialog-title")).toHaveText("Höhle wechseln?");
    await expect(page.locator("#dialog-text")).toContainText("Höhle 1-99");
    await page.keyboard.press("Escape");
    await expect(last).toBeFocused();
    await expect(last).toBeInViewport();
    await page.keyboard.press("Enter");
    await page.locator("#primary").click();
    await expect(page.locator("#overlay")).toBeHidden();
    await expect(page.locator("#level-name")).toContainText("Höhle 1-99");
  });
}

for (const profile of ["standard", "competition-pro"]) {
  test(`Neue Menüs mit simuliertem ${profile}: Navigation, Loslasssperre und Trennung in der Hilfe`, async ({ page }) => {
    await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
    await page.addInitScript((profile) => {
      window.menuPad = { index: 0, connected: true, mapping: profile === "standard" ? "standard" : "",
        id: "USB 2A4K GamePad (Vendor: 040b Product: 6533)", axes: [0, 0],
        buttons: Array.from({ length: profile === "standard" ? 17 : 4 }, () => ({ pressed: false, value: 0 })) };
      window.menuPads = [window.menuPad];
      Object.defineProperty(navigator, "getGamepads", { value: () => window.menuPads, configurable: true });
    }, profile);
    await page.goto(origin);
    await expect(page.locator("#primary")).toBeEnabled();
    async function press(action) {
      await page.evaluate(({ action, profile }) => {
        const index = action === "confirm" ? 0 : action === "back" ? 1 : action === "down" ? 13 : -1;
        window.menuPad.axes = profile === "competition-pro" && action === "down" ? [0, 1] : [0, 0];
        window.menuPad.buttons = Array.from({ length: profile === "standard" ? 17 : 4 }, (_, i) => ({
          pressed: i === index, value: Number(i === index),
        }));
      }, { action, profile });
      await page.clock.runFor(32);
    }
    async function choose(id) {
      for (let i = 0; i < 12; i++) {
        if (await page.locator(id).evaluate((node) => node === document.activeElement)) break;
        await press(null);
        await press("down");
      }
      await expect(page.locator(id)).toBeFocused();
      await press(null);
      await press("confirm");
    }
    await choose("#help");
    await expect(page.locator("#dialog-title")).toHaveText("Hilfe");
    await expect(page.locator("#help-controls")).toContainText(profile === "standard" ? "Gamepad" : "Competition Pro");
    await press(null);
    await press("down");
    await page.clock.runFor(1000);
    expect(await page.locator(".panel").evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator("#dialog-title")).toHaveText("Hilfe");
    await page.evaluate(() => { window.menuPads = []; });
    await page.clock.runFor(32);
    await page.evaluate(() => { window.menuPads = [window.menuPad]; });
    await page.clock.runFor(1000);
    await expect(page.locator("#dialog-title")).toHaveText("Hilfe");
    await press(null);
    await press("back");
    await expect(page.locator("#dialog-title")).toHaveText("Sturzstein");
    await choose("#settings");
    await choose("#toggle-hints");
    await expect(page.locator("#input-hints")).toBeHidden();
    await press(null);
    await press("back");
    await expect(page.locator("#settings")).toBeFocused();
    await choose("#primary");
    await expect(page.locator("#overlay")).toBeHidden();
  });
}

test("Verspäteter Import verändert eine inzwischen neu geöffnete Levelauswahl nicht", async ({ page }) => {
  await page.goto(origin);
  await page.locator("#manage-packs").click();
  await page.evaluate(() => {
    const read = File.prototype.text;
    File.prototype.text = function () {
      return new Promise((resolve) => {
        window.finishImport = async () => resolve(await read.call(this));
      });
    };
  });
  await page.locator("#pack-file").setInputFiles(path.join(root, "examples/meine-hoehlen.json"));
  await page.locator("#secondary").click();
  await page.locator("#manage-packs").click();
  await page.evaluate(() => window.finishImport());
  await expect(page.locator("#dialog-title")).toHaveText("Levelauswahl");
  await expect(page.locator("#pack-list")).not.toContainText("Meine Höhlen");
});
