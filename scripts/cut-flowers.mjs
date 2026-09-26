/**
 * Cuts the flower photographs out of their black backgrounds and publishes
 * them to public/decor/flowers/ as WebP.
 *
 *   node scripts/cut-flowers.mjs
 *
 * Run once, by hand, when a flower is added or replaced — the output is
 * committed, so nothing here runs at build time. Uses the sharp that ships
 * inside Next.js rather than a dependency of our own.
 *
 * THE CUT, the same one the rose petals and the leaf were given (see
 * lib/petals.ts). The photographs arrive as JPEGs on 0,0,0 with no alpha, so
 * coverage is read from brightness: a pixel's brightest channel below LOW is
 * background, above HIGH is flower, and the ramp between is the soft edge.
 * The brightest channel rather than luminance because a marigold's deep
 * orange is dim in luminance and bright in red.
 *
 * THE FRINGE. An edge pixel is flower colour mixed with black in proportion
 * to its coverage, so drawn at that coverage over a cream card it leaves a
 * dark rim. Dividing its colour by its coverage undoes the mix, and the edge
 * comes out the flower's own colour, fading.
 *
 * Then cropped to what is left and sized by the long side: loose pieces at
 * PIECE px, whole flowers at FLOWER px, both about twice what the card draws
 * so they stay sharp on a phone's screen.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "photo border";
const OUT = join("public", "decor", "flowers");
const PIECE = 160;
const FLOWER = 240;
const LOW = 14;
const HIGH = 56;

/** Source file for each published name. The bud is not supplied yet. */
const FLOWERS = [
  { name: "lotus-petal", file: "WhatsApp Image 2026-09-26 at 11.43.31 PM.jpeg", long: PIECE },
  { name: "lotus-flower", file: "WhatsApp Image 2026-09-26 at 11.43.31 PM (1).jpeg", long: FLOWER },
  { name: "mogra-flower", file: "WhatsApp Image 2026-09-26 at 11.43.31 PM (2).jpeg", long: FLOWER },
  { name: "marigold-petal", file: "WhatsApp Image 2026-09-26 at 11.43.32 PM.jpeg", long: PIECE },
  { name: "marigold-flower", file: "WhatsApp Image 2026-09-26 at 11.43.32 PM (1).jpeg", long: FLOWER },
];

mkdirSync(OUT, { recursive: true });

for (const flower of FLOWERS) {
  const { data, info } = await sharp(join(SOURCE, flower.file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const count = width * height;
  const bright = new Uint8Array(count);
  for (let pixel = 0; pixel < count; pixel += 1) {
    bright[pixel] = Math.max(data[pixel * 3], data[pixel * 3 + 1], data[pixel * 3 + 2]);
  }

  /*
    A fixed ramp is right for a dark flower and wrong for a white one: the
    mogra's edge is grey in the photograph because it is half white and half
    black, and a ramp that ends at HIGH calls that grey fully covered — a grey
    rim on a cream card. So within EDGE_REACH of the background, coverage is
    also read against the brightest flower pixel around it: grey beside white
    is half covered, and comes out white, fading. Creases inside a flower are
    nowhere near the background and keep the plain ramp.
  */
  const EDGE_REACH = 3;
  const coverageOf = new Float32Array(count);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      let coverage = Math.min(1, Math.max(0, (bright[pixel] - LOW) / (HIGH - LOW)));

      if (coverage > 0) {
        let nearBackground = false;
        let localMax = bright[pixel];

        for (let dy = -EDGE_REACH; dy <= EDGE_REACH; dy += 1) {
          for (let dx = -EDGE_REACH; dx <= EDGE_REACH; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
              nearBackground = true;
              continue;
            }
            const near = bright[ny * width + nx];
            if (near < LOW) nearBackground = true;
            if (near > localMax) localMax = near;
          }
        }

        if (nearBackground && localMax > HIGH) {
          coverage = Math.min(coverage, (bright[pixel] - LOW) / (localMax - LOW));
        }
      }

      coverageOf[pixel] = coverage;
    }
  }

  const rgba = Buffer.alloc(count * 4);
  let top = height;
  let bottom = -1;
  let left = width;
  let right = -1;

  for (let pixel = 0; pixel < count; pixel += 1) {
    const r = data[pixel * 3];
    const g = data[pixel * 3 + 1];
    const b = data[pixel * 3 + 2];
    const coverage = coverageOf[pixel];

    if (coverage > 0) {
      rgba[pixel * 4] = Math.min(255, Math.round(r / coverage));
      rgba[pixel * 4 + 1] = Math.min(255, Math.round(g / coverage));
      rgba[pixel * 4 + 2] = Math.min(255, Math.round(b / coverage));
      rgba[pixel * 4 + 3] = Math.round(coverage * 255);

      const x = pixel % width;
      const y = Math.floor(pixel / width);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }

  const cropWidth = right - left + 1;
  const cropHeight = bottom - top + 1;
  const target = join(OUT, `${flower.name}.webp`);

  const result = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize({ width: flower.long, height: flower.long, fit: "inside" })
    .webp({ quality: 86, alphaQuality: 100, effort: 6 })
    .toFile(target);

  console.log(`${target}  ${result.width}x${result.height}  ${result.size} bytes`);
}
