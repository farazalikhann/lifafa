import type { ReactElement } from "react";
import { DEFAULT_SIZE, Frame, polygonPath, r2 } from "@/lib/ornaments/frame";
import type { Ornament, OrnamentProps } from "@/lib/ornaments/frame";
import {
  calligraphyAlt,
  calligraphyAspect,
  calligraphySrc,
  type CalligraphyId,
} from "@/lib/calligraphy";
import type { OrnamentConfig, OrnamentId } from "@/types/ornament";

/*
  The shell, the props and the shared path helpers now live in
  lib/ornaments/frame.tsx. They were private here, copied once into the Hindu
  pack with a note saying that when a third pack arrived both belonged in a
  shared module — four arrived at once. Re-exported below so existing importers
  of this file keep working.
*/
export type { Ornament, OrnamentProps };

/**
 * Hand drawn Muslim ornament pack.
 *
 * HARD RULE, enforced by hand across every shape below and inherited from
 * lib/motifs.tsx: these are ornament and architecture only. No human, prophet,
 * saint or divine figure or face is drawn, not even a stylised one. Nothing
 * here carries Arabic text either — script belongs in lib/arabicContent.ts,
 * which is reviewed on its own, and a letterform baked into a path could never
 * be corrected there.
 *
 * Every ornament is stroke based line art drawn with `currentColor`, so a
 * caller colours it by setting `color` on the wrapper and it inherits the
 * card's accent. The one exception is the lantern flame, which is a warm fill:
 * a flame the same colour as the metalwork around it stops being a flame.
 *
 * Each carries a second layer of drawing — a lattice, a vein, an inner
 * tracery, a scallop — beyond the silhouette that identifies it. That detail
 * is what makes the difference at 64px, where a silhouette alone reads as one
 * blown-up icon rather than as ornament.
 */

/**
 * Each drawing's width over its height, from its own viewBox.
 *
 * Exported because it is not only the Frame's business: anything that has to
 * reserve space for an ornament needs it too, and HangingLayer works out how
 * far down the card a lantern reaches from exactly these numbers. Duplicating
 * them there would let the two drift the moment a viewBox changed.
 */
export const ORNAMENT_ASPECT: Record<OrnamentId, number> = {
  /*
    The first three are not viewBoxes but the published cut-outs' own boxes —
    they are photographs. The lights' box is the one worth reading twice: 2.38
    to one where the drawn band was 4 to one, because real bulbs hang on
    droppers of different lengths and a swag of them is simply deeper than a
    stroked wire. `hangingDepth` reads this, so the whole card makes room.
  */
  lantern: 154 / 400,
  crescentMoon: 213 / 340,
  hangingLights: 1024 / 430,
  stars: 1,
  arabesqueBorder: 160 / 24,
  geometricStar: 1,
  /* Nor are these: the published crops each pair of inks shares. */
  bismillah: calligraphyAspect("bismillah"),
  versePairs: calligraphyAspect("versePairs"),
};

/** A closed star, alternating between the outer and the inner radius. */
function starPath(
  cx: number,
  cy: number,
  points: number,
  outerR: number,
  innerR: number,
  rotationDeg: number,
): string {
  const start = (rotationDeg * Math.PI) / 180 - Math.PI / 2;
  const step = Math.PI / points;
  const coords: string[] = [];

  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerR : innerR;
    const angle = start + index * step;
    coords.push(
      `${r2(cx + radius * Math.cos(angle))} ${r2(cy + radius * Math.sin(angle))}`,
    );
  }

  return `M ${coords.join(" L ")} Z`;
}


/* ---------------------------------------------------------------------------
   Lantern
   --------------------------------------------------------------------------- */

/**
 * Warm enough to read as fire against every palette the card ships with.
 *
 * Exported because the Hindu pack's diya burns too, and its flame is meant to
 * be the same flame — see FlameGlow below.
 */
export const FLAME_COLOUR = "#ffcb7a";

