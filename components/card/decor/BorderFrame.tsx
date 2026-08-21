"use client";

import { useId, type ReactElement, type ReactNode } from "react";
import type { CardBorderStyle } from "@/types/card";

/**
 * The decorative frame around the card's edges.
 *
 * INDEPENDENT OF TRADITION, and the only piece of decor on the card that is.
 * An ornament pack says something about whose wedding this is; a border is
 * stationery. Every style here is offered on every card, and nothing in this
 * file reads `traditionId`.
 *
 * NOTHING STRETCHES. That is the constraint the whole file is built around: a
 * card is one screen tall in the editor and five screens tall on a phone, and
 * one drawing scaled to fit that box would smear the motif beyond recognition
 * on the long one. So the four edges are not drawn — they are *tiled*. Each
 * edge is a `<rect>` filled by an SVG pattern in `userSpaceOnUse` units inside
 * an svg with no viewBox, which makes one user unit exactly one CSS pixel: the
 * tile is the same size on every card, and a taller edge simply gets more
 * repeats. The corners are the opposite case — they must stay square and must
 * not repeat — so each is its own svg with a `viewBox` and
 * `preserveAspectRatio="xMidYMid meet"`, sized to match its viewBox 1:1.
 *
 * The one style that is a single drawing rather than a run, the garland, keeps
 * its aspect ratio through the same `preserveAspectRatio` rather than being
 * stretched to the card's width.
 *
 * PINNED, not scrolled — the same sticky band DecorLayer and CornerLayer use,
 * so the frame surrounds what the guest is looking at instead of running off
 * the top of the screen after the cover.
 *
 * The band is measured in `dvh` rather than `svh`, which is what stopped the
 * bottom edge turning up in the middle of the screen. `svh` is the *smallest*
 * the viewport ever gets — the state with the address bar fully shown — so as
 * soon as Chrome on Android collapses that bar the visible area is taller than
 * the band, and a frame that ends where the band ends stops reaching the bottom
 * of the screen. `dvh` follows the viewport as it actually is.
 *
 * It frames the screen, not the content, and it holds `z-[16]` — above the
 * text at `z-10` and above the dissolve at `z-[12]`, so the frame keeps full
 * opacity at exactly the edges where that dissolve is strongest.
 *
 * NOTHING HERE ANIMATES. There are no keyframes, no transitions and no
 * `animation` property in this file, so `prefers-reduced-motion` has nothing to
 * suppress: a guest who has asked for less movement gets exactly the frame
 * everyone else gets, which is the right answer for ornament that is not in
 * motion to begin with.
 */

/** Rendered stroke weight, in CSS px. Fine enough to read as ornament. */
const STROKE = 1.2;

/**
 * How far the frame sits in from the edge of the screen, in px.
 *
 * Small on purpose. A frame flush to the edge reads as a browser artefact
 * rather than as stationery, and anything much larger leaves a band of bare
 * background outside it that looks like the card failed to fill the screen.
 * 8px is enough to say "inset" and not enough to be a gap.
 */
const SCREEN_INSET = 8;

/** Held well under half, so the frame never competes with the names. */
const FRAME_OPACITY = 0.5;

/* Two places is finer than a subpixel at these sizes, and keeps markup short. */
function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A five petal flower centred on (cx, cy) with its tips at `radius`.
 *
 * Generated rather than hand authored because it is drawn at eight different
 * sizes across the five styles, and five petals struck by hand at each size is
 * five chances for one of them to come out lopsided.
 */
function flowerPath(
  cx: number,
  cy: number,
  radius: number,
  phaseDeg: number = -90,
): string {
  const parts: string[] = [];

  for (let index = 0; index < 5; index += 1) {
    const angle = ((phaseDeg + index * 72) * Math.PI) / 180;
    /* How far the petal's shoulders sit off its axis. 0.62rad reads as a petal. */
    const spread = 0.62;

    const tipX = cx + Math.cos(angle) * radius;
    const tipY = cy + Math.sin(angle) * radius;
    const leftX = cx + Math.cos(angle - spread) * radius * 0.92;
    const leftY = cy + Math.sin(angle - spread) * radius * 0.92;
    const rightX = cx + Math.cos(angle + spread) * radius * 0.92;
    const rightY = cy + Math.sin(angle + spread) * radius * 0.92;

    parts.push(
      `M ${r2(cx)} ${r2(cy)} Q ${r2(leftX)} ${r2(leftY)} ${r2(tipX)} ${r2(tipY)} Q ${r2(rightX)} ${r2(rightY)} ${r2(cx)} ${r2(cy)} Z`,
    );
  }

  return parts.join(" ");
}

