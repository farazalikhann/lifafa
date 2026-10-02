/**
 * The card's photographed furniture that a host chooses between: the frame
 * round a scratch panel, and the garland between two sections. Cut from the
 * supplied artwork by scripts/cut-flowers.mjs.
 *
 * Both choices live in card_config, which is a jsonb snapshot: a card saved
 * before either existed has no key for it. So neither is ever read straight
 * off the config. `scratchFrameOf` and `dividerStyleOf` turn a missing or
 * unknown value into the answer such a card should have had.
 */

import type { DividerStyle, ScratchFrame } from "@/types/card";
import type { TraditionId } from "@/types/occasion";

/* --- The scratch panel's frame ------------------------------------------ */

/** A picture with an opening, and the box inside the opening that content is set in. */
export interface FrameArt {
  src: string;
  /** Width over height of the picture. */
  aspect: number;
  /** As wide as the frame is drawn on a phone, in card pixels. */
  width: number;
  /** The largest upright box the opening holds with air round it, as shares of the picture. */
  words: { x: number; y: number; width: number; height: number };
}

export interface ScratchFrameArt extends FrameArt {
  /**
   * What the foil covers, as shares of the picture: a little more than the
   * opening, so its edge is under the frame's gold rule and the roses overlap
   * it. `round` is the corner radius of a rectangular one, as a share of its
   * own height; an oval has none.
   */
  foil: { x: number; y: number; width: number; height: number; round?: number };
  /**
   * Where the words under the foil are set: the largest upright box that
   * sits inside the opening with air round it. For the oval that is well
   * inside the ellipse, whose sides curve away from a box's corners.
   */
  words: { x: number; y: number; width: number; height: number };
}

/*
  Measured on the published files, which are the slim vine of roses: the
  oval's opening runs from 7.9% to 92.1% across and 13.2% to 84.4% down, the
  rectangle's from about 4.5% to 95.5% and 7.6% to 89.3%, less at its corners,
  where a rose sits.

  The oval's box of words is 56% by 50% about the opening's middle: its
  corners are at 93% of the way to the ellipse, so nothing set in it reaches
  the vine. The widths are what the frames are drawn at on a phone: the oval
  about four fifths of the screen, the rectangle as wide as the column lets
  it be.
*/
const FRAMES: Record<ScratchFrame, ScratchFrameArt> = {
  oval: {
    src: "/decor/scratch/scratch-frame-oval.webp",
    aspect: 622 / 900,
    width: 296,
    foil: { x: 0.067, y: 0.12, width: 0.866, height: 0.736 },
    words: { x: 0.22, y: 0.238, width: 0.56, height: 0.5 },
  },
  rect: {
    src: "/decor/scratch/scratch-frame-rect.webp",
    aspect: 900 / 581,
    width: 352,
    foil: { x: 0.04, y: 0.07, width: 0.92, height: 0.835, round: 0.08 },
    words: { x: 0.1, y: 0.19, width: 0.8, height: 0.62 },
  },
};

export const SCRATCH_FOIL = "/decor/scratch/scratch-foil.webp";

export const DEFAULT_SCRATCH_FRAME: ScratchFrame = "oval";

/** The frame a card's scratch panel is drawn in. Oval on every card saved before there was a choice. */
export function scratchFrameOf(value: unknown): ScratchFrame {
  return value === "rect" || value === "oval" ? value : DEFAULT_SCRATCH_FRAME;
}

export function scratchFrameArt(frame: ScratchFrame): ScratchFrameArt {
  return FRAMES[frame];
}

/* --- The divider between two sections ----------------------------------- */

export interface DividerArt {
  src: string;
  /** The picture's own size, so the browser holds its place before it loads. */
  width: number;
  height: number;
}

const DIVIDERS: Record<Exclude<DividerStyle, "none">, DividerArt> = {
  rose: { src: "/decor/dividers/divider-rose.webp", width: 1000, height: 186 },
  marigold: { src: "/decor/dividers/divider-marigold.webp", width: 1000, height: 212 },
  mogra: { src: "/decor/dividers/divider-mogra.webp", width: 1000, height: 213 },
};

/** The garland a tradition's card gets before its host has chosen one. */
export function defaultDivider(traditionId: TraditionId): DividerStyle {
  if (traditionId === "hindu") {
    return "marigold";
  }

  return traditionId === "muslim" ? "mogra" : "rose";
}

/** Whether the host has chosen a divider themselves, floral or none. */
export function hasChosenDivider(value: unknown): value is DividerStyle {
  return value === "rose" || value === "marigold" || value === "mogra" || value === "none";
}

/** The divider a card draws: the host's choice, or its tradition's default. */
export function dividerStyleOf(value: unknown, traditionId: TraditionId): DividerStyle {
  return hasChosenDivider(value) ? value : defaultDivider(traditionId);
}

/** The picture for a divider, or null for "none". */
export function dividerArt(style: DividerStyle): DividerArt | null {
  return style === "none" ? null : DIVIDERS[style];
}
