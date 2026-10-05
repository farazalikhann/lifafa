/**
 * What the breeze cover is strewn with: two maple leaves, two rose petals cut
 * for it, and the card's own two red petals.
 *
 * Unlike the curtain's cloth, these lie on the card's own colour: the cover
 * is a veil of the card's ground with leaves and petals scattered over it, so
 * a cream card is covered in cream and an ink one in ink. The words over it
 * are therefore set in inks for a light ground or a dark one, as the card is.
 */

import type { CoverArt } from "@/types/coverAnimation";

export interface BreezePiece {
  src: string;
  /** The file's width over its height. */
  aspect: number;
  /** A leaf tumbles; a petal floats, lighter and quicker. */
  kind: "leaf" | "petal";
}

/**
 * The pieces, in the order the scatter deals them: leaf and petal turn about,
 * and the reds are the card's own petals (lib/petals.ts), which most cards
 * already have in the browser's cache.
 */
export const BREEZE_PIECES: readonly BreezePiece[] = [
  { src: "/decor/breeze/leaf-gold.webp", aspect: 177 / 180, kind: "leaf" },
  { src: "/decor/breeze/petal-pink.webp", aspect: 180 / 166, kind: "petal" },
  { src: "/decor/breeze/leaf-orange.webp", aspect: 179 / 180, kind: "leaf" },
  { src: "/decor/petal-a.webp", aspect: 160 / 140, kind: "petal" },
  { src: "/decor/breeze/petal-white.webp", aspect: 180 / 172, kind: "petal" },
  { src: "/decor/petal-b.webp", aspect: 160 / 154, kind: "petal" },
];

const IMAGES = BREEZE_PIECES.map((piece) => piece.src);

const ON_DARK: CoverArt = {
  images: IMAGES,
  tone: "dark",
  ink: "#FBF4E6",
  inkMuted: "rgba(251, 244, 230, 0.9)",
  plaque: "rgba(24, 14, 10, 0.86)",
  plaqueEdge: "#D9B25F",
  plaqueInk: "#F1D38A",
};

const ON_LIGHT: CoverArt = {
  images: IMAGES,
  tone: "light",
  ink: "#3A2610",
  inkMuted: "rgba(58, 38, 16, 0.92)",
  plaque: "rgba(255, 251, 240, 0.94)",
  plaqueEdge: "#C2913A",
  plaqueInk: "#80560F",
};

/** The pictures the closed cover shows, and the inks that read over it. */
export function breezeArt(isLight: boolean): CoverArt {
  return isLight ? ON_LIGHT : ON_DARK;
}
