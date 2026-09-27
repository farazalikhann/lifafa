/**
 * Cuts supplied artwork out of the background it arrived on and publishes it
 * as WebP: the flowers to public/decor/flowers/, the ornaments to
 * public/decor/ornaments/.
 *
 *   node scripts/cut-flowers.mjs              every set
 *   node scripts/cut-flowers.mjs flowers      just the flowers
 *   node scripts/cut-flowers.mjs ornaments    just the ornaments
 *   node scripts/cut-flowers.mjs ornaments toran kalash   just those two
 *   node scripts/cut-flowers.mjs calligraphy  just the calligraphy
 *
 * Run by hand when a picture is added or replaced — the output is committed,
 * so nothing here runs at build time. Uses the sharp that ships inside Next.js
 * rather than a dependency of our own.
 *
 * TWO BACKGROUNDS ARRIVE, AND EACH HAS ITS OWN CUT.
 *
 * On black — the flowers, the rose petals and the leaf before them (see
 * lib/petals.ts), and the diya. Coverage is read from brightness: a pixel's
 * brightest channel below LOW is background, above HIGH is artwork, and the
 * ramp between is the soft edge — which is also what lets the diya's glow fade
 * out rather than stop. The brightest channel rather than luminance because a
 * marigold's deep orange is dim in luminance and bright in red. An edge pixel
 * is artwork mixed with black in proportion to its coverage, so its colour is
 * divided by that coverage; otherwise it leaves a dark rim on a cream card.
 *
 * On a painted checkerboard — the garland, the toran, the om, the kalash and
 * Ganesh. They were exported with the grey-and-white "transparent" squares
 * drawn into the JPEG. The squares are two greys with no colour in them, but
 * they are not a clean grid: the period drifts from 16 to 21px between files
 * and the cells are smeared into each other, so matching a pixel to the colour
 * its cell ought to be would leave most of the background behind. What holds
 * instead is that every square, smeared or not, is grey with no colour in it,
 * and that the background is one piece reaching the edge of the picture. So:
 * a flood fill from the edges through pixels that are colourless and within
 * the measured range of the two greys. Nothing it cannot reach is removed —
 * a pocket of squares closed in by the ornament stays, and shows up in the
 * check afterwards rather than being guessed at. Then the rim: an edge pixel
 * is the ornament mixed with the grey behind it, so its coverage is read from
 * where it sits between that grey and the ornament's own colour a few pixels
 * in, and its colour is unmixed the same way the black cut divides it.
 *
 * Then cropped to what is left, and sized.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "photo border";
const LOW = 14;
const HIGH = 56;

const PIECE = 160;
const FLOWER = 240;

/** Source file for each published flower. The bud is not supplied yet. */
const FLOWERS = [
  { name: "lotus-petal", file: "WhatsApp Image 2026-09-26 at 11.43.31 PM.jpeg", fit: { long: PIECE } },
  { name: "lotus-flower", file: "WhatsApp Image 2026-09-26 at 11.43.31 PM (1).jpeg", fit: { long: FLOWER } },
  { name: "mogra-flower", file: "WhatsApp Image 2026-09-26 at 11.43.31 PM (2).jpeg", fit: { long: FLOWER } },
  { name: "marigold-petal", file: "WhatsApp Image 2026-09-26 at 11.43.32 PM.jpeg", fit: { long: PIECE } },
  { name: "marigold-flower", file: "WhatsApp Image 2026-09-26 at 11.43.32 PM (1).jpeg", fit: { long: FLOWER } },
].map((entry) => ({ ...entry, background: "black", out: join("public", "decor", "flowers") }));

