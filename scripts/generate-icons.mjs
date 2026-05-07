import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";

const PUBLIC = "public";

function svgFor(size, opts = {}) {
  const { maskable = false } = opts;
  // Maskable icons need padding so the brand mark sits in the safe zone (~80%).
  // For maskable we shrink the typography area accordingly.
  const safe = maskable ? 0.6 : 0.78; // text width ratio
  const fontSize = Math.round(size * (maskable ? 0.22 : 0.30));
  // Slight letterSpacing tightening done via textLength + lengthAdjust.
  const textLen = Math.round(size * safe);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#4F9598" />
  <text x="${size / 2}"
        y="${size / 2}"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        font-weight="900"
        font-size="${fontSize}"
        textLength="${textLen}"
        lengthAdjust="spacingAndGlyphs"
        letter-spacing="-${Math.round(fontSize * 0.06)}"
        fill="#FFFFFF">MCQ</text>
</svg>`;
}

async function generate(filename, size, opts) {
  const svg = svgFor(size, opts);
  const outPath = path.join(PUBLIC, filename);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outPath);
  console.log(`wrote ${outPath} (${size}x${size}${opts?.maskable ? ", maskable" : ""})`);
}

await fs.mkdir(PUBLIC, { recursive: true });
await generate("icon-192.png", 192);
await generate("icon-512.png", 512);
await generate("icon-maskable-512.png", 512, { maskable: true });
