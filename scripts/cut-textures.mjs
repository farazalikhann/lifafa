/**
 * Makes the royal texture's tiles from a photograph of patterned cloth, and
 * publishes them to public/decor/texture/: a 600px tile for dark cards and one
 * for light cards, for each pattern. See lib/royalTexture.ts for why two.
 *
 *   node scripts/cut-textures.mjs            every pattern
 *   node scripts/cut-textures.mjs paisley    just that one
 *
 * Run by hand when a pattern is added or replaced. The output is committed, so
 * nothing here runs at build time. Uses the sharp that ships inside Next.js,
 * as scripts/cut-flowers.mjs does.
 *
 * THE CLOTH REPEATS, BUT NOT EXACTLY. The pictures are 1254px of a pattern
 * that looks regular and is not: measured by autocorrelation, the paisley
 * repeats across every 418px almost perfectly (0.97) and down the picture
 * hardly at all (0.34 at best), because no two of its rows are drawn quite
 * alike; the jaal is in between both ways (0.78 across, 0.86 down). A tile cut
 * at a fixed size and faded into itself at the join, the way the envelope's
 * papers are, would show every vine twice wherever the two rows disagree.
 *
 * SO THE JOIN IS A CUT, NOT A FADE. Where the tile's first rows and the rows
 * that follow its last one overlap, a path is found across the overlap along
 * which the two are most alike, pixel for pixel: it runs through bare ground
 * where it can and crosses a vine only where both have one. Above the path
 * the tile is the rows that really came next, below it the tile's own, with
 * two pixels of feather. The same is done down the other join. And because a
 * repeat that is a few pixels longer or shorter may join far better, the
 * length of the tile each way, and where it starts, are searched for within
 * the ranges given below and the cheapest cut is the one kept.
 *
 * THE TONES ARE THE DAMASK'S, MEASURED. lib/royalTexture.ts works out how
 * strongly to lay a tile on a card from the damask's own greys, so a new tile
 * is given the same ones and needs no arithmetic of its own:
 *
 *   The dark-card tile runs from 70 to 208 (its 0.5th and 99.5th percentiles)
 *   and averages 127.5, which is the grey soft-light leaves alone.
 *
 *   The light-card tile is the pattern alone, grey on pure white: as much of
 *   it white as the damask's is (66%), its deepest grey 129 and its average
 *   232.8.
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "texture art";
const OUT = join("public", "decor", "texture");

/** The tile's side, in px. Drawn at 400 CSS px; see ROYAL_TEXTURE_TILE. */
const TILE = 600;

/** The damask's own figures, which every tile is made to. */
const DARK = { low: 70, high: 208, mean: 127.5 };
const LIGHT = { low: 129, mean: 232.8, white: 0.66 };

/** No tile is published heavier than this. The damask's two are 63 and 70 KB. */
const MAX_BYTES = 78 * 1024;

/** How many pixels of overlap a cut is looked for in. */
const OVERLAP = 110;

/**
 * Each pattern: its picture, and the ranges the tile's width and height are
 * searched in, in the picture's pixels. Two repeats across for the paisley and
 * three for the jaal, which is the finer pattern, so that a motif on the card
 * is about the size the damask's is.
 *
 * The ranges are narrow because the wide search has been run: the paisley's
 * height was looked for from 800 to 930 and came out at 903, the jaal's cell
 * at 769 by 714. Widen them again for a new picture; the whole search for one
 * pattern is a few minutes.
 */
const PATTERNS = [
  {
    name: "royal-paisley",
    alias: "paisley",
    file: "Monochrome Paisley Brocade Textile.png",
    width: [836, 836],
    height: [897, 909],
  },
  {
    name: "royal-jaal",
    alias: "jaal",
    file: "Monochrome Floral Ogee Damask Textile.png",
    width: [763, 774],
    height: [708, 720],
  },
];

/** A box blur, so the cut is judged on shapes and not on the weave's grain. */
function blurred(grey, width, height, radius) {
  const pass = (source, horizontal) => {
    const out = new Float32Array(source.length);
    const outer = horizontal ? height : width;
    const inner = horizontal ? width : height;
    for (let o = 0; o < outer; o += 1) {
      let sum = 0;
      let count = 0;
      const at = (i) => (horizontal ? o * width + i : i * width + o);
      for (let i = 0; i < Math.min(inner, radius + 1); i += 1) { sum += source[at(i)]; count += 1; }
      for (let i = 0; i < inner; i += 1) {
        out[at(i)] = sum / count;
        const add = i + radius + 1;
        const drop = i - radius;
        if (add < inner) { sum += source[at(add)]; count += 1; }
        if (drop >= 0) { sum -= source[at(drop)]; count -= 1; }
      }
    }
    return out;
  };
  return pass(pass(grey, true), false);
}

