"use client";

import { useId, type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { initialsOf } from "@/components/invite/covers/initials";
import { ABOVE_WORDS } from "@/components/invite/covers/layout";
import { stage } from "@/components/invite/covers/timing";
import type { CoverPalette } from "@/lib/coverPalette";
import { PETALS } from "@/lib/petals";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * A leaf's own delay is added to its burst and its fade, and every delay is
 * kept at or under 0.16, so the latest leaf finishes moving at 0.96 and
 * finishes fading on exactly 1. The ground starts to clear almost at once, so
 * the card is showing through while the leaves are still in the air — the
 * scatter is what reveals it, rather than something to wait out first.
 */
const BURST_SHARE = 0.8;
const LEAF_FADE_START = 0.34;
const LEAF_FADE_SHARE = 0.5;
const WREATH_SHARE = 0.36;
const SPARK_START = 0.02;
const SPARK_SHARE = 0.36;
const BACKDROP_START = 0.1;
const BACKDROP_SHARE = 0.7;

/** Fast off the cover, then gliding: a gust, not a push. */
const BURST_EASE = "cubic-bezier(0.16,0.84,0.44,1)";

/** The point on the screen, in percent, that everything is blown away from. */
const CX = 50;
const CY = 42;

/**
 * What a leaf in the table is drawn as, by its `shape`: a rose petal, the
 * same two photographs the card's own falling petals use, for 0 and 3; a leaf
 * of gold, broad or slender, for 1 and 2. Real petals and gilt leaves, rather
 * than four flat silhouettes in one colour at half strength, which is what
 * made the field read as dust on the screen rather than as petals on it.
 */
const PETAL_FOR_SHAPE: Readonly<Record<number, number>> = { 0: 0, 3: 1 };

/** A gilt leaf, drawn pointing up in a 24 × 24 box: broad, or slender. */
const GILT: Readonly<Record<number, { body: string; vein: string }>> = {
  1: {
    body: "M12 1.5 C19 6 19.5 15 12 22.5 C4.5 15 5 6 12 1.5 Z",
    vein: "M12 4 V21 M12 10 L15.5 7.5 M12 14 L16 11 M12 10 L8.5 7.5 M12 14 L8 11",
  },
  2: {
    body: "M12 1 C15.5 7 15.5 15 12 23 C8.5 15 8.5 7 12 1 Z",
    vein: "M12 3 V21",
  },
};

/**
 * How much larger than the table's own sizes everything is drawn. The table
 * was written for leaves at half strength; at full strength and full colour
 * they carry more at a larger size and the field needs no more of them.
 */
const GROW = 1.5;

/** Flecks of gold thrown off the wreath as the gust takes it, in vmin. */
const SPARKS: readonly { angle: number; distance: number; size: number; delay: number }[] = [
  { angle: -90, distance: 34, size: 12, delay: 0 },
  { angle: -50, distance: 30, size: 8, delay: 0.02 },
  { angle: -14, distance: 36, size: 10, delay: 0.01 },
  { angle: 24, distance: 28, size: 7, delay: 0.04 },
  { angle: 60, distance: 32, size: 9, delay: 0.02 },
  { angle: 104, distance: 26, size: 7, delay: 0.05 },
  { angle: 146, distance: 34, size: 10, delay: 0.01 },
  { angle: 190, distance: 30, size: 8, delay: 0.03 },
  { angle: 232, distance: 36, size: 11, delay: 0.02 },
  { angle: 268, distance: 28, size: 7, delay: 0.04 },
];

interface Leaf {
  /** Where it rests, in percent of the screen. */
  x: number;
  y: number;
  /** Its size on a phone, in pixels, before GROW; it grows a little on a larger screen. */
  size: number;
  /** Its resting angle. */
  rotate: number;
  /** What it is drawn as; see PETAL_FOR_SHAPE and GILT. */
  shape: number;
  /** For a gilt leaf: 0 for the leaf's body, 1 for its shade. */
  tone: 0 | 1;
  opacity: number;
  /** The length of its idle sway, in seconds, and how far into it it starts. */
  sway: number;
  phase: number;
  /** How far it turns as it is blown away, in degrees. */
  spin: number;
  /** A share of --cover-ms, kept at or under 0.16 for the reason above. */
  delay: number;
}

interface Speck {
  x: number;
  y: number;
  /** Radius, in pixels. */
  r: number;
  delay: number;
  opacity: number;
}

/**
 * Every leaf, written out by hand.
 *
 * Not generated, and deliberately not random. This renders on the server and
 * again in the browser, and any scatter drawn from Math.random puts a different
 * arrangement in each: React would hydrate onto markup that does not match, and
 * the guest would see the whole field jump on first paint. A fixed table also
 * means the composition can be looked at and adjusted, which a seeded scatter
 * never quite allows.
 *
 * The whole screen is covered now, not a 400 × 300 box in the middle of it, and
 * there are three times as many. The one region left nearly bare is the lower
 * middle, from about 68% down, where the shell prints the names and the prompt:
 * leaves under the words would be leaves the guest has to read through.
 */
const LEAVES: readonly Leaf[] = [
  /* Along the top. */
  { x: 6, y: 6, size: 22, rotate: -30, shape: 1, tone: 0, opacity: 0.5, sway: 4.6, phase: -1.2, spin: -160, delay: 0.06 },
  { x: 18, y: 4, size: 16, rotate: 20, shape: 0, tone: 1, opacity: 0.42, sway: 5.2, phase: -2.8, spin: 140, delay: 0.1 },
  { x: 30, y: 10, size: 26, rotate: -12, shape: 3, tone: 0, opacity: 0.55, sway: 4.1, phase: -0.6, spin: -210, delay: 0.04 },
  { x: 43, y: 5, size: 18, rotate: 35, shape: 2, tone: 1, opacity: 0.45, sway: 5.6, phase: -3.4, spin: 180, delay: 0.12 },
  { x: 56, y: 11, size: 24, rotate: -40, shape: 1, tone: 0, opacity: 0.52, sway: 4.4, phase: -2.1, spin: -150, delay: 0.02 },
  { x: 68, y: 4, size: 20, rotate: 15, shape: 0, tone: 0, opacity: 0.46, sway: 5, phase: -1.7, spin: 200, delay: 0.08 },
  { x: 80, y: 12, size: 28, rotate: -25, shape: 3, tone: 1, opacity: 0.5, sway: 4.8, phase: -3.9, spin: -240, delay: 0.05 },
  { x: 93, y: 6, size: 18, rotate: 40, shape: 2, tone: 0, opacity: 0.44, sway: 5.4, phase: -0.9, spin: 170, delay: 0.14 },

  /* The upper middle. */
  { x: 10, y: 22, size: 24, rotate: 10, shape: 0, tone: 0, opacity: 0.5, sway: 4.3, phase: -2.5, spin: -190, delay: 0.03 },
  { x: 24, y: 26, size: 18, rotate: -45, shape: 2, tone: 1, opacity: 0.4, sway: 5.8, phase: -1.1, spin: 150, delay: 0.13 },
  { x: 38, y: 20, size: 22, rotate: 28, shape: 1, tone: 0, opacity: 0.54, sway: 4.7, phase: -3.1, spin: -130, delay: 0.01 },
  { x: 62, y: 22, size: 20, rotate: -18, shape: 0, tone: 1, opacity: 0.48, sway: 5.1, phase: -0.4, spin: 220, delay: 0.09 },
  { x: 75, y: 28, size: 26, rotate: 32, shape: 1, tone: 0, opacity: 0.53, sway: 4.2, phase: -2.6, spin: -170, delay: 0.04 },
  { x: 90, y: 24, size: 20, rotate: -35, shape: 3, tone: 0, opacity: 0.47, sway: 5.5, phase: -1.8, spin: 160, delay: 0.11 },
  { x: 50, y: 30, size: 16, rotate: 5, shape: 2, tone: 0, opacity: 0.38, sway: 6, phase: -4.2, spin: -120, delay: 0.15 },

  /* The ring round the glow. */
  { x: 4, y: 38, size: 20, rotate: -20, shape: 2, tone: 1, opacity: 0.45, sway: 4.9, phase: -0.7, spin: 190, delay: 0.07 },
  { x: 17, y: 42, size: 28, rotate: 25, shape: 1, tone: 0, opacity: 0.55, sway: 4.5, phase: -3.3, spin: -230, delay: 0.02 },
  { x: 30, y: 36, size: 18, rotate: -38, shape: 0, tone: 0, opacity: 0.44, sway: 5.3, phase: -1.4, spin: 140, delay: 0.1 },
  { x: 44, y: 40, size: 14, rotate: -50, shape: 0, tone: 0, opacity: 0.34, sway: 5.9, phase: -1.3, spin: 120, delay: 0.16 },
  { x: 57, y: 43, size: 14, rotate: 40, shape: 2, tone: 0, opacity: 0.34, sway: 5.4, phase: -3, spin: -130, delay: 0.15 },
  { x: 70, y: 38, size: 22, rotate: 18, shape: 3, tone: 1, opacity: 0.5, sway: 4.6, phase: -2.2, spin: -200, delay: 0.06 },
  { x: 84, y: 44, size: 26, rotate: -28, shape: 1, tone: 0, opacity: 0.54, sway: 4, phase: -0.3, spin: 180, delay: 0.03 },
  { x: 96, y: 36, size: 16, rotate: 42, shape: 0, tone: 0, opacity: 0.4, sway: 5.7, phase: -3.6, spin: -150, delay: 0.13 },
  { x: 36, y: 50, size: 20, rotate: 30, shape: 2, tone: 0, opacity: 0.46, sway: 5, phase: -2.9, spin: 210, delay: 0.08 },
  { x: 64, y: 52, size: 24, rotate: -15, shape: 0, tone: 1, opacity: 0.5, sway: 4.4, phase: -1.6, spin: -160, delay: 0.05 },
  { x: 8, y: 56, size: 24, rotate: 12, shape: 3, tone: 0, opacity: 0.52, sway: 5.2, phase: -2, spin: 170, delay: 0.09 },
  { x: 24, y: 58, size: 18, rotate: -30, shape: 0, tone: 1, opacity: 0.42, sway: 4.8, phase: -3.8, spin: -140, delay: 0.12 },
  { x: 76, y: 58, size: 20, rotate: 36, shape: 2, tone: 0, opacity: 0.46, sway: 5.6, phase: -0.8, spin: 230, delay: 0.1 },
  { x: 92, y: 56, size: 26, rotate: -10, shape: 1, tone: 1, opacity: 0.53, sway: 4.3, phase: -2.7, spin: -180, delay: 0.04 },

  /* Just above the words. */
  { x: 14, y: 66, size: 20, rotate: 22, shape: 1, tone: 0, opacity: 0.48, sway: 4.7, phase: -1.9, spin: -170, delay: 0.07 },
  { x: 34, y: 64, size: 24, rotate: -24, shape: 3, tone: 0, opacity: 0.5, sway: 5.1, phase: -0.5, spin: 190, delay: 0.03 },
  { x: 50, y: 62, size: 18, rotate: 10, shape: 0, tone: 1, opacity: 0.42, sway: 4.5, phase: -2.4, spin: -150, delay: 0.11 },
  { x: 66, y: 64, size: 22, rotate: -36, shape: 1, tone: 0, opacity: 0.5, sway: 5.3, phase: -3.5, spin: 200, delay: 0.06 },
  { x: 86, y: 66, size: 18, rotate: 28, shape: 2, tone: 1, opacity: 0.44, sway: 4.9, phase: -1, spin: -210, delay: 0.12 },

  /* Down the two sides of the words, and along the foot below them. */
  { x: 5, y: 74, size: 24, rotate: -15, shape: 1, tone: 0, opacity: 0.5, sway: 4.4, phase: -2.3, spin: 160, delay: 0.05 },
  { x: 20, y: 76, size: 14, rotate: -12, shape: 0, tone: 0, opacity: 0.34, sway: 5, phase: -1.9, spin: 150, delay: 0.15 },
  { x: 95, y: 76, size: 22, rotate: 30, shape: 3, tone: 0, opacity: 0.5, sway: 5, phase: -0.6, spin: -190, delay: 0.08 },
  { x: 10, y: 86, size: 18, rotate: 40, shape: 0, tone: 1, opacity: 0.42, sway: 5.5, phase: -3.2, spin: 210, delay: 0.1 },
  { x: 92, y: 86, size: 20, rotate: -28, shape: 2, tone: 0, opacity: 0.44, sway: 4.6, phase: -1.5, spin: -160, delay: 0.14 },
  { x: 4, y: 96, size: 22, rotate: 18, shape: 1, tone: 0, opacity: 0.48, sway: 4.9, phase: -2.8, spin: -150, delay: 0.06 },
  { x: 22, y: 97, size: 16, rotate: -40, shape: 2, tone: 1, opacity: 0.4, sway: 5.7, phase: -0.2, spin: 180, delay: 0.12 },
  { x: 40, y: 98, size: 24, rotate: 25, shape: 3, tone: 0, opacity: 0.46, sway: 4.3, phase: -3.7, spin: -220, delay: 0.04 },
  { x: 58, y: 97, size: 18, rotate: -20, shape: 0, tone: 0, opacity: 0.42, sway: 5.2, phase: -1.2, spin: 140, delay: 0.09 },
  { x: 74, y: 96, size: 22, rotate: 35, shape: 1, tone: 1, opacity: 0.46, sway: 4.8, phase: -2.5, spin: -170, delay: 0.13 },
];

/** The finer dust between the leaves. Same rules, same reason. */
const SPECKS: readonly Speck[] = [
  { x: 14, y: 14, r: 2.2, delay: 0.05, opacity: 0.32 },
  { x: 36, y: 15, r: 1.6, delay: 0.1, opacity: 0.26 },
  { x: 52, y: 20, r: 2, delay: 0.02, opacity: 0.3 },
  { x: 72, y: 17, r: 1.8, delay: 0.12, opacity: 0.28 },
  { x: 88, y: 32, r: 1.5, delay: 0.07, opacity: 0.24 },
  { x: 66, y: 31, r: 2.1, delay: 0.14, opacity: 0.3 },
  { x: 42, y: 28, r: 1.7, delay: 0.09, opacity: 0.26 },
  { x: 22, y: 33, r: 1.9, delay: 0.16, opacity: 0.28 },
  { x: 12, y: 48, r: 1.4, delay: 0.15, opacity: 0.22 },
  { x: 30, y: 46, r: 1.6, delay: 0.11, opacity: 0.26 },
  { x: 70, y: 47, r: 2, delay: 0.06, opacity: 0.3 },
  { x: 88, y: 50, r: 1.7, delay: 0.13, opacity: 0.26 },
  { x: 46, y: 57, r: 1.8, delay: 0.08, opacity: 0.28 },
  { x: 58, y: 34, r: 1.5, delay: 0.04, opacity: 0.24 },
  { x: 26, y: 68, r: 1.6, delay: 0.1, opacity: 0.24 },
  { x: 78, y: 70, r: 1.9, delay: 0.15, opacity: 0.28 },
];

/** Rounded to a tenth, so the style strings stay short and easy to read. */
function tenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Where a leaf is blown to, in vmin, relative to where it rests.
 *
 * Always away from the centre and always lifted, so the field opens from the
 * middle and rises rather than blowing sideways: a leaf near the top leaves
 * almost straight up, one near the foot mostly out to the side. Plain
 * arithmetic on the table's own numbers, which comes out the same on the
 * server and in every browser, so it is as safe to hydrate as the table is.
 */
function burstOf(x: number, y: number): { dx: number; dy: number } {
  return {
    dx: tenth((x - CX) * 0.8 + (x < CX ? -10 : 10)),
    dy: tenth((y - CY) * 0.55 - 30),
  };
}

/**
 * A size that is `px` on a phone and grows with the screen, to a cap.
 *
 * The leaves used to live in a drawing that scaled as a whole; now they are
 * placed on the screen itself, and a 20px leaf that is right on a phone is a
 * crumb on a laptop.
 */
function sized(px: number): string {
  return `clamp(${px}px, ${tenth(px * 0.28)}vmin, ${tenth(px * 1.8)}px)`;
}

/**
 * Full strength for the table's opacities, which were written for a faint
 * field: 0.34 comes out at 0.78 and 0.55 at 1, so the depth the table gives
 * the field is kept and only lifted.
 */
function strength(opacity: number): number {
  return tenth(Math.min(1, 0.78 + (opacity - 0.34) * 1.05));
}

/** How many leaves each branch of the laurel carries. */
const LAUREL = 11;

/** A laurel of gilt leaves round the couple's initials: the wreath at the centre of the field. */
function Wreath({
  colors,
  initials,
  namesFont,
  gradientId,
}: {
  colors: CoverPalette;
  initials: string;
  namesFont: CSSProperties;
  gradientId: string;
}): ReactElement {
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" role="presentation" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={colors.foilHi} />
          <stop offset="0.5" stopColor={colors.foil} />
          <stop offset="1" stopColor={colors.foilLo} />
        </linearGradient>
      </defs>
      {/* The ground inside the wreath, so a petal lying under it does not show through. */}
      <circle cx="60" cy="60" r="40" fill={colors.ground} opacity="0.96" />
      <circle cx="60" cy="60" r="36" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.1" />
      <circle cx="60" cy="60" r="33" fill="none" stroke={colors.foil} strokeWidth="0.5" opacity="0.7" />
      {/*
        Two branches of laurel, rising from a knot at the foot and all but
        meeting at the crown, each leaf laid along the branch and tilted off it
        alternately in and out.
      */}
      {([-1, 1] as const).map((side) => (
        <g key={side}>
          {/* The branch itself, up its own side of the ring. */}
          <path
            d={`M${60 + side * 11.9} 104.4 A46 46 0 0 ${side < 0 ? 1 : 0} ${60 + side * 6.4} 14.4`}
            fill="none"
            stroke={colors.foilLo}
            strokeWidth="1"
          />
          {Array.from({ length: LAUREL }, (_, index) => {
            /* Measured from the foot of the ring: 18° just off the knot, 168° just short of the crown. */
            const theta = ((18 + (index / (LAUREL - 1)) * 150) * Math.PI) / 180;
            const x = 60 + side * Math.sin(theta) * 46;
            const y = 60 + Math.cos(theta) * 46;
            /* Along the branch, pointing the way it grows, and tilted off it in and out in turn. */
            const along = (Math.atan2(side * Math.cos(theta), Math.sin(theta)) * 180) / Math.PI;
            const tilt = (index % 2 === 0 ? 1 : -1) * 32;
            const scale = 1 - (index / LAUREL) * 0.3;

            return (
              <path
                key={index}
                d="M0 -7 C3.6 -2.5 3.6 2.5 0 7 C-3.6 2.5 -3.6 -2.5 0 -7 Z"
                fill={`url(#${gradientId})`}
                transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${(along + tilt).toFixed(1)}) scale(${scale.toFixed(2)}) translate(0 -5)`}
              />
            );
          })}
        </g>
      ))}
      {/* The knot the two branches are tied with. */}
      {([-1, 1] as const).map((side) => (
        <g key={side} transform={side < 0 ? undefined : "translate(120 0) scale(-1 1)"}>
          <path d="M60 105 C53 98 47 102 50 107 C52 111 57 109 60 105 Z" fill={`url(#${gradientId})`} />
          <path d="M59 106 L53 118 L56.5 116.5 L57.5 120 L60.5 107 Z" fill={colors.foil} />
        </g>
      ))}
      <circle cx="60" cy="105.5" r="2.4" fill={colors.foil} />
      {initials.length > 0 ? (
        <text
          x="60"
          y="61"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={initials.length > 1 ? 26 : 32}
          fill={colors.text}
          style={namesFont}
        >
          {initials}
        </text>
      ) : (
        <path d="M60 46 L71 60 L60 74 L49 60 Z" fill={`url(#${gradientId})`} />
      )}
      <path d="M44 82 H76" stroke={colors.foil} strokeWidth="0.8" />
      <path d="M60 78 L64 82 L60 86 L56 82 Z" fill={colors.foil} />
    </svg>
  );
}

/**
 * Rose petals and gilt leaves blown off the invitation by one gust.
 *
 * DRESSED, NOT FAINT. The field used to be four flat silhouettes in the
 * accent at half strength, round a muddy glow: dust on the screen. It is rose
 * petals now — the two photographs the card's own falling petals are — and
 * leaves of gold, at full strength and half as large again, round a gilt
 * wreath carrying the couple's initials. The gold is the card's accent worked
 * towards gold; see the dressed tones in lib/coverPalette.ts.
 *
 * THE GUST. The wreath flares and is gone, gold flies off it, and every petal
 * and leaf is blown out from the middle and up, turning over as it goes, while
 * the card shows through underneath.
 *
 * ELEMENTS, NOT SHAPES IN ONE SVG, so the compositor moves each one without
 * repainting the field. Three layers per leaf, because each drives its own
 * transform: the outer is placed on the screen and carries the burst, the
 * middle carries the idle sway (which keeps going through the burst, so a
 * leaf flutters as it flies), and the art inside holds the resting angle.
 */
export default function PetalDustCover({
  phase,
  option,
  reducedMotion,
  colors,
  title,
  namesFont,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";
  const initials = initialsOf(title);
  /* Gradient ids are document-wide; anything but a plain name breaks url(#…). */
  const uid = `petal${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const gilt = [colors.foil, colors.foilLo] as const;

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  const onOpen = (name: string, share: number, start: number, easing: string): string | undefined =>
    opening && !reducedMotion
      ? `${name} calc(var(--cover-ms)*${share}) ${easing} calc(var(--cover-ms)*${start}) both`
      : undefined;

  /* The card's ground, clearing while the leaves are still in the air. */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    transition: transition(stage("opacity", BACKDROP_SHARE, BACKDROP_START, "ease-in-out")),
    opacity: opening ? 0 : 1,
  };

  /** Out from the centre and up, turning over, then fading as it goes. */
  const burstStyle = (dx: number, dy: number, spin: number, delay: number): CSSProperties => ({
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", BURST_SHARE, delay, BURST_EASE),
      stage("opacity", LEAF_FADE_SHARE, delay + LEAF_FADE_START, "ease-in"),
    ),
    transform: opening
      ? `translate3d(${dx}vmin, ${dy}vmin, 0) rotate3d(1, 0.6, 0.2, ${spin}deg) scale(0.8)`
      : "translate3d(0, 0, 0)",
    opacity: opening ? 0 : 1,
  });

  /* The wreath flaring as the gust takes it. */
  const wreathStyle: CSSProperties = {
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", WREATH_SHARE, 0, "cubic-bezier(0.2,0.7,0.4,1)"),
      stage("opacity", WREATH_SHARE * 0.8, WREATH_SHARE * 0.2, "ease-in"),
    ),
    transform: opening ? "scale(1.35)" : "scale(1)",
    opacity: opening ? 0 : 1,
  };

  return (
    <div aria-hidden style={rootStyle} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={backdropStyle} />

      {/* The light under the wreath, breathing, so the middle reads as the place to tap. */}
      {/* Centred on the wreath, in the space above the names; see ABOVE_WORDS. */}
      <div style={ABOVE_WORDS}>
        <div
          className="absolute top-1/2 left-1/2 aspect-square w-[110vmin] -translate-x-1/2 -translate-y-1/2"
        >
          {/*
            The fade on its own layer: a running keyframe owns the opacity of the
            element it runs on, and would hold the glow over the card.
          */}
          <div
            className="absolute inset-0"
            style={{
              transition: transition(stage("opacity", 0.3, 0, "ease-out")),
              opacity: opening ? 0 : 1,
            }}
          >
            <div
              className="absolute inset-0 rounded-full animate-[lifafa-cover-halo_4s_ease-in-out_infinite] motion-reduce:animate-none"
              style={{
                backgroundImage: `radial-gradient(circle, ${colors.foilHi} 0%, transparent 58%)`,
                animationPlayState: opening ? "paused" : "running",
              }}
            />
          </div>
        </div>
      </div>

      {SPECKS.map((speck) => {
        const dx = tenth((speck.x - CX) * 0.5);
        const dy = tenth((speck.y - CY) * 0.3 - 18);

        return (
          <div
            key={`speck-${speck.x}-${speck.y}`}
            className="absolute"
            style={{
              ...burstStyle(dx, dy, 0, speck.delay),
              left: `calc(${speck.x}% - ${speck.r * 1.5}px)`,
              top: `calc(${speck.y}% - ${speck.r * 1.5}px)`,
              width: `${speck.r * 3}px`,
              height: `${speck.r * 3}px`,
            }}
          >
            {/* A glint of gold leaf, its own alpha on this inner layer. */}
            <svg
              viewBox="0 0 10 10"
              className="absolute inset-0 h-full w-full"
              style={{ opacity: strength(speck.opacity) }}
              role="presentation"
              focusable="false"
            >
              <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={colors.foilHi} />
            </svg>
          </div>
        );
      })}

      {LEAVES.map((leaf) => {
        const { dx, dy } = burstOf(leaf.x, leaf.y);
        const size = sized(leaf.size * GROW);
        const petal = PETAL_FOR_SHAPE[leaf.shape];
        const leafArt = GILT[leaf.shape];

        return (
          <div
            key={`leaf-${leaf.x}-${leaf.y}`}
            className="absolute"
            style={{
              ...burstStyle(dx, dy, leaf.spin, leaf.delay),
              left: `calc(${leaf.x}% - ${size} / 2)`,
              top: `calc(${leaf.y}% - ${size} / 2)`,
              width: size,
              height: size,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                animation: reducedMotion
                  ? undefined
                  : `lifafa-leaf-sway ${leaf.sway}s ease-in-out ${leaf.phase}s infinite`,
              }}
            >
              {petal !== undefined ? (
                <img
                  src={PETALS[petal].src}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ transform: `rotate(${leaf.rotate}deg)`, opacity: strength(leaf.opacity) }}
                />
              ) : leafArt !== undefined ? (
                <svg
                  viewBox="0 0 24 24"
                  className="absolute inset-0 h-full w-full"
                  style={{ transform: `rotate(${leaf.rotate}deg)`, opacity: strength(leaf.opacity) }}
                  role="presentation"
                  focusable="false"
                >
                  <path d={leafArt.body} fill={gilt[leaf.tone]} />
                  <path d={leafArt.body} fill={`url(#${uid}-shine)`} />
                  <path
                    d={leafArt.vein}
                    fill="none"
                    stroke={colors.foilHi}
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                </svg>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* The shine every gilt leaf shares: lit at the tip, dark at the stem. */}
      <svg className="absolute h-0 w-0" role="presentation" focusable="false">
        <defs>
          <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={colors.foilHi} stopOpacity="0.85" />
            <stop offset="0.55" stopColor={colors.foilHi} stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>
        </defs>
      </svg>

      {/* The wreath, with the couple's initials at its heart. */}
      {/* The wreath takes the space above the names; see ABOVE_WORDS. */}
      <div style={ABOVE_WORDS}>
        <div
          className="relative aspect-square w-[min(52vmin,260px)] shrink-0"
          style={{ width: "min(52vmin, 260px, 64cqh)" }}
        >
          {/*
            Still, not breathing: the glow behind it already says "tap here", and
            a wreath of this many shapes scaling on a loop was the most expensive
            thing on the cover — it cost a third of the frame rate on a slow
            phone for a movement nobody would miss.
          */}
          <div className="absolute inset-0" style={wreathStyle}>
            <Wreath colors={colors} initials={initials} namesFont={namesFont} gradientId={`${uid}-wreath`} />
          </div>
  
          {/* The flash as the gust takes it, and the gold thrown off. */}
          <div
            className="absolute -inset-[40%] rounded-full opacity-0"
            style={{
              backgroundImage: `radial-gradient(circle, ${colors.foilHi} 0%, transparent 58%)`,
              animation: onOpen("lifafa-cover-flash", 0.4, 0, "cubic-bezier(0.2,0.6,0.4,1)"),
            }}
          />
          {SPARKS.map((spark, index) => {
            const radians = (spark.angle * Math.PI) / 180;
  
            return (
              <span
                key={index}
                className="absolute top-1/2 left-1/2 opacity-0"
                style={
                  {
                    width: spark.size,
                    height: spark.size,
                    marginLeft: -spark.size / 2,
                    marginTop: -spark.size / 2,
                    "--dx": `${tenth(Math.cos(radians) * spark.distance)}vmin`,
                    "--dy": `${tenth(Math.sin(radians) * spark.distance)}vmin`,
                    animation: onOpen(
                      "lifafa-cover-spark",
                      SPARK_SHARE,
                      SPARK_START + spark.delay,
                      "cubic-bezier(0.15,0.7,0.4,1)",
                    ),
                  } as CSSProperties
                }
              >
                <svg viewBox="0 0 10 10" className="h-full w-full" role="presentation" focusable="false">
                  <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={index % 3 === 0 ? colors.foilHi : colors.foil} />
                </svg>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
