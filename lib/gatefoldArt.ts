/**
 * What the fold cover is made of: two doors of the envelope's paper, lined
 * with the envelope's lining, framed by an arch of gold filigree and tied
 * with a gold ribbon. The arch and the ribbon are cut from the supplied
 * artwork by scripts/cut-flowers.mjs; the paper and the lining are the
 * envelope cover's own (lib/envelopeArt.ts), already prepared.
 *
 * As with the other covers drawn from pictures, the cover answers to the
 * card by which paper it is: cream on a light card, maroon on a dark one.
 * The gold is the same on both, and only the chosen paper is ever fetched.
 */

import type { CoverArt } from "@/types/coverAnimation";

/**
 * The published pictures' proportions and landmarks, measured on the files.
 *
 * The arch is published as its left half only — the right door shows it in a
 * mirror — so the whole arch is twice as wide as its file: 728 × 1100. The
 * ribbon is 1000 × 358, its band running through its middle and its
 * medallion's clear face a fifth of its width across.
 */
export const GATEFOLD_ARCH_ASPECT = 728 / 1100;
export const GATEFOLD_RIBBON_ASPECT = 1000 / 358;
export const GATEFOLD_MEDALLION = 0.2;

export interface GatefoldArt extends CoverArt {
  /** The doors' paper, a tile. */
  paper: string;
  /** The lining inside the doors, a tile. */
  liner: string;
  /** The left half of the arch. */
  arch: string;
  /** The ribbon, with its medallion. */
  ribbon: string;
  /** The prompt under the ribbon, printed on the paper. */
  promptInk: string;
}

const LINER = "/decor/envelope/envelope-liner.webp";
const ARCH = "/decor/gatefold/gatefold-arch.webp";
const RIBBON = "/decor/gatefold/gatefold-ribbon.webp";
const MAROON_PAPER = "/decor/envelope/envelope-paper-maroon.webp";
const CREAM_PAPER = "/decor/envelope/envelope-paper-cream.webp";

/**
 * The monogram is cut into the medallion, which is itself gold: a deep gold
 * with a lit lower edge, the way an engraving catches the light. The same on
 * both papers, the medallion being the same.
 */
export const GATEFOLD_ENGRAVED = {
  hi: "#9A7222",
  body: "#6B4708",
  lo: "#4A3005",
  shadow: "0 0.045em 0 rgba(255, 238, 178, 0.8), 0 -0.02em 0.03em rgba(58, 34, 0, 0.45)",
} as const;

const MAROON: GatefoldArt = {
  paper: MAROON_PAPER,
  liner: LINER,
  arch: ARCH,
  ribbon: RIBBON,
  images: [MAROON_PAPER, LINER, ARCH, RIBBON],
  promptInk: "#E6C77E",
  ink: "#FBF4E6",
  inkMuted: "rgba(251, 244, 230, 0.9)",
  plaque: "rgba(46, 8, 16, 0.84)",
  plaqueEdge: "#D9B25F",
};

/* On cream paper a pale gold is unreadable, so the prompt is an antique one: 5:1 on the paper. */
const CREAM: GatefoldArt = {
  paper: CREAM_PAPER,
  liner: LINER,
  arch: ARCH,
  ribbon: RIBBON,
  images: [CREAM_PAPER, LINER, ARCH, RIBBON],
  promptInk: "#80560F",
  ink: "#4A3410",
  inkMuted: "rgba(74, 52, 16, 0.92)",
  plaque: "rgba(255, 251, 240, 0.92)",
  plaqueEdge: "#C2913A",
};

/** The gatefold for a card whose ground is light, or dark. */
export function gatefoldArt(isLight: boolean): GatefoldArt {
  return isLight ? CREAM : MAROON;
}