/**
 * The cheapest path across an overlap `along` long and OVERLAP deep, where
 * `cost(a, d)` is how unlike the two layers are at position `a` along the
 * join and depth `d` into it. Moves at most two steps of depth per step
 * along. Returns the depth at each position, and the path's mean cost.
 */
function cheapestPath(along, cost) {
  const total = new Float32Array(along * OVERLAP);
  const from = new Int16Array(along * OVERLAP);
  for (let d = 0; d < OVERLAP; d += 1) total[d] = cost(0, d);
  for (let a = 1; a < along; a += 1) {
    for (let d = 0; d < OVERLAP; d += 1) {
      let best = Infinity;
      let bestFrom = d;
      for (let step = -2; step <= 2; step += 1) {
        const prev = d + step;
        if (prev < 0 || prev >= OVERLAP) continue;
        const value = total[(a - 1) * OVERLAP + prev];
        if (value < best) { best = value; bestFrom = prev; }
      }
      total[a * OVERLAP + d] = best + cost(a, d);
      from[a * OVERLAP + d] = bestFrom;
    }
  }
  /* Kept off the overlap's two lips, where there is no room to feather. */
  let end = 4;
  for (let d = 4; d < OVERLAP - 4; d += 1) {
    if (total[(along - 1) * OVERLAP + d] < total[(along - 1) * OVERLAP + end]) end = d;
  }
  const path = new Int16Array(along);
  path[along - 1] = end;
  for (let a = along - 1; a > 0; a -= 1) path[a - 1] = from[a * OVERLAP + path[a]];
  return { path, cost: total[(along - 1) * OVERLAP + end] / along };
}

/**
 * Joins a picture to itself down one axis: `length` pixels from `start`, with
 * the first OVERLAP of them cut against the pixels that follow the far edge.
 * `soft` is the blurred picture the cut is judged on. Returns the joined
 * picture, its blurred twin joined the same way, and what the cut cost.
 */
function joinAxis(grey, soft, width, height, axis, start, length) {
  const along = axis === "y" ? width : height;
  const index = (a, d) => (axis === "y" ? (start + d) * width + a : a * width + start + d);
  const beyond = (a, d) => (axis === "y" ? (start + length + d) * width + a : a * width + start + length + d);

  const { path, cost } = cheapestPath(along, (a, d) => {
    const gap = soft[index(a, d)] - soft[beyond(a, d)];
    return gap * gap;
  });

  const outWidth = axis === "y" ? width : length;
  const outHeight = axis === "y" ? length : height;
  const out = new Float32Array(outWidth * outHeight);
  const outSoft = new Float32Array(outWidth * outHeight);
  const FEATHER = 2;

  for (let a = 0; a < along; a += 1) {
    for (let d = 0; d < length; d += 1) {
      /* Before the path: the pixels that really came next. After it: the tile's own. */
      const own = Math.min(1, Math.max(0, (d - path[a] + FEATHER) / (2 * FEATHER)));
      const here = index(a, d);
      const next = d < OVERLAP ? beyond(a, d) : here;
      const target = axis === "y" ? d * outWidth + a : a * outWidth + d;
      out[target] = grey[here] * own + grey[next] * (1 - own);
      outSoft[target] = soft[here] * own + soft[next] * (1 - own);
    }
  }

  return { grey: out, soft: outSoft, width: outWidth, height: outHeight, cost };
}

/** The value below which `share` of the pixels fall. */
function percentile(values, share) {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))];
}

/** The exponent that brings `curve`'s mean to `target`, by bisection. `rising` says which way it moves. */
function solve(curve, target, rising) {
  let low = 0.15;
  let high = 6;
  for (let round = 0; round < 40; round += 1) {
    const middle = (low + high) / 2;
    const mean = curve(middle);
    if (mean > target === rising) high = middle; else low = middle;
  }
  return (low + high) / 2;
}