/** The Hindu pack's ornaments. */
const ORNAMENTS = [
  {
    name: "diya",
    file: "WhatsApp Image 2026-09-27 at 2.45.33 PM.jpeg",
    background: "black",
    fit: { height: 320 },
    /*
      The bowl's engraving is cut deep enough to go nearly black, which the
      ramp reads as see-through: on cream the bowl came out speckled. Dark
      that the background cannot reach without crossing gold is the bowl's
      own shadow, and stays solid.
    */
    solidInside: true,
    /*
      The flame and its glow are light, not a surface. Treated as a surface
      the dim outer glow is a dark orange at nearly full cover, which is a
      brown ring on a cream card. As light, coverage follows brightness and
      the colour is lifted back to full: identical over black, and a glow
      that fades into cream. The box is the flame's, in the source's pixels,
      and blends into the bowl's cut over `feather` rows at its foot.
    */
    light: { x0: 960, y0: 100, x1: 1225, y1: 500, feather: 40 },
  },
  /*
    The kalash, Ganesh and the toran first came on a painted checkerboard and
    failed their cut — squares caught in pockets the ornament closes off. These
    are their replacements on black, with the swastik, which had none. Each
    keeps its own dark shading solid, as the diya's bowl does.
  */
  { name: "kalash", file: "ChatGPT Image Sep 27, 2026, 10_27_44 PM.png", background: "black", fit: { height: 320 }, solidInside: true },
  {
    name: "ganesh",
    file: "ChatGPT Image Sep 27, 2026, 10_27_49 PM.png",
    background: "black",
    fit: { height: 260 },
    solidInside: true,
    /*
      The gap between the trunk's curl and the right earring is closed off;
      see the toran. Ganesh's own dark hair at the temples is true black too,
      in patches up to about 60px, so only an area far bigger than those is
      taken for background — the gap is over 13,000.
    */
    pocketMin: 500,
  },
  { name: "swastik", file: "ChatGPT Image Sep 27, 2026, 10_27_55 PM.png", background: "black", fit: { height: 260 }, solidInside: true },
  { name: "om", file: "WhatsApp Image 2026-09-27 at 2.45.32 PM (1).jpeg", background: "checker", fit: { height: 260 } },
  {
    name: "toran",
    file: "ChatGPT Image Sep 27, 2026, 10_27_37 PM.png",
    background: "black",
    fit: { width: 1200 },
    solidInside: true,
    /*
      Two things the diya's rule gets wrong here. The cord closes off pockets
      of background under its swags, which "solid inside" fills with black;
      and the leaves' shaded edges are dark enough that a flood from the edges
      through anything below HIGH runs deep into them and washes them out.
      So the flood from the edges stops at a darker level, and an enclosed
      area of true black counts as background when it is big enough to be a
      pocket — the leaves' own black specks are far smaller, and stay solid.
    */
    floodBelow: 30,
    pocketMin: 40,
  },
  { name: "marigold-garland", file: "WhatsApp Image 2026-09-27 at 2.45.32 PM.jpeg", background: "checker", fit: { width: 1200 } },
].map((entry) => ({ ...entry, out: join("public", "decor", "ornaments") }));

/**
 * The Hindu calligraphy: white lettering on black, published as a white shape
 * whose alpha is the lettering's brightness. The card uses it as a CSS mask and
 * fills it with the card's accent, so only the alpha matters — see "mask" below.
 */
const CALLIGRAPHY = [
  {
    name: "shubh-vivah",
    file: "ChatGPT Image Sep 28, 2026, 01_43_47 AM.png",
    /*
      The supplied art has a small white smudge on the left of the ु under
      शु. It touches the stroke, so it is not a separate speck the cut could
      drop: it is erased in the published file, left of the stroke's own edge
      as the clean rows above and below it place that edge, and nothing the
      stroke is solid in is touched. In published pixels.
    */
    touchUp: { rows: [479, 490], edgeFrom: [478, 238.5], edgeTo: [491, 248.5], left: 234 },
  },
  { name: "sadar-nimantran", file: "ChatGPT Image Sep 28, 2026, 01_43_52 AM.png" },
  { name: "radhe-krishna", file: "ChatGPT Image Sep 28, 2026, 01_43_57 AM.png" },
  /* The second supply, which spells गणेशाय; the first was lettered गणराय. */
  { name: "shri-ganeshaya-namah", file: "ChatGPT Image Sep 28, 2026, 02_07_37 AM.png" },
  { name: "vivahotsav", file: "ChatGPT Image Sep 28, 2026, 01_44_07 AM.png" },
].map((entry) => ({
  ...entry,
  background: "mask",
  fit: { width: 900 },
  out: join("public", "decor", "calligraphy"),
}));

/* --- On black ---------------------------------------------------------- */

