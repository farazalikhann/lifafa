import type {
  ButterflyColour,
  ButterflyStyle,
} from "@/types/card";

/**
 * The butterflies a host can choose, and the one place their files are named.
 *
 * Three cut-outs of the same artwork recoloured, published from the originals
 * in `photo border/`. Only the red one was supplied with an alpha channel; the
 * other two arrived composited over black and are cut out with the red one's
 * alpha, which is sound because the three are pixel aligned — 98% and 99% of
 * their lit pixels fall inside that mask. A threshold would not have done it:
 * the background is black and so are the wing borders and the body, and any
 * threshold deep enough to find the one eats the other.
 */
export const BUTTERFLY_SRC: Record<ButterflyColour, string> = {
  red: "/decor/butterfly-red.webp",
  yellow: "/decor/butterfly-yellow.webp",
  purple: "/decor/butterfly-purple.webp",
};

/** The artwork's own proportions, so a width is enough to place one. */
export const BUTTERFLY_ASPECT = 180 / 110;

/** In the order the panel offers them, coldest first and the mixture last. */
export const BUTTERFLY_STYLES: readonly {
  id: ButterflyStyle;
  label: string;
}[] = [
  { id: "none", label: "Off" },
  { id: "red", label: "Red" },
  { id: "yellow", label: "Yellow" },
  { id: "purple", label: "Purple" },
  { id: "mixed", label: "Mixed" },
];

/**
 * What each butterfly on the card is, given the host's choice.
 *
 * One entry for a single colour and three for "mixed", and the layer cycles
 * whatever comes back across its flight table — so a colour returns a card
 * where every butterfly matches, and "mixed" returns one where no two beside
 * each other do.
 */
export function butterflySources(
  style: Exclude<ButterflyStyle, "none">,
): readonly string[] {
  if (style === "mixed") {
    return [BUTTERFLY_SRC.red, BUTTERFLY_SRC.yellow, BUTTERFLY_SRC.purple];
  }

  return [BUTTERFLY_SRC[style]];
}

/**
 * The host's choice, read out of a card config that may predate it.
 *
 * Three shapes reach this, and only one of them is the current type. A card
 * saved before butterflies existed has no key here at all. A card saved while
 * the field was a switch has `true` or `false` — `true` meant all three, which
 * is what "mixed" now means, so that is where those land rather than in a
 * colour nobody picked. Anything else unrecognisable is treated as off.
 *
 * Typed wider than the field it reads, deliberately: card_config is a jsonb
 * snapshot and the column has no idea what shape this release expects, so the
 * honest signature is the one that admits what can actually come back.
 */
export function butterflyStyle(
  stored: ButterflyStyle | boolean | null | undefined,
): ButterflyStyle {
  if (stored === true) {
    return "mixed";
  }

  if (
    stored === "red" ||
    stored === "yellow" ||
    stored === "purple" ||
    stored === "mixed"
  ) {
    return stored;
  }

  return "none";
}
