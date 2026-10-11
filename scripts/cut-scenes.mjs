/**
 * Publishes the painted scenes and the tear strip's paper.
 *
 *   node scripts/cut-scenes.mjs          everything
 *   node scripts/cut-scenes.mjs scenes   the scenes between a card's first two screens
 *   node scripts/cut-scenes.mjs tear     the handmade paper a date is torn out of
 *
 * Run by hand when a picture is added or replaced. The output is committed, so
 * nothing here runs at build time. Uses the sharp that ships inside Next.js,
 * as scripts/cut-flowers.mjs does.
 *
 * THE SCENES ARE NOT CUT OUT. Each is a whole watercolour, 9:16, and is
 * published as it was painted: the card fades its top and bottom into its own
 * colour with a mask (components/card/SceneScreen.tsx), so nothing is baked
 * into the file and one file serves every palette. Each three times: 1080px
 * tall for a phone, 720px tall for a slow connection, and a small one for the
 * editor's chip. The quality is brought down a step at a time until the file
 * is under its limit.
 *
 * THE PAPER IS ALREADY SEAMLESS. It is brought down to a 512px tile and its
 * greys are centred on the middle grey, so the card can tint it by laying
 * its accent under it (components/card/TearReveal.tsx): a tile that averages
 * mid grey neither lightens nor darkens the colour it is laid on.
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = "general photos";

const SCENES = [
  { name: "floral-arch", file: "Romantic Watercolor Garden Archway.png" },
  { name: "garden-pavilion", file: "Dreamy Garden Wedding Mandap.png" },
  { name: "lakeside-gazebo", file: "Dreamy Lakeside Wedding Gazebo.png" },
];

/** The three sizes of a scene: its height in px, where it goes and the most it may weigh. */
const SCENE_SIZES = [
  { height: 1080, dir: "", maxBytes: 200 * 1024 },
  { height: 720, dir: "small", maxBytes: 90 * 1024 },
  { height: 240, dir: "thumbs", maxBytes: 14 * 1024 },
];

const TEAR = {
  file: "Seamless Gray Handmade Paper Texture.png",
  size: 512,
  maxBytes: 60 * 1024,
};

/** The best quality under the limit, stepping down from 86. */
async function underLimit(make, maxBytes) {
  for (let quality = 86; quality >= 20; quality -= 4) {
    const buffer = await make(quality);

    if (buffer.length <= maxBytes) {
      return { buffer, quality };
    }
  }

  throw new Error("No quality brings this file under its limit.");
}

async function scenes() {
  for (const scene of SCENES) {
    for (const size of SCENE_SIZES) {
      const out = join("public", "decor", "scenes", size.dir);
      mkdirSync(out, { recursive: true });

      const { buffer, quality } = await underLimit(
        (q) =>
          sharp(join(SOURCE, scene.file))
            .resize({ height: size.height })
            .webp({ quality: q, effort: 6, smartSubsample: true })
            .toBuffer(),
        size.maxBytes,
      );
      const meta = await sharp(buffer).metadata();

      writeFileSync(join(out, `${scene.name}.webp`), buffer);
      console.log(
        `${join(out, `${scene.name}.webp`)}  ${meta.width}x${meta.height}  ${(buffer.length / 1024).toFixed(1)} KB  q${quality}`,
      );
    }
  }
}

async function tear() {
  const out = join("public", "decor", "tear");
  mkdirSync(out, { recursive: true });

  /*
    Brought down with its own repeat round it, half a tile on every side, and
    the middle kept: a tile resized by itself is resampled against nothing at
    its edges, and shows a line where two of them meet.
  */
  const source = sharp(join(SOURCE, TEAR.file));
  const { width, height } = await source.metadata();
  const wrapped = await source
    .greyscale()
    .extend({
      top: Math.floor(height / 2),
      bottom: Math.ceil(height / 2),
      left: Math.floor(width / 2),
      right: Math.ceil(width / 2),
      extendWith: "repeat",
    })
    .toBuffer();

  /* One channel: the paper is grey. Centred on the middle grey below. */
  const { data, info } = await sharp(wrapped)
    .resize(TEAR.size * 2, TEAR.size * 2)
    .extract({ left: TEAR.size / 2, top: TEAR.size / 2, width: TEAR.size, height: TEAR.size })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (const value of data) {
    sum += value;
  }
  const mean = sum / data.length;

  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.max(0, Math.min(255, Math.round(data[index] - mean + 127.5)));
  }

  const { buffer, quality } = await underLimit(
    (q) =>
      sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
        .webp({ quality: q, effort: 6 })
        .toBuffer(),
    TEAR.maxBytes,
  );

  writeFileSync(join(out, "paper.webp"), buffer);
  console.log(
    `${join(out, "paper.webp")}  ${info.width}x${info.height}  ${(buffer.length / 1024).toFixed(1)} KB  q${quality}`,
  );
}

const which = process.argv[2] ?? "all";

if (which === "all" || which === "scenes") {
  await scenes();
}

if (which === "all" || which === "tear") {
  await tear();
}