/**
 * Coverage per pixel, and the colour it is un-darkened to.
 *
 * A fixed ramp is right for a dark flower and wrong for a white one: the
 * mogra's edge is grey in the photograph because it is half white and half
 * black, and a ramp that ends at HIGH calls that grey fully covered — a grey
 * rim on a cream card. So within EDGE_REACH of the background, coverage is
 * also read against the brightest pixel around it: grey beside white is half
 * covered, and comes out white, fading. Creases inside a flower are nowhere
 * near the background and keep the plain ramp.
 */
function cutOnBlack(data, width, height, options = {}) {
  const count = width * height;
  const bright = new Uint8Array(count);
  for (let pixel = 0; pixel < count; pixel += 1) {
    bright[pixel] = Math.max(data[pixel * 3], data[pixel * 3 + 1], data[pixel * 3 + 2]);
  }

  const EDGE_REACH = 3;
  const rgba = Buffer.alloc(count * 4);

  /* Background reached from the edges through dark pixels; anything else dark is the artwork's own. */
  let outside = null;
  if (options.solidInside) {
    outside = new Uint8Array(count);
    const stack = [];
    const floodBelow = options.floodBelow ?? HIGH;
    const seed = (pixel) => {
      if (!outside[pixel] && bright[pixel] < floodBelow) {
        outside[pixel] = 1;
        stack.push(pixel);
      }
    };
    for (let x = 0; x < width; x += 1) { seed(x); seed((height - 1) * width + x); }
    for (let y = 0; y < height; y += 1) { seed(y * width); seed(y * width + width - 1); }
    while (stack.length > 0) {
      const pixel = stack.pop();
      const x = pixel % width;
      const y = (pixel - x) / width;
      if (x > 0) seed(pixel - 1);
      if (x < width - 1) seed(pixel + 1);
      if (y > 0) seed(pixel - width);
      if (y < height - 1) seed(pixel + width);
    }

    /* Enclosed true black big enough to be a pocket of background, not a shadow. */
    if (options.pocketMin) {
      const seen = new Uint8Array(count);
      for (let start = 0; start < count; start += 1) {
        if (seen[start] || outside[start] || bright[start] >= LOW) continue;
        const region = [start];
        seen[start] = 1;
        for (let i = 0; i < region.length; i += 1) {
          const pixel = region[i];
          const x = pixel % width;
          const y = (pixel - x) / width;
          for (const near of [x > 0 ? pixel - 1 : -1, x < width - 1 ? pixel + 1 : -1, y > 0 ? pixel - width : -1, y < height - 1 ? pixel + width : -1]) {
            if (near >= 0 && !seen[near] && !outside[near] && bright[near] < LOW) {
              seen[near] = 1;
              region.push(near);
            }
          }
        }
        if (region.length >= options.pocketMin) {
          for (const pixel of region) stack.push(pixel), (outside[pixel] = 1);
          /* And the pocket's soft rim with it, as far as the flood would go. */
          while (stack.length > 0) {
            const pixel = stack.pop();
            const x = pixel % width;
            const y = (pixel - x) / width;
            if (x > 0) seed(pixel - 1);
            if (x < width - 1) seed(pixel + 1);
            if (y > 0) seed(pixel - width);
            if (y < height - 1) seed(pixel + width);
          }
        }
      }
    }
  }

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

      if (outside !== null && !outside[pixel]) {
        coverage = 1;
      }

      const light = options.light;
      if (light && x >= light.x0 && x <= light.x1 && y >= light.y0 && y <= light.y1 + light.feather) {
        const asLight = Math.max(0, (bright[pixel] - LOW) / (255 - LOW));
        /* Glow the background reaches stays light all the way down; the wick and spout blend in. */
        const toBowl =
          outside !== null && outside[pixel]
            ? 0
            : Math.min(1, Math.max(0, (y - light.y1) / light.feather));
        coverage = asLight + (coverage - asLight) * toBowl;
      }

      if (coverage > 0) {
        rgba[pixel * 4] = Math.min(255, Math.round(data[pixel * 3] / coverage));
        rgba[pixel * 4 + 1] = Math.min(255, Math.round(data[pixel * 3 + 1] / coverage));
        rgba[pixel * 4 + 2] = Math.min(255, Math.round(data[pixel * 3 + 2] / coverage));
        rgba[pixel * 4 + 3] = Math.round(coverage * 255);
      }
    }
  }

  return { rgba, report: "" };
}

