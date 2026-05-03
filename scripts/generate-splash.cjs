#!/usr/bin/env node
// Generate iOS PWA splash screen PNGs in pure Node.js (no external deps)
// Run: node scripts/generate-splash.js
// Output: public/splash/*.png

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'public', 'splash');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Brand colors
const BG = [255, 255, 255];    // #ffffff white

// CRC-32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const crcInput = Buffer.concat([t, d]);
  const out = Buffer.alloc(4 + 4 + d.length + 4);
  out.writeUInt32BE(d.length, 0);
  t.copy(out, 4);
  d.copy(out, 8);
  out.writeUInt32BE(crc32(crcInput), 8 + d.length);
  return out;
}

function makePNG(width, height, [r, g, b]) {
  // Build raw image rows (filter byte 0 = None + RGB pixels)
  const rowBytes = 1 + width * 3;
  const raw = Buffer.alloc(height * rowBytes, 0);
  for (let y = 0; y < height; y++) {
    const base = y * rowBytes;
    raw[base] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const off = base + 1 + x * 3;
      raw[off] = r; raw[off + 1] = g; raw[off + 2] = b;
    }
  }

  const deflated = zlib.deflateSync(raw, { level: 6 });

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdrData),
    chunk('IDAT', deflated),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// iOS splash screen sizes [width, height, filename]
const SIZES = [
  [1290, 2796, 'apple-splash-1290x2796.png'],
  [1179, 2556, 'apple-splash-1179x2556.png'],
  [1170, 2532, 'apple-splash-1170x2532.png'],
  [828,  1792, 'apple-splash-828x1792.png'],
  [750,  1334, 'apple-splash-750x1334.png'],
  [2048, 2732, 'apple-splash-2048x2732.png'],
];

for (const [w, h, name] of SIZES) {
  const png = makePNG(w, h, BG);
  const outPath = path.join(OUT_DIR, name);
  fs.writeFileSync(outPath, png);
  process.stdout.write(`  ✓ ${name} (${w}×${h})\n`);
}
process.stdout.write('Done. Splash screens written to public/splash/\n');
