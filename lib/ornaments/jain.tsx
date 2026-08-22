import { Frame, flowerPath, leafPath, pointOnCord, cordPath, r2 } from "@/lib/ornaments/frame";
import type { Ornament } from "@/lib/ornaments/frame";
import type { JainOrnamentId } from "@/types/jainOrnament";

/**
 * Hand drawn Jain ornament pack.
 *
 * Same rules as every other pack: stroke based line art in `currentColor`, each
 * shape carrying a second layer of drawing beyond the silhouette. Nothing here
 * is filled.
 *
 * NO FIGURE IS DRAWN. No Tirthankara, no human, no face, not even a stylised
 * one. The ahimsa hand is the conventional open palm bearing a wheel, which is
 * an emblem rather than a person: there is no arm, no wrist, no body and no
 * face, and it must stay that way.
 *
 * No Devanagari is drawn. Script belongs in lib/jainContent.ts, where it is
 * reviewed and can be corrected; a letterform baked into a path cannot.
 */

/* ---------------------------------------------------------------------------
   Ahimsa hand
   --------------------------------------------------------------------------- */

/**
 * The open palm with a wheel set in it.
 *
 * Drawn as the emblem is drawn: a symmetric palm shape cut off square at the
 * base, four fingers and a thumb of even length, and the wheel centred in it.
 * Deliberately not a hand study — no knuckles, no nails, no wrist, nothing that
 * would start it reading as part of a person.
 */
export const AhimsaHand: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 80"
    aspect={JAIN_ORNAMENT_ASPECT.ahimsaHand}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/*
      Palm: sides and a rounded foot, with a knuckle line across the top that
      the fingers stand on. Drawn as separate pieces rather than one silhouette
      so each finger reads at 40px instead of merging into a mitten.
    */}
    <path d="M 15 40 V 68 Q 15 74 21 74 H 45 Q 51 74 51 68 V 40" />
    <path d="M 15 40 H 51" />

    {/*
      Four fingers of uneven length, open at the foot so the knuckle line above
      shows through. Each is two uprights closed by a half-round tip.
    */}
    {[
      { cx: 21.5, tip: 20 },
      { cx: 29.5, tip: 14 },
      { cx: 37.5, tip: 17 },
      { cx: 45, tip: 25 },
    ].map((finger) => {
      const half = 3.4;
      const top = finger.tip + half;

      return (
        <path
          key={finger.cx}
          d={`M ${r2(finger.cx - half)} 40 V ${r2(top)} A ${half} ${half} 0 0 1 ${r2(finger.cx + half)} ${r2(top)} V 40`}
        />
      );
    })}

    {/* Thumb, swung out from the heel of the palm. */}
    <path d="M 15 46 C 9.4 44.6 5.6 40 6.6 35.4 C 7.4 31.8 11 31 13.4 33.6 C 15.4 35.8 15.4 39.4 15 42.6" />

    {/* The wheel in the palm — rim, hub and six spokes. */}
    <circle cx={33} cy={50} r={12.4} />
    <circle cx={33} cy={50} r={3.4} />
    {Array.from({ length: 6 }, (_unused, index) => {
      const angle = (index * Math.PI) / 3 - Math.PI / 2;
      const x1 = r2(33 + 3.4 * Math.cos(angle));
      const y1 = r2(50 + 3.4 * Math.sin(angle));
      const x2 = r2(33 + 12.4 * Math.cos(angle));
      const y2 = r2(50 + 12.4 * Math.sin(angle));

      return <path key={index} d={`M ${x1} ${y1} L ${x2} ${y2}`} />;
    })}
  </Frame>
);

/* ---------------------------------------------------------------------------
   Swastika
   --------------------------------------------------------------------------- */

/**
 * The four armed symbol, upright, arms bending clockwise, with a dot in each
 * quadrant.
 *
 * THAT HANDEDNESS IS THE WHOLE POINT AND MUST NOT BE FLIPPED, and it must not
 * be tilted to 45 degrees either. Mirroring or rotating this path produces a
 * different symbol carrying a meaning nobody wants on an invitation. Any
 * animation or layout that might rotate an ornament has to leave this one
 * alone. The same rule and the same construction as the Hindu pack's swastik.
 *
 * Authored as two continuous strokes rather than six segments, so the four
 * corners are real mitred joins instead of butted line ends.
 */
