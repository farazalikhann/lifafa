"use client";

import type { CSSProperties, ReactElement } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Motif } from "@/lib/motifs";
import type { DecorIntensity, DecorMotion } from "@/types/card";

interface DecorShape {
  /**
   * Percentages within the layer, so the table is resolution independent.
   *
   * Deliberately allowed outside 0-100: an ornament that runs off the edge and
   * is clipped by the canvas reads as a border the card sits inside, where the
   * same shape tucked fully into view reads as a sticker.
   */
  left: number;
  top: number;
  /** Seconds. */
  delay: number;
  duration: number;
}

/**
 * Fixed shape table — deliberately hardcoded.
 *
 * Math.random would produce different positions on the server and in the
 * browser, which React reports as a hydration mismatch. These values are hand
 * picked to look scattered while staying identical on both sides of the wire.
 *
 * Every third row is an edge row — eight of the twenty four, four down each
 * side — so the ornament frames the column of text rather than settling evenly
 * across it. Every third row is also what the shorter slices take, so the
 * framing survives at every intensity instead of only appearing once the tail
 * of the table is in play.
 */
const SHAPES: readonly DecorShape[] = [
  { left: -2, top: 14, delay: 0, duration: 15 } /* edge */,
  { left: 34, top: 30, delay: 2.4, duration: 18 },
  { left: 58, top: 62, delay: 1.1, duration: 16 },
  { left: 90, top: 8, delay: 4.2, duration: 19 } /* edge */,
  { left: 22, top: 74, delay: 0.7, duration: 14 },
  { left: 66, top: 22, delay: 3.3, duration: 17 },
  { left: 2, top: 52, delay: 5.1, duration: 20 } /* edge */,
  { left: 46, top: 44, delay: 2.9, duration: 15 },
  /* Rows 9-14 join at "normal"; 15 and 16 are only reached at "lively". */
  { left: 72, top: 84, delay: 6.0, duration: 18 },
  { left: 92, top: 40, delay: 1.8, duration: 16 } /* edge */,
  { left: 30, top: 18, delay: 3.9, duration: 21 },
  { left: 54, top: 90, delay: 5.6, duration: 17 },
  { left: -3, top: 82, delay: 2.2, duration: 19 } /* edge */,
  { left: 40, top: 8, delay: 6.8, duration: 15 },
  { left: 62, top: 48, delay: 4.7, duration: 20 },
  { left: 89, top: 68, delay: 0.4, duration: 16 } /* edge */,
  /* Rows 17-24 are no longer reached at any intensity — see INTENSITY. */
  { left: 18, top: 38, delay: 7.4, duration: 17 },
  { left: 50, top: 66, delay: 1.5, duration: 19 },
  { left: 3, top: 26, delay: 5.9, duration: 15 } /* edge */,
  /*
    Moved up and left off (76, 12): at 58px that row's box clipped the corner of
    the (90, 8) edge shape on a 360px screen, and two motifs stacked behind one
    glyph halve the contrast the ceiling was measured to protect.
  */
  { left: 70, top: 2, delay: 3.1, duration: 18 },
  { left: 36, top: 58, delay: 7.9, duration: 16 },
  { left: 93, top: 92, delay: 2.6, duration: 21 } /* edge */,
  { left: 26, top: 96, delay: 4.4, duration: 17 },
  { left: 68, top: 36, delay: 6.3, duration: 20 },
];

/**
 * Rendered sizes in px, cycled across the shape table.
 *
 * Eight entries, still coprime with the every-third-row edge stride, which is
 * what stops the edge shapes from all coming out the same size.
 *
 * The top of the range is cut by a third — 64px down to 43px. A 64px motif on
 * a 360px screen is a ninth of the card's width and stops being background:
 * it reads as a picture the text happens to be sitting on. The floor stays at
 * 18px, where a motif's inner detail is still legible, so what has changed is
 * the spread rather than the whole scale.
 */
const SIZE_STEPS: readonly number[] = [24, 34, 18, 40, 28, 43, 20, 37];

const SIZE_MIN = 18;
const SIZE_MAX = 43;

/**
 * Rotations in degrees, cycled on their own stride.
 *
 * Seven entries, coprime with both the eight sizes and the three-row edge
 * stride, so size and angle keep recombining across the table instead of
 * locking into one repeating pair.
 *
 * Applied to the inner span rather than the animated one: an animation's
 * transform replaces the element's own outright, so a rotation set on the
 * animated span would vanish the moment the keyframes took over.
 */
