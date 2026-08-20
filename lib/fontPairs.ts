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

/** Builds a usable font-family string from a variable and its fallback. */
export function fontFamilyOf(variable: string, fallback: string): string {
  return `var(${variable}), ${fallback}`;
}

/** Always resolves — an unknown id falls back to the first pair. */
export function getFontPair(id: FontPairId): FontPair {
  return FONT_PAIRS.find((pair) => pair.id === id) ?? FONT_PAIRS[0];
}