function mean(values) {
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

/** The dark-card tile: the cloth's greys, run from 70 to 208 on a curve that averages 127.5. */
function darkTones(grey) {
  const low = percentile(grey, 0.005);
  const high = percentile(grey, 0.995);
  const unit = Float32Array.from(grey, (value) => Math.min(1, Math.max(0, (value - low) / (high - low))));
  const tones = (gamma) => Float32Array.from(unit, (value) => DARK.low + (DARK.high - DARK.low) * value ** gamma);
  /* A bigger exponent darkens, so the mean falls as it rises. */
  const gamma = solve((g) => mean(tones(g)), DARK.mean, false);
  return { pixels: tones(gamma), note: `gamma ${gamma.toFixed(2)}` };
}

/** The light-card tile: the pattern alone, grey on white. */
function lightTones(grey) {
  /* Everything up to the ground's own level is paper: as much of the tile as the damask leaves white. */
  const ground = percentile(grey, LIGHT.white);
  const high = percentile(grey, 0.995);
  const unit = Float32Array.from(grey, (value) => Math.min(1, Math.max(0, (value - ground) / (high - ground))));
  const tones = (gamma) => Float32Array.from(unit, (value) => 255 - (255 - LIGHT.low) * value ** gamma);
  /* A bigger exponent prints less of the pattern, so the mean rises with it. */
  const gamma = solve((g) => mean(tones(g)), LIGHT.mean, true);
  return { pixels: tones(gamma), note: `ground ${ground.toFixed(0)}, gamma ${gamma.toFixed(2)}` };
}

/** Encodes at the best quality that comes in under MAX_BYTES. */
async function encode(pixels, target) {
  const raw = Buffer.from(Uint8Array.from(pixels, (value) => Math.round(Math.min(255, Math.max(0, value)))));
  for (let quality = 86; quality >= 30; quality -= 4) {
    const buffer = await sharp(raw, { raw: { width: TILE, height: TILE, channels: 1 } })
      .toColourspace("b-w")
      .webp({ quality, effort: 6 })
      .toBuffer();
    if (buffer.length <= MAX_BYTES || quality === 30) {
      /* The bytes as encoded: handing them back to sharp to save would encode them a second time. */
      writeFileSync(target, buffer);
      /* Measured on the file as published, which is what the card draws. */
      const { data } = await sharp(buffer).greyscale().raw().toBuffer({ resolveWithObject: true });
      const published = Float32Array.from(data);
      return {
        bytes: buffer.length,
        quality,
        low: percentile(published, 0.005),
        high: percentile(published, 0.995),
        mean: mean(published),
        white: published.filter((value) => value >= 250).length / published.length,
      };
    }
  }
  throw new Error(`could not encode ${target}`);
}

async function publish(pattern) {
  const { data, info } = await sharp(join(SOURCE, pattern.file))
    .removeAlpha()
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const grey = Float32Array.from(data);
  const soft = blurred(grey, width, height, 3);

  /* Down the picture first: the height and the starting row whose cut is cheapest. */
  let down = null;
  for (let length = pattern.height[0]; length <= pattern.height[1]; length += 1) {
    for (let start = 0; start + length + OVERLAP <= height; start += 16) {
      const tried = joinAxis(grey, soft, width, height, "y", start, length);
      if (down === null || tried.cost < down.cost) down = { ...tried, start, length };
    }
  }

  /* Then across what that left. */
  let across = null;
  for (let length = pattern.width[0]; length <= pattern.width[1]; length += 1) {
    for (let start = 0; start + length + OVERLAP <= down.width; start += 16) {
      const tried = joinAxis(down.grey, down.soft, down.width, down.height, "x", start, length);
      if (across === null || tried.cost < across.cost) across = { ...tried, start, length };
    }
  }

  const cell = Buffer.from(Uint8Array.from(across.grey, (value) => Math.round(value)));
  const { data: sized } = await sharp(cell, { raw: { width: across.width, height: across.height, channels: 1 } })
    .resize({ width: TILE, height: TILE, fit: "fill", kernel: "lanczos3" })
    /* One channel out, as one went in: a resize hands a grey picture back as three. */
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tile = Float32Array.from(sized);

  mkdirSync(OUT, { recursive: true });
  console.log(
    `${pattern.name}: cell ${across.length}x${down.length} from (${across.start}, ${down.start}), ` +
      `cut cost ${across.cost.toFixed(1)} across, ${down.cost.toFixed(1)} down`,
  );

  for (const [suffix, tones] of [["", darkTones(tile)], ["-light", lightTones(tile)]]) {
    const target = join(OUT, `${pattern.name}${suffix}.webp`);
    const result = await encode(tones.pixels, target);
    console.log(
      `  ${target}  ${TILE}x${TILE}  ${result.bytes} bytes  q${result.quality}  (${tones.note}; ` +
        `0.5% ${result.low}, 99.5% ${result.high}, mean ${result.mean.toFixed(1)}, white ${(result.white * 100).toFixed(0)}%)`,
    );
  }
}

const only = process.argv.slice(2);
for (const pattern of PATTERNS) {
  if (only.length === 0 || only.includes(pattern.alias) || only.includes(pattern.name)) {
    await publish(pattern);
  }
}
