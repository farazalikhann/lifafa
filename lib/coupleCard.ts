import { contrastRatio, fitContrast } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";
import type { TraditionId } from "@/types/occasion";

/**
 * "Meet the Couple": the two cards' panel, their figures and their inks.
 * Drawn by components/card/sections/FamilySection.tsx; the pictures are cut by
 * scripts/cut-flowers.mjs (`couple`), which also records which file is whom.
 */

export type CoupleRole = "groom" | "bride";

/**
 * The panel each person's card is: a soft ivory, on every palette. It is a
 * card laid on the card, the way a photograph is mounted on a page, and its
 * own colour is what lets the figures be drawn on white and simply multiplied
 * onto it — on a dark card's own ground they would vanish.
 */
export const COUPLE_PANEL = "#FBF5E9";
/** The gold of the panel's double border, the pin and the monogram's initial. */
export const COUPLE_GOLD = "#B08A3C";

/**
 * The folder a tradition's pair is published in. Each tradition has its own;
 * a card with none — "Other", "prefer not to say", nothing chosen — has the
 * pair that belongs to no tradition.
 */
function figureFolder(traditionId: TraditionId): string {
  return traditionId === "none" ? "other" : traditionId;
}

export function coupleFigure(traditionId: TraditionId, role: CoupleRole): string {
  return `/decor/couple/${figureFolder(traditionId)}/${role}.webp`;
}

export const COUPLE_CORNER = "/decor/couple/card-corner.webp";
export const COUPLE_MONOGRAM = "/decor/couple/monogram-frame.webp";

/**
 * Absent from every card saved before the switch existed, and on by default:
 * only a host who turned the illustration off has `false` stored.
 */
export function coupleIllustrationOn(value: unknown): boolean {
  return value !== false;
}

export interface CoupleInks {
  /** The name. */
  primary: string;
  /** "Son of", the parents and the city. */
  secondary: string;
}

/** The panel's own inks, for a card whose two do not read on ivory. */
const PANEL_PRIMARY = "#3A1420";
const PANEL_SECONDARY = fitContrast("#8A6A2F", COUPLE_PANEL, 4.5);

/**
 * The inks on the ivory panel.
 *
 * The card's Primary and Secondary where they can be read there — which on a
 * light card they can, and on a dark card, whose inks are cream and gold, they
 * cannot. An ink that falls short on ivory (7:1 for the name, 4.5:1 for the
 * rest) is replaced by the panel's own: a deep wine and an antique gold.
 */
export function coupleInks(theme: Theme): CoupleInks {
  return {
    primary:
      contrastRatio(theme.textPrimary, COUPLE_PANEL) >= 7
        ? theme.textPrimary
        : PANEL_PRIMARY,
    secondary:
      contrastRatio(theme.textMuted, COUPLE_PANEL) >= 4.5
        ? theme.textMuted
        : PANEL_SECONDARY,
  };
}

/** The "&" between the two cards: gold, taken as far as it needs to go to show on the card's own ground. */
export function coupleAmpersand(theme: Theme): string {
  return fitContrast("#C9A14A", theme.background, 3);
}
