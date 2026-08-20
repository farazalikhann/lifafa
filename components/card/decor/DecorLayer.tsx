"use client";

import type { CSSProperties, ReactElement } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { Motif } from "@/lib/motifs";
import type { DecorIntensity, DecorMotion } from "@/types/card";

interface DecorShape {
  /** Percentages within the layer, so the table is resolution independent. */
  left: number;
  top: number;
  /** Rendered size in px. */
  size: number;
  /** Seconds. */
  delay: number;
  duration: number;
  opacity: number;
}

/**
 * Fixed shape table — deliberately hardcoded.
 *
 * Math.random would produce different positions on the server and in the
 * browser, which React reports as a hydration mismatch. These values are hand
 * picked to look scattered while staying identical on both sides of the wire.
 */
const SHAPES: readonly DecorShape[] = [
  { left: 8, top: 12, size: 10, delay: 0, duration: 15, opacity: 0.18 },
  { left: 22, top: 68, size: 7, delay: 2.4, duration: 18, opacity: 0.14 },
  { left: 37, top: 30, size: 12, delay: 1.1, duration: 16, opacity: 0.2 },
  { left: 54, top: 82, size: 8, delay: 4.2, duration: 19, opacity: 0.15 },
  { left: 71, top: 18, size: 11, delay: 0.7, duration: 14, opacity: 0.22 },
  { left: 86, top: 55, size: 9, delay: 3.3, duration: 17, opacity: 0.16 },
  { left: 14, top: 44, size: 8, delay: 5.1, duration: 20, opacity: 0.13 },
  { left: 63, top: 40, size: 6, delay: 2.9, duration: 15, opacity: 0.24 },
  { left: 45, top: 8, size: 9, delay: 6.0, duration: 18, opacity: 0.17 },
  { left: 92, top: 30, size: 7, delay: 1.8, duration: 16, opacity: 0.15 },
  { left: 30, top: 92, size: 11, delay: 3.9, duration: 21, opacity: 0.19 },
  { left: 78, top: 74, size: 8, delay: 5.6, duration: 17, opacity: 0.14 },
  { left: 5, top: 78, size: 6, delay: 2.2, duration: 19, opacity: 0.21 },
  { left: 58, top: 60, size: 10, delay: 6.8, duration: 15, opacity: 0.12 },
  { left: 40, top: 50, size: 7, delay: 4.7, duration: 20, opacity: 0.18 },
  { left: 88, top: 90, size: 9, delay: 0.4, duration: 16, opacity: 0.16 },
  /* Rows 17-24 only appear at "lively". */
  { left: 18, top: 24, size: 9, delay: 7.4, duration: 17, opacity: 0.15 },
  { left: 50, top: 70, size: 7, delay: 1.5, duration: 19, opacity: 0.2 },
  { left: 68, top: 88, size: 10, delay: 5.9, duration: 15, opacity: 0.13 },
  { left: 96, top: 66, size: 6, delay: 3.1, duration: 18, opacity: 0.17 },
  { left: 26, top: 56, size: 8, delay: 7.9, duration: 16, opacity: 0.14 },
  { left: 74, top: 34, size: 9, delay: 2.6, duration: 21, opacity: 0.19 },
  { left: 10, top: 92, size: 7, delay: 4.4, duration: 17, opacity: 0.16 },
  { left: 34, top: 14, size: 8, delay: 6.3, duration: 20, opacity: 0.12 },
];

/**
 * Intensity tiers. "lively" runs shorter durations as well as more shapes, so
 * the extra density reads as energy rather than clutter.
 */
const INTENSITY: Record<
  DecorIntensity,
  { count: number; opacityScale: number; durationScale: number }
> = {
  subtle: { count: 8, opacityScale: 0.6, durationScale: 1 },
  normal: { count: 16, opacityScale: 1, durationScale: 1 },
  lively: { count: 24, opacityScale: 1.3, durationScale: 0.7 },
};

/**
 * Hard ceiling on how opaque any one decor shape may be.
 *
 * The decor sits behind the card's text, so a shape that overlaps a glyph
 * becomes part of that glyph's background. At full "lively" strength the old
 * ceiling was 0.312, which pulled cream's muted text down to 2.3:1 — below the
 * 4.5:1 small-text threshold. Every palette in lib/palettes.ts is measured
 * against a solid wash of its own accent at this alpha, so this number and
 * those colours have to move together.
 *
 * Intensity still reads as intensity: "lively" scatters 24 shapes at 0.7x the
 * duration, "subtle" scatters 8 and stays well under the ceiling on its own.
 */
export const DECOR_MAX_ALPHA = 0.16;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const KEYFRAME_NAME: Record<Exclude<DecorMotion, "none">, string> = {
  float: "lifafa-decor-float",
  fall: "lifafa-decor-fall",
  drift: "lifafa-decor-drift",
};

/**
 * Decorative background for the card canvas.
 *
 * Sits inside the canvas bounds only — an absolutely positioned layer, with the
 * shapes held in a sticky viewport-height band so they stay in view while the
 * guest scrolls without ever escaping the card.
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
}: {
  accent: string;
  motion: DecorMotion;
  motifs: readonly Motif[];
  intensity: DecorIntensity;
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
      className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
    >
      <div className="sticky top-0 h-[100svh] w-full">
        {shapes.map((shape, index) => {
          /* Cycle the motifs across the fixed positions. */
          const MotifShape = motifs[index % motifs.length];

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
              */}
              <span
                className="block"
                style={{
                  opacity: Math.min(
                    DECOR_MAX_ALPHA,
                    shape.opacity * tier.opacityScale,
                  ),
                }}
              >
                <MotifShape size={shape.size} />
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
