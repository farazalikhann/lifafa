"use client";

import { type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";
import { mixHex } from "@/lib/contrast";

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
const GLOW_START = 0;
const GLOW_SHARE = 0.6;
const BACKDROP_START = 0.1;
const BACKDROP_SHARE = 0.7;

/** Fast off the cover, then gliding: a gust, not a push. */
const BURST_EASE = "cubic-bezier(0.16,0.84,0.44,1)";

/** The point on the screen, in percent, that everything is blown away from. */
const CX = 50;
const CY = 42;

/**
 * The four shapes a leaf can be, each drawn pointing up in a 24 × 24 box.
 *
 * `vein` is optional: the petal has none, which is what keeps it reading as a
 * petal among the leaves rather than as one more leaf.
 */
const SHAPES: readonly { body: string; vein?: string }[] = [
  /* Petal: the almond the cover has always scattered. */
  { body: "M12 2 C18 7 18 16 12 22 C6 16 6 7 12 2 Z" },
  /* Broad leaf, with a midrib and two pairs of veins. */
  {
    body: "M12 1.5 C19 6 19.5 15 12 22.5 C4.5 15 5 6 12 1.5 Z",
    vein: "M12 4 V21 M12 10 L15.5 7.5 M12 14 L16 11 M12 10 L8.5 7.5 M12 14 L8 11",
  },
  /* Slender leaf, a willow or a mango leaf. */
  {
    body: "M12 1 C15.5 7 15.5 15 12 23 C8.5 15 8.5 7 12 1 Z",
    vein: "M12 3 V21",
  },
  /* Curled leaf, the same drawing the card's own Leaf motif uses. */
  { body: "M5 19 Q5 8 19 5 Q19 16 5 19 Z", vein: "M5 19 Q11 13 16 9" },
];

interface Leaf {
  /** Where it rests, in percent of the screen. */
  x: number;
  y: number;
  /** Its size on a phone, in pixels; it grows a little on a larger screen. */
  size: number;
  /** Its resting angle. */
  rotate: number;
  /** An index into SHAPES. */
  shape: number;
  /** 0 for the accent, 1 for the accent deepened towards the card's ink. */
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
 * A field of leaves and petals blown off the invitation.
 *
 * ELEMENTS, NOT SHAPES IN ONE SVG. The field used to be one drawing with CSS
 * transforms on its shapes, and browsers do not composite SVG shapes: every
 * frame of the scatter repainted the whole thing on the main thread, which is
 * where a phone drops frames. Each leaf is now its own small element the
 * compositor moves, holding a tiny SVG that is painted once.
 *
 * Three layers per leaf, because each one is driving a different transform and
 * one element can only have one: the outer is placed on the screen and carries
 * the burst, the middle carries the idle sway (which keeps going through the
 * burst, so a leaf flutters as it flies), and the SVG inside holds the leaf's
 * resting angle.
 *
 * Everything is the card's accent — the host's override when they set one — or
 * that accent deepened towards the card's own ink, so the scatter belongs to
 * the invitation underneath it. See lib/coverPalette.ts.
 */
export default function PetalDustCover({
  phase,
  option,
  reducedMotion,
  colors,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";
  const tones = [colors.accent, mixHex(colors.accent, colors.text, 0.3)] as const;

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  /* The card's ground, clearing while the leaves are still in the air. */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    transition: transition(
      stage("opacity", BACKDROP_SHARE, BACKDROP_START, "ease-in-out"),
    ),
    opacity: opening ? 0 : 1,
  };

  /** Out from the centre and up, turning, then fading as it goes. */
  const burstStyle = (
    dx: number,
    dy: number,
    spin: number,
    delay: number,
  ): CSSProperties => ({
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", BURST_SHARE, delay, BURST_EASE),
      stage("opacity", LEAF_FADE_SHARE, delay + LEAF_FADE_START, "ease-in"),
    ),
    transform: opening
      ? `translate3d(${dx}vmin, ${dy}vmin, 0) rotate(${spin}deg) scale(0.85)`
      : "translate3d(0, 0, 0)",
    opacity: opening ? 0 : 1,
  });

  const glowStyle: CSSProperties = {
    transition: transition(
      stage("transform", GLOW_SHARE, GLOW_START, "ease-out"),
      stage("opacity", GLOW_SHARE, GLOW_START, "ease-out"),
    ),
    transform: opening ? "scale(1.7)" : "scale(1)",
    opacity: opening ? 0 : 1,
  };

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0" style={backdropStyle} />

      {/*
        The glow sits behind everything, under the words the shell prints. Its
        idle breath is on an inner element because a CSS animation and a CSS
        transition cannot both drive transform on one element: the animation
        wins, and the expansion would never play.
      */}
      <div
        className="absolute aspect-square w-[90vmin] -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${CX}%`, top: `${CY}%` }}
      >
        <div className="absolute inset-0" style={glowStyle}>
          <div className="absolute inset-0 animate-[lifafa-pulse_6s_ease-in-out_infinite] motion-reduce:animate-none">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full"
              role="presentation"
              focusable="false"
            >
              <defs>
                <radialGradient id="lifafa-petal-glow">
                  <stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
                  <stop offset="55%" stopColor={colors.accent} stopOpacity="0.1" />
                  <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="50" fill="url(#lifafa-petal-glow)" />
            </svg>
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
              left: `calc(${speck.x}% - ${speck.r}px)`,
              top: `calc(${speck.y}% - ${speck.r}px)`,
              width: `${speck.r * 2}px`,
              height: `${speck.r * 2}px`,
            }}
          >
            {/*
              The speck's own alpha lives on this inner layer, so the burst's
              fade on the outer one multiplies it rather than overwriting it.
            */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: colors.accent, opacity: speck.opacity }}
            />
          </div>
        );
      })}

      {LEAVES.map((leaf) => {
        const { dx, dy } = burstOf(leaf.x, leaf.y);
        const size = sized(leaf.size);
        const shape = SHAPES[leaf.shape];

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
              <svg
                viewBox="0 0 24 24"
                className="absolute inset-0 h-full w-full"
                style={{ transform: `rotate(${leaf.rotate}deg)` }}
                opacity={leaf.opacity}
                role="presentation"
                focusable="false"
              >
                <path d={shape.body} fill={tones[leaf.tone]} />
                {shape.vein !== undefined ? (
                  <path
                    d={shape.vein}
                    fill="none"
                    stroke={colors.onAccent}
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    opacity="0.4"
                  />
                ) : null}
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}
