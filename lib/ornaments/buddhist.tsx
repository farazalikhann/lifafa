import {
  Frame,
  cordPath,
  flowerPath,
  leafPath,
  pointOnCord,
  r2,
} from "@/lib/ornaments/frame";
import type { Ornament } from "@/lib/ornaments/frame";
import type { BuddhistOrnamentId } from "@/types/buddhistOrnament";

/**
 * Hand drawn Buddhist ornament pack.
 *
 * Same rules as every other pack: stroke based line art in `currentColor`, each
 * shape carrying a second layer of drawing beyond the silhouette. Nothing here
 * is filled.
 *
 * THE BUDDHA IS NEVER DRAWN. Not a figure, not a seated silhouette, not a face,
 * not an outline of one, not a suggestion of one in a stupa's profile. Nor is
 * any monk, teacher or person. This pack is wheels, plants, knots, architecture
 * and objects, and that is not a limitation to be worked around by someone
 * adding an eighth ornament later.
 *
 * The stupa is ARCHITECTURE ONLY — a dome, a spire and a plinth. It carries no
 * eyes, which some stupas are painted with; a pair of eyes is a face.
 */

/* ---------------------------------------------------------------------------
   Dharma wheel
   --------------------------------------------------------------------------- */

/** Eight spokes, a hub, and a rim drawn as a band. */
export const DharmaWheel: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 64"
    aspect={BUDDHIST_ORNAMENT_ASPECT.dharmaWheel}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Rim as two circles, so it reads as a band rather than a hoop. */}
    <circle cx={32} cy={32} r={28} />
    <circle cx={32} cy={32} r={24} />

    {/* Hub. */}
    <circle cx={32} cy={32} r={6} />
    <circle cx={32} cy={32} r={2.4} />

    {/* Eight spokes, hub to rim. */}
    {Array.from({ length: 8 }, (_unused, index) => {
      const angle = (index * Math.PI) / 4 - Math.PI / 2;
      const x1 = r2(32 + 6 * Math.cos(angle));
      const y1 = r2(32 + 6 * Math.sin(angle));
      const x2 = r2(32 + 24 * Math.cos(angle));
      const y2 = r2(32 + 24 * Math.sin(angle));

      return <path key={index} d={`M ${x1} ${y1} L ${x2} ${y2}`} />;
    })}
  </Frame>
);

/* ---------------------------------------------------------------------------
   Lotus
   --------------------------------------------------------------------------- */

/**
 * A wide open bloom, flatter and more splayed than the Sikh and Jain lotuses —
 * the eight petal form, seen from above.
 */
export const Lotus: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 72 56"
    aspect={BUDDHIST_ORNAMENT_ASPECT.lotus}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Back row, splayed nearly flat. */}
    <path d={leafPath(36, 42, 4, 30, 8)} />
    <path d={leafPath(36, 42, 68, 30, 8)} />
    <path d={leafPath(36, 42, 13, 15, 8.6)} />
    <path d={leafPath(36, 42, 59, 15, 8.6)} />

    {/* Front row, standing more upright. */}
    <path d={leafPath(36, 42, 24, 8, 9)} />
    <path d={leafPath(36, 42, 48, 8, 9)} />
    <path d={leafPath(36, 42, 36, 4, 9.6)} />

    {/* Rib in the centre petal, and the cup at the foot — the second layer. */}
    <path d="M 36 38 V 12" />
    <path d="M 22.6 40 C 27.4 47.4 44.6 47.4 49.4 40" />
    <path d="M 28 44.6 C 31.4 48 40.6 48 44 44.6" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Bodhi leaf
   --------------------------------------------------------------------------- */

/** The heart-shaped leaf with its long drip tip, veined. */
export const BodhiLeaf: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 56 72"
    aspect={BUDDHIST_ORNAMENT_ASPECT.bodhiLeaf}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Blade: broad shoulders, drawn down to a long point. */}
    <path d="M 28 8 C 16 10 6 19 6 29.6 C 6 39 13 46 22 49.6 C 25.4 51 27 54 28 58 C 29 54 30.6 51 34 49.6 C 43 46 50 39 50 29.6 C 50 19 40 10 28 8 Z" />

    {/* Midrib carried into the drip tip. */}
    <path d="M 28 12 V 58" />
    <path d="M 28 58 C 28.6 62.6 29.6 65.6 31.4 68.4" />

    {/* Lateral veins, three a side. */}
    <path d="M 28 22 C 22 24 17.4 27.4 14.6 32" />
    <path d="M 28 30.6 C 23 32.6 19.4 36 17.4 40.6" />
    <path d="M 28 39 C 25 40.6 22.6 43 21 46" />
    <path d="M 28 22 C 34 24 38.6 27.4 41.4 32" />
    <path d="M 28 30.6 C 33 32.6 36.6 36 38.6 40.6" />
    <path d="M 28 39 C 31 40.6 33.4 43 35 46" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Endless knot
   --------------------------------------------------------------------------- */

