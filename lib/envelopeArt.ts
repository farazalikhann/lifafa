/**
 * What the envelope cover is made of: a sheet of printed paper, the lining of
 * its flap, and a wax seal, prepared from the supplied artwork by
 * scripts/cut-flowers.mjs.
 *
 * The envelope's SHAPE is still drawn in code — see EnvelopeSealCover — and
 * these fill it. As with the curtain's cloth (lib/curtainArt.ts), a
 * photograph of paper cannot be mixed out of the card's two colours, so the
 * cover answers to the card by which paper it is: cream on a light card,
 * maroon on a dark one. The lining and the seal are the same on both, and
 * only the chosen paper is ever fetched.
 */

import type { CoverArt } from "@/types/coverAnimation";

export interface EnvelopeArt extends CoverArt {
  /** The envelope's paper, a tile. */
  paper: string;
  /** The lining inside the flap and the pocket, a tile. */
  liner: string;
  /** The wax seal, cut out, with an empty centre for the initials. */
  seal: string;
}

const LINER = "/decor/envelope/envelope-liner.webp";
const SEAL = "/decor/envelope/wax-seal.webp";
const MAROON_PAPER = "/decor/envelope/envelope-paper-maroon.webp";
const CREAM_PAPER = "/decor/envelope/envelope-paper-cream.webp";

/*
  The prompt is printed on the card's own ground under the envelope, in gold.
  One gold cannot read on both: a pale one on a dark card, and on a light
  card an antique one, 5:1 or better on Cream, Blush and Sand.
*/
const MAROON: EnvelopeArt = {
  paper: MAROON_PAPER,
  liner: LINER,
  seal: SEAL,
  images: [MAROON_PAPER, LINER, SEAL],
  promptInk: "#E6C77E",
};

const CREAM: EnvelopeArt = {
  paper: CREAM_PAPER,
  liner: LINER,
  seal: SEAL,
  images: [CREAM_PAPER, LINER, SEAL],
  promptInk: "#80560F",
};

/** The envelope for a card whose ground is light, or dark. */
export function envelopeArt(isLight: boolean): EnvelopeArt {
  return isLight ? CREAM : MAROON;
}
