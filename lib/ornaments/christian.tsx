import { Frame, leafPath, r2 } from "@/lib/ornaments/frame";
import type { Ornament } from "@/lib/ornaments/frame";
import type { ChristianOrnamentId } from "@/types/christianOrnament";

/**
 * Hand drawn Christian ornament pack.
 *
 * Same rules as every other pack: stroke based line art in `currentColor`, each
 * shape carrying a second layer of drawing beyond the silhouette, because at
 * 64px a bare outline reads as one blown-up icon rather than as ornament.
 * Nothing here is filled.
 *
 * NO FIGURE IS DRAWN — no Christ, no saint, no human, no face. The cross is
 * plain and empty: a crucifix carries a figure by definition, so it is not
 * offered, and this is a deliberate choice rather than a gap. Objects,
 * architecture, plants and birds only.
 *
 * The dove follows the treatment already used for birds in lib/motifs.tsx: an
 * outline with no eye. An eye is the first mark that turns a bird into a face.
 */

/* ---------------------------------------------------------------------------
   Plain cross
   --------------------------------------------------------------------------- */

/** Latin cross, empty, with a bevel line down each limb. */
export const PlainCross: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 48 64"
    aspect={CHRISTIAN_ORNAMENT_ASPECT.plainCross}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* One continuous outline, so all twelve corners are real mitred joins. */}
    <path d="M 19 4 H 29 V 20 H 44 V 30 H 29 V 60 H 19 V 30 H 4 V 20 H 19 Z" />

    {/* Inner bevel, held clear of the outline all the way round. */}
    <path d="M 22 8 H 26 V 23 H 41 V 27 H 26 V 56 H 22 V 27 H 7 V 23 H 22 Z" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Dove
   --------------------------------------------------------------------------- */

/**
 * Descending dove, wings spread.
 *
 * NO EYE, matching the birds in lib/motifs.tsx. The head reads from the beak
 * and the curve of the crown alone.
 */
export const Dove: Ornament = ({
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
   Wedding bells
   --------------------------------------------------------------------------- */

/** Two bells on a shared bow, the pair that hangs at the head of the card. */
export const WeddingBells: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 72 80"
    aspect={CHRISTIAN_ORNAMENT_ASPECT.weddingBells}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Bow the pair hangs from. */}
    <path d="M 36 6 C 30 1.6 23.6 3.6 24.6 8.6 C 25.4 12.4 32 13.4 36 10" />
    <path d="M 36 6 C 42 1.6 48.4 3.6 47.4 8.6 C 46.6 12.4 40 13.4 36 10" />
    <circle cx={36} cy={9.6} r={2} />

    {/* Left bell: crown, flared body, lip and clapper. */}
    <path d="M 36 12 L 23 20" />
    <circle cx={22.6} cy={22.6} r={2.4} />
    <path d="M 22.6 25 C 14 29.6 9.6 40 9 52" />
    <path d="M 22.6 25 C 31.2 29.6 35.6 40 36.2 52" />
    <path d="M 7 52 C 15.4 57.4 29.8 57.4 38.2 52" />
    <path d="M 22.6 57.6 V 62" />
    <circle cx={22.6} cy={64.4} r={2.4} />

    {/* Right bell, hung shorter so the pair does not read as one shape. */}
    <path d="M 36 12 L 49 22" />
    <circle cx={49.4} cy={24.4} r={2.2} />
    <path d="M 49.4 26.6 C 42.6 30.4 39.2 38.6 38.8 48" />
    <path d="M 49.4 26.6 C 56.2 30.4 59.6 38.6 60 48" />
    <path d="M 37.2 48 C 43.8 52.2 55 52.2 61.6 48" />
    <path d="M 49.4 52.8 V 56.4" />
    <circle cx={49.4} cy={58.4} r={2.2} />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Olive branch
   --------------------------------------------------------------------------- */

/** A stem of paired leaves with three olives. */
export const OliveBranch: Ornament = ({
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
export const Chalice: Ornament = ({
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
   Gothic arch
   --------------------------------------------------------------------------- */

/** A pointed arch with tracery, open at the foot so content sits inside it. */
export const GothicArch: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 100 140"
    aspect={CHRISTIAN_ORNAMENT_ASPECT.gothicArch}
    size={size}
    strokeWidth={strokeWidth ?? 2}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Outer order: two struck curves meeting in a point. */}
    <path d="M 8 138 V 62 C 8 34 28 12 50 6 C 72 12 92 34 92 62 V 138" />

    {/* Inner order, held parallel. */}
    <path d="M 18 138 V 66 C 18 44 33 26 50 20 C 67 26 82 44 82 66 V 138" />

    {/* Tracery: two lancets under a quatrefoil-ish rosette. */}
    <path d="M 44 138 V 84 C 44 74 39.4 66 32.6 62" />
    <path d="M 56 138 V 84 C 56 74 60.6 66 67.4 62" />
    <circle cx={50} cy={62} r={9} />
    <circle cx={50} cy={62} r={4.4} />

    {/* Springline imposts. */}
    <path d="M 8 66 H 18 M 82 66 H 92" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Ring pair
   --------------------------------------------------------------------------- */

/** Two interlocking bands, the second thing that hangs in this pack. */
export const RingPair: Ornament = ({
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
   Registry
   --------------------------------------------------------------------------- */

/** Each drawing's width over its height, from its own viewBox. */
export const CHRISTIAN_ORNAMENT_ASPECT: Record<ChristianOrnamentId, number> = {
  plainCross: 48 / 64,
  dove: 72 / 56,
  weddingBells: 72 / 80,
  oliveBranch: 120 / 44,
  chalice: 64 / 80,
  gothicArch: 100 / 140,
  ringPair: 84 / 56,
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
}

/**
 * The pack, in the order the editor lays out its chips.
 *
 * The two that hang lead the list, as the Muslim pack's do, because the muted
 * line under the grid tells the host that bells and rings hang from the top of
 * the card and that is easier to believe when they are read first.
 */
export const CHRISTIAN_ORNAMENTS: readonly ChristianOrnamentEntry[] = [
  {
    id: "weddingBells",
    label: "Wedding bells",
    Component: WeddingBells,
    chipSize: 40,
    topRegionOnly: false,
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
    chipSize: 38,
    topRegionOnly: false,
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
  {
    id: "gothicArch",
    label: "Gothic arch",
    Component: GothicArch,
    chipSize: 40,
    topRegionOnly: false,
  },
];

/** Sits under the ornament grid in the editor. */
export const CHRISTIAN_ORNAMENTS_NOTE =
  "Bells and rings hang from the top of your card.";

const BY_ID: Record<ChristianOrnamentId, Ornament> = {
  plainCross: PlainCross,
  dove: Dove,
  weddingBells: WeddingBells,
  oliveBranch: OliveBranch,
  chalice: Chalice,
  gothicArch: GothicArch,
  ringPair: RingPair,
};

export function getChristianOrnament(id: ChristianOrnamentId): Ornament {
  return BY_ID[id];
}