/**
 * The endless knot, drawn as an interlace on a square grid.
 *
 * Authored as literal path data rather than generated: the crossings have to
 * land on each other exactly, and a loop over a stride does not guarantee that.
 * Broken lines at the crossings are what make it read as over-and-under rather
 * than as a flat grid.
 */
export const EndlessKnot: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 64"
    aspect={BUDDHIST_ORNAMENT_ASPECT.endlessKnot}
    size={size}
    strokeWidth={strokeWidth ?? 1.6}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/*
      Four corner returns, each carrying a strand from a vertical end round to a
      horizontal one, so the whole figure is a single closed path with no ends.
    */}
    <path d="M 24 12 A 12 12 0 0 0 12 24" />
    <path d="M 40 12 A 12 12 0 0 1 52 24" />
    <path d="M 24 52 A 12 12 0 0 1 12 40" />
    <path d="M 40 52 A 12 12 0 0 0 52 40" />

    {/*
      The weave. Four strands crossing at four points, each broken where it
      passes UNDER the other — the gaps are the whole reason this reads as an
      interlace rather than as a grid, so do not close them up.

      Verticals pass over at the top-left and bottom-right crossings, the
      horizontals over at the other two, which is what makes the alternation
      consistent all the way round.
    */}
    <path d="M 24 12 V 37" />
    <path d="M 24 43 V 52" />
    <path d="M 40 12 V 21" />
    <path d="M 40 27 V 52" />
    <path d="M 12 24 H 21" />
    <path d="M 27 24 H 52" />
    <path d="M 12 40 H 37" />
    <path d="M 43 40 H 52" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Stupa
   --------------------------------------------------------------------------- */

/**
 * Dome, spire and plinth. ARCHITECTURE ONLY — no eyes, no face, no figure in
 * any niche. See the file header.
 */
export const StupaOutline: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 96"
    aspect={BUDDHIST_ORNAMENT_ASPECT.stupaOutline}
    size={size}
    strokeWidth={strokeWidth ?? 1.6}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Finial: a drop above a crescent above the spire. */}
    <circle cx={32} cy={5} r={2.4} />
    <path d="M 26.6 11.4 C 29 15 35 15 37.4 11.4" />

    {/* Spire: a stepped cone of thirteen rings, drawn as five for legibility. */}
    <path d="M 28.6 16 H 35.4 M 27.4 20.6 H 36.6 M 26.2 25.2 H 37.8 M 25 29.8 H 39 M 23.8 34.4 H 40.2" />
    <path d="M 29.4 16 L 24.6 34.4 M 34.6 16 L 39.4 34.4" />

    {/* Harmika, the square rail the spire stands on. */}
    <path d="M 22.6 34.4 H 41.4 V 42 H 22.6 Z" />
    <path d="M 27 34.4 V 42 M 32 34.4 V 42 M 37 34.4 V 42" />

    {/* Dome. */}
    <path d="M 10 68 C 10 52.6 19.8 42 32 42 C 44.2 42 54 52.6 54 68" />
    {/* Band round the dome — the second layer. */}
    <path d="M 13.4 57.6 C 20.6 53.4 43.4 53.4 50.6 57.6" />

    {/* Plinth, two courses. */}
    <path d="M 8 68 H 56 V 78 H 8 Z" />
    <path d="M 4 78 H 60 V 90 H 4 Z" />
    <path d="M 4 90 H 60" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Prayer flag string
   --------------------------------------------------------------------------- */

const FLAG_CORD_START: readonly [number, number] = [4, 6];
const FLAG_CORD_CONTROL: readonly [number, number] = [80, 26];
const FLAG_CORD_END: readonly [number, number] = [156, 6];

/** Where the flags are tied. Fixed — never generated. */
const FLAG_STOPS: readonly number[] = [
  0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92,
];

/**
 * A line of square flags on a sagging cord.
 *
 * Each flag is a rectangle hanging from the cord with a fold line down it — the
 * detail that keeps eight of them from reading as a row of blank boxes. No
 * script is drawn on them: real prayer flags carry printed mantras, and putting
 * invented marks there would be inventing scripture in ornament form.
 */