/** An almond leaf growing from (x, y), `length` long, at `angleDeg`. */
function leafPath(
  x: number,
  y: number,
  length: number,
  angleDeg: number,
  fatness: number = 0.4,
): string {
  const angle = (angleDeg * Math.PI) / 180;
  const tipX = x + Math.cos(angle) * length;
  const tipY = y + Math.sin(angle) * length;
  const midX = x + Math.cos(angle) * length * 0.5;
  const midY = y + Math.sin(angle) * length * 0.5;
  /* Normal to the leaf's axis — the two control points ride either side of it. */
  const offX = -Math.sin(angle) * length * fatness;
  const offY = Math.cos(angle) * length * fatness;

  return [
    `M ${r2(x)} ${r2(y)}`,
    `Q ${r2(midX + offX)} ${r2(midY + offY)} ${r2(tipX)} ${r2(tipY)}`,
    `Q ${r2(midX - offX)} ${r2(midY - offY)} ${r2(x)} ${r2(y)} Z`,
  ].join(" ");
}

/** A point on a quadratic Bezier, so a flower lands *on* the swag, not near it. */
function onQuadratic(
  start: readonly [number, number],
  control: readonly [number, number],
  end: readonly [number, number],
  t: number,
): readonly [number, number] {
  const inverse = 1 - t;

  return [
    r2(
      inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0],
    ),
    r2(
      inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1],
    ),
  ];
}

/* ---------------------------------------------------------------------------
   Style specs

   `band` is how deep an edge run is, `tile` how long one repeat is, and
   `corner` the side of the square each corner piece occupies. Every one of
   them is in CSS px, because the edge svgs carry no viewBox and so measure in
   px directly — which is exactly what stops the tile from resizing with the
   card.
   --------------------------------------------------------------------------- */

interface BorderSpec {
  band: number;
  tile: number;
  corner: number;
  /** Whether the repeating run goes all the way round or nowhere. */
  hasEdges: boolean;
  /**
   * How far the rest of the card must stay clear of the frame, in px.
   *
   * Read by CardCanvas, which is the only thing on the card that draws to its
   * own edges: the mosque arch frames the cover from `inset-x-4`, which is
   * inside every one of these bands. Published here rather than guessed there,
   * so a band that gets deeper pushes the arch in with it.
   */
  clearance: { x: number; y: number };
}

const SPECS: Record<Exclude<CardBorderStyle, "none">, BorderSpec> = {
  /* The richest of the five: a full vine on all four sides. */
  floralVine: {
    band: 20,
    tile: 30,
    corner: 40,
    hasEdges: true,
    clearance: { x: 28, y: 30 },
  },
  /* Corners only — the edges are deliberately bare, so nothing runs down them. */
  cornerSprigs: {
    band: 0,
    tile: 0,
    corner: 60,
    hasEdges: false,
    clearance: { x: 24, y: 26 },
  },
  geometricRule: {
    band: 14,
    tile: 24,
    corner: 26,
    hasEdges: true,
    clearance: { x: 22, y: 24 },
  },
  scallopedFrame: {
    band: 16,
    tile: 24,
    corner: 28,
    hasEdges: true,
    clearance: { x: 24, y: 26 },
  },
  /* Top edge only, and one drawing rather than a run — see GarlandDrawing. */
  hangingGarland: {
    band: 0,
    tile: 0,
    corner: 0,
    hasEdges: false,
    clearance: { x: 16, y: 96 },
  },
};

/**
 * How far anything else on the card should stay clear of the frame.
 *
 * Exported because the collision is real and specific: the Muslim mosque arch
 * is drawn to the cover's own edges, and on a 360px screen its jambs land
 * inside every band above. The arch is the one that moves — a frame that had to
 * dodge the contents of the card would stop being a frame — so the canvas reads
 * this and insets the arch until it sits inside the border rather than across
 * it. Returns zeroes for "none", which leaves the arch exactly where it was.
 */