/* --- On a painted checkerboard ----------------------------------------- */

/** How far from grey a checker pixel may be: the corners' own worst, plus JPEG slack. */
const CHECKER_SAT_SLACK = 10;
/** How far outside the two measured greys a smeared square may fall. */
const CHECKER_LUM_SLACK = 26;
/** Pixels in from the cut that count as the rim and are unmixed. */
const RIM = 3;

function saturation(data, pixel) {
  const r = data[pixel * 3];
  const g = data[pixel * 3 + 1];
  const b = data[pixel * 3 + 2];
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function luminance(data, pixel) {
  return (data[pixel * 3] + data[pixel * 3 + 1] + data[pixel * 3 + 2]) / 3;
}

/**
 * The two greys and how colourless they are, read from the four corners, where
 * none of these pictures has any ornament. A two-way split of the corners'
 * luminance finds the light square and the dark one.
 */
function measureChecker(data, width, height) {
  const size = Math.round(Math.min(width, height) * 0.09);
  const samples = [];
  let maxSat = 0;

  for (const [x0, y0] of [
    [0, height - size],
    [width - size, height - size],
    [0, 0],
    [width - size, 0],
  ]) {
    for (let y = y0; y < y0 + size; y += 1) {
      for (let x = x0; x < x0 + size; x += 1) {
        const pixel = y * width + x;
        const sat = saturation(data, pixel);
        /* A corner the ornament reaches into is skipped pixel by pixel. */
        if (sat > 20) continue;
        maxSat = Math.max(maxSat, sat);
        samples.push(luminance(data, pixel));
      }
    }
  }

  let dark = 130;
  let light = 205;
  for (let round = 0; round < 12; round += 1) {
    let darkSum = 0, darkN = 0, lightSum = 0, lightN = 0;
    for (const value of samples) {
      if (Math.abs(value - dark) < Math.abs(value - light)) {
        darkSum += value; darkN += 1;
      } else {
        lightSum += value; lightN += 1;
      }
    }
    dark = darkSum / Math.max(1, darkN);
    light = lightSum / Math.max(1, lightN);
  }

  /* The cell, for the record: the strongest repeat along a bottom row. */
  const row = [];
  for (let x = 0; x < Math.min(400, width); x += 1) row.push(luminance(data, (height - 30) * width + x));
  const mean = row.reduce((a, b) => a + b, 0) / row.length;
  let period = 0, best = -Infinity;
  for (let p = 6; p < 80; p += 1) {
    let score = 0;
    for (let x = 0; x + p < row.length; x += 1) score += (row[x] - mean) * (row[x + p] - mean);
    if (score > best) { best = score; period = p; }
  }

  return {
    dark,
    light,
    maxSat: maxSat + CHECKER_SAT_SLACK,
    low: dark - CHECKER_LUM_SLACK,
    high: light + CHECKER_LUM_SLACK,
    period,
  };
}

function cutFromChecker(data, width, height) {
  const count = width * height;
  const checker = measureChecker(data, width, height);
  const isCheckerish = (pixel) => {
    if (saturation(data, pixel) > checker.maxSat) return false;
    const lum = luminance(data, pixel);
    return lum >= checker.low && lum <= checker.high;
  };

  /* Flood from every edge pixel through checker-like pixels, 4-connected. */
  const removed = new Uint8Array(count);
  const stack = [];
  const seed = (pixel) => {
    if (!removed[pixel] && isCheckerish(pixel)) {
      removed[pixel] = 1;
      stack.push(pixel);
    }
  };
  for (let x = 0; x < width; x += 1) { seed(x); seed((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { seed(y * width); seed(y * width + width - 1); }
  while (stack.length > 0) {
    const pixel = stack.pop();
    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x > 0) seed(pixel - 1);
    if (x < width - 1) seed(pixel + 1);
    if (y > 0) seed(pixel - width);
    if (y < height - 1) seed(pixel + width);
  }

  /* Distance from the cut, in pixels, out to RIM + 2. */
  const REACH = RIM + 2;
  const distance = new Uint8Array(count).fill(255);
  let frontier = [];
  for (let pixel = 0; pixel < count; pixel += 1) {
    if (removed[pixel]) { distance[pixel] = 0; frontier.push(pixel); }
  }
  for (let step = 1; step <= REACH; step += 1) {
    const next = [];
    for (const pixel of frontier) {
      const x = pixel % width;
      const y = (pixel - x) / width;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const near = ny * width + nx;
        if (distance[near] === 255) { distance[near] = step; next.push(near); }
      }
    }
    frontier = next;
  }

  const rgba = Buffer.alloc(count * 4);
  let unmixed = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (removed[pixel]) continue;

      let r = data[pixel * 3], g = data[pixel * 3 + 1], b = data[pixel * 3 + 2];
      let coverage = 1;

      if (distance[pixel] <= RIM) {
        /* What is behind it: the removed grey around it. What it is: the ornament further in. */
        let bgR = 0, bgG = 0, bgB = 0, bgN = 0, fgR = 0, fgG = 0, fgB = 0, fgN = 0;
        for (let dy = -REACH; dy <= REACH; dy += 1) {
          for (let dx = -REACH; dx <= REACH; dx += 1) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const near = ny * width + nx;
            if (removed[near]) {
              bgR += data[near * 3]; bgG += data[near * 3 + 1]; bgB += data[near * 3 + 2]; bgN += 1;
            } else if (distance[near] > RIM) {
              fgR += data[near * 3]; fgG += data[near * 3 + 1]; fgB += data[near * 3 + 2]; fgN += 1;
            }
          }
        }

        if (bgN > 0 && fgN > 0) {
          bgR /= bgN; bgG /= bgN; bgB /= bgN;
          fgR /= fgN; fgG /= fgN; fgB /= fgN;
          const spanR = fgR - bgR, spanG = fgG - bgG, spanB = fgB - bgB;
          const span = spanR * spanR + spanG * spanG + spanB * spanB;

          /* Only where the ornament is distinguishable from the grey at all. */
          if (span > 900) {
            coverage = ((r - bgR) * spanR + (g - bgG) * spanG + (b - bgB) * spanB) / span;
            coverage = Math.min(1, Math.max(0, coverage));
            if (coverage > 0.02) {
              r = (r - (1 - coverage) * bgR) / coverage;
              g = (g - (1 - coverage) * bgG) / coverage;
              b = (b - (1 - coverage) * bgB) / coverage;
            }
            unmixed += 1;
          }
        } else if (bgN > 0) {
          /* A sliver with no ornament behind it to measure against: let it go. */
          coverage = 0;
        }
      }

      if (coverage > 0.02) {
        rgba[pixel * 4] = Math.min(255, Math.max(0, Math.round(r)));
        rgba[pixel * 4 + 1] = Math.min(255, Math.max(0, Math.round(g)));
        rgba[pixel * 4 + 2] = Math.min(255, Math.max(0, Math.round(b)));
        rgba[pixel * 4 + 3] = Math.round(coverage * 255);
      }
    }
  }

  /* What the flood could not reach: checker-like pixels still standing, for the check. */
  let leftover = 0;
  for (let pixel = 0; pixel < count; pixel += 1) {
    if (!removed[pixel] && rgba[pixel * 4 + 3] > 0 && isCheckerish(pixel)) {
      const s = saturation(data, pixel);
      if (s <= checker.maxSat - CHECKER_SAT_SLACK + 2) leftover += 1;
    }
  }

  const report =
    `greys ${checker.dark.toFixed(0)}/${checker.light.toFixed(0)}, ` +
    `sat<=${checker.maxSat}, repeat ${checker.period}px, ` +
    `removed ${((removed.reduce((a, v) => a + v, 0) / count) * 100).toFixed(1)}%, ` +
    `rim unmixed ${unmixed}, grey pixels left inside ${leftover}`;

  return { rgba, report };
}

