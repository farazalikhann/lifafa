/**
 * The cloth the curtain cover is hung with: two panels of dark red velvet and
 * the swagged valance over them, with their gold fringe.
 *
 * CUT FROM FILM. The cover is a film of velvet curtains opening on a stage,
 * and a film is opaque: the card could only ever be faded in over its last
 * frames, never seen between the curtains. So the film's first frame, the
 * curtains hanging closed, was cut into three: the valance, which is
 * everything above its trim with its fringe and the two cords and tassels
 * that hang from it, and what is left split down the middle into a left
 * panel and a right. Where the valance was, each panel has plain velvet from
 * lower down the same fold. The generator's mark in the corner is covered
 * the same way.
 *
 * ONE SET, FOR EVERY CARD, and not taken from the card's palette. The
 * curtains cover the whole screen until they are tapped, so the card's colour
 * is not on screen to match, and there is one film. The words over them are
 * set in the cloth's inks, not the card's, and the cloth says it is dark
 * (`tone`) so the shell seats them on a dark shadow whatever the card is.
 *
 * Two panels, because the film's two curtains are not each other's mirror.
 * The right one is published already turned, so the visual's one mirrored
 * markup draws it the right way round.
 */

import type { CoverArt } from "@/types/coverAnimation";

export interface CurtainArt extends CoverArt {
  /** The left curtain, its leading edge on its right. */
  panel: string;
  /** The right curtain, published turned: leading edge on its right, like the left one's. */
  panelRight: string;
  /** The swagged valance across the top. */
  valance: string;
  /**
   * The valance's height as a share of the film frame's. The panels are
   * scaled to the screen's height, and the valance has to be scaled with
   * them or its fringe hangs short of where the film hung it.
   */
  valanceHeight: number;
  /** The valance's own width over its height. */
  valanceAspect: number;
  /** The shade where the two panels meet, and that each casts on the card as it leaves. */
  shadow: string;
}

const VELVET_LEFT = "/decor/curtain/velvet/curtain-left.webp";
const VELVET_RIGHT = "/decor/curtain/velvet/curtain-right.webp";
const VELVET_VALANCE = "/decor/curtain/velvet/valance.webp";

const VELVET: CurtainArt = {
  panel: VELVET_LEFT,
  panelRight: VELVET_RIGHT,
  valance: VELVET_VALANCE,
  /* 412 of the frame's 1920 rows, and 1080 wide. */
  valanceHeight: 412 / 1920,
  valanceAspect: 1080 / 412,
  images: [VELVET_LEFT, VELVET_RIGHT, VELVET_VALANCE],
  tone: "dark",
  shadow: "rgba(0, 0, 0, 0.42)",
  ink: "#FBF4E6",
  inkMuted: "rgba(251, 244, 230, 0.86)",
  plaque: "rgba(46, 8, 16, 0.84)",
  plaqueEdge: "#D9B25F",
  plaqueInk: "#F1D38A",
};

/** The cloth, which is the same for every card. */
export function curtainArt(): CurtainArt {
  return VELVET;
}