export function borderClearance(style: CardBorderStyle): {
  x: number;
  y: number;
} {
  return style === "none" ? { x: 0, y: 0 } : SPECS[style].clearance;
}

/* ---------------------------------------------------------------------------
   Tiles

   Every tile is authored in a `tile` wide by `band` deep box with y = 0 at the
   *outer* edge of the card and y = band pointing inward. One orientation is
   authored; the other three edges are that same tile rotated or mirrored, so a
   change to the drawing reaches all four sides at once.
   --------------------------------------------------------------------------- */

/** The vine's stem, waving once across the tile and level at both ends. */
const VINE_STEM = "M 0 10 C 5 3 10 3 15 10 C 20 17 25 17 30 10";

/** Sides: the full vine, with a flower on the crest and a leaf in the trough. */
function floralVineRich(): ReactNode {
  return (
    <>
      <path d={VINE_STEM} />
      <path d={flowerPath(8, 5.4, 3.4)} />
      <path d={leafPath(21.5, 14.4, 6.4, 118)} />
      <path d={leafPath(26.5, 12, 4.6, 38)} />
      <circle cx={15} cy={10} r={0.9} />
    </>
  );
}

/**
 * Top and bottom: the same stem and the same wave, with the flower dropped for
 * a bud.
 *
 * A lighter run on the horizontals is not a shortcut — the two long sides are
 * what the eye reads as the border, and repeating the full flower across the
 * top as well turns a frame into a wallpaper. This closes the frame without
 * competing with the sides.
 */
function floralVineLight(): ReactNode {
  return (
    <>
      <path d={VINE_STEM} />
      <path d={leafPath(8, 5.6, 5.6, -58)} />
      <path d={leafPath(22, 14.4, 5.6, 122)} />
      <circle cx={15} cy={10} r={1.1} />
    </>
  );
}

/** Two hairlines inset from the edge. A straight run tiles with no seam at all. */
function geometricRuleTile(): ReactNode {
  return (
    <>
      <path d="M 0 5 H 24" />
      <path d="M 0 9.5 H 24" />
    </>
  );
}

/** One scallop hanging inward off a straight outer rule, with a bead at its dip. */
function scallopedTile(): ReactNode {
  return (
    <>
      <path d="M 0 3 H 24" />
      <path d="M 0 5.5 Q 12 16.5 24 5.5" />
      <circle cx={12} cy={12.4} r={1.1} />
      <circle cx={0} cy={5.5} r={0.9} />
    </>
  );
}

/* ---------------------------------------------------------------------------
   Corners

   Authored for the top left, with (0, 0) at the outer corner, and mirrored into
   the other three. Each is drawn in a viewBox whose side equals the rendered px
   size, so the authored 1.2 unit stroke lands as a 1.2px line.
   --------------------------------------------------------------------------- */

/** The vine turning the corner, with the flower on the elbow. */
function floralVineCorner(): ReactNode {
  return (
    <>
      {/* Picks the stem up at x = 10 on the left edge and hands it back at y = 10 on the top. */}
      <path d="M 10 40 C 10 22 22 10 40 10" />
      <path d={flowerPath(17.5, 17.5, 4.6, -135)} />
      <path d={leafPath(13.5, 29, 7, -72)} />
      <path d={leafPath(29, 13.5, 7, 198)} />
      <circle cx={10} cy={38.5} r={0.9} />
      <circle cx={38.5} cy={10} r={0.9} />
    </>
  );
}

/** A spray fanning out of the corner. The whole of this style, four times over. */
function cornerSprigCorner(): ReactNode {
  return (
    <>
      {/* Three stems out of one root, so the spray reads as one plant. */}
      <path d="M 8 8 C 20 11 32 14 50 12" />
      <path d="M 8 8 C 11 20 14 32 12 50" />
      <path d="M 8 8 C 17 17 24 25 30 34" />

      {/* Leaves down the two long stems. */}
      <path d={leafPath(19, 10.4, 8, -46)} />
      <path d={leafPath(31, 13, 8, -24)} />
      <path d={leafPath(10.4, 19, 8, 44)} />
      <path d={leafPath(13, 31, 8, 66)} />
      <path d={leafPath(21, 24, 7, 6)} />

      {/* Flowers at the tips, largest on the diagonal so the spray has a head. */}
      <path d={flowerPath(50, 12, 4.4)} />
      <path d={flowerPath(12, 50, 4.4)} />
      <path d={flowerPath(31.5, 35.5, 5.2, -120)} />
      <circle cx={8} cy={8} r={1.4} />
    </>
  );
}

