const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "../..");
let server;
let origin;

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
    await page.locator("#primary").click();
    async function ticks(key, count) {
      const target = await page.evaluate(() => window.testState.tick) + count;
      if (key) await page.keyboard.down(key);
      await page.clock.runFor(Math.max(0, count * 100 - 16));
      for (let attempt = 0; attempt < 4; attempt++) {
        if (await page.evaluate(() => window.testState.tick) >= target) break;
        await page.clock.runFor(16);
      }
      if (key) await page.keyboard.up(key);
      expect(await page.evaluate(() => window.testState.tick)).toBe(target);
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
