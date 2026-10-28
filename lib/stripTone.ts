import { effectiveTheme } from "@/lib/cardTheme";
import { contrastRatio, fitContrast } from "@/lib/contrast";
import { getTheme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";

/** WCAG's ratio for small text: everything on the strip is under 18.66px. */
const MIN_RATIO = 4.5;

/** The colours a pinned strip is drawn in when it takes them from a card. */
export interface StripTone {
  /** The strip itself. */
  bar: string;
  /** Its line of text. */
  text: string;
  /** The first words of the line, set apart. */
  highlight: string;
  /** The button's fill. */
  button: string;
  /** The button's label. */
  buttonText: string;
}

/**
 * The sample banner in the card's own colours, so it reads as part of the
 * invitation under it rather than a black bar over it.
 *
 * The bar is the card's surface, its text the card's main ink, its button
 * the card's accent. The button's label is the bar's colour, moved towards
 * black or white only as far as it takes to be read on the accent: on Gulab
 * Mahal, a rose-gold button lettered in deep velvet. The first words are in
 * the accent where that can be read on the bar, and in the card's ink where
 * it cannot.
 *
 * Every pair is checked at 4.5:1. A card whose colours cannot give that comes
 * back as null, and the strip keeps its own ink and marigold.
 */
export function sampleStripTone(config: CardConfig): StripTone | null {
  const card = effectiveTheme(getTheme(config.themeId), config.style);
  const bar = card.surface;
  const text = card.textPrimary;
  const button = card.accent;
  const buttonText = fitContrast(bar, button, MIN_RATIO);
  const highlight =
    contrastRatio(button, bar) >= MIN_RATIO ? button : text;

  const readable =
    contrastRatio(text, bar) >= MIN_RATIO &&
    contrastRatio(buttonText, button) >= MIN_RATIO;

  return readable ? { bar, text, highlight, button, buttonText } : null;
}