export const Swastika: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 64"
    aspect={JAIN_ORNAMENT_ASPECT.swastika}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Top bend, down the upright, bottom bend. */}
    <path d="M 46 8 H 32 V 56 H 18" />
    {/* Left bend, across the crossbar, right bend. */}
    <path d="M 8 18 V 32 H 56 V 46" />

    {/* The four quadrant dots. */}
    <circle cx={44} cy={20} r={2.4} />
    <circle cx={44} cy={44} r={2.4} />
    <circle cx={20} cy={44} r={2.4} />
    <circle cx={20} cy={20} r={2.4} />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Lotus
   --------------------------------------------------------------------------- */

/** A tighter, more upright bloom than the Sikh pack's, on a stem. */
export const Lotus: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 64"
    aspect={JAIN_ORNAMENT_ASPECT.lotus}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Five upright petals, the middle one tallest. */}
    <path d={leafPath(32, 46, 32, 8, 12)} />
    <path d={leafPath(32, 46, 17.6, 15.6, 11)} />
    <path d={leafPath(32, 46, 46.4, 15.6, 11)} />
    <path d={leafPath(32, 46, 8, 28, 9.6)} />
    <path d={leafPath(32, 46, 56, 28, 9.6)} />

    {/* Rib inside the centre petal — the second layer. */}
    <path d="M 32 42 V 16" />

    {/* Calyx and stem. */}
    <path d="M 24 45 C 27.4 49.6 36.6 49.6 40 45" />
    <path d="M 32 48.4 V 58" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Siddhashila
   --------------------------------------------------------------------------- */

/**
 * The stepped emblem at the head of the Jain symbol: an upturned crescent under
 * a dot, standing on a stepped base, with three dots above the crescent.
 */
export const SiddhaShila: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 80 64"
    aspect={JAIN_ORNAMENT_ASPECT.siddhaShila}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* The dot at the top, and the three dots beneath it. */}
    <circle cx={40} cy={7} r={2.6} />
    <circle cx={29} cy={19.6} r={2.2} />
    <circle cx={40} cy={17.4} r={2.2} />
    <circle cx={51} cy={19.6} r={2.2} />

    {/* Crescent, opening upward, drawn as two arcs so it has thickness. */}
    <path d="M 20 26 C 24 34.6 56 34.6 60 26" />
    <path d="M 24.6 26.6 C 28.6 32 51.4 32 55.4 26.6" />

    {/* Stepped base: three courses, each wider than the one above. */}
    <path d="M 26 38 H 54 V 44 H 26 Z" />
    <path d="M 20 44 H 60 V 50 H 20 Z" />
    <path d="M 13 50 H 67 V 57 H 13 Z" />

    {/* Ground line, so the steps stand on something. */}
    <path d="M 9 57 H 71" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Kalash
   --------------------------------------------------------------------------- */

/**
 * The pot, with a coconut and a fan of mango leaves at its mouth.
 *
 * Drawn again here rather than imported from the Hindu pack: the two
 * traditions' kalash differ, this one is squatter with a plainer band, and a
 * pack that borrows another's shapes stops being a pack. The fan is kept flat
 * for the same reason it is flat there — steeper leaves close over the coconut
 * and the whole ornament turns into a lotus in a pot.
 */
export const Kalash: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 80"
    aspect={JAIN_ORNAMENT_ASPECT.kalash}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Leaves first, so the coconut and the mouth sit in front of them. */}
    <path d={leafPath(26.6, 31, 5.6, 23, 8.6)} />
    <path d={leafPath(29.4, 31, 17, 14.6, 7.6)} />
    <path d={leafPath(34.6, 31, 47, 14.6, 7.6)} />
    <path d={leafPath(37.4, 31, 58.4, 23, 8.6)} />

    {/* Coconut and its seam. */}
    <ellipse cx={32} cy={19.6} rx={7.6} ry={7.2} />
    <path d="M 25.4 18.4 Q 32 23 38.6 18.4" />

    {/* Mouth. */}
    <ellipse cx={32} cy={31.4} rx={10} ry={2.6} />

    {/* Squat body — wide shoulders, short taper to a flat foot. */}
    <path d="M 22 31.4 C 20.6 36.4 9.4 40.6 9.4 51.4 C 9.4 61 17.6 68.4 24 69.6" />
    <path d="M 42 31.4 C 43.4 36.4 54.6 40.6 54.6 51.4 C 54.6 61 46.4 68.4 40 69.6" />

    {/* Single band across the belly, plainer than the Hindu pot's pair. */}
    <path d="M 10.6 48.6 C 18.6 51.4 45.4 51.4 53.4 48.6" />

    {/* Plinth. */}
    <path d="M 24 69.6 L 22 74.6 H 42 L 40 69.6" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Toran gate
   --------------------------------------------------------------------------- */

