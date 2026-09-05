/*
 * Generate the site's icon assets from the Ajani brand mark.
 *
 *   node scripts/generate-icons.mjs
 *
 * Everything is produced locally from the coordinates in
 * src/lib/brandMarkGeometry.js. There is no image library, no network
 * request, and no third-party artwork anywhere in this pipeline: the
 * rasteriser below samples the mark's own geometry, and the PNG and ICO
 * writers are the container formats spelled out by hand over node:zlib.
 *
 * Outputs (all in public/):
 *   favicon.svg              the vector mark
 *   favicon-32.png           browser tab icon
 *   favicon.ico              legacy fallback, 16/32/48 PNG entries
 *   apple-touch-icon.png     180px, full-bleed
 *   icon-192.png             PWA
 *   icon-512.png             PWA
 *   icon-maskable-512.png    PWA maskable, artwork inside the safe zone
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MARK_BAR,
  MARK_COLORS,
  MARK_FRAME_POINTS,
  MARK_PLATE,
  MARK_SIZE,
  markSvgDocument,
} from '../src/lib/brandMarkGeometry.js';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/* --- Colour ----------------------------------------------------------- */

function rgb(hex) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

const PLATE = rgb(MARK_COLORS.plate);
const FRAME = rgb(MARK_COLORS.frame);
const BAR = rgb(MARK_COLORS.bar);

/* --- Geometry tests --------------------------------------------------- */

/* Point-in-rounded-rectangle. Inside the straight sides this is a plain range
   check; near a corner it falls back to a distance test against that corner's
   arc centre. */
function inRoundedRect(x, y, rect) {
  const x0 = rect.x;
  const y0 = rect.y;
  const x1 = rect.x + rect.width;
  const y1 = rect.y + rect.height;
  const r = rect.rx || 0;

  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  if (!r) return true;

  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/* Standard even-odd ray cast. The mark's frame is a simple polygon, so this
   agrees with the fill a browser would produce. */
function inPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const straddles = yi > y !== yj > y;
    if (straddles && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/* --- Rasteriser ------------------------------------------------------- */

/**
 * Draw the mark into an RGBA buffer.
 *
 * `fullBleed` fills the whole canvas with the plate colour instead of drawing
 * the rounded plate, and `inset` shrinks the glyph towards the centre. The two
 * together produce the maskable and Apple variants, whose artwork has to stay
 * inside a safe zone the platform may crop to.
 *
 * Edges are antialiased by sampling each pixel on a SAMPLES x SAMPLES grid and
 * averaging, which is ample for flat geometric shapes like these.
 */
function rasterise(size, options) {
  const settings = options || {};
  const fullBleed = settings.fullBleed === true;
  const inset = typeof settings.inset === 'number' ? settings.inset : 1;

  const SAMPLES = 4;
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / MARK_SIZE;
  const centre = MARK_SIZE / 2;

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let covered = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const ux = (px + (sx + 0.5) / SAMPLES) / scale;
          const uy = (py + (sy + 0.5) / SAMPLES) / scale;

          /* Glyph coordinates, expanded back out of the inset so the same
             geometry can be tested at any content scale. */
          const gx = centre + (ux - centre) / inset;
          const gy = centre + (uy - centre) / inset;

          let colour = null;
          if (fullBleed || inRoundedRect(ux, uy, MARK_PLATE)) colour = PLATE;
          if (inPolygon(gx, gy, MARK_FRAME_POINTS)) colour = FRAME;
          if (inRoundedRect(gx, gy, MARK_BAR)) colour = BAR;

          if (colour) {
            r += colour[0];
            g += colour[1];
            b += colour[2];
            covered += 1;
          }
        }
      }

      const total = SAMPLES * SAMPLES;
      const offset = (py * size + px) * 4;

      if (covered > 0) {
        /* r/g/b accumulated over covered samples only, so the average of the
           covered samples is the un-premultiplied colour. */
        pixels[offset] = Math.round(r / covered);
        pixels[offset + 1] = Math.round(g / covered);
        pixels[offset + 2] = Math.round(b / covered);
        pixels[offset + 3] = Math.round((covered / total) * 255);
      }
    }
  }

  return pixels;
}

/* --- PNG -------------------------------------------------------------- */

const CRC_TABLE = (function buildCrcTable() {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) {
    c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter: adaptive
  ihdr[12] = 0; // no interlace

  /* One filter byte (0 = None) in front of each scanline. */
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --- ICO -------------------------------------------------------------- */

/* PNG-compressed entries, which every current browser and Windows Vista
   onwards reads. Keeps the file small and avoids hand-rolling a BMP plus AND
   mask for a fallback asset. */
function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;

  entries.forEach((entry, index) => {
    const at = index * 16;
    directory[at] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[at + 2] = 0; // palette size
    directory[at + 3] = 0; // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(entry.png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += entry.png.length;
  });

  const payloads = entries.map((entry) => entry.png);
  return Buffer.concat([header, directory].concat(payloads));
}

/* --- Run -------------------------------------------------------------- */

function write(name, contents) {
  writeFileSync(join(OUT_DIR, name), contents);
  const kb = (contents.length / 1024).toFixed(1);
  console.log('  public/' + name.padEnd(24) + kb.padStart(6) + ' kB');
}

function png(size, options) {
  return encodePng(size, rasterise(size, options));
}

mkdirSync(OUT_DIR, { recursive: true });
console.log('Generating Ajani icon assets from src/lib/brandMarkGeometry.js');

write('favicon.svg', markSvgDocument());
write('favicon-32.png', png(32));
write('icon-192.png', png(192));
write('icon-512.png', png(512));

/* Maskable icons may be cropped to a circle, so the glyph sits inside the
   recommended safe zone and the plate colour runs to the edges. */
write('icon-maskable-512.png', png(512, { fullBleed: true, inset: 0.62 }));

/* iOS applies its own rounded mask and does not honour transparency, so the
   Apple icon is full-bleed too. */
write('apple-touch-icon.png', png(180, { fullBleed: true, inset: 0.72 }));

write(
  'favicon.ico',
  encodeIco([16, 32, 48].map((size) => ({ size, png: png(size) }))),
);

console.log('Done.');
