export type FontPairId =
  | "classic"
  | "modern"
  | "elegant"
  | "warm"
  | "clean"
  | "royal"
  | "regal"
  | "romantic"
  | "graceful"
  | "luxe";

export type PaletteId =
  | "ink"
  | "cream"
  | "forest"
  | "blush"
  | "midnight"
  | "sand"
  | "maroon"
  | "peacock";

export type CardDensity = "compact" | "comfortable" | "airy";

/**
 * The card's two text colours, and what came with them. See lib/textColors.ts.
 *
 * Stored as the colours themselves rather than as the name of a pair, so a
 * saved card keeps exactly the inks it was saved with whatever happens to the
 * table of pairs afterwards.
 */
export interface CardTextColors {
  /** Names, titles, headings, the date's numeral, the countdown. Hex. */
  textPrimary: string;
  /** Parents, places, labels, small dates and times, captions. Hex. */
  textSecondary: string;
  /**
   * The card colour that came with a pair the host picked, laid over the
   * palette's. Null when the card colour is the palette's own.
   *
   * READ, AND NO LONGER WRITTEN. A pair used to bring its own card colour and
   * accent; it sets the two inks alone now. A card saved before then still
   * has them here and is still painted in them.
   */
  cardColor: string | null;
  /** The accent that came with that pair, on the same terms. Null for the palette's own. */
  accent: string | null;
  /**
   * The host picked these, as a pair or one ink at a time. False when they
   * simply followed a palette, in which case the next palette brings its own.
   */
  chosen: boolean;
}

export interface CardStyle {
  fontPairId: FontPairId;
  paletteId: PaletteId;
  density: CardDensity;
  /** Hex string when the host has overridden the palette accent, else null. */
  accentOverride: string | null;
  /**
   * The two text colours. Absent on a card saved before there were any: such
   * a card keeps the colours its palette always gave it, element for element.
   */
  textColors?: CardTextColors;
}
