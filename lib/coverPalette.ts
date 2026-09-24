import { contrastRatio, mixHex, relativeLuminance } from "@/lib/contrast";
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

  /*
    THE DRESSED TONES. The ones above keep a cover to the card's own two
    colours, and a cover drawn in nothing else read as grey paper on a grey
    screen: every fill was the ground with a little of the ink in it. These are
    what the covers dress it with — card stock that catches the light, a lining,
    metal leaf, wax and velvet — and every one is still worked out of the same
    palette, so a Midnight card gets gold on navy and a Blush card gets copper on
    blush without a colour the host did not choose.
  */

  /** Whether the ground is light. The tones below lean one way or the other on it. */
  isLight: boolean;
  /** Fine card stock: the lit face, the body, and the side turned from the light. */
  stockHi: string;
  stock: string;
  stockLo: string;
  /** The lining inside an envelope or a folded card, and the pattern printed on it. */
  liner: string;
  linerInk: string;
  /** Metal leaf, from the accent warmed towards gold: its highlight, body and shade. */
  foilHi: string;
  foil: string;
  foilLo: string;
  /** Sealing wax, in the accent: the lit crown, the body and the pooled edge. */
  waxHi: string;
  wax: string;
  waxLo: string;
  /** Velvet, the accent taken deep: a fold's crest, its body, and the hollow. */
  velvetHi: string;
  velvet: string;
  velvetLo: string;
  /** Words printed over velvet, where the card's own text colour would not read. */
  onVelvet: string;
  onVelvetMuted: string;
}

/**
 * The gold every foil leans towards, so a rose or a green accent still reads
 * as metal rather than as paint. Close to the Midnight palette's own accent.
 */
const LEAF_GOLD = "#C9A25A";

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
    ...dressedTones(palette, accent),
  };
}

/**
 * The dressed tones for one card. See the note on CoverPalette.
 *
 * On a light card the stock is whiter than the ground, so an envelope lifts off
 * it like good paper does; on a dark card it is the card's own surface warmed
 * by the accent, so it stays a dark envelope on a dark screen rather than a
 * white one flashing up in front of it.
 */
function dressedTones(
  palette: Palette,
  accent: string,
): Omit<
  CoverPalette,
  | "ground"
  | "paper"
  | "paperDeep"
  | "paperLift"
  | "edge"
  | "accent"
  | "onAccent"
  | "text"
  | "textMuted"
> {
  const isLight = relativeLuminance(palette.background) > 0.4;
  const stock = isLight
    ? mixHex(palette.surface, "#FFFFFF", 0.45)
    : mixHex(palette.surface, accent, 0.12);
  const foil = mixHex(accent, LEAF_GOLD, 0.55);
  const velvet = mixHex(accent, "#000000", isLight ? 0.3 : 0.55);

  return {
    isLight,
    stockHi: isLight ? mixHex(stock, "#FFFFFF", 0.7) : mixHex(stock, "#FFFFFF", 0.07),
    stock,
    stockLo: isLight
      ? mixHex(mixHex(stock, accent, 0.1), "#000000", 0.05)
      : mixHex(palette.background, "#000000", 0.3),
    liner: isLight ? mixHex(accent, "#000000", 0.08) : mixHex(accent, "#000000", 0.52),
    linerInk: mixHex(foil, "#FFFFFF", isLight ? 0.45 : 0.15),
    foilHi: mixHex(foil, "#FFF4D6", 0.6),
    foil,
    foilLo: mixHex(foil, "#000000", 0.4),
    waxHi: mixHex(accent, "#FFFFFF", 0.32),
    wax: accent,
    waxLo: mixHex(accent, "#000000", 0.45),
    velvetHi: mixHex(velvet, "#FFFFFF", 0.16),
    velvet,
    velvetLo: mixHex(velvet, "#000000", 0.55),
    onVelvet: "#FBF4E6",
    onVelvetMuted: "rgba(251, 244, 230, 0.78)",
  };
}
