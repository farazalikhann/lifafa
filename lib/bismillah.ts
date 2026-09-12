import { relativeLuminance } from "@/lib/contrast";

/**
 * The Bismillah, set in thuluth, and the two inks it is published in.
 *
 * A photograph of calligraphy rather than a drawing, so it is here beside the
 * flower frames and the butterflies rather than in lib/motifs.tsx with the line
 * art. It is a script, which is what makes it something this card will carry:
 * the rule at the head of lib/motifs.tsx is that no figure is ever drawn for
 * any tradition, and that where a tradition's emblem is itself a glyph, the
 * glyph is drawn. This is that case.
 *
 * TWO FILES AND NOT ONE TINTED, which is the opposite of how every other
 * ornament works. The rest are strokes in `currentColor` and take whatever
 * colour the card hands them; this is a raster, so its ink is fixed at the
 * point it was published and the only way to have it both ways is to publish it
 * both ways. Black for a card that is light, white for a card that is dark.
 *
 * They are cropped to one shared box — the union of what is visible in each —
 * so the two are the same size and the same shape. Which matters because the
 * card picks between them on the fly: cropped apart they came out at 2.438 and
 * 2.343 to one, and a host changing palette would have watched the calligraphy
 * change proportion as well as colour.
 */

const SRC = {
  light: "/decor/bismillah-black.webp",
  dark: "/decor/bismillah-white.webp",
} as const;

/** Which ground the calligraphy is being laid on. */
export type BismillahGround = keyof typeof SRC;

/** The published box, width over height. Both inks share it exactly. */
export const BISMILLAH_ASPECT = 1024 / 436;

/**
 * What the calligraphy says, for anyone who cannot see it.
 *
 * A real alt rather than the empty one every other ornament carries, because
 * this is the one that is not ornament: a lantern is a picture on the card and
 * a guest loses nothing by not being told it is there, while this is a line
 * that is read, and on a card where the host has switched the greeting off it
 * is the only thing at the head. The full Basmala, which is longer than the
 * "bismillah" greeting in lib/arabicContent.ts — that entry is the short form,
 * and this artwork is not.
 */
export const BISMILLAH_ALT =
  "Bismillah ir-Rahman ir-Rahim — In the name of Allah, the Most Gracious, the Most Merciful";

/**
 * Which ink to use on a given background.
 *
 * The card's own background, never the guest's system theme. A guest reading an
 * invitation in a dark room is still reading whatever palette the host chose,
 * and `prefers-color-scheme` says nothing about that — a card set in cream is
 * cream on every device, and black is the ink it wants.
 *
 * 0.5 relative luminance is the crossing point, which places every palette the
 * card ships with comfortably on one side or the other rather than near the
 * line. It is a threshold rather than a contrast measurement on purpose: the
 * artwork is pure black or pure white, so whichever side of the middle the
 * background falls, the far end of the scale is the answer.
 */
export function bismillahGround(background: string): BismillahGround {
  return relativeLuminance(background) >= 0.5 ? "light" : "dark";
}

/** The file to load for a ground. */
export function bismillahSrc(ground: BismillahGround): string {
  return SRC[ground];
}
