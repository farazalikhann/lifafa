import type { CSSProperties, ReactElement, ReactNode } from "react";
import { FLAME_COLOUR, FlameGlow } from "@/lib/ornaments/muslim";
import type { Ornament, OrnamentProps } from "@/lib/ornaments/muslim";
import type { HinduOrnamentConfig, HinduOrnamentId } from "@/types/hinduOrnament";

/**
 * Hand drawn Hindu ornament pack.
 *
 * The parallel of lib/ornaments/muslim.tsx, and it follows that file's drawing
 * rules to the letter: every ornament is stroke based line art drawn with
 * `currentColor`, so a caller colours it by setting `color` on the wrapper and
 * it inherits the card's accent. Each carries a second layer of drawing — a
 * vein, a band, a ring, a scallop — beyond the silhouette that identifies it,
 * because that detail is what makes the difference at 64px, where a silhouette
 * alone reads as one blown-up icon rather than as ornament.
 *
 * The one exception is the diya's flame, which is a warm fill rather than a
 * stroke — the same exception, and literally the same filter and colour, as the
 * Muslim lantern's flame. It is imported from that file rather than restated.
 * Nothing else here is filled.
 *
 * `OrnamentProps` and `Ornament` are imported from the Muslim pack rather than
 * redeclared. They describe nothing Muslim — a size, an instance id, a stroke
 * override — and sharing the one definition is what lets a renderer take an
 * ornament from either pack without knowing which. The `Frame` shell below is a
 * copy of that file's, because it is private there; when a third pack lands,
 * both belong in a shared module and this copy goes away.
 *
 * ONE GLYPH IS DRAWN HERE, DELIBERATELY. Devanagari text belongs in
 * lib/devanagariContent.ts, which is reviewed on its own, and a letterform
 * baked into a path can never be corrected there. Om is the exception and is
 * meant to be one: it is offered as a mark to hang on a card next to a diya and
 * a kalash, not as words to read. The same syllable also exists as text — the
 * "om" greeting in lib/devanagariContent.ts — and that is the copy to reach for
 * anywhere it has to be selectable, scale with the type, or be read aloud,
 * since every ornament here is aria-hidden. Nothing else in this file may
 * follow it. The swastik is a symbol rather than a letter and raises no such
 * question.
 */

/** Rendered size of an ornament's larger dimension when the caller says nothing. */
const DEFAULT_SIZE = 64;

/**
 * Each drawing's width over its height, from its own viewBox.
 *
 * Exported for the same reason the Muslim pack exports its own: anything that
 * has to reserve space for an ornament needs it, and repeating the numbers at
 * the call site would let the two drift the moment a viewBox changed.
 */
export const HINDU_ORNAMENT_ASPECT: Record<HinduOrnamentId, number> = {
  diya: 1,
  kalash: 64 / 80,
  ganesh: 64 / 72,
  om: 72 / 64,
  swastik: 1,
  toran: 160 / 40,
  marigold: 160 / 34,
};

/** Two places is finer than a subpixel at these sizes, and keeps the markup short. */
function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A pointed leaf, as a closed outline of two quadratics either side of the
 * base-to-tip line.
 *
 * `controlSpread` is how far the control points sit off that line, NOT the
 * leaf's half width: a quadratic only reaches half way to its control, so a
 * leaf three units wide either side is authored by passing six. Kept as the raw
 * control offset rather than the finished width because that is the number
 * being nudged when a leaf is made fatter or thinner by eye.
 */
function leafPath(
  baseX: number,
  baseY: number,
  tipX: number,
  tipY: number,
  controlSpread: number,
): string {
  const runX = tipX - baseX;
  const runY = tipY - baseY;
  const length = Math.hypot(runX, runY);
  /* Unit normal to the base-to-tip line, scaled out to the control offset. */
  const offsetX = (runY / length) * controlSpread;
  const offsetY = (-runX / length) * controlSpread;
  const midX = (baseX + tipX) / 2;
  const midY = (baseY + tipY) / 2;

  return [
    `M ${r2(baseX)} ${r2(baseY)}`,
    `Q ${r2(midX + offsetX)} ${r2(midY + offsetY)} ${r2(tipX)} ${r2(tipY)}`,
    `Q ${r2(midX - offsetX)} ${r2(midY - offsetY)} ${r2(baseX)} ${r2(baseY)}`,
    "Z",
  ].join(" ");
}

