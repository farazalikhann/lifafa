/**
 * The royal texture: a damask woven into the card's ground.
 *
 * TWO TILES, BECAUSE ONE BLEND DOES NOT DO BOTH JOBS. On a dark card it is a
 * grey tile laid over the card's colour with `mix-blend-mode: soft-light`. The
 * tile averages exactly 50% grey, which soft-light leaves alone, so the card
 * keeps its colour and only the pattern shows: a little lighter where the
 * damask is, a little darker between.
 *
 * Soft-light has almost nothing to give a pale ground, though, and on Cream,
 * Blush and Sand the same tile was all but invisible. A light card gets the
 * other tile instead: the same damask printed dark on pure white, laid on
 * with `multiply`. White leaves the card's colour exactly as it is, and the
 * pattern is that colour a shade deeper, the way a blind emboss reads on
 * wedding paper.
 *
 * `royalTextureLayer` chooses, and components/card/CardCanvas.tsx and
 * components/card/decor/RoyalTextureFill.tsx draw what it hands them.
 */

/** The soft-light tile, for a dark card. */
const DARK_SRC = "/decor/texture/royal-damask.webp";
/** The multiply tile, for a light card. */
const LIGHT_SRC = "/decor/texture/royal-damask-light.webp";

/** The texture as one layer of the card: which tile, how it is blended, and how strongly. */
export interface RoyalTextureLayer {
  src: string;
  blend: "soft-light" | "multiply";
  opacity: number;
}

/**
 * Marks the card's own texture layer, so a pinned band can find it and draw
 * its tile in register with it; see components/card/decor/RoyalTextureFill.tsx.
 */
export const ROYAL_TEXTURE_ATTRIBUTE = "data-royal-texture";

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
 * The soft-light tile's opacity on a dark card of this colour.
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
function softLightOpacity(channels: readonly number[]): number {
  const swing =
    255 *
    Math.max(
      ...channels.map(
        (channel) => softLight(channel, TEXTURE_HIGH) - softLight(channel, TEXTURE_LOW),
      ),
    );

  return Math.round(100 * Math.min(1, TARGET_SWING / Math.max(swing, 1))) / 100;
}

/** The light tile's darkest grey, 0 to 1: its 0.5th percentile. Its ground is 1. */
const LIGHT_TEXTURE_LOW = 0.5059;

/** How far the damask sits below a light card's colour at its deepest, of 255. */
const LIGHT_TARGET_DROP = 18;

/**
 * The multiply tile's opacity on a light card: whatever prints the damask 18
 * levels under the card's colour at its deepest. About as present as the
 * pattern is on Ink, and the muted text, read across the darkest of it, is
 * still at 4.80:1 on Cream, 4.65:1 on Blush and 4.87:1 on Sand. All three
 * come out at 0.15.
 */
function multiplyOpacity(channels: readonly number[]): number {
  const drop = 255 * Math.max(...channels) * (1 - LIGHT_TEXTURE_LOW);

  return Math.round(100 * Math.min(1, LIGHT_TARGET_DROP / Math.max(drop, 1))) / 100;
}

function relativeLuminance(channels: readonly number[]): number {
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/**
 * The texture for a card of this colour.
 *
 * Light or dark is the ground's relative luminance against a half: Cream,
 * Blush and Sand are at 0.78 and above and the dark five are under 0.04, so
 * none of the eight palettes sits near the line.
 */
export function royalTextureLayer(background: string): RoyalTextureLayer {
  const channels = [1, 3, 5].map(
    (start) => Number.parseInt(background.slice(start, start + 2), 16) / 255,
  );

  if (channels.some((channel) => Number.isNaN(channel))) {
    return { src: DARK_SRC, blend: "soft-light", opacity: 0.4 };
  }

  return relativeLuminance(channels) > 0.5
    ? { src: LIGHT_SRC, blend: "multiply", opacity: multiplyOpacity(channels) }
    : { src: DARK_SRC, blend: "soft-light", opacity: softLightOpacity(channels) };
}
