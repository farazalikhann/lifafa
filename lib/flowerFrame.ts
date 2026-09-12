import type { CSSProperties } from "react";

/**
 * The one photographic border, and the numbers that cut it into a frame.
 *
 * Every other border on the card is line art generated from a path table, which
 * is what lets BorderFrame tile them at any size: a vine is drawn, so more card
 * simply means more vine. This one is a photograph — painted roses with a
 * transparent middle — and a photograph cannot be generated, only placed.
 * Stretching it to the box is what that usually becomes, and the box is a
 * screen: 390 x 828 on a phone against artwork drawn at 2:3, which is a 1.4x
 * vertical pull. Every rose comes out as an egg.
 *
 * So it is placed as a nine-slice instead, which is all `border-image` is: the
 * four corner clusters are lifted out and drawn at a fixed size in the four
 * corners, and the runs down the two long sides are repeated to fill whatever
 * height is left over. Nothing is ever scaled unevenly, at any screen height —
 * the same promise BorderFrame's tiled edges make, kept the same way.
 *
 * WHERE THE CUTS FALL IS NOT A GUESS. The artwork packs its flowers into the
 * corners and leaves a bare channel between them, and the slice lines have to
 * land inside that channel. A line struck through a rose leaves half of it in
 * the corner piece and the other half at the head of the run that repeats —
 * and that half is then printed across the top of the card once for every tile
 * that fits. Measured off the source: the columns from x = 450 to x = 594 are
 * fully transparent through both the top band and the bottom one, and that is
 * the only span where both are. The two vertical cuts below sit inside it.
 *
 * The horizontal cuts have no such constraint. The side runs are continuous
 * down the whole height, so wherever they are made the corner piece and the
 * run that follows it are neighbours in the source and meet without a seam.
 * 288 is simply how deep the corner clusters are.
 */

/** The artwork's own pixels — every number below is measured in these. */
const SOURCE_WIDTH = 1024;
const SOURCE_HEIGHT = 1536;

/**
 * Where the nine-slice cuts the artwork, in source pixels.
 *
 * Left and right differ because the bare channel is not centred: 480 and
 * 1024 - 448 = 576 both land inside it, and forcing them to match would push
 * one of them through a flower. The asymmetry costs nothing — both sides are
 * scaled by the same factor below, so the roses land exactly where the artwork
 * put them and only the transparent box around them is lopsided.
 */
const SLICE_TOP = 288;
const SLICE_RIGHT = 448;
const SLICE_BOTTOM = 288;
const SLICE_LEFT = 480;

/**
 * How far the flowers actually reach in from the edge of the artwork.
 *
 * Much less than the slice, which is mostly the transparent channel: the run
 * itself is a narrow band down the outside. This is the number the card's text
 * has to clear, so it is measured rather than taken from the slice — clearing
 * the slice would inset the names by a third of the card for no reason.
 */
const FLOWER_REACH_X = 160;
const FLOWER_REACH_Y = 224;

/**
 * The published asset, re-exported from the 1024 x 1536 original at 720 wide.
 *
 * WebP with an alpha channel, and the alpha is most of the weight — the cut-out
 * is what makes this a frame rather than a backdrop, so it is the one thing not
 * worth compressing hard. 720 gives a little over 2x the pixels at the size the
 * scale below renders it, which is where a phone stops being able to tell.
 */
export const FLOWER_FRAME_SRC = "/borders/flower-background.webp";

/**
 * Rendered CSS pixels per source pixel, on a card.
 *
 * 0.3 is chosen against the *tiling*, not against taste. The side run repeats a
 * whole number of times — `round` rescales it to fit, and rounding 1.4 tiles
 * down to 1 is a 40% stretch of a rose — so the tile has to be short enough
 * that every screen the card is read on lands safely above a whole number. At
 * 0.3 the run is 288px tall and the count comes out at 2 on a 620px editor
 * frame, 2 on a 828px phone and 3 on a tall desktop window, none of them
 * stretched past 15%. At 0.34 the same editor frame rounds down to a single
 * tile pulled 30% taller, and the host is previewing a card no guest will see.
 */
export const FLOWER_FRAME_SCALE = 0.3;

/**
 * How far the rest of the card must stay clear of the frame, in CSS px.
 *
 * Both axes matter here, which is what makes this border different from the
 * five line-art ones. Their bands are shallower than a section's own padding,
 * so text clears them by standing still; this one paints opaque roses roughly
 * 48px in down the full height of the screen, and a name set at the section's
 * usual 28px would be read through a flower.
 */
export const FLOWER_FRAME_CLEARANCE = {
  x: Math.round(FLOWER_REACH_X * FLOWER_FRAME_SCALE) + 12,
  y: Math.round(FLOWER_REACH_Y * FLOWER_FRAME_SCALE) + 12,
} as const;

function percent(slice: number, extent: number): string {
  return `${Math.round((slice / extent) * 1e6) / 1e4}%`;
}

/**
 * The slice, as percentages rather than pixels.
 *
 * Which makes the numbers above survive the asset being re-exported at another
 * resolution — a percentage slice is read against whatever the image turns out
 * to be, where a pixel slice is read against the source it was measured on and
 * quietly cuts somewhere else the moment that changes.
 */
const SLICE = [
  percent(SLICE_TOP, SOURCE_HEIGHT),
  percent(SLICE_RIGHT, SOURCE_WIDTH),
  percent(SLICE_BOTTOM, SOURCE_HEIGHT),
  percent(SLICE_LEFT, SOURCE_WIDTH),
].join(" ");

/**
 * The frame, as the style of one element.
 *
 * `scale` is the only parameter: pass FLOWER_FRAME_SCALE for a card, or
 * something far smaller for a thumbnail. Every border width comes off it, which
 * is what keeps the corner pieces square — a nine-slice corner is drawn into
 * the box where its two border widths cross, so widths that are not in the same
 * ratio as the slices squash the roses in the corners and nowhere else.
 *
 * `round` on the vertical sides, and the horizontal pair is left to `stretch`
 * because there is nothing on it to stretch: the strip between the two vertical
 * cuts is the bare channel, transparent top and bottom alike.
 */
export function flowerFrameStyle(scale: number): CSSProperties {
  return {
    borderStyle: "solid",
    borderColor: "transparent",
    borderTopWidth: Math.round(SLICE_TOP * scale),
    borderRightWidth: Math.round(SLICE_RIGHT * scale),
    borderBottomWidth: Math.round(SLICE_BOTTOM * scale),
    borderLeftWidth: Math.round(SLICE_LEFT * scale),
    borderImageSource: `url(${FLOWER_FRAME_SRC})`,
    borderImageSlice: SLICE,
    borderImageRepeat: "stretch round",
  };
}