/**
 * A closed ring of outward bulging arcs — a flower head seen face on.
 *
 * `curvature` is each arc's radius as a fraction of the chord it spans, the
 * same convention the Muslim pack's scallop uses. Anything above 0.5 is a
 * drawable arc; the closer to 0.5, the deeper the petal.
 *
 * Points are walked in increasing angle, which with y pointing down is
 * clockwise on screen, so sweep flag 1 bulges every arc away from the centre.
 */
function flowerPath(
  cx: number,
  cy: number,
  radius: number,
  petals: number,
  curvature: number,
): string {
  const step = (Math.PI * 2) / petals;
  const at = (index: number): readonly [number, number] => {
    const angle = index * step - Math.PI / 2;

    return [
      r2(cx + radius * Math.cos(angle)),
      r2(cy + radius * Math.sin(angle)),
    ];
  };

  const [startX, startY] = at(0);
  let d = `M ${startX} ${startY}`;

  for (let index = 1; index <= petals; index += 1) {
    const [previousX, previousY] = at(index - 1);
    const [x, y] = at(index);
    const arcR = r2(Math.hypot(x - previousX, y - previousY) * curvature);

    d += ` A ${arcR} ${arcR} 0 0 1 ${x} ${y}`;
  }

  return `${d} Z`;
}

/**
 * A point on a quadratic cord.
 *
 * Leaves and blooms are placed by evaluating the cord they hang from rather
 * than at hand-guessed heights, so every one sits exactly on the string and the
 * drape stays a real drape — the same trick the Muslim pack's hanging lights
 * use for their bulbs.
 */
function pointOnCord(
  start: readonly [number, number],
  control: readonly [number, number],
  end: readonly [number, number],
  t: number,
): readonly [number, number] {
  const inverse = 1 - t;
  const x =
    inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0];
  const y =
    inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1];

  return [r2(x), r2(y)];
}

/** The `d` of a quadratic cord, from the same three points. */
function cordPath(
  start: readonly [number, number],
  control: readonly [number, number],
  end: readonly [number, number],
): string {
  return `M ${start[0]} ${start[1]} Q ${control[0]} ${control[1]} ${end[0]} ${end[1]}`;
}

/**
 * Shared svg shell — a copy of the Muslim pack's, which is private to that
 * file. See the note in the header.
 *
 * `aspect` is the drawing's width over its height, and is what turns the single
 * `size` prop into the right pair of dimensions for shapes as different as a
 * tall kalash and a wide garland.
 */
