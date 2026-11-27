"use strict";

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const size = 16;
const names = ["empty", "earth", "steel", "wall", "rock", "gem", "exit", "openExit", "player"];
const width = size * names.length;
const pixels = Buffer.alloc(width * size * 4);
let offset = 0;
function pixel(x, y, hex) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const position = (y * width + offset + x) * 4;
  pixels[position] = parseInt(hex.slice(0, 2), 16);
  pixels[position + 1] = parseInt(hex.slice(2, 4), 16);
  pixels[position + 2] = parseInt(hex.slice(4, 6), 16);
  pixels[position + 3] = 255;
}
function rect(x, y, w, h, color) {
  for (let dy = y; dy < y + h; dy++) for (let dx = x; dx < x + w; dx++) pixel(dx, dy, color);
}
function floor() {
  rect(0, 0, 16, 16, "111e2a");
  rect(1, 3, 3, 1, "162633");
  rect(9, 11, 4, 1, "162633");
  pixel(6, 8, "21323c");
}
for (const [index, name] of names.entries()) {
  offset = index * size;
  if (name === "empty") floor();
  if (name === "earth") {
    rect(0, 0, 16, 16, "765143");
    rect(0, 0, 16, 1, "8c6450");
    for (let y = 1; y < 16; y++) for (let x = 0; x < 16; x++) {
      const noise = (x * 17 + y * 31 + x * y * 7) % 29;
      if (noise < 3) pixel(x, y, "a77c59");
      if (noise > 24) pixel(x, y, "503b37");
    }
    rect(2, 4, 4, 1, "bf9566");
    rect(10, 10, 3, 2, "594039");
  }
  if (name === "steel") {
    rect(0, 0, 16, 16, "182b3c");
    rect(1, 1, 14, 14, "384f62");
    rect(1, 1, 14, 1, "81909a");
    rect(1, 2, 1, 12, "617987");
    rect(3, 3, 10, 10, "293d50");
    rect(4, 4, 8, 1, "476175");
    for (const x of [2, 12]) for (const y of [2, 12]) {
      rect(x, y, 2, 2, "a4b2b2");
      pixel(x + 1, y + 1, "596e7b");
    }
  }
  if (name === "wall") {
    rect(0, 0, 16, 16, "2c3542");
    for (let y = 0; y < 16; y += 8) for (let x = y === 0 ? -4 : 0; x < 16; x += 8) {
      rect(x + 1, y + 1, 7, 6, "696675");
      rect(x + 1, y + 1, 7, 1, "a3a0a5");
      rect(x + 1, y + 6, 7, 1, "444454");
    }
  }
  if (name === "rock") {
    rect(5, 1, 6, 1, "243746");
    rect(3, 2, 10, 2, "243746");
    rect(2, 4, 12, 9, "243746");
    rect(4, 13, 9, 2, "243746");
    rect(4, 3, 8, 9, "839397");
    rect(3, 5, 10, 6, "839397");
    rect(5, 2, 6, 2, "c1c7bb");
    rect(4, 4, 3, 5, "a7b3ac");
    rect(8, 9, 5, 3, "576c76");
    rect(5, 12, 7, 1, "576c76");
    rect(8, 4, 2, 2, "617982");
    rect(9, 6, 2, 3, "617982");
  }
  if (name === "gem") {
    for (let y = 1; y < 15; y++) {
      const half = y < 7 ? Math.floor(y / 2) + 1 : Math.floor((15 - y) / 2) + 1;
      for (let x = 8 - half; x <= 8 + half; x++) {
        pixel(x, y, x < 8 ? "c2fff0" : y < 7 ? "5cebd0" : "159caa");
      }
    }
    rect(6, 5, 5, 1, "f0fff2");
    rect(8, 3, 1, 9, "80f6d5");
  }
  if (name === "exit" || name === "openExit") {
    floor();
    rect(2, 2, 12, 14, "536479");
    rect(3, 1, 10, 2, "a8b7b2");
    rect(4, 3, 8, 13, name === "exit" ? "273546" : "72ecd0");
    rect(5, 4, 6, 12, name === "exit" ? "1d2835" : "265d64");
    if (name === "exit") {
      for (const x of [5, 8, 11]) rect(x, 4, 1, 12, "778088");
      rect(6, 8, 4, 3, "d2a261");
    } else {
      rect(7, 6, 2, 5, "d1ffdf");
      rect(5, 8, 6, 1, "d1ffdf");
      rect(5, 14, 6, 2, "76e8c2");
    }
  }
  if (name === "player") {
    rect(4, 12, 3, 3, "132d42");
    rect(10, 12, 3, 3, "132d42");
    rect(4, 14, 3, 1, "bad3c5");
    rect(10, 14, 3, 1, "bad3c5");
    rect(4, 7, 9, 6, "e6a349");
    rect(5, 10, 7, 2, "b56c32");
    rect(2, 8, 2, 4, "6e8e91");
    rect(13, 8, 1, 3, "f5cf9b");
    rect(5, 4, 7, 5, "f5cf9b");
    rect(8, 5, 5, 3, "233a50");
    pixel(10, 5, "a0f4e3");
    rect(4, 2, 9, 3, "e6a349");
    rect(5, 1, 6, 2, "f5d686");
    rect(3, 4, 11, 1, "8c603c");
    rect(8, 2, 3, 3, "fff4c2");
  }
}
function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}
const header = Buffer.alloc(13);
header.writeUInt32BE(width, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;
const rows = [];
for (let y = 0; y < size; y++) rows.push(Buffer.from([0]), pixels.subarray(y * width * 4, (y + 1) * width * 4));
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
  chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))), chunk("IEND", Buffer.alloc(0)),
]);
const destination = path.join(__dirname, "../assets/tiles.png");
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, png);
console.log("Eigene 16-Pixel-Sprites erzeugt: assets/tiles.png");
