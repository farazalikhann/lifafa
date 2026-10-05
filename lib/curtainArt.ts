/**
 * The cloth the curtain cover is hung with: its panels and a valance, in
 * maroon velvet and in cream.
 *
 * THE VELVET IS CUT FROM FILM. The cover used to play a film of velvet
 * curtains parting, and a film is opaque: the card could only be faded in
 * over its last frames, never seen between the curtains. So the film's first
 * frame, the curtains hanging closed, was cut into a left panel and a right
 * one down the seam between them, and the valance was cut from a later frame,
 * where the curtains are open and it hangs against black. The panels' tops,
 * which the valance hides in the film, are the cloth below turned over. The
 * cream set is the artwork cut by scripts/cut-flowers.mjs, as it was.
 *
 * NOT TAKEN FROM THE CARD'S PALETTE, unlike every other cover. A photograph
 * of velvet cannot be mixed out of two hex colours, and a tint laid over one
 * turns gold thread to mud. So the cover answers to the card the only way a
 * photograph can: by which of the two it is. A light card is opened from
 * behind cream cloth and a dark one from behind maroon, so the screen does not
 * flash from one end of the scale to the other as the curtains part.
 *
 * The cream set has one panel: its right curtain is the left one mirrored, in
 * the visual. The velvet has two, because the film's two curtains are not
 * each other's mirror, and its right one is published already turned, so the
 * visual's one mirrored markup draws it the right way round.
 */

import type { CoverArt } from "@/types/coverAnimation";

export interface CurtainArt extends CoverArt {
  /** The left curtain, its gold border on its right edge. */
  panel: string;
  /**
   * The right curtain, for a set whose two are different cloth: published
   * turned, border on its right edge like the left one's. Absent where the
   * right is simply the left in a mirror.
   */
  panelRight?: string;
  /** The swagged valance across the top. */
  valance: string;
  /** The shade where the two panels meet, and that each casts on the card as it leaves. */
  shadow: string;
}

const VELVET_LEFT = "/decor/curtain/velvet/curtain-left.webp";
const VELVET_RIGHT = "/decor/curtain/velvet/curtain-right.webp";
const VELVET_VALANCE = "/decor/curtain/velvet/valance.webp";
const CREAM_PANEL = "/decor/curtain/curtain-left-cream.webp";
const CREAM_VALANCE = "/decor/curtain/curtain-valance-cream.webp";

const VELVET: CurtainArt = {
  panel: VELVET_LEFT,
  panelRight: VELVET_RIGHT,
  valance: VELVET_VALANCE,
  images: [VELVET_LEFT, VELVET_RIGHT, VELVET_VALANCE],
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
  return isLight ? CREAM : VELVET;
}