/** The double rule turning the corner, with an interlaced knot on the elbow. */
function geometricRuleCorner(): ReactNode {
  return (
    <>
      <path d="M 5 26 V 5 H 26" />
      <path d="M 9.5 26 V 9.5 H 26" />
      {/* Diamond over square — two figures crossing, which is what makes it a knot. */}
      <path d="M 7.25 2.6 L 11.9 7.25 L 7.25 11.9 L 2.6 7.25 Z" />
      <path d="M 4.4 4.4 H 10.1 V 10.1 H 4.4 Z" />
      <circle cx={7.25} cy={7.25} r={1.1} />
    </>
  );
}

/** The outer rule turning the corner, with one scallop struck across it. */
function scallopedCorner(): ReactNode {
  return (
    <>
      <path d="M 3 28 V 3 H 28" />
      <path d="M 5.5 28 Q 5.5 5.5 28 5.5" />
      <path d="M 9 28 Q 9 9 28 9" />
      <circle cx={13.5} cy={13.5} r={1.4} />
    </>
  );
}

/* ---------------------------------------------------------------------------
   Garland — the one style that is a drawing rather than a run
   --------------------------------------------------------------------------- */

const SWAG_START: readonly [number, number] = [22, 16];
const SWAG_CONTROL: readonly [number, number] = [180, 92];
const SWAG_END: readonly [number, number] = [338, 16];

/** Where the flowers sit along the swag. Fixed — never generated. */
const SWAG_STOPS: readonly number[] = [0.1, 0.24, 0.38, 0.5, 0.62, 0.76, 0.9];

/** Radii for those stops, largest at the dip so the swag has a centre. */
const SWAG_RADII: readonly number[] = [3.4, 4.2, 5, 5.8, 5, 4.2, 3.4];

/**
 * A swag draped across the top edge, dipping in the middle, tied off at each
 * end with a short strand trailing down.
 *
 * Authored at 360 x 104 and scaled as a whole — never stretched. The card runs
 * between 360px and its 420px cap, so `xMidYMid meet` scales the drawing by at
 * most 1.17 and centres it; the swag stays a swag at every width instead of
 * flattening out on the wide one.
 */
function GarlandDrawing(): ReactElement {
  return (
    <>
      {/* Two cords, the second slacker, so the swag has depth rather than being a wire. */}
      <path
        d={`M ${SWAG_START[0]} ${SWAG_START[1]} Q ${SWAG_CONTROL[0]} ${SWAG_CONTROL[1]} ${SWAG_END[0]} ${SWAG_END[1]}`}
      />
      <path
        d={`M ${SWAG_START[0]} ${SWAG_START[1]} Q ${SWAG_CONTROL[0]} ${SWAG_CONTROL[1] + 14} ${SWAG_END[0]} ${SWAG_END[1]}`}
      />

      {/* Leaves on the slack cord, angled with the fall of the swag. */}
      {SWAG_STOPS.map((t, index) => {
        const [x, y] = onQuadratic(
          SWAG_START,
          [SWAG_CONTROL[0], SWAG_CONTROL[1] + 14],
          SWAG_END,
          t,
        );
        /* Roughly tangent to the cord: down-and-out on the way in, mirrored after. */
        const angle = t < 0.5 ? 118 : 62;

        return (
          <path key={`leaf-${index}`} d={leafPath(x, y, 11, angle, 0.34)} />
        );
      })}

      {/* Flowers on the taut cord. */}
      {SWAG_STOPS.map((t, index) => {
        const [x, y] = onQuadratic(SWAG_START, SWAG_CONTROL, SWAG_END, t);

        return (
          <g key={`flower-${index}`}>
            <path d={flowerPath(x, y, SWAG_RADII[index])} />
            <circle cx={x} cy={y} r={1} />
          </g>
        );
      })}

      {/* Tie-offs, and the strands trailing from them. */}
      <circle cx={SWAG_START[0]} cy={SWAG_START[1]} r={2.2} />
      <circle cx={SWAG_END[0]} cy={SWAG_END[1]} r={2.2} />

      <path d="M 22 18 C 15 34 19 50 12 66" />
      <path d={leafPath(17.5, 33, 10, 140, 0.34)} />
      <path d={leafPath(17, 50, 9, 118, 0.34)} />
      <path d={flowerPath(12, 68, 4)} />

      <path d="M 338 18 C 345 34 341 50 348 66" />
      <path d={leafPath(342.5, 33, 10, 40, 0.34)} />
      <path d={leafPath(343, 50, 9, 62, 0.34)} />
      <path d={flowerPath(348, 68, 4)} />
    </>
  );
}