/**
 * The glow behind a flame.
 *
 * Lifted out of the lantern so the Hindu pack's diya can use the identical
 * filter rather than a second one that drifts: lib/ornaments/hindu.tsx imports
 * this and FLAME_COLOUR, and the two flames are one treatment defined once. If
 * this changes, both flames change, which is the point — do not fork it.
 *
 * `id` must be unique per rendered flame and must come from the caller's stable
 * instanceId, never from Math.random or the clock: two renders of the same
 * ornament in the same place have to emit byte-identical markup or hydration
 * reports a mismatch.
 */
export function FlameGlow({ id }: { id: string }): ReactElement {
  return (
    /*
      Generous filter region: the blur spreads well outside the flame's own box,
      and the default -10%/120% region would clip the halo into a visible
      square.
    */
    <filter
      id={id}
      x="-150%"
      y="-150%"
      width="400%"
      height="400%"
      colorInterpolationFilters="sRGB"
    >
      <feGaussianBlur stdDeviation="2.4" result="lifafaFlameBlur" />
      <feMerge>
        {/* Twice, so the halo carries past anything drawn in front of it. */}
        <feMergeNode in="lifafaFlameBlur" />
        <feMergeNode in="lifafaFlameBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

/**
 * The three that are photographs, built from one factory.
 *
 * They were line art until they weren't, and that was the whole of what was
 * wrong with them: a drawing holds up at 43px the way line art does, and a
 * lantern on a wedding card is meant to be the warm thing at the corner of the
 * eye rather than a diagram of one. Same ids, same slots, same rows in the
 * hanging table, so a card saved with any of them on keeps them; only the
 * drawings changed.
 *
 * WHAT THEY GIVE UP, deliberately. They no longer take the card's accent — a
 * photograph has no stroke to colour, and these are brass on every palette. The
 * lantern no longer carries FlameGlow either: the light is in the file, baked
 * into the glass, rather than being a filter over a drawn flame. FlameGlow and
 * FLAME_COLOUR stay exported, because the Hindu diya is still drawn and still
 * needs them.
 *
 * `instanceId`, `strokeWidth` and `preserveAspectRatio` are taken and ignored.
 * They exist so an svg can build filter ids and tune its pen, and an img has
 * neither. Taking them anyway keeps these the same shape as every other
 * Ornament, which is what lets the pack hold them in one list.
 */
function photoOrnament(src: string, id: OrnamentId): Ornament {
  const Photo: Ornament = ({ size = 64, className, style }) => {
    /*
      `size` measures the longer side, exactly as it does for the drawn
      ornaments — which for the lantern and the moon is the height and for the
      string of lights is the width. Working both out from the aspect is what
      lets the hanging table's rem values and `hangingDepth` go on meaning what
      they meant.
    */
    const aspect = ORNAMENT_ASPECT[id];
    const width = aspect >= 1 ? size : size * aspect;
    const height = aspect >= 1 ? size / aspect : size;

    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        width={className === undefined ? Math.round(width) : undefined}
        height={className === undefined ? Math.round(height) : undefined}
        className={className ?? "block max-w-none"}
        style={style}
      />
    );
  };

  return Photo;
}

export const Lantern = photoOrnament("/decor/lantern.webp", "lantern");
export const CrescentMoon = photoOrnament(
  "/decor/crescent-moon.webp",
  "crescentMoon",
);
export const HangingLights = photoOrnament(
  "/decor/hanging-lights.webp",
  "hangingLights",
);

/* ---------------------------------------------------------------------------
   Stars
   --------------------------------------------------------------------------- */

/**
 * The cluster, authored as a fixed table.
 *
 * Five and eight pointed stars at four sizes, placed by hand so the group has
 * a diagonal drift rather than sitting on a grid.
 */
const STAR_CLUSTER: readonly {
  cx: number;
  cy: number;
  points: number;
  outerR: number;
  innerR: number;
  rotation: number;
}[] = [
  { cx: 23, cy: 25, points: 8, outerR: 15, innerR: 6.4, rotation: 0 },
  { cx: 45.5, cy: 15, points: 5, outerR: 9, innerR: 3.8, rotation: 12 },
  { cx: 43, cy: 44, points: 5, outerR: 11.5, innerR: 4.8, rotation: -18 },
  { cx: 14, cy: 49, points: 8, outerR: 7.5, innerR: 3.2, rotation: 22 },
];

export const Stars: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 64"
    aspect={ORNAMENT_ASPECT.stars}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {STAR_CLUSTER.map((star) => (
      <g key={`${star.cx}-${star.cy}`}>
        <path
          d={starPath(
            star.cx,
            star.cy,
            star.points,
            star.outerR,
            star.innerR,
            star.rotation,
          )}
        />
        {/* Inner echo — the detail that survives being blown up to 64px. */}
        <path
          d={polygonPath(
            star.cx,
            star.cy,
            star.points,
            star.innerR * 0.62,
            star.rotation,
          )}
        />
      </g>
    ))}
  </Frame>
);

