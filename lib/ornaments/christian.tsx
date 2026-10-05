import { calligraphyAspect } from "@/lib/calligraphy";
import { calligraphyOrnament, imageOrnament } from "@/lib/ornaments/frame";
import type { Ornament } from "@/lib/ornaments/frame";
import type { ChristianOrnamentId } from "@/types/christianOrnament";

/**
 * The Christian ornament pack: nine pictures and six lines of calligraphy.
 *
 * Seven of the nine were line drawings in the card's accent: the cross, the
 * church arch, the wedding bells, the ring pair, the dove, the olive branch
 * and the chalice. They are pictures now, published to
 * public/decor/christian/ under the ids the drawings had: a card saved with
 * any of them loads as it always did and shows the picture. The open Bible
 * with the rings and the spray of lilies are new, and pictures from the start.
 *
 * EACH PICTURE HAS A PLACE, and is drawn there and nowhere else: see `slots`
 * on the Christian pack in lib/traditionPacks.tsx. The cross, the arch, the
 * Bible and the chalice stand above the names, one at a time; a pair of doves
 * flies in toward the names from either side; the lilies stand in the two
 * bottom corners; the bells and the rings hang from the top; the olive branch
 * is the rule between sections. None of them is ever scattered behind the
 * writing, where a painted thing is only a faded one, and the cross and the
 * chalice are never turned or mirrored.
 *
 * NO FIGURE IS DRAWN. No Christ, no saint, no human, no face. The cross is
 * empty: a crucifix carries a figure by definition, so it is not offered, and
 * this is a deliberate choice rather than a gap. The arch's glass is flowers
 * and tracery, and the Bible's pages are ruled, with no words on them.
 * Objects, architecture, plants and one bird only.
 *
 * THE DOVE HAS AN EYE NOW, which the drawing it replaces did not. That one
 * followed the birds in lib/motifs.tsx, outlines with no eye, on the grounds
 * that an eye is the first mark that turns a bird into a face. This is a
 * painting of a dove, supplied as it is, and a painted bird has one. It is a
 * bird's and nobody's face, but it is a change from the rule the drawing kept.
 */

/* ---------------------------------------------------------------------------
   The pictures
   --------------------------------------------------------------------------- */

/** The published files, and each one's width over its height. */
const PICTURES = {
  plainCross: { src: "/decor/christian/cross.webp", aspect: 468 / 640 },
  gothicArch: { src: "/decor/christian/church-arch.webp", aspect: 497 / 760 },
  weddingBells: { src: "/decor/christian/bells.webp", aspect: 611 / 640 },
  bibleRings: { src: "/decor/christian/bible-rings.webp", aspect: 720 / 435 },
  /* Turned over from the artwork, which was drawn for a top corner: this one grows up out of a bottom corner. */
  lilyCorner: { src: "/decor/christian/lily-corner.webp", aspect: 636 / 640 },
  ringPair: { src: "/decor/christian/ring-pair.webp", aspect: 600 / 481 },
  /* Turned from the artwork to fly to the left: the one on the right of the names, flying in. */
  dove: { src: "/decor/christian/dove.webp", aspect: 569 / 600 },
  oliveBranch: { src: "/decor/christian/olive-branch.webp", aspect: 760 / 284 },
  chalice: { src: "/decor/christian/chalice.webp", aspect: 635 / 640 },
} as const;

const PlainCross = imageOrnament(PICTURES.plainCross.src, PICTURES.plainCross.aspect);
const GothicArch = imageOrnament(PICTURES.gothicArch.src, PICTURES.gothicArch.aspect);
const WeddingBells = imageOrnament(PICTURES.weddingBells.src, PICTURES.weddingBells.aspect);
const BibleRings = imageOrnament(PICTURES.bibleRings.src, PICTURES.bibleRings.aspect);
const LilyCorner = imageOrnament(PICTURES.lilyCorner.src, PICTURES.lilyCorner.aspect);
const RingPair = imageOrnament(PICTURES.ringPair.src, PICTURES.ringPair.aspect);
const Dove = imageOrnament(PICTURES.dove.src, PICTURES.dove.aspect);
const OliveBranch = imageOrnament(PICTURES.oliveBranch.src, PICTURES.oliveBranch.aspect);
const Chalice = imageOrnament(PICTURES.chalice.src, PICTURES.chalice.aspect);

/* ---------------------------------------------------------------------------
   Calligraphy
   --------------------------------------------------------------------------- */

/**
 * The six English lines, from the shared factory in lib/ornaments/frame.tsx.
 * lib/calligraphy.ts holds their files and what each says.
 */
const GodIsLove = calligraphyOrnament("godIsLove");
const LoveNeverFails = calligraphyOrnament("loveNeverFails");
const TwoBecomeOne = calligraphyOrnament("twoBecomeOne");
const GodHasJoined = calligraphyOrnament("godHasJoined");
const HolyMatrimony = calligraphyOrnament("holyMatrimony");
const LoveIsPatient = calligraphyOrnament("loveIsPatient");

/* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- */

