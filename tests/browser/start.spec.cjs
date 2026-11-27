const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "../..");
let server;
let origin;

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
  });
}

async function advanceTicks(page, count) {
  const target = await page.evaluate(() => window.testState.tick) + count;
  await page.clock.runFor(Math.max(0, count * 100 - 16));
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await page.evaluate(() => window.testState.tick) >= target) break;
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
    await expect(page.locator("#dialog-title")).toHaveText("Ein Funkeln im Dunkeln");
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

    for (const [key, count] of [
      ["ArrowRight", 3], ["ArrowDown", 1], ["ArrowRight", 2], ["ArrowDown", 5],
      ["ArrowLeft", 3], ["ArrowDown", 1], ["ArrowRight", 3], ["ArrowUp", 1],
      ["ArrowRight", 8], ["ArrowUp", 3], ["ArrowDown", 5], ["ArrowRight", 3],
    ]) await ticks(key, count);
    await expect(page.locator("#dialog-title")).toHaveText("Ausgang erreicht!");
    await expect(page.locator("#gems")).toHaveText("3 / 3");
    expect(await page.evaluate(() => window.testState.status)).toBe("won");
    await page.keyboard.press("Enter");
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
    await page.keyboard.press("Enter");
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
    await expect(page.locator("#feature-notice")).toContainText("folgt in S07");
    await press([]);
    await page.keyboard.press("KeyM");
    await expect(page.locator("#feature-notice")).toContainText("S14");
    await expect(page.locator("#input-hints")).toContainText("Tastatur");
    await page.locator("#pause").click();
    await expect(page.locator("#input-hints")).toContainText("Maus");
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