const TORAN_CORD_START: readonly [number, number] = [6, 8];
const TORAN_CORD_CONTROL: readonly [number, number] = [80, 22];
const TORAN_CORD_END: readonly [number, number] = [154, 8];

/** Where the leaves are tied on. Fixed — never generated. */
const TORAN_LEAF_STOPS: readonly number[] = [
  0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82,
];

/**
 * A doorway garland: two posts, a swagged cord between them and a hem of
 * alternating leaves.
 */
export const TornGate: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 160 48"
    aspect={JAIN_ORNAMENT_ASPECT.tornGate}
    size={size}
    strokeWidth={strokeWidth ?? 1.3}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Posts the gate hangs between. */}
    <path d="M 6 4 V 24 M 154 4 V 24" />
    <path d="M 2.6 4 H 9.4 M 150.6 4 H 157.4" />

    {/* Cord. */}
    <path d={cordPath(TORAN_CORD_START, TORAN_CORD_CONTROL, TORAN_CORD_END)} />

    {TORAN_LEAF_STOPS.map((t, index) => {
      const [x, y] = pointOnCord(
        TORAN_CORD_START,
        TORAN_CORD_CONTROL,
        TORAN_CORD_END,
        t,
      );
      /* Alternating lengths give the hem a scallop rather than a comb edge. */
      const isLong = index % 2 === 0;

      return (
        <path
          key={t}
          d={leafPath(x, y, x, r2(y + (isLong ? 20 : 13)), isLong ? 5 : 3.6)}
        />
      );
    })}

    {/* A bloom at the centre of the swag — the second layer. */}
    <path d={flowerPath(80, 22, 4.4, 6, 0.56)} />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- */

/** Each drawing's width over its height, from its own viewBox. */
export const JAIN_ORNAMENT_ASPECT: Record<JainOrnamentId, number> = {
  ahimsaHand: 64 / 80,
  swastika: 1,
  lotus: 1,
  siddhaShila: 80 / 64,
  kalash: 64 / 80,
  tornGate: 160 / 48,
};

/** One ornament offered in the editor. The same shape as HinduOrnamentEntry. */
export interface JainOrnamentEntry {
  id: JainOrnamentId;
  /** Shown under the chip in the editor. Latin script only. */
  label: string;
  Component: Ornament;
  /** What `size` the editor's chip preview renders this at. */
  chipSize: number;
  /** Whether this ornament may only be placed in the card's top region. */
  topRegionOnly: boolean;
  /** Never rotate or tilt this shape. See the note on the swastika. */
  uprightOnly?: boolean;
}

/**
 * The pack, in the order the editor lays out its chips.
 *
 * The two that hang lead the list, so the muted line under the grid is easier
 * to believe.
 */
export const JAIN_ORNAMENTS: readonly JainOrnamentEntry[] = [
  {
    id: "tornGate",
    label: "Toran gate",
    Component: TornGate,
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "kalash",
    label: "Kalash",
    Component: Kalash,
    chipSize: 40,
    topRegionOnly: false,
  },
  {
    id: "ahimsaHand",
    label: "Ahimsa hand",
    Component: AhimsaHand,
    chipSize: 40,
    topRegionOnly: false,
  },
  {
    id: "swastika",
    label: "Swastika",
    Component: Swastika,
    chipSize: 36,
    topRegionOnly: false,
    /* Upright and clockwise or it is not this symbol — see the note on Swastika. */
    uprightOnly: true,
  },
  {
    id: "siddhaShila",
    label: "Siddhashila",
    Component: SiddhaShila,
    chipSize: 46,
    topRegionOnly: false,
  },
  { id: "lotus", label: "Lotus", Component: Lotus, chipSize: 36, topRegionOnly: false },
];

/** Sits under the ornament grid in the editor. */
export const JAIN_ORNAMENTS_NOTE =
  "The toran and the kalash frame the top of your card.";

const BY_ID: Record<JainOrnamentId, Ornament> = {
  ahimsaHand: AhimsaHand,
  swastika: Swastika,
  lotus: Lotus,
  siddhaShila: SiddhaShila,
  kalash: Kalash,
  tornGate: TornGate,
};

export function getJainOrnament(id: JainOrnamentId): Ornament {
  return BY_ID[id];
}
