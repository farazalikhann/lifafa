import { contrastRatio, mixHex } from "@/lib/contrast";
import type { Palette } from "@/lib/palettes";

/**
 * The colours the closed cover is drawn in, worked out from the card's own
 * palette.
 *
 * WHY THIS EXISTS. The cover used to be cream, in every literal sense: a
 * hardcoded `bg-[var(--lifafa-cream)]` layer, paper tones written into each
 * visual as hex, and marigold for every ornament. That is fine on a cream card
 * and wrong on nine of the palettes — a host picking Ink or Midnight got a
 * near-black invitation behind a bright white envelope, and the open was a
 * flash from one to the other rather than a card coming out of its wrapper. The
 * cover is the first thing a guest sees, and it was announcing the wrong card.
 *
 * The fix is not a second set of colours for dark palettes. It is that the
 * cover has no colours of its own at all: every tone below is the card's
 * background moved some distance towards the card's own text, so the wrapper is
 * made of the same material as what is inside it whatever the host chose.
 *
 * DIRECTION RATHER THAN LIGHTNESS is what makes one rule cover both. On a cream
 * card, "towards the text" is darker and the envelope sits as a shadow on the
 * ground; on an ink card it is lighter and the envelope lifts off it. Either
 * way the pieces keep their order — a flap is further from the ground than the
 * body, which is further than the pocket — so the drawing still reads as
 * folded paper rather than as a flat shape.
 */
export interface CoverPalette {
  /** The full-screen ground the cover layer paints. */
  ground: string;
  /** The main body of whatever is drawn: envelope, curtain, card stock. */
  paper: string;
  /** The deepest piece — a flap folded over, the shaded side of a fold. */
  paperDeep: string;
  /** The piece nearest the ground — a pocket behind the flap, an inner panel. */
  paperLift: string;
  /** Outlines and creases, one step further out than the deepest fill. */
  edge: string;
  /** The card's accent, honouring a host's override. Seals, cords, borders. */
  accent: string;
  /** What is legible written ON the accent — initials on wax, a mark on a seal. */
  onAccent: string;
  /** The names printed on the cover. */
  text: string;
  /** The prompt under them, and the Skip control. */
  textMuted: string;
}

/**
 * How far each piece sits from the ground, towards the card's text colour.
 *
 * Small numbers on purpose. The cover is a wrapper and should read as one
 * material catching light differently, not as four objects in four colours —
 * and these are also the distances that keep an envelope visible on a cream
 * card without turning it into a grey slab on a black one.
 */
const LIFT = 0.06;
const PAPER = 0.12;
const DEEP = 0.2;
const EDGE = 0.34;

/**
 * The cover's colours for one card.
 *
 * `accentOverride` is the host's own accent when they set one, which is the
 * same resolution the watermark and the card's ornaments make — so a host who
 * changed the gold to a green does not meet gold again on the way in.
 */
export function coverPalette(
  palette: Palette,
  accentOverride?: string | null,
): CoverPalette {
  const ground = palette.background;
  const ink = palette.textPrimary;
  const accent = accentOverride ?? palette.accent;

  return {
    ground,
    paper: mixHex(ground, ink, PAPER),
    paperDeep: mixHex(ground, ink, DEEP),
    paperLift: mixHex(ground, ink, LIFT),
    edge: mixHex(ground, ink, EDGE),
    accent,
    /*
      Measured rather than assumed. The wax seal carries two initials at 18px
      and the accent under them can be anything from a dark rose to a pale gold,
      so the ink on top is whichever of the card's own two extremes is easier to
      read against it — and it is only ever one of those two, so the seal cannot
      introduce a colour the card does not already use.
    */
    onAccent:
      contrastRatio(ground, accent) >= contrastRatio(ink, accent) ? ground : ink,
    text: palette.textPrimary,
    textMuted: palette.textMuted,
  };
}
