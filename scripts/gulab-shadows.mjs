/**
 * Makes Gulab Mahal's soft shadows: public/templates/gulab-mahal/shadow-*.webp.
 *
 * A shadow is each object's own outline (its alpha), blurred and tinted a
 * deep wine, with room round it for the blur. The card lays it under the
 * object as a layer of its own that moves with it, so nothing that moves
 * carries a drop-shadow filter to be worked out again as it moves.
 *
 * Every shadow is the object's picture shrunk to SIZE across, with PAD of
 * that width added on every side; the card places it with `shadowBox` in
 * templates/gulab-mahal/art.ts, which uses the same PAD. Run it again
 * whenever one of the pictures changes; the shadows are committed, so
 * nothing here runs when the site is built.
 *
 *   node scripts/gulab-shadows.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "templates", "gulab-mahal");

/* Shared with art.ts: the room round the object, as a share of its width. */
const PAD = 0.14;
const SIZE = 360;

/* Which pictures, and how soft each shadow is (blur, as a share of the width). */
const OBJECTS = [
  ["envelope-body", 0.045],
  ["seal-rose", 0.06],
  ["scroll-roll", 0.03],
  ["couple-tag", 0.05],
  ["event-card", 0.045],
  ["cameo-frame", 0.045],
  ["letter-paper", 0.045],
  ["venue-arch", 0.035],
  ["box-empty", 0.04],
];

for (const [name, softness] of OBJECTS) {
  const source = sharp(join(DIR, `${name}.webp`)).resize({ width: SIZE });
  const { data, info } = await source.ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true });
  const pad = Math.round(SIZE * PAD);
  const width = info.width + pad * 2;
  const height = info.height + pad * 2;

  const alpha = await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0 } })
    .blur(Math.max(0.5, SIZE * softness))
    .linear(0.62, 0)
    .extractChannel(0)
    .raw()
    .toBuffer();

  const out = join(DIR, `shadow-${name}.webp`);
  await sharp({ create: { width, height, channels: 3, background: { r: 36, g: 8, b: 14 } } })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .webp({ quality: 80, alphaQuality: 80, effort: 6 })
    .toFile(out);

  const size = (await sharp(out).toBuffer()).length;
  console.log(`shadow-${name}.webp ${width}x${height} ${Math.round(size / 1024)} KB`);
}

/* The scroll's paper: a plain rectangle, stretched down as the paper comes down. */
{
  const width = 320;
  const height = 320;
  const pad = Math.round(width * PAD);
  const rect = Buffer.alloc((width + pad * 2) * (height + pad * 2), 0);
  for (let y = pad; y < pad + height; y += 1) {
    rect.fill(255, y * (width + pad * 2) + pad, y * (width + pad * 2) + pad + width);
  }
  const alpha = await sharp(rect, { raw: { width: width + pad * 2, height: height + pad * 2, channels: 1 } })
    .blur(width * 0.05)
    .linear(0.55, 0)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const out = join(DIR, "shadow-scroll-paper.webp");
  await sharp({ create: { width: width + pad * 2, height: height + pad * 2, channels: 3, background: { r: 36, g: 8, b: 14 } } })
    .joinChannel(alpha, { raw: { width: width + pad * 2, height: height + pad * 2, channels: 1 } })
    .webp({ quality: 80, alphaQuality: 80, effort: 6 })
    .toFile(out);
  console.log(`shadow-scroll-paper.webp ${width + pad * 2}x${height + pad * 2}`);
}
