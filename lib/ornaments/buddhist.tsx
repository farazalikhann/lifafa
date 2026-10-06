import { calligraphyAspect } from "@/lib/calligraphy";
import { calligraphyOrnament, imageOrnament } from "@/lib/ornaments/frame";
import type { Ornament } from "@/lib/ornaments/frame";
import type { BuddhistOrnamentId } from "@/types/buddhistOrnament";

/**
 * The Buddhist ornament pack: seven pictures and three lines of calligraphy.
 *
 * All seven were line drawings in the card's accent: the prayer flags, the
 * dharma wheel, the endless knot, the stupa, the lotus, the Bodhi leaf and the
 * conch. They are pictures now, under the ids the drawings had: a card saved
 * with any of them loads as it always did and shows the picture. Six are
 * published to public/decor/buddhist/; the lotus is the Jain pack's own file,
 * used from where it is rather than copied.
 *
 * EACH PICTURE HAS A PLACE, and is drawn there and nowhere else: see `slots`
 * on the Buddhist pack in lib/traditionPacks.tsx. The prayer flags hang across
 * the top of the card. The dharma wheel, the endless knot and the stupa are
 * emblems of the faith, not decoration to be sprinkled: they stand above the
 * names, one at a time, never mirrored and never turned (`uprightOnly`), and
 * none of them is ever scattered behind the writing, stood at the foot of the
 * card or put where petals fall over it. The lotus, the Bodhi leaf and the
 * conch stand in the bottom corners, two at a time.
 *
 * THE CONCH IS NEVER MIRRORED EITHER. It is the right-turning conch, and its
 * mirror image is the other one: alone in the corners it stands the same way
 * round in both.
 *
 * THE BUDDHA IS NEVER DRAWN. Not a figure, not a seated silhouette, not a face,
 * not an outline of one, not a suggestion of one in a stupa's profile. Nor is
 * any monk, teacher or person. This pack is wheels, plants, knots, architecture
 * and objects, and that is not a limitation to be worked around by someone
 * adding an eighth ornament later.
 *
 * The stupa is ARCHITECTURE ONLY — a dome, a spire and a plinth. It carries no
 * eyes, which some stupas are painted with; a pair of eyes is a face. The
 * niche in its dome holds a lotus bud, not a figure.
 *
 * NO SCRIPT IS PAINTED ON THE FLAGS. Real prayer flags carry printed mantras,
 * and marks invented to look like them would be invented scripture.
 *
 * No Devanagari is drawn by hand here. The greetings and blessings are text,
 * in lib/buddhistContent.ts, where they are reviewed and can be corrected. The
 * calligraphy is supplied artwork, read against its text before it was
 * published; see lib/calligraphy.ts.
 */

/* ---------------------------------------------------------------------------
   The pictures
   --------------------------------------------------------------------------- */

/** The published files, and each one's width over its height. */
const PICTURES = {
  prayerFlagString: { src: "/decor/buddhist/prayer-flags.webp", aspect: 1200 / 436 },
  dharmaWheel: { src: "/decor/buddhist/dharma-wheel.webp", aspect: 644 / 640 },
  endlessKnot: { src: "/decor/buddhist/endless-knot.webp", aspect: 580 / 640 },
  stupaOutline: { src: "/decor/buddhist/stupa.webp", aspect: 543 / 640 },
  /* The Jain pack's lotus: one file for both packs. */
  lotus: { src: "/decor/jain/lotus.webp", aspect: 680 / 617 },
  bodhiLeaf: { src: "/decor/buddhist/bodhi-leaf.webp", aspect: 490 / 640 },
  conchShell: { src: "/decor/buddhist/conch.webp", aspect: 680 / 587 },
} as const;

const PrayerFlagString = imageOrnament(
  PICTURES.prayerFlagString.src,
  PICTURES.prayerFlagString.aspect,
);
const DharmaWheel = imageOrnament(PICTURES.dharmaWheel.src, PICTURES.dharmaWheel.aspect);
const EndlessKnot = imageOrnament(PICTURES.endlessKnot.src, PICTURES.endlessKnot.aspect);
const Stupa = imageOrnament(PICTURES.stupaOutline.src, PICTURES.stupaOutline.aspect);
const Lotus = imageOrnament(PICTURES.lotus.src, PICTURES.lotus.aspect);
const BodhiLeaf = imageOrnament(PICTURES.bodhiLeaf.src, PICTURES.bodhiLeaf.aspect);
const ConchShell = imageOrnament(PICTURES.conchShell.src, PICTURES.conchShell.aspect);

/* ---------------------------------------------------------------------------
   Calligraphy
   --------------------------------------------------------------------------- */

/**
 * The three Devanagari lines, from the shared factory in lib/ornaments/frame.tsx.
 * lib/calligraphy.ts holds their files and what each says.
 */
const BuddhamSaranam = calligraphyOrnament("buddhistBuddhamSaranam");
const MangalParinay = calligraphyOrnament("buddhistMangalParinay");
const ShubhVivah = calligraphyOrnament("buddhistShubhVivah");

/* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- */

/** Each ornament's width over its height, from its published file. */
export const BUDDHIST_ORNAMENT_ASPECT: Record<BuddhistOrnamentId, number> = {
  dharmaWheel: PICTURES.dharmaWheel.aspect,
  lotus: PICTURES.lotus.aspect,
  bodhiLeaf: PICTURES.bodhiLeaf.aspect,
  endlessKnot: PICTURES.endlessKnot.aspect,
  stupaOutline: PICTURES.stupaOutline.aspect,
  prayerFlagString: PICTURES.prayerFlagString.aspect,
  conchShell: PICTURES.conchShell.aspect,
  /* Not viewBoxes: the published crop of each line's file. */
  buddhistBuddhamSaranam: calligraphyAspect("buddhistBuddhamSaranam"),
  buddhistMangalParinay: calligraphyAspect("buddhistMangalParinay"),
  buddhistShubhVivah: calligraphyAspect("buddhistShubhVivah"),
};

/** One ornament offered in the editor. The same shape as HinduOrnamentEntry. */
export interface BuddhistOrnamentEntry {
  id: BuddhistOrnamentId;
  /** Shown under the chip in the editor. Latin script only. */
  label: string;
  Component: Ornament;
  /** What `size` the editor's chip preview renders this at. */
  chipSize: number;
  /** Whether this ornament may only be placed in the card's top region. */
  topRegionOnly: boolean;
  /** The published file, for the card to preload. Absent for the calligraphy, which is a mask. */
  src?: string;
  /** Never mirrored and never turned: an emblem, not a pattern. */
  uprightOnly?: boolean;
  /** How tall it stands above the names, in card px, where the usual 60 is too small to read. */
  aboveNamesHeight?: number;
  /** How tall it stands in a bottom corner, in card px, in place of the usual 64. */
  cornerHeight?: number;
}

/**
 * The pack, in the order the editor lays out its chips. Every picture has a
 * place on the card (see `slots` on the Buddhist pack) and the editor groups
 * them by place, whatever their order here; the calligraphy comes last and has
 * a group of its own.
 */
export const BUDDHIST_ORNAMENTS: readonly BuddhistOrnamentEntry[] = [
  {
    id: "prayerFlagString",
    label: "Prayer flags",
    Component: PrayerFlagString,
    chipSize: 84,
    topRegionOnly: true,
    src: PICTURES.prayerFlagString.src,
  },
  {
    id: "dharmaWheel",
    label: "Dharma wheel",
    Component: DharmaWheel,
    chipSize: 42,
    topRegionOnly: true,
    src: PICTURES.dharmaWheel.src,
    uprightOnly: true,
    /* Eight spokes and a lotus at the hub: at 60px the hub is a dot. */
    aboveNamesHeight: 88,
  },
  {
    id: "endlessKnot",
    label: "Endless knot",
    Component: EndlessKnot,
    chipSize: 44,
    topRegionOnly: true,
    src: PICTURES.endlessKnot.src,
    uprightOnly: true,
    /* The weave has to read as over and under. */
    aboveNamesHeight: 92,
  },
  {
    id: "stupaOutline",
    label: "Stupa",
    Component: Stupa,
    chipSize: 44,
    topRegionOnly: true,
    src: PICTURES.stupaOutline.src,
    uprightOnly: true,
    /* Tall and tapering: the spire is a third of it. */
    aboveNamesHeight: 104,
  },
  {
    id: "lotus",
    label: "Lotus",
    Component: Lotus,
    chipSize: 46,
    topRegionOnly: false,
    src: PICTURES.lotus.src,
  },
  {
    id: "bodhiLeaf",
    label: "Bodhi leaf",
    Component: BodhiLeaf,
    chipSize: 44,
    topRegionOnly: false,
    src: PICTURES.bodhiLeaf.src,
    /* Narrower than it is tall: at the usual 64 it is thinner than the lotus beside it. */
    cornerHeight: 76,
  },
  {
    id: "conchShell",
    label: "Conch shell",
    Component: ConchShell,
    chipSize: 46,
    topRegionOnly: false,
    src: PICTURES.conchShell.src,
    /* The right-turning conch; see the file header. */
    uprightOnly: true,
    /* A third of its height is ribbon: at the usual 64 the shell itself is 40px. */
    cornerHeight: 76,
  },
  ...(
    [
      ["buddhistBuddhamSaranam", "Buddham Saranam Gacchami", BuddhamSaranam],
      ["buddhistMangalParinay", "Mangal Parinay", MangalParinay],
      ["buddhistShubhVivah", "Shubh Vivah", ShubhVivah],
    ] as const
  ).map(([id, label, Component]) => ({
    id,
    label,
    Component,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 120,
    topRegionOnly: true,
  })),
];

/** Sits under the ornament grid in the editor. */
export const BUDDHIST_ORNAMENTS_NOTE =
  "Each has its own place on your card. Tap one again to take it off.";