/* --- White lettering on black, as a mask -------------------------------- */

/** Below this the black is the sheet, not the lettering's soft edge. */
const MASK_FLOOR = 12;
/** At and above this the lettering is solid. */
const MASK_SOLID = 232;

/**
 * Brightness as coverage, everything else white. Black is fully transparent,
 * white fully solid, and the anti-aliased edge in between keeps its ramp — so
 * a thin stroke stays as thin and as soft as it was drawn. The floor is what
 * takes the sheet's near-black noise out, so nothing speckles once the mask is
 * filled with a colour.
 */
function cutMask(data, width, height) {
  const count = width * height;
  const rgba = Buffer.alloc(count * 4);

  for (let pixel = 0; pixel < count; pixel += 1) {
    const lum =
      0.2126 * data[pixel * 3] + 0.7152 * data[pixel * 3 + 1] + 0.0722 * data[pixel * 3 + 2];
    const coverage = Math.min(1, Math.max(0, (lum - MASK_FLOOR) / (MASK_SOLID - MASK_FLOOR)));

    rgba[pixel * 4] = 255;
    rgba[pixel * 4 + 1] = 255;
    rgba[pixel * 4 + 2] = 255;
    rgba[pixel * 4 + 3] = Math.round(coverage * 255);
  }

  return { rgba, report: "" };
}

