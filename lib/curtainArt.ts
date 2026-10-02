/**
 * The cloth the curtain cover is hung with: a panel and a valance, cut out of
 * the supplied artwork by scripts/cut-flowers.mjs, in maroon velvet and in
 * cream.
 *
 * NOT TAKEN FROM THE CARD'S PALETTE, unlike every other cover. A photograph
 * of velvet cannot be mixed out of two hex colours, and a tint laid over one
 * turns gold thread to mud. So the cover answers to the card the only way a
 * photograph can: by which of the two it is. A light card is opened from
 * behind cream cloth and a dark one from behind maroon, so the screen does not
 * flash from one end of the scale to the other as the curtains part.
 *
 * One panel per set. The right curtain is the left one mirrored, in the
 * visual, so a guest downloads two pictures and not three.
 */

import type { CoverArt } from "@/types/coverAnimation";

export interface CurtainArt extends CoverArt {
  /** The left curtain, its gold border on its right edge. */
  panel: string;
  /** The swagged valance across the top. */
  valance: string;
  /** The shade where the two panels meet, and that each casts on the card as it leaves. */
  shadow: string;
}

const MAROON_PANEL = "/decor/curtain/curtain-left.webp";
const MAROON_VALANCE = "/decor/curtain/curtain-valance.webp";
const CREAM_PANEL = "/decor/curtain/curtain-left-cream.webp";
const CREAM_VALANCE = "/decor/curtain/curtain-valance-cream.webp";

const MAROON: CurtainArt = {
  panel: MAROON_PANEL,
  valance: MAROON_VALANCE,
  images: [MAROON_PANEL, MAROON_VALANCE],
  shadow: "rgba(0, 0, 0, 0.42)",
  ink: "#FBF4E6",
  inkMuted: "rgba(251, 244, 230, 0.86)",
  plaque: "rgba(46, 8, 16, 0.84)",
  plaqueEdge: "#D9B25F",
  plaqueInk: "#F1D38A",
};

/*
  Gold on cream cloth is gold on gold, so the cream set's plaque is ivory and
  its gold is taken down to an antique one that reads on it: 5.6:1.
*/
const CREAM: CurtainArt = {
  panel: CREAM_PANEL,
  valance: CREAM_VALANCE,
  images: [CREAM_PANEL, CREAM_VALANCE],
  shadow: "rgba(72, 48, 12, 0.3)",
  ink: "#4A3410",
  inkMuted: "rgba(74, 52, 16, 0.9)",
  plaque: "rgba(255, 251, 240, 0.9)",
  plaqueEdge: "#C2913A",
  plaqueInk: "#80560F",
};

/** The cloth for a card whose ground is light, or dark. */
export function curtainArt(isLight: boolean): CurtainArt {
  return isLight ? CREAM : MAROON;
}
