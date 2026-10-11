import { mixHex, readableOn, relativeLuminance } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";

/**
 * "Tear to reveal": the date under a strip of handmade paper that the guest
 * tears off with a swipe. Drawn by components/card/TearReveal.tsx, chosen
 * under "Date reveal" (components/create/DateRevealPanel.tsx) and stored as
 * dateReveal "tear".
 */

/** The seamless paper, 512px, grey about the middle grey. See scripts/cut-scenes.mjs. */
export const TEAR_PAPER_SRC = "/decor/tear/paper.webp";

/** How wide one repeat of the paper is drawn, in CSS px. */
export const TEAR_PAPER_TILE = 256;

/** What the card hands the strip. */
export interface TearConfig {
  /** The paper's colour. */
  paper: string;
  /** The words and the arrow on it. */
  ink: string;
  /** "Swipe to reveal", in the card's language. */
  label: string;
  /** What the strip is called as a button, for a screen reader. */
  openLabel: string;
  /** Already off: the host's own preview, where nothing is hidden from them. */
  preCleared: boolean;
}

/** A colour's hue in degrees and its saturation, 0 to 1. */
function hueAndSaturation(hex: string): { hue: number; saturation: number } {
  const value = parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0 };
  }

  const lightness = (max + min) / 2;
  const hue =
    max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;

  return { hue: hue * 60, saturation: delta / (1 - Math.abs(2 * lightness - 1)) };
}

/** The red a maroon card's paper is: deeper than a signal red, and lighter than the card. */
const DEEP_RED = "#A3202F";

/**
 * The paper's colour on this card: its accent, which is the rose on Cream and
 * the gold on Midnight. On a dark red card (Maroon, or a host's own colour
 * near it) the accent is gold and the paper is a deep red instead, a shade up
 * from the card's own, the way a red card is wrapped in red.
 */
export function tearPaperColor(theme: Theme): string {
  const { hue, saturation } = hueAndSaturation(theme.background);
  const red = hue >= 330 || hue <= 15;

  return red && saturation > 0.4 && relativeLuminance(theme.background) < 0.12
    ? mixHex(theme.background, DEEP_RED, 0.72)
    : theme.accent;
}

/** The ink for the words on the paper: the card's own text or ground, whichever reads. */
export function tearInkColor(theme: Theme, paper: string): string {
  return readableOn(paper, [theme.textPrimary, theme.background]);
}