/* --- Crop, size, publish ------------------------------------------------ */

async function publish(entry) {
  const { data, info } = await sharp(join(SOURCE, entry.file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const { rgba, report } =
    entry.background === "black"
      ? cutOnBlack(data, width, height, entry)
      : entry.background === "mask"
        ? cutMask(data, width, height)
        : cutFromChecker(data, width, height);

  /* Cropped to what is left — a stray pixel below 10% coverage does not stretch the box. */
  let top = height, bottom = -1, left = width, right = -1;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (rgba[pixel * 4 + 3] > (entry.background === "black" ? 0 : entry.background === "mask" ? 8 : 25)) {
      const x = pixel % width;
      const y = (pixel - x) / width;
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      left = Math.min(left, x); right = Math.max(right, x);
    }
  }

  const resize =
    "long" in entry.fit
      ? { width: entry.fit.long, height: entry.fit.long, fit: "inside" }
      : entry.fit;

  mkdirSync(entry.out, { recursive: true });
  const target = join(entry.out, `${entry.name}.webp`);
  let sized = sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(resize);

  /*
    A hand touch-up in published pixels: in each row of `rows`, whatever lies
    left of the stroke's edge — a straight line through the clean rows either
    side — and right of `left` is cleared, the pixel astride the edge keeps a
    soft half, and anything the stroke is solid in is left alone.
  */
  if (entry.touchUp) {
    const { data: px, info: size } = await sized.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { rows, edgeFrom, edgeTo, left: from } = entry.touchUp;
    const slope = (edgeTo[1] - edgeFrom[1]) / (edgeTo[0] - edgeFrom[0]);
    for (let y = rows[0]; y <= rows[1]; y += 1) {
      const edge = edgeFrom[1] + slope * (y - edgeFrom[0]);
      for (let x = from; x < Math.ceil(edge); x += 1) {
        const at = (y * size.width + x) * 4 + 3;
        if (px[at] >= 240) continue;
        const keep = Math.max(0, Math.min(1, x + 1 - edge + 0.5));
        px[at] = Math.min(px[at], Math.round(keep * 255));
      }
    }
    sized = sharp(px, { raw: { width: size.width, height: size.height, channels: 4 } });
  }

  const result = await sized
    .webp({ quality: 86, alphaQuality: 100, effort: 6 })
    .toFile(target);

  console.log(`${target}  ${result.width}x${result.height}  ${result.size} bytes${report ? `  (${report})` : ""}`);
}

const which = process.argv[2] ?? "all";
/* Named ones only, when named — so re-cutting one never re-encodes the rest. */
const only = process.argv.slice(3);
const sets = [
  ...(which === "all" || which === "flowers" ? FLOWERS : []),
  ...(which === "all" || which === "ornaments" ? ORNAMENTS : []),
  ...(which === "all" || which === "calligraphy" ? CALLIGRAPHY : []),
].filter((entry) => only.length === 0 || only.includes(entry.name));

for (const entry of sets) {
  if (entry.hold === true) {
    console.log(`held: ${entry.name} (see the note on ORNAMENTS)`);
    continue;
  }
  await publish(entry);
}
