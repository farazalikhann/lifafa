/**
 * What the petal dust cover is made of: one photograph of a carpet of petals
 * with an oval left empty in the middle of it, sized by
 * scripts/cut-flowers.mjs, and the loose petals that fly off with it.
 *
 * As with the curtain's cloth (lib/curtainArt.ts), a photograph cannot be
 * mixed out of the card's two colours, so the cover answers to the card by
 * which photograph it is: deep roses on a dark card, blush ones on a light
 * card. Only the chosen one is ever fetched.
 */

import type { CoverArt } from "@/types/coverAnimation";

/**
 * Where the oval sits in the photograph, as shares of its width and height,
 * measured on the light one (the two were made to the same layout): its
 * centre, and the clear space inside its gold rim. The picture is 2:3.
 */
export const PETAL_COVER_ASPECT = 2 / 3;
export const PETAL_OVAL = { x: 0.5, y: 0.477, width: 0.51, height: 0.43 } as const;

/**
 * The loose pieces thrown up by the gust, so its edge reads as petals and
 * not as the squares the picture is cut into: the card's own rose petals, a
 * marigold petal, a mogra and a leaf. The same files the card's petal layer
 * and its leaves use (lib/petals.ts), so on most cards they are already in
 * the browser's cache.
 */
export const GUST_PIECES: readonly string[] = [
  "/decor/petal-a.webp",
  "/decor/flowers/marigold-petal.webp",
  "/decor/petal-b.webp",
  "/decor/flowers/mogra-flower.webp",
  "/decor/leaf.webp",
];

export interface PetalCoverArt extends CoverArt {
  /** The photograph. */
  cover: string;
  /** The gold the monogram and the prompt are lettered in: lit, body, shade. */
  goldHi: string;
  gold: string;
  goldLo: string;
  /** What lifts the lettering off the oval's ground. */
  emboss: string;
}

const DARK_COVER = "/decor/petal-cover/petal-cover-dark.webp";
const LIGHT_COVER = "/decor/petal-cover/petal-cover-light.webp";

const DARK: PetalCoverArt = {
  cover: DARK_COVER,
  images: [DARK_COVER, ...GUST_PIECES],
  goldHi: "#F8E7B0",
  gold: "#E6C273",
  goldLo: "#8F6420",
  emboss: "0 0.03em 0.08em rgba(0, 0, 0, 0.6)",
  ink: "#FBF4E6",
  inkMuted: "rgba(251, 244, 230, 0.9)",
  plaque: "rgba(46, 8, 16, 0.84)",
  plaqueEdge: "#D9B25F",
};

/*
  The light oval is cream, and a bright gold on cream is a pale yellow nobody
  can read. So its gold is an antique one: 4.9:1 on the oval's ground.
*/
const LIGHT: PetalCoverArt = {
  cover: LIGHT_COVER,
  images: [LIGHT_COVER, ...GUST_PIECES],
  goldHi: "#C2913A",
  gold: "#8F6112",
  goldLo: "#6A4609",
  emboss: "0 0.03em 0 rgba(255, 255, 255, 0.75)",
  ink: "#4A3410",
  inkMuted: "rgba(74, 52, 16, 0.92)",
  plaque: "rgba(255, 251, 240, 0.92)",
  plaqueEdge: "#C2913A",
};

/** The cover for a card whose ground is light, or dark. */
export function petalCoverArt(isLight: boolean): PetalCoverArt {
  return isLight ? LIGHT : DARK;
}
