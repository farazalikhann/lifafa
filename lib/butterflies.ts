import type {
  ButterflyColour,
  ButterflyStyle,
  FlyingKind,
  NatureKind,
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
const BUTTERFLY_SRC: Record<ButterflyColour, string> = {
  red: "/decor/butterfly-red.webp",
  yellow: "/decor/butterfly-yellow.webp",
  purple: "/decor/butterfly-purple.webp",
};

/** The artwork's own proportions, so a width is enough to place one. */
export const BUTTERFLY_ASPECT = 180 / 110;

/**
 * The leaf that drifts with them.
 *
 * One file and no pair, unlike the butterflies: a green leaf is a green leaf on
 * cream and on ink alike, so there is nothing for the host to choose between
 * and nothing the card has to decide. A switch of its own now — see `leavesOn`
 * — and one of several kinds, of which it is the first: see `natureKind`.
 *
 * Supplied as a JPEG on black, so it is cut out on luminance rather than on an
 * alpha channel it never had. That works here where it would not have worked
 * for the Devanagari sheet: the background is 0,0,0 and the leaf is a bright
 * green, with only 4,462 of 175,000 sampled pixels between the two.
 */
const GREEN_LEAF: NaturePiece = {
  src: "/decor/leaf.webp",
  aspect: 240 / 138,
  scale: 1,
  motion: "leaf",
};

/**
 * One thing the nature layer drifts.
 *
 * `scale` is how much wider or narrower than the green leaf it is drawn: the
 * layer's table sizes a slot for that leaf, which is long and narrow, and a
 * maple leaf as wide as it would be nearly twice the leaf.
 */
export interface NaturePiece {
  src: string;
  /** Width over height, so a width is enough to place one. */
  aspect: number;
  scale: number;
  /**
   * How it moves, which is a set of keyframes in globals.css: a leaf is
   * carried and turns over, a seed drifts and rises with almost no spin, a
   * feather falls on a wide, slow swing.
   */
  motion: "leaf" | "seed" | "feather";
}

/**
 * The picture for each kind. The two maple leaves are the breeze cover's own
 * (lib/breezeArt.ts), already cut out and already on the server. At three
 * quarters of the green leaf's width they cover about what it does. The seed
 * and the feather are cut by scripts/cut-flowers.mjs, as light: see there.
 */
const NATURE_PIECES: Partial<Record<NatureKind, NaturePiece>> = {
  greenLeaves: GREEN_LEAF,
  goldLeaves: {
    src: "/decor/breeze/leaf-gold.webp",
    aspect: 177 / 180,
    scale: 0.76,
    motion: "leaf",
  },
  autumnLeaves: {
    src: "/decor/breeze/leaf-orange.webp",
    aspect: 179 / 180,
    scale: 0.76,
    motion: "leaf",
  },
  /* Taller than wide, both: a little narrower than the leaf, and about its size. */
  dandelion: {
    src: "/decor/floating/dandelion.webp",
    aspect: 210 / 240,
    scale: 0.9,
    motion: "seed",
  },
  feathers: {
    src: "/decor/floating/feather.webp",
    aspect: 233 / 240,
    scale: 1,
    motion: "feather",
  },
};

/**
 * One thing the flying layer flies.
 *
 * `scale` is how much wider or narrower than a butterfly it is drawn: the
 * layer's table sizes a slot for a butterfly, which is wide and shallow.
 */
export interface FlyingPiece {
  src: string;
  /** Width over height. */
  aspect: number;
  scale: number;
}

/**
 * The three that came after the butterflies, cut by scripts/cut-flowers.mjs.
 * The lovebird is seen from the side and faces right; the dragonfly is seen
 * from above, head up, as the butterflies are; the heart is a jewel, and
 * small, because six of anything that red is a lot of red.
 */
const FLYING_ART: Record<Exclude<FlyingKind, "butterflies" | "fireflies">, FlyingPiece> = {
  lovebirds: { src: "/decor/floating/lovebird.webp", aspect: 159 / 180, scale: 0.84 },
  dragonflies: { src: "/decor/floating/dragonfly.webp", aspect: 180 / 136, scale: 1 },
  hearts: { src: "/decor/floating/heart.webp", aspect: 180 / 158, scale: 0.56 },
};

/**
 * What each flyer on the card is, given the kind and, for butterflies, the
 * colour: a list the layer cycles across its flight table, as
 * `butterflySources` is. Fireflies have no picture: see `fireflyGlow`.
 */
export function flyingPieces(
  kind: FlyingKind,
  colour: Exclude<ButterflyStyle, "none">,
): readonly FlyingPiece[] {
  if (kind === "lovebirds" || kind === "dragonflies" || kind === "hearts") {
    return [FLYING_ART[kind]];
  }

  return butterflySources(colour).map((src) => ({
    src,
    aspect: BUTTERFLY_ASPECT,
    scale: 1,
  }));
}

/** What a kind drifts: its own picture, or the green leaf until it has one. */
export function naturePiece(kind: NatureKind): NaturePiece {
  return NATURE_PIECES[kind] ?? GREEN_LEAF;
}

/** Every flying kind, in the order the panel offers them. */
export const FLYING_KINDS: readonly { id: FlyingKind; label: string }[] = [
  { id: "butterflies", label: "Butterflies" },
  { id: "lovebirds", label: "Lovebirds" },
  { id: "dragonflies", label: "Dragonflies" },
  { id: "hearts", label: "Hearts" },
  { id: "fireflies", label: "Fireflies" },
];

/**
 * THE ONE LIST that says which flying kinds a card can have: the panel shows
 * a chip for each, and `flyingKind` reads any other as butterflies. A kind is
 * added here when its artwork and its layer have landed, and not before.
 */
export const AVAILABLE_FLYING: readonly FlyingKind[] = [
  "butterflies",
  "lovebirds",
  "dragonflies",
  "hearts",
  "fireflies",
];

/**
 * A firefly: a point of light with a soft halo, drawn in code, as one
 * radial-gradient background. Not a filter and not a box-shadow: a gradient
 * is painted once into the element's own layer, and from then on the firefly
 * is that layer being moved and faded.
 *
 * Warm gold on a dark card, with a halo four times the point. On a light card
 * gold is the colour of the paper, so it is a deeper amber with a smaller,
 * firmer halo: a light cannot glow against cream, but an ember still reads.
 *
 * `core` is the point's width in px; what comes back is the size of the box
 * that holds the point and its halo, and the background that draws both.
 */
export function fireflyGlow(
  core: number,
  onLight: boolean,
): { size: number; background: string } {
  const spread = onLight ? 2.4 : 4;
  /* The point's edge, as a share of the box's radius. */
  const edge = Math.round(100 / spread);

  return {
    size: Math.round(core * spread),
    background: onLight
      ? `radial-gradient(circle, #C98A1E 0%, #C98A1E ${edge - 6}%, rgb(201 138 30 / 0.4) ${edge + 10}%, rgb(201 138 30 / 0) 70%)`
      : `radial-gradient(circle, #FFF3D1 0%, #FFD98A ${edge - 8}%, rgb(255 217 138 / 0.38) ${edge + 8}%, rgb(255 217 138 / 0.1) 48%, rgb(255 217 138 / 0) 70%)`,
  };
}

/** Every nature kind, in the order the panel offers them. */
export const NATURE_KINDS: readonly { id: NatureKind; label: string }[] = [
  { id: "greenLeaves", label: "Green leaves" },
  { id: "goldLeaves", label: "Gold leaves" },
  { id: "autumnLeaves", label: "Autumn leaves" },
  { id: "dandelion", label: "Dandelion" },
  { id: "feathers", label: "Feathers" },
];

/** The same list for the nature kinds. */
export const AVAILABLE_NATURE: readonly NatureKind[] = [
  "greenLeaves",
  "goldLeaves",
  "autumnLeaves",
  "dandelion",
  "feathers",
];

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

/**
 * Whether the card's leaves are on, read out of a card config that may predate
 * the switch.
 *
 * Leaves used to ride the butterfly switch, so a card saved before they had
 * their own has no key here and drifted leaves whenever it flew butterflies.
 * That is what it keeps doing: a missing key follows the butterflies, and only
 * a card that has actually been given a value is read by it.
 */
export function leavesOn(
  stored: boolean | null | undefined,
  storedButterflies: ButterflyStyle | boolean | null | undefined,
): boolean {
  if (typeof stored === "boolean") {
    return stored;
  }

  return butterflyStyle(storedButterflies) !== "none";
}

/**
 * Which kind flies, read out of a card config that may predate the choice.
 *
 * Every card saved before there was one flew butterflies, so a missing key is
 * butterflies, and so is a kind this build cannot draw yet. Whether anything
 * flies at all is not asked here: that is still `butterflyStyle`.
 */
export function flyingKind(stored: FlyingKind | null | undefined): FlyingKind {
  return AVAILABLE_FLYING.find((kind) => kind === stored) ?? "butterflies";
}

/**
 * Which kind drifts, read the same way: a missing key is the green leaf every
 * card had, and so is a kind with no picture yet. Whether anything drifts is
 * still `leavesOn`.
 */
export function natureKind(stored: NatureKind | null | undefined): NatureKind {
  return AVAILABLE_NATURE.find((kind) => kind === stored) ?? "greenLeaves";
}
