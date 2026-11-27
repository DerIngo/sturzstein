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
    await expect(page.locator("#status")).toHaveText("Bereit: 1 Levelpack geladen.");
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  });
}
