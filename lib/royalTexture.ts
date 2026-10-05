/**
 * The royal texture: a damask woven into the card's ground.
 *
 * One grey tile, laid over the card's colour with `mix-blend-mode: soft-light`
 * by components/card/CardCanvas.tsx. The tile averages exactly 50% grey, which
 * soft-light leaves alone, so the card keeps its colour and only the pattern
 * shows: a little lighter where the damask is, a little darker between.
 */

export const ROYAL_TEXTURE_SRC = "/decor/texture/royal-damask.webp";

/** The tile's drawn size, in CSS px. The file is 600px, so it is sharp at 1.5x. */
export const ROYAL_TEXTURE_TILE = 400;

/**
 * Stored only as `true`. Absent from every card saved before the texture
 * existed, and those cards have none; a new card starts with it on, which
 * app/create/page.tsx is where it is given.
 */
export function royalTextureOn(value: unknown): boolean {
  return value === true;
}

/** The tile's darkest and lightest greys, 0 to 1: its 0.5th and 99.5th percentiles. */
const TEXTURE_LOW = 0.2745;
const TEXTURE_HIGH = 0.8157;

/** How far apart the pattern's light and dark may sit on the card, of 255. */
const TARGET_SWING = 14;

/** The W3C soft-light formula, for one channel, both 0 to 1. */
function softLight(backdrop: number, source: number): number {
  if (source <= 0.5) {
    return backdrop - (1 - 2 * source) * backdrop * (1 - backdrop);
  }

  const lifted =
    backdrop <= 0.25
      ? ((16 * backdrop - 12) * backdrop + 4) * backdrop
      : Math.sqrt(backdrop);

  return backdrop + (2 * source - 1) * (lifted - backdrop);
}

/**
 * The overlay's opacity on a card of this colour.
 *
 * NOT ONE NUMBER, because soft-light is not one strength. At full opacity the
 * same tile moves Maroon by 64 levels and Blush by 15: it does most on a deep
 * saturated ground and least on a pale one. So the opacity is worked back from
 * the colour, to whatever puts the pattern's light and dark 14 levels apart:
 * visible, and quiet enough that the muted text loses under a third of a point
 * of contrast on the palette where it has least to spare.
 *
 * As it falls out: Blush 0.92, Cream 0.85, Sand 0.54, Forest 0.52, Ink 0.43,
 * Midnight 0.28, Peacock 0.23, Maroon 0.22. Worked out rather than listed, so
 * a text pair's own card colour gets the right answer too.
 */
export function royalTextureOpacity(background: string): number {
  const channels = [1, 3, 5].map(
    (start) => Number.parseInt(background.slice(start, start + 2), 16) / 255,
  );

  if (channels.some((channel) => Number.isNaN(channel))) {
    return 0.4;
  }

  const swing =
    255 *
    Math.max(
      ...channels.map(
        (channel) => softLight(channel, TEXTURE_HIGH) - softLight(channel, TEXTURE_LOW),
      ),
    );

  return Math.round(100 * Math.min(1, TARGET_SWING / Math.max(swing, 1))) / 100;
}