const ROTATIONS: readonly number[] = [0, 22, -14, 38, -28, 10, -42];

/**
 * Opacity is derived from size, never authored per shape, and runs backwards:
 * the smallest motif is the most opaque and the largest the faintest.
 *
 * A 43px motif covers nearly six times the area of an 18px one, so matching
 * their alphas would let the big shapes dominate the card and crowd the text
 * they sit behind. Tying the two together is what lets the ornament grow
 * without gaining weight.
 *
 * The whole range is pulled down — 0.38/0.18 to 0.22/0.10 — because at the old
 * top end the scatter was competing with the names rather than sitting behind
 * them. This is decor that has to survive being read straight through.
 */
const OPACITY_AT_SMALLEST = 0.22;
const OPACITY_AT_LARGEST = 0.1;

/** Above this a shape is softened, so it reads as depth rather than as an icon. */
const BLUR_MIN_SIZE = 36;
const BLUR_RADIUS = "0.5px";

/**
 * Rounded to three places, which is finer than the eye can separate and keeps
 * the value out of the markup as "0.2669565217391304" — the interpolation
 * lands on repeating fractions, and every one of those digits would otherwise
 * be shipped to the browser on every shape.
 */
function opacityForSize(size: number): number {
  const span = SIZE_MAX - SIZE_MIN;
  const t = Math.min(1, Math.max(0, (size - SIZE_MIN) / span));
  const alpha =
    OPACITY_AT_SMALLEST + t * (OPACITY_AT_LARGEST - OPACITY_AT_SMALLEST);

  return Math.round(alpha * 1000) / 1000;
}

/**
 * Intensity tiers.
 *
 * The three differ in how many shapes they scatter and how large those shapes
 * may get, not in how loud each one is — total visual weight is the thing being
 * held roughly level, and count multiplies it far faster than alpha does.
 *
 * "subtle" caps size rather than scaling it, so its shapes stay at or above the
 * 18px floor where a motif's inner detail is still legible; a flat multiplier
 * would have shrunk the small end back into the specks this table exists to fix.
 * Its opacityScale then trims the extra alpha those smaller sizes earn.
 *
 * "lively" also runs shorter durations, so the extra density reads as energy
 * rather than clutter.
 */
const INTENSITY: Record<
  DecorIntensity,
  {
    count: number;
    sizeCap: number;
    opacityScale: number;
    durationScale: number;
  }
