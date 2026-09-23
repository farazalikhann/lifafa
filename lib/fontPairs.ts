import type { FontPairId } from "@/types/style";

/**
 * Font pairings the host can choose between.
 *
 * Only the CSS variable names live here — every face is declared once through
 * next/font/google in app/layout.tsx and exposed on the html element. Declaring
 * a face is not downloading it: a browser fetches a webfont only when some text
 * on the page is set in it, so a guest's invite pulls the files for its own
 * pair and nothing else. See the note on preloading in app/layout.tsx.
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
  /**
   * The face for the couple's names on the cover, and for nothing else. Absent
   * means the heading face sets them, which is how the first five pairs work.
   *
   * Kept apart from the heading because the heading face also sets the date,
   * the time, the venue and the countdown, which must stay readable at a
   * glance on a phone. A script face is allowed here and nowhere else.
   */
  names?: NamesFace;
}

export interface NamesFace {
  variable: string;
  fallback: string;
  weight: number;
  /**
   * Multiplier on the cover's name size. A script face draws its lowercase far
   * smaller than a serif at the same font-size, so it needs more size to carry
   * the same presence.
   */
  scale: number;
  /**
   * Line height for a name that wraps. Script capitals and descenders reach
   * well past a serif's, and at the serif's 1.05 a wrapped name's two lines
   * run into each other.
   */
  leading: number;
  /**
   * Letter spacing. Zero for a script: its letters are drawn to join, and any
   * tracking pulls the joins apart.
   */
  tracking: string;
  /**
   * Extra room between words. Great Vibes draws its space so narrow that
   * "Mohammad Abdul" reads as one word, so it is opened up; every other face
   * keeps its own.
   */
  wordSpacing: string;
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
  {
    id: "royal",
    label: "Royal",
    headingVar: "--font-cormorant",
    bodyVar: "--font-cormorant",
    headingFallback: "Garamond, Georgia, serif",
    bodyFallback: "Garamond, Georgia, serif",
    headingWeight: 600,
    names: {
      variable: "--font-great-vibes",
      fallback: "cursive",
      weight: 400,
      scale: 1.2,
      leading: 1.25,
      tracking: "0",
      wordSpacing: "0.15em",
    },
  },
  {
    id: "regal",
    label: "Regal",
    headingVar: "--font-cinzel",
    bodyVar: "--font-cormorant",
    headingFallback: "Georgia, serif",
    bodyFallback: "Garamond, Georgia, serif",
    headingWeight: 600,
    names: {
      variable: "--font-cinzel",
      fallback: "Georgia, serif",
      weight: 600,
      /* Cinzel has no lowercase, so its capitals are held back a little. */
      scale: 0.85,
      leading: 1.15,
      tracking: "0.02em",
      wordSpacing: "normal",
    },
  },
  {
    id: "romantic",
    label: "Romantic",
    headingVar: "--font-playfair",
    bodyVar: "--font-lora",
    headingFallback: "Georgia, serif",
    bodyFallback: "Georgia, serif",
    headingWeight: 600,
    names: {
      variable: "--font-parisienne",
      fallback: "cursive",
      weight: 400,
      scale: 1.1,
      leading: 1.25,
      tracking: "0",
      wordSpacing: "normal",
    },
  },
  {
    id: "graceful",
    label: "Graceful",
    headingVar: "--font-marcellus",
    bodyVar: "--font-marcellus",
    headingFallback: "Georgia, serif",
    bodyFallback: "Georgia, serif",
    /* Marcellus comes in one weight; asking for more would fake a bold. */
    headingWeight: 400,
    names: {
      variable: "--font-pinyon",
      fallback: "cursive",
      weight: 400,
      scale: 1.1,
      leading: 1.3,
      tracking: "0",
      wordSpacing: "normal",
    },
  },
  {
    id: "luxe",
    label: "Luxe",
    headingVar: "--font-bodoni",
    bodyVar: "--font-josefin",
    headingFallback: "Didot, Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 500,
    names: {
      variable: "--font-bodoni",
      fallback: "Didot, Georgia, serif",
      weight: 500,
      scale: 1,
      leading: 1.1,
      tracking: "-0.01em",
      wordSpacing: "normal",
    },
  },
];

export const DEFAULT_FONT_PAIR_ID: FontPairId = "classic";

/**
 * The face the cover names are set in. A pair with no face of its own for the
 * names falls back to its heading face at the settings the cover has always
 * used, so the first five pairs render exactly as before.
 */
export function namesFaceOf(pair: FontPair): NamesFace {
  return (
    pair.names ?? {
      variable: pair.headingVar,
      fallback: pair.headingFallback,
      weight: pair.headingWeight,
      scale: 1,
      leading: 1.05,
      tracking: "-0.015em",
      wordSpacing: "normal",
    }
  );
}

/**
 * Builds a usable font-family string from a variable and its fallback.
 *
 * Noto Sans Devanagari sits second, straight after the pair's own face, and
 * that is what lets a card be written in Hindi in any pair. None of the
 * pairs has a single Devanagari glyph, so without it every Hindi word
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