function Frame({
  viewBox,
  aspect,
  size = DEFAULT_SIZE,
  strokeWidth,
  className,
  preserveAspectRatio,
  style,
  children,
}: {
  viewBox: string;
  aspect: number;
  size?: number;
  strokeWidth: number;
  className?: string;
  preserveAspectRatio?: string;
  style?: CSSProperties;
  children: ReactNode;
}): ReactElement {
  /* CSS sizing and attribute sizing are mutually exclusive, never both. */
  const dimensions =
    className === undefined
      ? {
          width: r2(aspect >= 1 ? size : size * aspect),
          height: r2(aspect >= 1 ? size / aspect : size),
        }
      : {};

  return (
    <svg
      viewBox={viewBox}
      {...dimensions}
      className={className}
      style={style}
      preserveAspectRatio={preserveAspectRatio}
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Diya
   --------------------------------------------------------------------------- */

/**
 * Oil lamp, single flame.
 *
 * THE FLAME IS THE LANTERN'S FLAME. Same FLAME_COLOUR, same FlameGlow filter,
 * same flicker class, all imported from lib/ornaments/muslim.tsx rather than
 * restated here — a warm fill because a flame the colour of the clay around it
 * stops being a flame, which is the one place either pack departs from
 * `currentColor`. It is the single exception in this file to the line-art rule
 * in the header. Do not fork it, and do not add a stroked outline back on top:
 * the lantern's flame has no outline either, and two flames drawn differently
 * on one card is the thing this is meant to prevent.
 */
export const Diya: Ornament = ({
  size,
  instanceId,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => {
  /* Derived from the caller's stable id, exactly as the lantern derives its own. */
  const glowId = `lifafa-diya-glow-${instanceId}`;

  return (
    <Frame
      viewBox="0 0 64 64"
      aspect={HINDU_ORNAMENT_ASPECT.diya}
      size={size}
      strokeWidth={strokeWidth ?? 1.4}
      className={className}
      preserveAspectRatio={preserveAspectRatio}
      style={style}
    >
      <defs>
        <FlameGlow id={glowId} />
      </defs>

      {/*
        Drawn before the lamp, as the lantern's is drawn before its body, so the
        halo sits behind the rim rather than washing over it.
      */}
      <path
        d="M 32 29.1 C 25.6 24.6 26 15.8 32 8.6 C 38 15.8 38.4 24.6 32 29.1 Z"
        fill={FLAME_COLOUR}
        stroke="none"
        filter={`url(#${glowId})`}
        className="lifafa-flame-flicker"
      />

      {/* Wick, running down into the oil. */}
      <path d="M 32 29.1 V 33.7" />

      {/* Rim, then the bowl hung off its two ends. */}
      <ellipse cx={32} cy={36.3} rx={25.2} ry={4.3} />
      <path d="M 6.8 36.3 C 8.5 48.8 18.1 55.5 32 55.5 C 45.9 55.5 55.5 48.8 57.2 36.3" />

      {/* Collar band around the clay — the second layer at chip size. */}
      <path d="M 7.5 40.4 C 12.8 43.3 21.9 45 32 45 C 42.1 45 51.2 43.3 56.5 40.4" />

      {/* Flared foot, so it reads as a lamp standing rather than as a bowl. */}
      <path d="M 25.5 55.2 L 23.8 59.8 H 40.2 L 38.5 55.2" />
    </Frame>
  );
};

/* ---------------------------------------------------------------------------
   Kalash
   --------------------------------------------------------------------------- */

/**
 * The mango leaves ringing the pot's mouth, authored as a fixed table.
 *
 * Four leaves rather than the five a real kalash carries: the fifth stands
 * straight up behind the coconut, where at chip size it is two strokes of
 * clutter and nothing else.
 *
 * The fan is deliberately flat — every tip below the coconut's waist and well
 * outside its width. Steeper leaves close over the coconut and the whole
 * ornament turns into a lotus in a pot, which is a different thing entirely.
 * If a leaf is ever re-aimed, check it against the coconut's box first.
 */
const KALASH_LEAVES: readonly {
  baseX: number;
  baseY: number;
  tipX: number;
  tipY: number;
  spread: number;
  /** Outer leaves are big enough to carry a vein; the inner pair are not. */
  vein: string | null;
}[] = [
  {
    baseX: 26.6,
    baseY: 30,
    tipX: 4.6,
    tipY: 21,
    spread: 9,
    vein: "M 25.8 29.2 Q 15.6 27 6.4 21.8",
  },
  { baseX: 29.4, baseY: 30, tipX: 15.6, tipY: 12.6, spread: 8, vein: null },
  { baseX: 34.6, baseY: 30, tipX: 48.4, tipY: 12.6, spread: 8, vein: null },
  {
    baseX: 37.4,
    baseY: 30,
    tipX: 59.4,
    tipY: 21,
    spread: 9,
    vein: "M 38.2 29.2 Q 48.4 27 57.6 21.8",
  },
];

export const Kalash: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 80"
    aspect={HINDU_ORNAMENT_ASPECT.kalash}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Leaves first, so the coconut and the pot's mouth sit in front of them. */}
    {KALASH_LEAVES.map((leaf) => (
      <g key={`${leaf.tipX}-${leaf.tipY}`}>
        <path
          d={leafPath(leaf.baseX, leaf.baseY, leaf.tipX, leaf.tipY, leaf.spread)}
        />
        {leaf.vein === null ? null : <path d={leaf.vein} />}
      </g>
    ))}

    {/* Coconut, its husk tufts, and the seam that stops it reading as a ball. */}
    <ellipse cx={32} cy={18.6} rx={8.2} ry={7.8} />
    <path d="M 32 10.8 V 5.2 M 27.4 12 L 24.8 7.6 M 36.6 12 L 39.2 7.6" />
    <path d="M 24.6 17.2 Q 32 22.4 39.4 17.2" />

    {/* Mouth. */}
    <ellipse cx={32} cy={30.4} rx={10.4} ry={2.8} />

    {/* Pot — neck, shoulder and belly, one side each. */}
    <path d="M 21.6 30.4 C 20.4 35.4 8.4 39.4 8.4 51 C 8.4 61.4 17 69 23.6 70.4" />
    <path d="M 42.4 30.4 C 43.6 35.4 55.6 39.4 55.6 51 C 55.6 61.4 47 69 40.4 70.4" />

    {/* Carved band across the belly. */}
    <path d="M 10.2 45.6 C 18 48 46 48 53.8 45.6" />
    <path d="M 9.4 52.4 C 17.6 54.8 46.4 54.8 54.6 52.4" />

    {/* Plinth, which closes the silhouette the pot's open base leaves. */}
    <path d="M 23.6 70.4 L 21.6 75.4 H 42.4 L 40.4 70.4" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Ganesh
   --------------------------------------------------------------------------- */

/**
 * Head only — crown, both ears, trunk, tusks. No body, no arms, no throne.
 *
 * Figurative on purpose; see the note on HinduOrnamentEntry. The head alone is
 * also the practical choice: a full murti at 40px is a smudge, whereas a crown
 * over two fanned ears with a trunk between them reads instantly.
 *
 * The right tusk is drawn short. That is Ekadanta, the broken tusk, and not a
 * path that got clipped — do not "fix" it to match the left.
 */
export const Ganesh: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 72"
    aspect={HINDU_ORNAMENT_ASPECT.ganesh}
    size={size}
    strokeWidth={strokeWidth ?? 1.5}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Ears, drawn first so the face overlaps them at the temples. */}
    <path d="M 21.8 24 C 13.2 20.8 5.4 26 6.6 34.2 C 7.6 41.2 15.6 46.4 24.4 44" />
    <path d="M 21.6 28 C 15.4 26.8 10.8 30.4 11.6 35.2 C 12.2 39.2 16.8 42.4 22.4 41.8" />
    <path d="M 42.2 24 C 50.8 20.8 58.6 26 57.4 34.2 C 56.4 41.2 48.4 46.4 39.6 44" />
    <path d="M 42.4 28 C 48.6 26.8 53.2 30.4 52.4 35.2 C 51.8 39.2 47.2 42.4 41.6 41.8" />

    {/* Crown — outline, band, jewel, and the bead at its point. */}
    <path d="M 23.4 22 C 24.4 14.6 27.4 8.4 32 4.8 C 36.6 8.4 39.6 14.6 40.6 22" />
    <path d="M 22 22 H 42" />
    <circle cx={32} cy={15.6} r={2} />
    <circle cx={32} cy={2.8} r={1.4} />

    {/* Face, open at the bottom where the trunk leaves it. */}
    <path d="M 21.8 22.6 C 19.6 29 20.2 38.6 24.6 44.4" />
    <path d="M 42.2 22.6 C 44.4 29 43.8 38.6 39.4 44.4" />
    <path d="M 32 25 V 29.4" />

    {/* Eyes, lowered rather than open — steadier than dots at chip size. */}
    <path d="M 25.8 34 Q 27.8 31.4 29.8 34" />
    <path d="M 34.2 34 Q 36.2 31.4 38.2 34" />

    {/* Tusks: left full, right broken. */}
    <path d="M 26.6 44.4 C 24.8 47.6 24 51.2 25 54.2" />
    <path d="M 37.8 44.4 C 39.4 46.8 40 48.8 39.8 50.4" />

    {/* Trunk — outer edge, inner edge, and the curled tip that closes them. */}
    <path d="M 35.8 43 C 37.4 50.4 36.6 59.4 30 63.8 C 22.6 68.6 14 63.6 14.6 55.4" />
    <path d="M 28.8 43.6 C 29.8 50 30.2 56.2 27 58.6 C 23.8 61 20.6 58.6 21 55.6" />
    <path d="M 14.6 55.4 Q 17.8 51.6 21 55.6" />

    {/* Rings across the trunk — the second layer, and what gives it girth. */}
    <path d="M 29.4 48 Q 32.6 49.8 36.2 48.2" />
    <path d="M 29.9 53.6 Q 33 55.8 36.2 54.2" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Om
   --------------------------------------------------------------------------- */

/**
 * The mark, as four strokes and a dot: the small upper bowl, the large lower
 * bowl, the stroke that leaves their junction and hooks up to the right, the
 * chandra above it, and the bindu above that.
 *
 * The one ornament in the pack with no added tracery, and it must stay that
 * way. Everything else here can take a vein or a band because the extra line is
 * decoration on a shape; on a glyph an extra line is a different glyph.
 */
export const Om: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 72 64"
    aspect={HINDU_ORNAMENT_ASPECT.om}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Upper bowl, down to the junction at (20.4, 33.4). */}
    <path d="M 11.6 27.6 C 12.8 19 25.6 16.8 29.6 23.2 C 32.6 28 27.4 32.6 20.4 33.4" />

    {/* Lower bowl, from that same junction. */}
    <path d="M 20.4 33.4 C 29.8 33.2 37.6 37.8 37.6 45.8 C 37.6 54.4 28.6 60 19 58.2 C 14.8 57.4 11.2 54.8 9.8 51.6" />

    {/* The stroke off the junction, rising right and curling back on itself. */}
    <path d="M 20.4 33.4 C 30.2 33.8 38.8 32 45.6 28.4 C 52.4 24.8 61 26.6 61.4 32.2 C 61.7 36.6 56.8 39 53.6 36.2" />

    {/* Chandra and bindu. */}
    <path d="M 44.6 15.2 Q 51.8 23.4 59 15.2" />
    <circle cx={51.8} cy={7.2} r={2.4} />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Swastik
   --------------------------------------------------------------------------- */

/**
 * Four equal arms, upright, bending clockwise: the top arm turns right, the
 * right arm turns down, the bottom turns left, the left turns up.
 *
 * THAT HANDEDNESS IS THE WHOLE POINT AND MUST NOT BE FLIPPED. Mirroring this
 * path, or reusing it under a transform that mirrors it, produces a different
 * symbol carrying a meaning nobody wants on an invitation. It is drawn upright
 * for the same reason: tilted to 45 degrees it stops being this symbol too. Any
 * animation or layout that might rotate an ornament has to leave this one
 * alone.
 *
 * Authored as two continuous strokes rather than six segments, so the four
 * corners are real mitred joins instead of butted line ends.
 */
export const Swastik: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 64"
    aspect={HINDU_ORNAMENT_ASPECT.swastik}
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

    {/* The four quadrant dots, as the mark is drawn at a threshold. */}
    <circle cx={44} cy={20} r={2.4} />
    <circle cx={44} cy={44} r={2.4} />
    <circle cx={20} cy={44} r={2.4} />
    <circle cx={20} cy={20} r={2.4} />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Toran
   --------------------------------------------------------------------------- */

const TORAN_CORD_START: readonly [number, number] = [4, 6];
const TORAN_CORD_CONTROL: readonly [number, number] = [80, 18];
const TORAN_CORD_END: readonly [number, number] = [156, 6];

/** Where the leaves are tied on. Fixed — never generated. */
const TORAN_LEAF_STOPS: readonly number[] = [
  0.08, 0.185, 0.29, 0.395, 0.5, 0.605, 0.71, 0.815, 0.92,
];

/** Flower drops, in every other gap. Any more and the hem closes up. */
const TORAN_BEAD_STOPS: readonly number[] = [0.1325, 0.3425, 0.5525, 0.7625];

export const Toran: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 160 40"
    aspect={HINDU_ORNAMENT_ASPECT.toran}
    size={size}
    strokeWidth={strokeWidth ?? 1.3}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    <path d={cordPath(TORAN_CORD_START, TORAN_CORD_CONTROL, TORAN_CORD_END)} />

    {/* Nails the cord is tied off on. */}
    <circle cx={TORAN_CORD_START[0]} cy={TORAN_CORD_START[1]} r={2} />
    <circle cx={TORAN_CORD_END[0]} cy={TORAN_CORD_END[1]} r={2} />

    {TORAN_LEAF_STOPS.map((t, index) => {
      const [x, y] = pointOnCord(
        TORAN_CORD_START,
        TORAN_CORD_CONTROL,
        TORAN_CORD_END,
        t,
      );
      /*
        Long and short alternating. A hem of nine identical leaves reads as a
        comb; alternating gives it the scallop a real toran has, and it is the
        only detail on this ornament that survives chip size.
      */
      const isLong = index % 2 === 0;

      return (
        <path
          key={t}
          d={leafPath(x, y, x, r2(y + (isLong ? 24 : 16)), isLong ? 5.6 : 4)}
        />
      );
    })}

    {TORAN_BEAD_STOPS.map((t) => {
      const [x, y] = pointOnCord(
        TORAN_CORD_START,
        TORAN_CORD_CONTROL,
        TORAN_CORD_END,
        t,
      );

      return (
        <g key={t}>
          <path d={`M ${x} ${y} V ${r2(y + 5.2)}`} />
          <circle cx={x} cy={r2(y + 7.8)} r={2.4} />
        </g>
      );
    })}
  </Frame>
);

/* ---------------------------------------------------------------------------
   Marigold garland
   --------------------------------------------------------------------------- */

const GARLAND_CORD_START: readonly [number, number] = [4, 6];
const GARLAND_CORD_CONTROL: readonly [number, number] = [80, 34];
const GARLAND_CORD_END: readonly [number, number] = [156, 6];

/** Where the blooms are threaded. Fixed — never generated. */
const GARLAND_STOPS: readonly number[] = [
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9,
];

export const Marigold: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 160 34"
    aspect={HINDU_ORNAMENT_ASPECT.marigold}
    size={size}
    strokeWidth={strokeWidth ?? 1.3}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* String first — the blooms are threaded over it. */}
    <path
      d={cordPath(GARLAND_CORD_START, GARLAND_CORD_CONTROL, GARLAND_CORD_END)}
    />

    <circle cx={GARLAND_CORD_START[0]} cy={GARLAND_CORD_START[1]} r={1.8} />
    <circle cx={GARLAND_CORD_END[0]} cy={GARLAND_CORD_END[1]} r={1.8} />

    {GARLAND_STOPS.map((t, index) => {
      const [x, y] = pointOnCord(
        GARLAND_CORD_START,
        GARLAND_CORD_CONTROL,
        GARLAND_CORD_END,
        t,
      );
      /*
        Full blooms alternating with buds, which is how a garland is actually
        strung and also what keeps nine circles in a row from reading as beads.

        The full blooms are fluted rather than plain: eight shallow petals round
        the edge, deep enough to read as a marigold at 64px and shallow enough
        to still come out as a circle at chip size, which is all that survives
        there anyway.
      */
      const isBloom = index % 2 === 0;

      if (!isBloom) {
        return <circle key={t} cx={x} cy={y} r={4.2} />;
      }

      return (
        <g key={t}>
          <path d={flowerPath(x, y, 7.4, 8, 0.55)} />
          <circle cx={x} cy={y} r={3} />
        </g>
      );
    })}
  </Frame>
);

/* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- */

/**
 * One ornament offered in the editor.
 *
 * The same shape as OrnamentEntry in lib/ornaments/muslim.tsx, field for field.
 *
 * ON THE FIGURATIVE QUESTION, SETTLED FOR THE WHOLE PACK: Ganesh is drawn as a
 * figure, and that is the correct call here. The Muslim pack's rule against
 * drawing any figure is specific to Islam and does not travel — a Hindu card is
 * the ordinary place for a murti, and an aniconic stand-in such as a modak or a
 * pair of footprints would be the strange choice, not the cautious one. Head
 * only: trunk, both ears, crown. Do not reopen this per ornament.
 */
export interface HinduOrnamentEntry {
  id: HinduOrnamentId;
  /** Shown under the chip in the editor. Latin script only. */
  label: string;
  Component: Ornament;
  /**
   * What `size` the editor's chip preview should render this at.
   *
   * Per ornament rather than one shared number, because `size` measures the
   * *longer* side: one value that makes the kalash 40px tall makes the garland
   * 40px wide and 8px high, which in a chip is a smudge. These are picked so
   * each drawing fills roughly the same 84x40 box — and so that every chip's
   * stroke lands between 0.65 and 0.85 device px, the same band the Muslim
   * chips sit in. Change one of these and check that number too: `strokeWidth`
   * is in viewBox units, so a new `chipSize` silently rescales the ink.
   */
  chipSize: number;
  /**
   * Whether this ornament may only be placed in the card's top region — the
   * invocation band above the names.
   *
   * True for ganesh and nothing else. It is a field rather than a comment
   * because a comment cannot be read by the code that does the placing: a
   * placer that walks this list must filter on this flag, and one that ignores
   * it is a bug, not a style choice. See the note on the ganesh entry.
   *
   * The Muslim pack has no equivalent because it draws no figure, so every
   * ornament in it is placeable anywhere. If a placer is ever made generic
   * across packs, this is the field it has to honour.
   */
  topRegionOnly: boolean;
}

