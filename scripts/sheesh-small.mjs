/**
 * Sheesh Mahal's lighter pictures, for a guest on a slow connection: every
 * room picture again at 55% of its width, WebP at quality 70, beside it as
 * `<name>-sm.webp` (wall.webp, wall-sm.webp). Which a guest is shown is
 * decided in templates/sheesh-mahal/picture.ts.
 *
 *   node scripts/sheesh-small.mjs
 *
 * Run by hand when a picture is added or replaced; the output is committed,
 * so nothing here runs at build time. Uses the sharp that ships inside
 * Next.js rather than a dependency of our own.
 */
import { statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DIR = "public/templates/sheesh-mahal";
const PICTURES = [
  "wall",
  "door-left",
  "door-right",
  "hall",
  "jharokha-moon",
  "jharokha-frame",
  "function-card",
  "venue-night",
  "farmaan",
  "kandeel",
];
const SHARE = 0.55;
const QUALITY = 70;

let before = 0;
let after = 0;

for (const name of PICTURES) {
  const from = join(DIR, `${name}.webp`);
  const to = join(DIR, `${name}-sm.webp`);
  const { width } = await sharp(from).metadata();

  await sharp(from)
    .resize({ width: Math.round(width * SHARE) })
    .webp({ quality: QUALITY, alphaQuality: 80, effort: 6 })
    .toFile(to);

  const a = statSync(from).size;
  const b = statSync(to).size;
  before += a;
  after += b;
  console.log(`${name}: ${Math.round(a / 1024)} KB -> ${Math.round(b / 1024)} KB`);
}

console.log(`all: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB`);
