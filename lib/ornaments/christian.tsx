import { calligraphyAspect } from "@/lib/calligraphy";
import { Frame, calligraphyOrnament, imageOrnament, leafPath } from "@/lib/ornaments/frame";
import type { Ornament } from "@/lib/ornaments/frame";
import type { ChristianOrnamentId } from "@/types/christianOrnament";

/**
 * The Christian ornament pack: five pictures, four drawings and six lines of
 * calligraphy.
 *
 * The cross, the church arch and the wedding bells were line drawings in the
 * card's accent. They are pictures now, published to public/decor/christian/
 * under the ids the drawings had: a card saved with any of them loads as it
 * always did and shows the picture. The open Bible with the rings and the
 * spray of lilies are new, and pictures from the start.
 *
 * EACH PICTURE HAS A PLACE, and is drawn there and nowhere else: see `slots`
 * on the Christian pack in lib/traditionPacks.tsx. The cross, the arch and the
 * Bible stand above the names, one at a time; the lilies stand in the two
 * bottom corners; the bells hang from the top. None of them is ever scattered
 * behind the writing, and the cross is never turned or mirrored.
 *
 * The ring pair, the dove, the olive branch and the chalice are still the
 * drawings they were: stroke based line art in `currentColor`, each carrying a
 * second layer of drawing beyond the silhouette.
 *
 * NO FIGURE IS DRAWN. No Christ, no saint, no human, no face. The cross is
 * empty: a crucifix carries a figure by definition, so it is not offered, and
 * this is a deliberate choice rather than a gap. The arch's glass is flowers
 * and tracery, and the Bible's pages are ruled, with no words on them.
 * Objects, architecture, plants and birds only.
 *
 * The dove follows the treatment already used for birds in lib/motifs.tsx: an
 * outline with no eye. An eye is the first mark that turns a bird into a face.
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
} as const;

const PlainCross = imageOrnament(PICTURES.plainCross.src, PICTURES.plainCross.aspect);
const GothicArch = imageOrnament(PICTURES.gothicArch.src, PICTURES.gothicArch.aspect);
const WeddingBells = imageOrnament(PICTURES.weddingBells.src, PICTURES.weddingBells.aspect);
const BibleRings = imageOrnament(PICTURES.bibleRings.src, PICTURES.bibleRings.aspect);
const LilyCorner = imageOrnament(PICTURES.lilyCorner.src, PICTURES.lilyCorner.aspect);

/* ---------------------------------------------------------------------------
   Dove
   --------------------------------------------------------------------------- */

/**
 * Descending dove, wings spread.
 *
 * NO EYE, matching the birds in lib/motifs.tsx. The head reads from the beak
 * and the curve of the crown alone.
 */
const Dove: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 72 56"
    aspect={CHRISTIAN_ORNAMENT_ASPECT.dove}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Body: breast, back and the swept tail. */}
    <path d="M 26 18 C 20 21 15 27 14 34 C 13.4 39 16.4 43 21.4 43.6 C 28 44.4 36 42 42 38" />
    <path d="M 42 38 L 58 45 L 54 36 L 66 33" />

    {/* Head and beak — no eye. */}
    <path d="M 26 18 C 27 12.6 32 9 37.4 9.6 C 42 10.2 45 13.6 45 17.6 C 45 21 43 23.6 40 24.6" />
    <path d="M 45 15.6 L 51.6 13.6 L 45.4 19.4" />

    {/* Upper wing, raised, with two flight feathers. */}
    <path d="M 34 22 C 30 12 20 5 9 4.6 C 14 13 20.6 19.6 30 24" />
    <path d="M 16 8.6 C 20.6 13.6 24.6 17.6 29 20.6" />
    <path d="M 23 7 C 25.6 12 28 16 31 19" />

    {/* Lower wing, folded across the body. */}
    <path d="M 30 27 C 25 31 22 36 21.4 41.6" />
    <path d="M 36 28.6 C 31.6 32.6 28.6 37 27.4 42" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Olive branch
   --------------------------------------------------------------------------- */