> = {
  /*
    Every count is down to roughly 60% of what it was — 8/16/24 to 5/10/14.
    Density multiplies visual weight far faster than alpha does, so thinning the
    scatter is what turns it back into texture; the alpha cut above is the
    second half of the same fix, not a substitute for it.
  */
  subtle: { count: 5, sizeCap: 28, opacityScale: 0.8, durationScale: 1 },
  normal: { count: 10, sizeCap: SIZE_MAX, opacityScale: 1, durationScale: 1 },
  lively: { count: 14, sizeCap: SIZE_MAX, opacityScale: 1, durationScale: 0.7 },
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const KEYFRAME_NAME: Record<Exclude<DecorMotion, "none">, string> = {
  float: "lifafa-decor-float",
  fall: "lifafa-decor-fall",
  drift: "lifafa-decor-drift",
};

/**
 * Decorative background for the card canvas.
 *
 * Sits inside the canvas bounds only — an absolutely positioned layer spanning
 * the whole card, with the shapes held in a sticky band exactly as tall as the
 * visible area. The card scrolls over it; it does not scroll with the card.
 *
 * The clipping on both wrappers is `overflow: clip`, never `overflow: hidden`,
 * and the same is now true of the canvas root above them. That is the whole
 * reason the sticky band works at all: `hidden` makes an element a scroll
 * container, and a sticky child sticks to the nearest one — which, when that
 * container is the card itself, never scrolls, so the band simply sat where it
 * was laid out and drifted away with the content. `clip` clips without
 * creating a scroll container, so the band keeps looking further up for the
 * real scrollport: the guest's screen, or the editor's phone frame.
 *
 * Under reduced motion the layer is removed twice over: `motion-reduce:hidden`
 * covers the server render and the very first paint, and once the media query
 * has been read on the client the component returns null so the shapes leave
 * the DOM altogether rather than merely being display:none. Both are needed —
 * the class alone leaves two dozen elements behind, and the query alone would
 * let one animated frame through before hydration.
 *
 * The motif array is cycled across the fixed position table, so a scatter mixes
 * several different shapes rather than repeating one.
 */
export default function DecorLayer({
  accent,
  motion,
  motifs,
  intensity,
  bandHeight,
  maxAlpha,
}: {
  accent: string;
  motion: DecorMotion;
  motifs: readonly Motif[];
  intensity: DecorIntensity;
  /**
   * How tall the sticky band is — the height of whatever is doing the
   * scrolling.
   *
   * Passed in rather than hardcoded to `100svh`, because the card lives in two
   * very different scrollports: the guest's screen, where the visible area is
   * the viewport, and the editor's fixed phone frame, where a viewport-tall
   * band would scatter most of the motifs outside the frame and show the host
   * a card their guests never receive.
   */
  bandHeight: string;
  /**
   * Ceiling on any one shape's opacity, measured by the canvas against the
   * palette actually in use.
   *
   * The tables above are authored for what looks right; this is what the
   * palette can carry before text sitting over a motif drops below 4.5:1, and
   * those are not the same number on every palette — a bright gold on near
   * black washes out far faster than a muted green does, and a host who
   * overrides the accent moves the answer again.
   */
  maxAlpha: number;
}): ReactElement | null {
  /* Read before any early return — a hook may not sit behind a branch. */
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  if (prefersReducedMotion || motion === "none" || motifs.length === 0) {
    return null;
  }

  const keyframe = KEYFRAME_NAME[motion];
  const tier = INTENSITY[intensity];
  const shapes = SHAPES.slice(0, tier.count);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-clip motion-reduce:hidden"
    >
      {/*
        Pinned flush to the top of the scrollport and exactly as tall as it, so
        the scatter covers the whole visible area edge to edge rather than a
        band somewhere down the middle of it.
      */}
      <div
        className="sticky top-0 w-full overflow-clip"
        style={{ height: bandHeight }}
      >
        {shapes.map((shape, index) => {
          /* Cycle the motifs across the fixed positions. */
          const MotifShape = motifs[index % motifs.length];

          const size = Math.min(
            SIZE_STEPS[index % SIZE_STEPS.length],
            tier.sizeCap,
          );
          const rotation = ROTATIONS[index % ROTATIONS.length];
          const opacity =
            Math.round(
              Math.min(maxAlpha, opacityForSize(size) * tier.opacityScale) *
                1000,
            ) / 1000;

          const style: CSSProperties = {
            left: `${shape.left}%`,
            top: `${shape.top}%`,
            /* Motifs draw with currentColor, so the accent is set here. */
            color: accent,
            animationName: keyframe,
            animationDuration: `${(shape.duration * tier.durationScale).toFixed(2)}s`,
            animationDelay: `${shape.delay}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationFillMode: "both",
          };

          return (
            <span
              key={`${shape.left}-${shape.top}-${index}`}
              className="absolute block"
              style={style}
            >
              {/*
                Base opacity lives on this inner span, not the animated one:
                the float and fall keyframes animate opacity themselves and
                would otherwise override it, making the decor far too loud.
                Nested opacity multiplies, which is what we want.

                Rotation and blur ride here for the same reason. Both are
                static — nothing in the keyframes touches filter or this
                element's transform — so the animation is still opacity and
                transform only, on one element per shape.
              */}
              <span
                className="block"
                style={{
                  opacity,
                  transform: `rotate(${rotation}deg)`,
                  filter:
                    size >= BLUR_MIN_SIZE ? `blur(${BLUR_RADIUS})` : undefined,
                }}
              >
                <MotifShape size={size} />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Thin accent flourish used between sections and inside the cover. */
export function CardFlourish({
  accent,
  className = "",
}: {
  accent: string;
  className?: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 120 14"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke={accent}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-[14px] w-[110px] shrink-0 ${className}`}
    >
      <path d="M4 7 H44" />
      <path d="M76 7 H116" />
      <path d="M60 1.5 L66.5 7 L60 12.5 L53.5 7 Z" />
      <path d="M48 7 L51 4.5 M48 7 L51 9.5" />
      <path d="M72 7 L69 4.5 M72 7 L69 9.5" />
    </svg>
  );
}
