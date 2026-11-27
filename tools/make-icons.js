// Generates the PNG app icons (no dependencies). Run: node tools/make-icons.js
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const BG = [11, 93, 86], FG = [220, 239, 235];

function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
}
const TABLE = crcTable();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// maskable: full-bleed background, artwork kept inside the 80% safe zone.
function icon(size, { rounded, scale }) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const c = size / 2, R = size * 0.2 * (rounded ? 1 : 0);
  const ringR = 150 / 512 * size * scale, ringW = 28 / 512 * size * scale, dotR = 70 / 512 * size * scale;
  const SS = 4; // supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let bg = 0, fg = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        // rounded-rect mask
        const qx = Math.max(R - px, px - (size - R), 0), qy = Math.max(R - py, py - (size - R), 0);
        if (R && qx * qx + qy * qy > R * R) continue;
        bg++;
        const d = Math.hypot(px - c, py - c);
        if (d <= dotR || Math.abs(d - ringR) <= ringW / 2) fg++;
      }
      const n = SS * SS, a = bg / n, f = bg ? fg / bg : 0;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(BG[i] * (1 - f) + FG[i] * f);
      raw[o + 3] = Math.round(a * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, "..", "app", "icons");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "icon-192.png"), icon(192, { rounded: true, scale: 1 }));
fs.writeFileSync(path.join(out, "icon-512.png"), icon(512, { rounded: true, scale: 1 }));
fs.writeFileSync(path.join(out, "maskable-512.png"), icon(512, { rounded: false, scale: 0.8 }));
fs.writeFileSync(path.join(out, "apple-touch-icon.png"), icon(180, { rounded: false, scale: 0.9 }));
console.log("Icons written to", out);