/** A stem of paired leaves with three olives. */
const OliveBranch: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 120 44"
    aspect={CHRISTIAN_ORNAMENT_ASPECT.oliveBranch}
    size={size}
    strokeWidth={strokeWidth ?? 1.3}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Stem, rising gently from the cut end to the tip. */}
    <path d="M 4 34 C 30 32 70 26 114 12" />

    {/* Leaves alternating above and below, shortening toward the tip. */}
    {[
      { x: 20, y: 33, tx: 12, ty: 20, s: 6 },
      { x: 34, y: 31.4, tx: 42, ty: 42, s: 6 },
      { x: 48, y: 29.4, tx: 40, ty: 17, s: 5.6 },
      { x: 62, y: 27, tx: 70, ty: 38.4, s: 5.6 },
      { x: 76, y: 23.6, tx: 68, ty: 12, s: 5.2 },
      { x: 90, y: 19.6, tx: 98, ty: 30.6, s: 5.2 },
      { x: 102, y: 15.6, tx: 96, ty: 5.6, s: 4.6 },
    ].map((leaf) => (
      <path
        key={`${leaf.x}-${leaf.tx}`}
        d={leafPath(leaf.x, leaf.y, leaf.tx, leaf.ty, leaf.s)}
      />
    ))}

    {/* Olives — the second layer that tells this branch from any other. */}
    <ellipse cx={28} cy={26.6} rx={3.2} ry={4} />
    <ellipse cx={56} cy={35.4} rx={3} ry={3.8} />
    <ellipse cx={84} cy={14.6} rx={3} ry={3.8} />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Chalice
   --------------------------------------------------------------------------- */

/** Cup, knop, stem and foot, with a band round the bowl. */
const Chalice: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 80"
    aspect={CHRISTIAN_ORNAMENT_ASPECT.chalice}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Rim and bowl. */}
    <ellipse cx={32} cy={14} rx={19} ry={4.6} />
    <path d="M 13 14 C 13.6 30 20.6 41 32 43.4 C 43.4 41 50.4 30 51 14" />

    {/* Band round the bowl — the second layer. */}
    <path d="M 15.6 26.6 C 22 30.6 42 30.6 48.4 26.6" />
    <path d="M 17.6 32.4 C 23.4 36 40.6 36 46.4 32.4" />

    {/* Stem with a knop, and the spread foot. */}
    <path d="M 32 43.4 V 50" />
    <ellipse cx={32} cy={52.6} rx={5} ry={3} />
    <path d="M 32 55.6 V 62" />
    <path d="M 32 62 C 24 63.4 18 67.4 16.6 72.6 H 47.4 C 46 67.4 40 63.4 32 62 Z" />
    <path d="M 14.6 72.6 H 49.4" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Ring pair
   --------------------------------------------------------------------------- */

/** Two interlocking bands, the second thing that hangs in this pack. */
const RingPair: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 84 56"
    aspect={CHRISTIAN_ORNAMENT_ASPECT.ringPair}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Left band, drawn as two concentric circles so it reads as a band. */}
    <circle cx={31} cy={32} r={19} />
    <circle cx={31} cy={32} r={15} />

    {/* Right band, overlapping. */}
    <circle cx={55} cy={32} r={19} />
    <circle cx={55} cy={32} r={15} />

    {/* A small stone on the left band, so the pair is not two plain circles. */}
    <path d="M 27.4 11.6 L 31 6.6 L 34.6 11.6 L 31 15.4 Z" />
    <path d="M 27.4 11.6 H 34.6" />
  </Frame>
);

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

/** Each ornament's width over its height: a picture's file, a drawing's viewBox. */
export const CHRISTIAN_ORNAMENT_ASPECT: Record<ChristianOrnamentId, number> = {
  plainCross: PICTURES.plainCross.aspect,
  dove: 72 / 56,
  weddingBells: PICTURES.weddingBells.aspect,
  oliveBranch: 120 / 44,
  chalice: 64 / 80,
  gothicArch: PICTURES.gothicArch.aspect,
  ringPair: 84 / 56,
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
  /** The published file, for the card to preload. Absent for a drawing. */
  src?: string;
  /** Never mirrored and never turned: an emblem, not a pattern. */
  uprightOnly?: boolean;
  /** How tall it stands above the names, in card px, where the usual 60 is too small to read. */
  aboveNamesHeight?: number;
  /** How tall it stands in a bottom corner, in card px, in place of the usual 64. */
  cornerHeight?: number;
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
    chipSize: 56,
    topRegionOnly: false,
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
  { id: "dove", label: "Dove", Component: Dove, chipSize: 52, topRegionOnly: false },
  {
    id: "oliveBranch",
    label: "Olive branch",
    Component: OliveBranch,
    chipSize: 80,
    topRegionOnly: false,
  },
  {
    id: "chalice",
    label: "Chalice",
    Component: Chalice,
    chipSize: 40,
    topRegionOnly: false,
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
  "Bells and rings hang from the top of your card.";
