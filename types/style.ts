export type FontPairId = "classic" | "modern" | "elegant" | "warm" | "clean";

export type PaletteId =
  | "ink"
  | "cream"
  | "forest"
  | "blush"
  | "midnight"
  | "sand";

export type CardDensity = "compact" | "comfortable" | "airy";

export interface CardStyle {
  fontPairId: FontPairId;
  paletteId: PaletteId;
  density: CardDensity;
  /** Hex string when the host has overridden the palette accent, else null. */
  accentOverride: string | null;
}
