import type { CSSProperties } from "react";
import type { CardBorderStyle, PhotoBorderStyle } from "@/types/card";

/**
 * The photographic borders, and the numbers that cut each one into a frame.
 *
 * Every other border on the card is line art generated from a path table, which
 * is what lets BorderFrame tile them at any size: a vine is drawn, so more card
 * simply means more vine. These are photographs — painted flowers with a
 * transparent middle — and a photograph cannot be generated, only placed.
 * Stretching one to the box is what that usually becomes, and the box is a
 * screen: 390 x 828 on a phone against artwork drawn at 2:3, which is a 1.4x
 * vertical pull. Every rose comes out as an egg.
 *
 * So each is placed as a nine-slice instead, which is all `border-image` is: the
 * four corner clusters are lifted out and drawn at a fixed size in the four
 * corners, and the runs down the two long sides are repeated to fill whatever
 * height is left over. Nothing is ever scaled unevenly, at any screen height —
 * the same promise BorderFrame's tiled edges make, kept the same way.
 *
 * WHERE THE CUTS FALL IS MEASURED, NEVER GUESSED, and each artwork is measured
 * on its own: the eight below are the same idea drawn eight times, and no two
 * of them put their flowers in the same place.
 *
 * The vertical cuts have to land in the bare channel the artwork leaves between
 * its left and right halves. A line struck through a flower leaves half of it in
 * the corner piece and the other half at the head of the run that repeats — and
 * that half is then printed across the top of the card once for every tile that
 * fits. The channel is the span of columns that is transparent for the whole
 * height of the image, and it is narrow and never in the same place twice:
 * 450-595 for the rose, 476-546 for the gold, 481-543 for the crimson. Both
 * cuts sit inside whichever one belongs to the frame being cut.
 *
 * The horizontal cuts answer a different question, and it is the one that shows.
 * The side run is a tile, so when it repeats its last row sits directly above
 * its first — and if those two rows disagree the card carries a bright seam
 * straight across the flowers, which is exactly what the purple frame did when
 * it was cut at the same depth as the rose. So the pair is chosen by comparing
 * the row at the top cut against the row at the bottom one across the run's own
 * columns, and taking the pair that matches: the purple's mismatch falls from 48
 * to 12 between 288 and the 388/386 below, and the seam goes with it. Top and
 * bottom need not be equal, and for six of the eight they are not.
 *
 * The rose keeps the cuts it shipped with. Its seam was already faint — a couple
 * of clipped berries — and a card that is out and liked is not worth re-cutting
 * for a number.
 */

/**
 * Every frame is authored at this size, and the table below is measured in it.
 *
 * Shared rather than stored per frame because it is not a coincidence — all
 * eight were drawn to the same sheet. A ninth that is not would need its own
 * pair here, or its slice would be converted against the wrong extent and cut
 * somewhere it was never measured.
 */
const SOURCE_WIDTH = 1024;
const SOURCE_HEIGHT = 1536;

interface FrameArt {
  /** The published asset, under public/borders. */
  src: string;
  /** Where the nine-slice cuts, in source pixels. */
  slice: { top: number; right: number; bottom: number; left: number };
  /**
   * How far the rest of the card must stay clear of it, in CSS px.
   *
   * The artwork's own measured reach at the scale below, plus about 20px of
   * air. Far less than the slice, which is mostly the bare channel: the run
   * itself is a narrow band down the outside, and clearing the slice would
   * inset the names by a third of the card for no reason.
   *
   * Both axes matter here, which is what makes these different from the five
   * line-art borders. Their bands are shallower than a section's own padding,
   * so text clears them by standing still; these paint opaque flowers 40 to
   * 76px in down the full height of the screen, and a name set at the section's
   * usual 28px would be read through one.
   */
  clearance: { x: number; y: number };
}