/* ---------------------------------------------------------------------------
   Assembly
   --------------------------------------------------------------------------- */

/** Which tile each style runs down its sides, and which across its ends. */
function tilesFor(style: Exclude<CardBorderStyle, "none">): {
  horizontal: ReactNode;
  vertical: ReactNode;
  corner: ReactNode;
} {
  switch (style) {
    case "floralVine":
      return {
        horizontal: floralVineLight(),
        vertical: floralVineRich(),
        corner: floralVineCorner(),
      };
    case "cornerSprigs":
      return { horizontal: null, vertical: null, corner: cornerSprigCorner() };
    case "geometricRule":
      return {
        horizontal: geometricRuleTile(),
        vertical: geometricRuleTile(),
        corner: geometricRuleCorner(),
      };
    case "scallopedFrame":
      return {
        horizontal: scallopedTile(),
        vertical: scallopedTile(),
        corner: scallopedCorner(),
      };
    case "hangingGarland":
      return { horizontal: null, vertical: null, corner: null };
  }
}

/** Shared drawing attributes. Applied per group, never inherited across svgs. */
const INK = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: STROKE,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** One corner piece: its own square viewBox, so it can never come out oval. */
function Corner({
  size,
  children,
  position,
  flipX,
  flipY,
}: {
  size: number;
  children: ReactNode;
  position: React.CSSProperties;
  flipX: boolean;
  flipY: boolean;
}): ReactElement {
  return (
    <svg
      className="absolute"
      style={{
        ...position,
        width: size,
        height: size,
        transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
      }}
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      {...INK}
    >
      {children}
    </svg>
  );
}

/** One tiled edge: a plain rect, painted with the repeating pattern. */
function Edge({
  position,
  patternId,
  flipX,
  flipY,
}: {
  position: React.CSSProperties;
  patternId: string;
  flipX: boolean;
  flipY: boolean;
}): ReactElement {
  return (
    <div
      className="absolute"
      style={{
        ...position,
        transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
      }}
    >
      {/*
        No viewBox, deliberately: without one, a user unit is a CSS pixel, the
        pattern's `userSpaceOnUse` tile is the size it says it is, and a long
        edge gets more repeats rather than a longer motif.
      */}
      <svg
        width="100%"
        height="100%"
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x={0}
          y={0}
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
          stroke="none"
        />
      </svg>
    </div>
  );
}

