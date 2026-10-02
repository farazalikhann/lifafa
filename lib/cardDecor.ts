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

export interface ScratchFrameArt {
  src: string;
  /** Width over height of the picture. */
  aspect: number;
  /** As wide as the frame is drawn on a phone, in card pixels. */
  width: number;
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
  Measured on the published files: the oval's opening runs from 14.8% to 85.1%
  across and 18.7% to 75.3% down, the rectangle's from 7.7% to 92.3% and 15.5%
  to 73.2%.
*/
const FRAMES: Record<ScratchFrame, ScratchFrameArt> = {
  oval: {
    src: "/decor/scratch/scratch-frame-oval.webp",
    aspect: 609 / 900,
    width: 300,
    foil: { x: 0.128, y: 0.172, width: 0.744, height: 0.596 },
    words: { x: 0.21, y: 0.31, width: 0.58, height: 0.32 },
  },
  rect: {
    src: "/decor/scratch/scratch-frame-rect.webp",
    aspect: 900 / 601,
    width: 340,
    foil: { x: 0.062, y: 0.135, width: 0.876, height: 0.615, round: 0.07 },
    words: { x: 0.13, y: 0.215, width: 0.74, height: 0.455 },
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
