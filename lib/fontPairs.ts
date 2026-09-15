import type { FontPairId } from "@/types/style";

/**
 * Font pairings the host can choose between.
 *
 * Only the CSS variable names live here — every face is loaded once through
 * next/font/google in app/layout.tsx and exposed on the html element. Loading
 * fonts in a component would defeat next/font's preloading and risk a flash of
 * fallback text.
 */
export interface FontPair {
  id: FontPairId;
  label: string;
  headingVar: string;
  bodyVar: string;
  /** Generic family appended after the variable, so text never goes unstyled. */
  headingFallback: string;
  bodyFallback: string;
  /**
   * Headings need an explicit weight because "Inter at heavy weight" cannot be
   * expressed by a family name alone — the modern pair is the same face as its
   * body text and is distinguished only by weight.
   */
  headingWeight: number;
}

export const FONT_PAIRS: readonly FontPair[] = [
  {
    id: "classic",
    label: "Classic",
    headingVar: "--font-display",
    bodyVar: "--font-sans",
    headingFallback: "Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 600,
  },
  {
    id: "modern",
    label: "Modern",
    headingVar: "--font-sans",
    bodyVar: "--font-sans",
    headingFallback: "system-ui, sans-serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 800,
  },
  {
    id: "elegant",
    label: "Elegant",
    headingVar: "--font-cormorant",
    bodyVar: "--font-sans",
    headingFallback: "Garamond, Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 600,
  },
  {
    id: "warm",
    label: "Warm",
    headingVar: "--font-lora",
    bodyVar: "--font-sans",
    headingFallback: "Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 600,
  },
  {
    id: "clean",
    label: "Clean",
    headingVar: "--font-dm-sans",
    bodyVar: "--font-dm-sans",
    headingFallback: "system-ui, sans-serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 700,
  },
];

export const DEFAULT_FONT_PAIR_ID: FontPairId = "classic";

/**
 * Builds a usable font-family string from a variable and its fallback.
 *
 * Noto Sans Devanagari sits second, straight after the pair's own face, and
 * that is what lets a card be written in Hindi in any of the five pairs. None
 * of the pairs has a single Devanagari glyph, so without it every Hindi word
 * on the card fell through to whatever the device had — Nirmala on one phone,
 * Kohinoor on the next, each with its own metrics. A browser picks a face per
 * character, so Latin text never reaches the second entry and nothing about an
 * English card changes; only the characters the pair cannot draw do.
 */
export function fontFamilyOf(variable: string, fallback: string): string {
  return `var(${variable}), var(--font-devanagari), ${fallback}`;
}

/**
 * The product's display face, for the headings laid out beside a card rather
 * than on it — the reply form, the confirmation, the guest's pass.
 *
 * Those used to name `--font-display` alone, which has no Devanagari, so on a
 * Hindi card their headings were the one line set in whatever the device had.
 * Built with the same helper as the card's own faces, so it carries the same
 * Devanagari fallback and cannot drift from it.
 */
export const DISPLAY_FACE = fontFamilyOf("--font-display", "Georgia, serif");

/** Always resolves — an unknown id falls back to the first pair. */
export function getFontPair(id: FontPairId): FontPair {
  return FONT_PAIRS.find((pair) => pair.id === id) ?? FONT_PAIRS[0];
}
