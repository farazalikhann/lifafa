import { mixHex } from "@/lib/contrast";
import type { Palette } from "@/lib/palettes";

/**
 * The colours of a control that sits on a card rather than beside it.
 *
 * The full screen preview floats its language switch, Replay and close over
 * the invitation itself, and they used to be the editor's own chrome: near
 * black pills with a marigold selection, the same on a cream card with a rose
 * garland as on an ink one. They read as something dropped on top of a designed
 * page. Made from the card's own colours instead, they read as part of it.
 *
 * EVERY COLOUR HERE IS ONE THE PALETTE ALREADY VOUCHES FOR. The fill is the
 * card's surface, which is deliberately close to its background — that is what
 * makes a chip look printed on the card rather than stuck to it, and it is also
 * the case to be careful with, because a fill that close to the ground cannot
 * carry any contrast. So nothing depends on the fill:
 *
 * - The words and icons are the card's textMuted and textPrimary, which
 *   lib/palettes.ts holds at 4.5:1 or better against both background and
 *   surface on every palette. The fill is nearly opaque, so a border or motif
 *   drawn behind a chip shifts what the words sit on by a few percent at most.
 * - The outline is textMuted mixed halfway into the background. textMuted is
 *   the palette's own guaranteed distance from the background, so half of it
 *   is a visible hairline on every palette, dark or light.
 * - A selection is shown by tinting the fill towards textPrimary and setting
 *   its label in textPrimary, never by filling it with the accent. A host can
 *   pick any accent they like, including one within a shade of their
 *   background; the accent never reaches these controls, so no choice of
 *   colour can make one of them vanish.
 */
export interface CardChrome {
  /** The chip itself: the card's surface, nearly opaque. */
  fill: string;
  /** Its outline. */
  edge: string;
  /** Words and icons at rest. */
  ink: string;
  /** Words and icons on hover, a selected label, and the focus ring. */
  inkStrong: string;
  /** A selected option's fill. */
  selectedFill: string;
}

/**
 * 92% as a hex alpha. Opaque enough that whatever is drawn behind a chip moves
 * the colour its words are read against by 8% at most; translucent enough that
 * the card's own texture still shows through and the chip sits on the page.
 */
const FILL_ALPHA = "EB";

/** How far the outline sits from the background, towards the muted ink. */
const EDGE_MIX = 0.5;

/** How far a selected option's fill leans towards the card's text colour. */
const SELECTED_MIX = 0.14;

export function cardChrome(palette: Palette): CardChrome {
  return {
    fill: `${palette.surface}${FILL_ALPHA}`,
    edge: mixHex(palette.background, palette.textMuted, EDGE_MIX),
    ink: palette.textMuted,
    inkStrong: palette.textPrimary,
    selectedFill: mixHex(palette.surface, palette.textPrimary, SELECTED_MIX),
  };
}