/**
 * The pack, in the order the editor lays out its chips.
 *
 * Authored order, exactly as handed over. Unlike the Muslim pack, which is
 * resequenced so the three that hang are read first, this one is left in the
 * order supplied — the muted line under the grid names the diya, the kalash and
 * the toran wherever they land in it.
 */
export const HINDU_ORNAMENTS: readonly HinduOrnamentEntry[] = [
  { id: "diya", label: "Diya", Component: Diya, chipSize: 38, topRegionOnly: false },
  {
    id: "kalash",
    label: "Kalash",
    Component: Kalash,
    chipSize: 40,
    topRegionOnly: false,
  },
  {
    /*
      GANESH RENDERS IN THE TOP REGION OF THE CARD ONLY — the invocation band
      above the names, where a murti sits at the head of an invitation. Never in
      the body, never behind text, never repeated down the card, never in a
      corner or a footer. It is a rule about where a deity may appear, not a
      layout preference.

      `topRegionOnly` below is what enforces it; this comment only explains it.
      A placer that reads the flag is correct whether or not anyone reads this.
    */
    id: "ganesh",
    label: "Ganesh",
    Component: Ganesh,
    chipSize: 40,
    topRegionOnly: true,
  },
  { id: "om", label: "Om", Component: Om, chipSize: 42, topRegionOnly: false },
  {
    id: "swastik",
    label: "Swastik",
    Component: Swastik,
    chipSize: 36,
    topRegionOnly: false,
  },
  {
    id: "toran",
    label: "Toran",
    Component: Toran,
    chipSize: 80,
    topRegionOnly: false,
  },
  {
    id: "marigold",
    label: "Marigold garland",
    Component: Marigold,
    chipSize: 84,
    topRegionOnly: false,
  },
];

/** Sits under the ornament grid in the editor. */
export const HINDU_ORNAMENTS_NOTE =
  "Diyas, kalash and torans frame the top of your card.";

const BY_ID: Record<HinduOrnamentId, Ornament> = {
  diya: Diya,
  kalash: Kalash,
  ganesh: Ganesh,
  om: Om,
  swastik: Swastik,
  toran: Toran,
  marigold: Marigold,
};

export function getHinduOrnament(id: HinduOrnamentId): Ornament {
  return BY_ID[id];
}

/**
 * What a card carries before the host touches anything, and what a card is
 * reset to the moment it stops being a Hindu card.
 *
 * Every field is empty or null, so a non-Hindu card that still holds this
 * object renders exactly what it rendered before the pack existed.
 */
export const DEFAULT_HINDU_ORNAMENT_CONFIG: HinduOrnamentConfig = {
  enabledOrnaments: [],
  greetingId: null,
  shlokId: null,
};

export type { Ornament, OrnamentProps };