/* ---------------------------------------------------------------------------
   Arabesque border
   --------------------------------------------------------------------------- */

/** One repeat of the vine, in viewBox units. Five repeats fill the 160 wide box. */
const VINE_UNIT = 32;
const VINE_REPEATS = 5;

function vineUnit(x: number): string {
  return [
    /* Stem — one crest and one trough per repeat, so repeats join smoothly. */
    `M ${x} 12 C ${x + 5} 3 ${x + 11} 3 ${x + 16} 12 C ${x + 21} 21 ${x + 27} 21 ${x + 32} 12`,
    /* Leaf riding the crest. */
    `M ${x + 8} 7.6 C ${x + 3.2} 6.2 ${x + 4} 1.6 ${x + 8} 2.1 C ${x + 12} 2.6 ${x + 12.8} 6.2 ${x + 8} 7.6 Z`,
    /* Scroll curling off the trough. */
    `M ${x + 23.4} 16.2 Q ${x + 28.6} 16.6 ${x + 28.1} 20.4 Q ${x + 27.6} 22.6 ${x + 25.4} 21.7 Q ${x + 24.2} 20.9 ${x + 25.9} 19.6`,
  ].join(" ");
}

export const ArabesqueBorder: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 160 24"
    aspect={ORNAMENT_ASPECT.arabesqueBorder}
    size={size}
    strokeWidth={strokeWidth ?? 1.3}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {Array.from({ length: VINE_REPEATS }, (_unused, index) => {
      const x = index * VINE_UNIT;

      return (
        <g key={x}>
          <path d={vineUnit(x)} />
          {/* Node where one repeat hands over to the next. */}
          <circle cx={x + 16} cy={12} r={1.1} />
        </g>
      );
    })}

    {/* End caps, so the run reads as a finished band and not a cropped one. */}
    <circle cx={2.4} cy={12} r={1.6} />
    <circle cx={157.6} cy={12} r={1.6} />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Geometric star
   --------------------------------------------------------------------------- */

const STAR_CENTRE = 32;
/** Circumradius of the two big squares. */
const STAR_RADIUS = 28;
/**
 * Circumradius of the octagon the two squares cut out of each other.
 *
 * The squares' apothem is R / sqrt(2); the octagon sharing that apothem has a
 * circumradius of apothem / cos(22.5 degrees). Derived rather than eyeballed,
 * so the tracery lands exactly on the interlace points instead of near them.
 */
const OCTAGON_RADIUS = r2(STAR_RADIUS / Math.SQRT2 / Math.cos(Math.PI / 8));

export const GeometricStar: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 64"
    aspect={ORNAMENT_ASPECT.geometricStar}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* The two squares, 45 degrees apart — the interlace itself. */}
    <path d={polygonPath(STAR_CENTRE, STAR_CENTRE, 4, STAR_RADIUS, 0)} />
    <path d={polygonPath(STAR_CENTRE, STAR_CENTRE, 4, STAR_RADIUS, 45)} />

    {/* Inner tracery: the octagon they cut, a smaller rosette, and a centre. */}
    <path d={polygonPath(STAR_CENTRE, STAR_CENTRE, 8, OCTAGON_RADIUS, 22.5)} />
    <path d={polygonPath(STAR_CENTRE, STAR_CENTRE, 4, 13, 0)} />
    <path d={polygonPath(STAR_CENTRE, STAR_CENTRE, 4, 13, 45)} />
    <path d={polygonPath(STAR_CENTRE, STAR_CENTRE, 8, 6, 22.5)} />
  </Frame>
);