export const PrayerFlagString: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 160 40"
    aspect={BUDDHIST_ORNAMENT_ASPECT.prayerFlagString}
    size={size}
    strokeWidth={strokeWidth ?? 1.3}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    <path d={cordPath(FLAG_CORD_START, FLAG_CORD_CONTROL, FLAG_CORD_END)} />

    {/* Hooks the line is tied off on. */}
    <circle cx={FLAG_CORD_START[0]} cy={FLAG_CORD_START[1]} r={1.8} />
    <circle cx={FLAG_CORD_END[0]} cy={FLAG_CORD_END[1]} r={1.8} />

    {FLAG_STOPS.map((t) => {
      const [x, y] = pointOnCord(
        FLAG_CORD_START,
        FLAG_CORD_CONTROL,
        FLAG_CORD_END,
        t,
      );
      const left = r2(x - 6);
      const right = r2(x + 6);
      const foot = r2(y + 14);

      return (
        <g key={t}>
          {/* The flag, with a slight lift at its outer bottom corner. */}
          <path
            d={`M ${left} ${r2(y)} V ${foot} Q ${x} ${r2(foot + 2)} ${right} ${r2(foot - 1)} V ${r2(y)}`}
          />
          {/* Fold down the middle. */}
          <path d={`M ${x} ${r2(y + 1)} V ${r2(foot + 0.6)}`} />
        </g>
      );
    })}
  </Frame>
);

/* ---------------------------------------------------------------------------
   Conch shell
   --------------------------------------------------------------------------- */

/** The right turning conch: a spiralled crown, a ribbed body and a flared lip. */
export const ConchShell: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 72"
    aspect={BUDDHIST_ORNAMENT_ASPECT.conchShell}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Body: swelling from the spire down to the flared aperture. */}
    <path d="M 30 10 C 20 18 14 30 14 42 C 14 54 20 63 30 66" />
    <path d="M 30 10 C 40 18 46 30 46 42 C 46 52 42 60 34 65" />

    {/* Flared lip at the mouth. */}
    <path d="M 30 66 C 38 68.6 46 66 50 60 C 44 60.6 38 60 34 57.4" />

    {/* Spire — three turns tightening to the apex. */}
    <path d="M 30 10 C 34.6 12.6 36 17.4 33.4 20.6 C 31.4 23 28 22.6 27 20" />
    <path d="M 27 20 C 26.2 17.4 28.6 15.4 31 16.4" />

    {/* Ribs across the body — the second layer. */}
    <path d="M 18.6 30 C 25 33.4 35.4 33.4 42.6 30" />
    <path d="M 15.4 42 C 23 46 37.6 46 45.4 42" />
    <path d="M 17.4 53 C 24 56.6 35.4 56.6 42.6 53" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- */

/** Each drawing's width over its height, from its own viewBox. */
export const BUDDHIST_ORNAMENT_ASPECT: Record<BuddhistOrnamentId, number> = {
  dharmaWheel: 1,
  lotus: 72 / 56,
  bodhiLeaf: 56 / 72,
  endlessKnot: 1,
  stupaOutline: 64 / 96,
  prayerFlagString: 160 / 40,
  conchShell: 64 / 72,
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
}

/**
 * The pack, in the order the editor lays out its chips.
 *
 * The two that hang lead the list, so the muted line under the grid is easier
 * to believe.
 */
export const BUDDHIST_ORNAMENTS: readonly BuddhistOrnamentEntry[] = [
  {
    id: "prayerFlagString",
    label: "Prayer flags",
    Component: PrayerFlagString,
    chipSize: 80,
    topRegionOnly: false,
  },
  {
    id: "lotus",
    label: "Lotus",
    Component: Lotus,
    chipSize: 50,
    topRegionOnly: false,
  },
  {
    id: "dharmaWheel",
    label: "Dharma wheel",
    Component: DharmaWheel,
    chipSize: 36,
    topRegionOnly: false,
  },
  {
    id: "bodhiLeaf",
    label: "Bodhi leaf",
    Component: BodhiLeaf,
    chipSize: 40,
    topRegionOnly: false,
  },
  {
    id: "endlessKnot",
    label: "Endless knot",
    Component: EndlessKnot,
    chipSize: 36,
    topRegionOnly: false,
  },
  {
    id: "stupaOutline",
    label: "Stupa",
    Component: StupaOutline,
    chipSize: 40,
    topRegionOnly: false,
  },
  {
    id: "conchShell",
    label: "Conch shell",
    Component: ConchShell,
    chipSize: 40,
    topRegionOnly: false,
  },
];

/** Sits under the ornament grid in the editor. */
export const BUDDHIST_ORNAMENTS_NOTE =
  "Prayer flags and lotuses hang from the top of your card.";

const BY_ID: Record<BuddhistOrnamentId, Ornament> = {
  dharmaWheel: DharmaWheel,
  lotus: Lotus,
  bodhiLeaf: BodhiLeaf,
  endlessKnot: EndlessKnot,
  stupaOutline: StupaOutline,
  prayerFlagString: PrayerFlagString,
  conchShell: ConchShell,
};

export function getBuddhistOrnament(id: BuddhistOrnamentId): Ornament {
  return BY_ID[id];
}
