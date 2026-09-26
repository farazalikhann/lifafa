import type { PetalFlower, PetalStyle } from "@/types/card";

/**
 * A piece of a flower the petal layer can throw or let fall.
 *
 * `scale` is how much bigger or smaller than a petal it is drawn: the layer's
 * tables size a slot for a rose petal, and a whole marigold in that slot would
 * be a speck.
 */
export interface FlowerPiece {
  src: string;
  /** Width over height, so a width is enough to place one. */
  aspect: number;
  scale: number;
}

/*
  Every file here was supplied as a JPEG on black and cut out on brightness —
  the rose petals by hand, the rest by scripts/cut-flowers.mjs, which says how
  and why the edges come out without a dark or a grey rim.
*/

/**
 * The rose petals, and the two a card had before there was any other flower.
 *
 * Two shapes rather than one, cycled across every table that places them, so a
 * shower of twenty reads as petals rather than as one petal copied.
 */
const ROSE_A: FlowerPiece = { src: "/decor/petal-a.webp", aspect: 160 / 140, scale: 1 };
const ROSE_B: FlowerPiece = { src: "/decor/petal-b.webp", aspect: 160 / 154, scale: 1 };

const MARIGOLD_PETAL: FlowerPiece = {
  src: "/decor/flowers/marigold-petal.webp",
  aspect: 154 / 160,
  scale: 1,
};
const MARIGOLD_FLOWER: FlowerPiece = {
  src: "/decor/flowers/marigold-flower.webp",
  aspect: 240 / 233,
  scale: 1.7,
};
const MOGRA_FLOWER: FlowerPiece = {
  src: "/decor/flowers/mogra-flower.webp",
  aspect: 239 / 240,
  scale: 1.5,
};
/** The few whole mogras among the buds of a falling Mogra, kept small. */
const SMALL_MOGRA: FlowerPiece = { ...MOGRA_FLOWER, scale: 0.9 };
/**
 * STAND-IN. The mogra bud has not been supplied yet, so a small mogra flower
 * falls in its place. When it arrives: add it to scripts/cut-flowers.mjs as
 * "mogra-bud" at PIECE size, run the script, and point this at
 * /decor/flowers/mogra-bud.webp with its own aspect and a scale of 1.
 */
const MOGRA_BUD: FlowerPiece = { ...MOGRA_FLOWER, scale: 0.7 };
const LOTUS_PETAL: FlowerPiece = {
  src: "/decor/flowers/lotus-petal.webp",
  aspect: 95 / 160,
  /* Long and narrow, so a little less wide keeps it a petal's size. */
  scale: 0.85,
};
const LOTUS_FLOWER: FlowerPiece = {
  src: "/decor/flowers/lotus-flower.webp",
  aspect: 240 / 220,
  scale: 1.8,
};

/** The rose petals, for anything that shows petals without a flower choice. */
export const PETALS: readonly FlowerPiece[] = [ROSE_A, ROSE_B];

/**
 * What falls down the margins, cycled across the fall table. Loose pieces
 * only: a whole flower drifting down for the length of the card is a lot to
 * read past, so only Mogra has any, and small.
 */
export const FALL_PIECES: Record<PetalFlower, readonly FlowerPiece[]> = {
  rose: PETALS,
  marigold: [MARIGOLD_PETAL],
  mogra: [MOGRA_BUD, MOGRA_BUD, SMALL_MOGRA],
  lotus: [LOTUS_PETAL],
  mixed: [MARIGOLD_PETAL, ROSE_A, MOGRA_BUD, MARIGOLD_PETAL, ROSE_B, MOGRA_BUD],
};

/**
 * What the shower throws as the card opens, cycled across the shower table:
 * whole flowers among their own petals, a third of the throw. Rose is only
 * petals, as it always was — there is no whole rose.
 */
export const BURST_PIECES: Record<PetalFlower, readonly FlowerPiece[]> = {
  rose: PETALS,
  marigold: [MARIGOLD_FLOWER, MARIGOLD_PETAL, MARIGOLD_PETAL],
  mogra: [MOGRA_FLOWER, MOGRA_BUD, MOGRA_BUD],
  lotus: [LOTUS_FLOWER, LOTUS_PETAL, LOTUS_PETAL],
  mixed: [MARIGOLD_FLOWER, ROSE_A, MOGRA_FLOWER, ROSE_B],
};

/** The picture on each flower's chip in the panel. */
export const FLOWER_CHIPS: Record<PetalFlower, readonly FlowerPiece[]> = {
  rose: PETALS,
  marigold: [MARIGOLD_FLOWER],
  mogra: [MOGRA_FLOWER],
  lotus: [LOTUS_FLOWER],
  mixed: [MARIGOLD_FLOWER, MOGRA_FLOWER, ROSE_A],
};

/** In the order the panel offers them. */
export const PETAL_STYLES: readonly { id: PetalStyle; label: string }[] = [
  { id: "none", label: "Off" },
  { id: "open", label: "When opened" },
  { id: "fall", label: "Falling" },
  { id: "both", label: "Both" },
];

/** In the order the panel offers them, the rose every card had first. */
export const PETAL_FLOWERS: readonly { id: PetalFlower; label: string }[] = [
  { id: "rose", label: "Rose" },
  { id: "marigold", label: "Marigold" },
  { id: "mogra", label: "Mogra" },
  { id: "lotus", label: "Lotus" },
  { id: "mixed", label: "Mixed" },
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

/**
 * The flower, read out of a card config that may predate the choice. Every
 * card saved before it had rose petals, so a missing key — or anything this
 * build does not recognise — is a rose.
 */
export function petalFlowerType(
  stored: PetalFlower | null | undefined,
): PetalFlower {
  if (
    stored === "marigold" ||
    stored === "mogra" ||
    stored === "lotus" ||
    stored === "mixed"
  ) {
    return stored;
  }

  return "rose";
}