const FRAMES: Record<PhotoBorderStyle, FrameArt> = {
  /*
    Crimson and cream roses. The first of the three, and the only one whose
    cuts were not chosen by the seam comparison — see the note above.

    Its left and right differ because its channel is not centred: 480 and
    1024 - 448 = 576 both land inside it, and forcing them to match would push
    one of them through a flower. The asymmetry costs nothing — both sides are
    scaled by the same factor, so the roses land exactly where the artwork put
    them and only the transparent box around them is lopsided.
  */
  flowerBackground: {
    src: "/borders/flower-background.webp",
    slice: { top: 288, right: 448, bottom: 288, left: 480 },
    clearance: { x: 60, y: 79 },
  },
  /* Marigold and white, on the deepest corner clusters of the three. */
  flowerGold: {
    src: "/borders/flower-gold.webp",
    slice: { top: 364, right: 496, bottom: 374, left: 496 },
    clearance: { x: 63, y: 95 },
  },
  /* Violet and gold. The widest run of the first three, and the one that
     needed the seam match. */
  flowerPurple: {
    src: "/borders/flower-purple.webp",
    slice: { top: 388, right: 480, bottom: 386, left: 480 },
    clearance: { x: 74, y: 82 },
  },

  /*
    The five below are a later batch, and they are heavier than the first three
    on purpose — deeper garlands with more in them. That shows up in one number:
    their runs reach 206 to 254 source pixels in where the first three reached
    129 to 177, so they stand the card's text 83 to 97px off the edge rather
    than 60 to 74. A 390px phone is left a 196 to 224px column of writing. That
    is the cost of a border this full, and it is paid here rather than by
    letting a name be read through a rose.

    Every pair of cuts below is this artwork's own: the channel each vertical
    cut lands in differs by 60px across the five, and each horizontal pair was
    chosen by the row match rather than by reusing a neighbour's.
  */

  /* Deep red roses on nothing at all — the only one of the eight with no wash
     behind it, so it sits on the card's own colour rather than tinting it. */
  flowerRed: {
    src: "/borders/flower-red.webp",
    slice: { top: 244, right: 472, bottom: 398, left: 472 },
    clearance: { x: 83, y: 65 },
  },
  /* Red roses and gold scrollwork, on a warm red wash. */
  flowerRuby: {
    src: "/borders/flower-ruby.webp",
    slice: { top: 352, right: 489, bottom: 378, left: 489 },
    clearance: { x: 92, y: 85 },
  },
  /* The same garden with white blooms through it, on gold. The deepest run of
     the eight, and so the narrowest column. */
  flowerCrimson: {
    src: "/borders/flower-crimson.webp",
    slice: { top: 392, right: 496, bottom: 416, left: 496 },
    clearance: { x: 97, y: 86 },
  },
  /* Blue roses, cream blooms and gold. */
  flowerBlue: {
    src: "/borders/flower-blue.webp",
    slice: { top: 256, right: 499, bottom: 402, left: 499 },
    clearance: { x: 92, y: 95 },
  },
  /* Blush and burgundy with cream peonies. Its corner clusters are the deepest
     of the eight, which is why it asks for the most room at the top. */
  flowerBlush: {
    src: "/borders/flower-blush.webp",
    slice: { top: 410, right: 494, bottom: 416, left: 494 },
    clearance: { x: 87, y: 104 },
  },
};

/**
 * Rendered CSS pixels per source pixel, on a card. Shared by all eight.
 *
 * 0.3 is chosen against the *tiling*, not against taste. The side run repeats a
 * whole number of times — `round` rescales it to fit, and rounding 1.4 tiles
 * down to 1 is a 40% stretch of a rose — so the tile has to be short enough
 * that every screen the card is read on lands safely above a whole number. At
 * 0.3 no frame on any of the four screens measured (a 620px editor frame, a
 * 667px and an 828px phone, a 950px desktop window) is stretched past 15%. At
 * 0.34 the editor frame rounds down to a single tile pulled 30% taller, and the
 * host is previewing a card no guest will see.
 */
export const FLOWER_FRAME_SCALE = 0.3;

/**
 * How much of a 44px chip the two horizontal bands may take between them.
 *
 * A chip scale cannot be shared the way the card scale is: the three frames are
 * cut at different depths, so one number would leave the rose's bands meeting
 * in the middle of the chip or the purple's barely showing. Fixing what the
 * bands add up to instead shows the same amount of frame whichever is drawn,
 * and leaves 12px of plate between them to read as the inside of a border.
 */
const CHIP_BAND = 32;

/** Whether this border is placed as a photograph rather than drawn as line art. */
export function isPhotoBorder(
  style: CardBorderStyle,
): style is PhotoBorderStyle {
  return style in FRAMES;
}

/** How far the rest of the card must stay clear of this frame, in CSS px. */
export function flowerFrameClearance(style: PhotoBorderStyle): {
  x: number;
  y: number;
} {
  return FRAMES[style].clearance;
}

/** The scale that fits this frame into a chip — see CHIP_BAND. */
export function flowerChipScale(style: PhotoBorderStyle): number {
  const { top, bottom } = FRAMES[style].slice;

  return CHIP_BAND / (top + bottom);
}

function percent(slice: number, extent: number): string {
  return `${Math.round((slice / extent) * 1e6) / 1e4}%`;
}

/**
 * The frame, as the style of one element.
 *
 * `scale` is the only thing a caller chooses: FLOWER_FRAME_SCALE for a card, or
 * `flowerChipScale` for a thumbnail. Every border width comes off it, which is
 * what keeps the corner pieces true — a nine-slice corner is drawn into the box
 * where its two border widths cross, so widths that are not in the same ratio as
 * the slices squash the flowers in the corners and nowhere else.
 *
 * The slice goes out as percentages rather than pixels, which is what makes the
 * table above survive an asset being re-exported at another resolution: a
 * percentage slice is read against whatever the image turns out to be, where a
 * pixel slice is read against the source it was measured on and quietly cuts
 * somewhere else the moment that changes.
 *
 * `round` on the vertical sides, and the horizontal pair is left to `stretch`
 * because there is nothing on it to stretch: the strip between the two vertical
 * cuts is the bare channel, transparent from the top of the image to the bottom.
 */
export function flowerFrameStyle(
  style: PhotoBorderStyle,
  scale: number,
): CSSProperties {
  const { src, slice } = FRAMES[style];

  return {
    borderStyle: "solid",
    borderColor: "transparent",
    borderTopWidth: Math.round(slice.top * scale),
    borderRightWidth: Math.round(slice.right * scale),
    borderBottomWidth: Math.round(slice.bottom * scale),
    borderLeftWidth: Math.round(slice.left * scale),
    borderImageSource: `url(${src})`,
    borderImageSlice: [
      percent(slice.top, SOURCE_HEIGHT),
      percent(slice.right, SOURCE_WIDTH),
      percent(slice.bottom, SOURCE_HEIGHT),
      percent(slice.left, SOURCE_WIDTH),
    ].join(" "),
    borderImageRepeat: "stretch round",
  };
}
