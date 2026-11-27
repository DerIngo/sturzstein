"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.join(__dirname, "..");
for (const directory of ["js", "tools", "tests"]) {
  for (const name of fs.readdirSync(path.join(root, directory), { recursive: true })) {
    if (/\.(js|cjs)$/.test(name)) {
      execFileSync(process.execPath, ["--check", path.join(root, directory, name)], { stdio: "inherit" });
    }
  }
}
execFileSync(process.execPath, ["--check", path.join(root, "playwright.config.cjs")], { stdio: "inherit" });
console.log("JavaScript-Syntax geprüft.");