export default function BorderFrame({
  borderStyle,
  accent,
  bandHeight,
}: {
  borderStyle: CardBorderStyle;
  /** The card's resolved accent. Everything below draws with `currentColor`. */
  accent: string;
  /**
   * Height of whatever is scrolling the card, exactly as DecorLayer takes it.
   *
   * The frame is pinned rather than laid out once down the card, so it needs to
   * know how tall "what the guest can see" is — the screen for a guest, the
   * editor's fixed frame for a host.
   */
  bandHeight: string;
}): ReactElement | null {
  /*
    Pattern ids have to be unique per mounted frame — the editor renders the
    card twice at once, inline and in the full screen preview — and identical
    between the server render and the client one, or React reports a mismatch.
    `useId` is exactly that guarantee, which is why it is used here rather than
    a counter or anything derived from the clock. Its output carries the
    separators React reserves for itself, which are not valid inside a `url(#…)`
    reference, so they are stripped.
  */
  const rawId = useId();
  const uid = `lifafa-border-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  if (borderStyle === "none") {
    return null;
  }

  const spec = SPECS[borderStyle];
  const tiles = tilesFor(borderStyle);
  const horizontalPattern = `${uid}-h`;
  const verticalPattern = `${uid}-v`;

  /* Corners sit at the card's own corners; the runs start where they end. */
  const inset = spec.corner;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[16] overflow-clip"
    >
      {/*
        The inset lives on the sticky band rather than on the wrapper around it.
        The wrapper has to stay at `inset-0` — it is what clips the frame to the
        card — and a sticky element offset from its own wrapper still pins to
        the scrollport, so `top` here is measured from the top of the screen and
        the margins from its sides. Both edges of the height come off the band
        so the bottom rail sits the same 8px up from the foot of the screen as
        the top rail sits down from its head.
      */}
      <div
        className="sticky overflow-clip"
        style={{
          top: SCREEN_INSET,
          height: `calc(${bandHeight} - ${SCREEN_INSET * 2}px)`,
          marginLeft: SCREEN_INSET,
          marginRight: SCREEN_INSET,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ color: accent, opacity: FRAME_OPACITY }}
        >
          {/*
            One hidden svg holding every pattern, referenced by id from the
            edges below. Patterns defined once rather than per edge, so the
            mirrored bottom and right runs are guaranteed to be the same
            drawing as the top and left rather than a copy that could drift.
          */}
          {spec.hasEdges ? (
            <svg
              className="absolute h-0 w-0 overflow-hidden"
              role="presentation"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <pattern
                  id={horizontalPattern}
                  patternUnits="userSpaceOnUse"
                  width={spec.tile}
                  height={spec.band}
                >
                  <g {...INK}>{tiles.horizontal}</g>
                </pattern>

                {/*
                  The same authored tile, stood on end. `rotate(-90)` then a
                  translate along the run maps the tile's outer edge (y = 0) to
                  the outer edge of a vertical band (x = 0) — without the
                  translate the drawing would land on the inside of the card and
                  the vine would run down the wrong side of its own stem.
                */}
                <pattern
                  id={verticalPattern}
                  patternUnits="userSpaceOnUse"
                  width={spec.band}
                  height={spec.tile}
                >
                  <g transform={`rotate(-90) translate(${-spec.tile} 0)`}>
                    <g {...INK}>{tiles.vertical}</g>
                  </g>
                </pattern>
              </defs>
            </svg>
          ) : null}

          {spec.hasEdges ? (
            <>
              <Edge
                position={{ left: inset, right: inset, top: 0, height: spec.band }}
                patternId={horizontalPattern}
                flipX={false}
                flipY={false}
              />
              <Edge
                position={{
                  left: inset,
                  right: inset,
                  bottom: 0,
                  height: spec.band,
                }}
                patternId={horizontalPattern}
                flipX={false}
                flipY
              />
              <Edge
                position={{ top: inset, bottom: inset, left: 0, width: spec.band }}
                patternId={verticalPattern}
                flipX={false}
                flipY={false}
              />
              <Edge
                position={{
                  top: inset,
                  bottom: inset,
                  right: 0,
                  width: spec.band,
                }}
                patternId={verticalPattern}
                flipX
                flipY={false}
              />
            </>
          ) : null}

          {tiles.corner !== null ? (
            <>
              <Corner
                size={spec.corner}
                position={{ top: 0, left: 0 }}
                flipX={false}
                flipY={false}
              >
                {tiles.corner}
              </Corner>
              <Corner
                size={spec.corner}
                position={{ top: 0, right: 0 }}
                flipX
                flipY={false}
              >
                {tiles.corner}
              </Corner>
              <Corner
                size={spec.corner}
                position={{ bottom: 0, right: 0 }}
                flipX
                flipY
              >
                {tiles.corner}
              </Corner>
              <Corner
                size={spec.corner}
                position={{ bottom: 0, left: 0 }}
                flipX={false}
                flipY
              >
                {tiles.corner}
              </Corner>
            </>
          ) : null}

          {borderStyle === "hangingGarland" ? (
            <svg
              className="absolute inset-x-0 top-0 h-auto w-full"
              viewBox="0 0 360 104"
              preserveAspectRatio="xMidYMid meet"
              role="presentation"
              aria-hidden="true"
              focusable="false"
              {...INK}
            >
              <GarlandDrawing />
            </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
}
