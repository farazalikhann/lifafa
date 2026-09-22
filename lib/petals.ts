import type { PetalStyle } from "@/types/card";

/**
 * The rose petals, and the one place their files are named.
 *
 * Two photographs of real petals, supplied as JPEGs on black and cut out on
 * luminance the way the leaf was: the background is 0,0,0 and the darkest fold
 * of either petal is far above it, so a ramp between the two finds the edge
 * without eating the shading. The soft edge is then un-darkened — divided by
 * its own coverage — so it does not leave a black rim on a cream card.
 *
 * Two shapes rather than one, cycled across every table that places them, so a
 * shower of twenty reads as petals rather than as one petal copied.
 */
export const PETALS: readonly { src: string; aspect: number }[] = [
  { src: "/decor/petal-a.webp", aspect: 160 / 140 },
  { src: "/decor/petal-b.webp", aspect: 160 / 154 },
];

/** In the order the panel offers them. */
export const PETAL_STYLES: readonly { id: PetalStyle; label: string }[] = [
  { id: "none", label: "Off" },
  { id: "open", label: "When opened" },
  { id: "fall", label: "Falling" },
  { id: "both", label: "Both" },
];

/** Whether the choice includes the shower on opening. */
export function petalsBurst(style: PetalStyle): boolean {
  return style === "open" || style === "both";
}

/** Whether the choice includes the steady fall in the margins. */
export function petalsFall(style: PetalStyle): boolean {
  return style === "fall" || style === "both";
}

/**
 * The host's choice, read out of a card config that may predate it. A card
 * saved before petals existed has no key, and anything unrecognisable is off.
 */
export function petalStyle(stored: PetalStyle | null | undefined): PetalStyle {
  if (stored === "open" || stored === "fall" || stored === "both") {
    return stored;
  }

  return "none";
}