/** Each ornament's width over its height, from its published file. */
export const CHRISTIAN_ORNAMENT_ASPECT: Record<ChristianOrnamentId, number> = {
  plainCross: PICTURES.plainCross.aspect,
  dove: PICTURES.dove.aspect,
  weddingBells: PICTURES.weddingBells.aspect,
  oliveBranch: PICTURES.oliveBranch.aspect,
  chalice: PICTURES.chalice.aspect,
  gothicArch: PICTURES.gothicArch.aspect,
  ringPair: PICTURES.ringPair.aspect,
  bibleRings: PICTURES.bibleRings.aspect,
  lilyCorner: PICTURES.lilyCorner.aspect,
  /* Not viewBoxes: the published crop of each line's file. */
  godIsLove: calligraphyAspect("godIsLove"),
  loveNeverFails: calligraphyAspect("loveNeverFails"),
  twoBecomeOne: calligraphyAspect("twoBecomeOne"),
  godHasJoined: calligraphyAspect("godHasJoined"),
  holyMatrimony: calligraphyAspect("holyMatrimony"),
  loveIsPatient: calligraphyAspect("loveIsPatient"),
};

/** One ornament offered in the editor. The same shape as HinduOrnamentEntry. */
export interface ChristianOrnamentEntry {
  id: ChristianOrnamentId;
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
  /** How tall it stands beside the names, in card px, in place of the usual 112. */
  sideHeight?: number;
}

/**
 * The pack, in the order the editor lays out its chips.
 *
 * The two that hang lead the list, as the Muslim pack's do, because the muted
 * line under the grid tells the host that bells and rings hang from the top of
 * the card and that is easier to believe when they are read first. The
 * pictures with places are grouped by place in the panel, whatever their
 * order here; the calligraphy comes last and has a group of its own.
 */
export const CHRISTIAN_ORNAMENTS: readonly ChristianOrnamentEntry[] = [
  {
    id: "weddingBells",
    label: "Wedding bells",
    Component: WeddingBells,
    chipSize: 44,
    topRegionOnly: false,
    src: PICTURES.weddingBells.src,
  },
  {
    id: "ringPair",
    label: "Ring pair",
    Component: RingPair,
    chipSize: 52,
    topRegionOnly: false,
    src: PICTURES.ringPair.src,
  },
  {
    id: "plainCross",
    label: "Cross",
    Component: PlainCross,
    chipSize: 44,
    topRegionOnly: true,
    src: PICTURES.plainCross.src,
    uprightOnly: true,
    aboveNamesHeight: 92,
  },
  {
    id: "gothicArch",
    label: "Church arch",
    Component: GothicArch,
    chipSize: 46,
    topRegionOnly: true,
    src: PICTURES.gothicArch.src,
    uprightOnly: true,
    /* A window full of tracery: at 60px it is a smudge. */
    aboveNamesHeight: 136,
  },
  {
    id: "bibleRings",
    label: "Bible and rings",
    Component: BibleRings,
    chipSize: 60,
    topRegionOnly: true,
    src: PICTURES.bibleRings.src,
    uprightOnly: true,
    aboveNamesHeight: 84,
  },
  {
    id: "lilyCorner",
    label: "Lily corner",
    Component: LilyCorner,
    chipSize: 44,
    topRegionOnly: false,
    src: PICTURES.lilyCorner.src,
    cornerHeight: 112,
  },
  {
    id: "chalice",
    label: "Chalice",
    Component: Chalice,
    chipSize: 44,
    topRegionOnly: true,
    src: PICTURES.chalice.src,
    uprightOnly: true,
    aboveNamesHeight: 96,
  },
  {
    id: "dove",
    label: "Doves",
    Component: Dove,
    chipSize: 44,
    topRegionOnly: false,
    src: PICTURES.dove.src,
    /* Almost square, where the flag this place was made for is a tall sliver: at its height two doves would leave the names no room. */
    sideHeight: 58,
  },
  {
    id: "oliveBranch",
    label: "Olive branch",
    Component: OliveBranch,
    chipSize: 80,
    topRegionOnly: false,
    src: PICTURES.oliveBranch.src,
  },
  { id: "godIsLove", label: "God is Love", Component: GodIsLove, chipSize: 120, topRegionOnly: true },
  {
    id: "loveNeverFails",
    label: "Love Never Fails",
    Component: LoveNeverFails,
    chipSize: 120,
    topRegionOnly: true,
  },
  {
    id: "twoBecomeOne",
    label: "Two Shall Become One",
    Component: TwoBecomeOne,
    chipSize: 120,
    topRegionOnly: true,
  },
  {
    id: "godHasJoined",
    label: "What God Has Joined Together",
    Component: GodHasJoined,
    chipSize: 120,
    topRegionOnly: true,
  },
  {
    id: "holyMatrimony",
    label: "Holy Matrimony",
    Component: HolyMatrimony,
    chipSize: 120,
    topRegionOnly: true,
  },
  {
    id: "loveIsPatient",
    label: "Love is Patient, Love is Kind",
    Component: LoveIsPatient,
    chipSize: 120,
    topRegionOnly: true,
  },
];

/** Sits under the ornament grid in the editor. */
export const CHRISTIAN_ORNAMENTS_NOTE =
  "Bells and rings hang from the top of your card. The olive branch is drawn between its sections when Section dividers is set to None.";