function calligraphyOrnament(id: CalligraphyId): Ornament {
  const Panel: Ornament = ({ size = 120, className, style, ground = "dark" }) => (
    <img
      src={calligraphySrc(id, ground)}
      alt={calligraphyAlt(id)}
      decoding="async"
      width={className === undefined ? Math.round(size) : undefined}
      height={
        className === undefined
          ? Math.round(size / calligraphyAspect(id))
          : undefined
      }
      className={className ?? "block max-w-none"}
      style={style}
    />
  );

  return Panel;
}

export const Bismillah = calligraphyOrnament("bismillah");
export const VersePairs = calligraphyOrnament("versePairs");

/* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- */

export interface OrnamentEntry {
  id: OrnamentId;
  /** Shown under the chip in the editor. Latin script only. */
  label: string;
  Component: Ornament;
  /**
   * What `size` the editor's chip preview should render this at.
   *
   * Per ornament rather than one shared number, because `size` measures the
   * *longer* side: one value that makes the lantern 40px tall makes the vine
   * border 40px wide and 6px high, which in a chip is a smudge. These are
   * picked so each drawing fills roughly the same 84x40 box — the widest a chip
   * gets in the four column desktop grid.
   */
  chipSize: number;
}

/**
 * The pack, in the order the editor lays out its chips.
 *
 * The three that hang come first, because the muted line under the grid tells
 * the host that lanterns, moons and lights hang from the top of the card — and
 * that is easier to believe when those three are the first ones read.
 */
export const MUSLIM_ORNAMENTS: readonly OrnamentEntry[] = [
  { id: "lantern", label: "Lantern", Component: Lantern, chipSize: 40 },
  {
    id: "crescentMoon",
    label: "Crescent moon",
    Component: CrescentMoon,
    chipSize: 36,
  },
  {
    id: "hangingLights",
    label: "Hanging lights",
    Component: HangingLights,
    chipSize: 80,
  },
  { id: "stars", label: "Stars", Component: Stars, chipSize: 36 },
  {
    id: "geometricStar",
    label: "Geometric star",
    Component: GeometricStar,
    chipSize: 36,
  },
  {
    id: "arabesqueBorder",
    label: "Arabesque border",
    Component: ArabesqueBorder,
    chipSize: 84,
  },
  /*
    Last, and the only entry whose chip is a photograph. 84 is the width the
    widest chip gets, and at 2.35 to one that lands the calligraphy at 36px
    tall — inside the 40px box the grid gives every drawing.
  */
  { id: "bismillah", label: "Bismillah", Component: Bismillah, chipSize: 84 },
  /*
    76 rather than the Bismillah's 84: this crop is 1.95 to one where that one
    is 2.35, so the same width would stand it 43px tall and burst the 40px box
    the grid gives every drawing.
  */
  {
    id: "versePairs",
    label: "Created you in pairs",
    Component: VersePairs,
    chipSize: 76,
  },
];

const BY_ID: Record<OrnamentId, Ornament> = {
  lantern: Lantern,
  crescentMoon: CrescentMoon,
  stars: Stars,
  arabesqueBorder: ArabesqueBorder,
  geometricStar: GeometricStar,
  hangingLights: HangingLights,
  bismillah: Bismillah,
  versePairs: VersePairs,
};

export function getOrnament(id: OrnamentId): Ornament {
  return BY_ID[id];
}

/**
 * What a card carries before the host touches anything, and what a card is
 * reset to the moment it stops being a Muslim card.
 *
 * Every field is empty or null, so a non-Muslim card that still holds this
 * object renders exactly what it rendered before the pack existed.
 */
export const DEFAULT_ORNAMENT_CONFIG: OrnamentConfig = {
  enabledOrnaments: [],
  greetingId: null,
  blessingId: null,
};
