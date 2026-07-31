#!/usr/bin/env node
// ============================================================
// generate-icons.js — Genera los íconos PWA (mismo "chip OP"
// amarillo/asfalto del logo real) sin depender de ninguna
// librería de imágenes: encoder PNG mínimo escrito a mano
// (zlib ya viene en Node para el deflate).
//
// Ejecutar de nuevo solo si cambia el logo: `node scripts/generate-icons.js`
// ============================================================

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const AMARILLO = [255, 196, 0]; // var(--amarillo)
const ASFALTO = [23, 25, 30];   // var(--asfalto)

// Monograma "OP" en cuadrícula de bloques (7 columnas x 9 filas cada letra,
// 1 columna de separación) — mismo mensaje visual que .logo .chip en styles.css.
const O = [
  ".#####.",
  "##...##",
  "##...##",
  "##...##",
  "##...##",
  "##...##",
  "##...##",
  "##...##",
  ".#####."
];
const P = [
  "######.",
  "##....#",
  "##....#",
  "##....#",
  "######.",
  "##.....",
  "##.....",
  "##.....",
  "##....."
];

function buildGrid() {
  const rows = O.length;
  const grid = [];
  for (let r = 0; r < rows; r++) grid.push(O[r] + "." + P[r]);
  return grid; // 15 cols x 9 rows
}

function renderIcon(size) {
  const grid = buildGrid();
  const gridW = grid[0].length;
  const gridH = grid.length;

  // El monograma ocupa ~62% del ancho del ícono, centrado.
  const cell = Math.floor((size * 0.62) / gridW);
  const monoW = cell * gridW;
  const monoH = cell * gridH;
  const offsetX = Math.floor((size - monoW) / 2);
  const offsetY = Math.floor((size - monoH) / 2);

  const pixels = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = AMARILLO;
      const gx = Math.floor((x - offsetX) / cell);
      const gy = Math.floor((y - offsetY) / cell);
      if (gx >= 0 && gx < gridW && gy >= 0 && gy < gridH && grid[gy][gx] === "#") {
        color = ASFALTO;
      }
      const i = (y * size + x) * 3;
      pixels[i] = color[0]; pixels[i + 1] = color[1]; pixels[i + 2] = color[2];
    }
  }
  return pixels;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(size, rgbPixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB (truecolor)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk("IHDR", ihdrData);

  // Cada scanline necesita un byte de filtro (0 = None) al inicio.
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgbPixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = chunk("IDAT", zlib.deflateSync(raw, { level: 9 }));
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const outDir = path.join(__dirname, "..", "icons");
fs.mkdirSync(outDir, { recursive: true });

const sizes = [
  ["icon-32.png", 32],
  ["icon-180.png", 180],  // apple-touch-icon
  ["icon-192.png", 192],
  ["icon-512.png", 512]
];

for (const [name, size] of sizes) {
  const pngBuf = encodePng(size, renderIcon(size));
  fs.writeFileSync(path.join(outDir, name), pngBuf);
  console.log(`✓ icons/${name} (${pngBuf.length} bytes)`);
}
