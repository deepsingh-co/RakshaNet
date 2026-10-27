/**
 * Generates PWA icons (PNG) without any image dependencies.
 * Design: red field, white beacon ring + center dot, faint outer pulse ring.
 * The maskable variant keeps all content inside the 80% safe zone.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

// Manual CRC32 (PNG chunk checksums)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, pixelAt) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    const row = y * stride;
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelAt(x, y);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [185, 28, 28, 255]; // red-700
const WHITE = [255, 255, 255, 255];

function beacon(size, { pulse }) {
  const c = size / 2;
  return (x, y) => {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / size;
    if (d <= 0.11) return WHITE;
    if (d >= 0.24 && d <= 0.34) return WHITE;
    if (pulse && d >= 0.42 && d <= 0.455) return [255, 255, 255, 102];
    return BG;
  };
}

mkdirSync(OUT, { recursive: true });
const icons = [
  ['icon-192.png', encodePng(192, beacon(192, { pulse: true }))],
  ['icon-512.png', encodePng(512, beacon(512, { pulse: true }))],
  ['maskable-512.png', encodePng(512, beacon(512, { pulse: false }))],
];
for (const [name, buf] of icons) {
  writeFileSync(join(OUT, name), buf);
  console.log(`wrote ${name} (${buf.length} bytes)`);
}
