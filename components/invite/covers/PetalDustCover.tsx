"use client";

import { type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * A petal's own delay is added to DRIFT_START, so the latest one still lands
 * before the layer's fade is over: 0.2 plus 0.7 is 0.9, and the fade runs from
 * 0.76 to 1. Nothing is still moving when the shell unmounts it.
 */
const DRIFT_SHARE = 0.7;
const DRIFT_START = 0;
const GLOW_SHARE = 0.62;
const GLOW_START = 0;
const FADE_SHARE = 0.24;
const FADE_START = 0.76;

/** The centre of the drawing, which everything drifts away from. */
const CX = 200;
const CY = 150;

/** One petal, drawn from its own tip down to the origin it is placed at. */
const PETAL_PATH = "M0 0 C7 -5 9 -14 0 -20 C-9 -14 -7 -5 0 0";

interface Petal {
  x: number;
  y: number;
  size: number;
  rotate: number;
  /** Where it drifts to, relative to where it sits. */
  dx: number;
  dy: number;
  /** A share of --cover-ms, kept at or under 0.2 for the reason above. */
  delay: number;
  opacity: number;
}

interface Speck {
  x: number;
  y: number;
  r: number;
  delay: number;
  opacity: number;
}

/**
 * Every petal, written out by hand.
 *
 * Not generated, and deliberately not random. This renders on the server and
 * again in the browser, and any scatter drawn from Math.random puts a different
 * arrangement in each: React would hydrate onto markup that does not match, and
 * the guest would see the whole field jump on first paint. A fixed table also
 * means the composition can be looked at and adjusted, which a seeded scatter
 * never quite allows.
 *
 * The drift is always away from the centre and always upward, so the field
 * lifts rather than blows sideways, and the middle clears first.
 */
const PETALS: readonly Petal[] = [
  { x: 62, y: 96, size: 1, rotate: -18, dx: -46, dy: -34, delay: 0, opacity: 0.5 },
  { x: 118, y: 62, size: 0.8, rotate: 24, dx: -30, dy: -46, delay: 0.06, opacity: 0.42 },
  { x: 178, y: 44, size: 1.1, rotate: -8, dx: -8, dy: -52, delay: 0.02, opacity: 0.55 },
  { x: 246, y: 58, size: 0.9, rotate: 34, dx: 26, dy: -48, delay: 0.1, opacity: 0.45 },
  { x: 312, y: 92, size: 1, rotate: -26, dx: 44, dy: -36, delay: 0.04, opacity: 0.52 },
  { x: 348, y: 148, size: 0.75, rotate: 12, dx: 54, dy: -22, delay: 0.12, opacity: 0.38 },
  { x: 322, y: 208, size: 1.05, rotate: -34, dx: 46, dy: -18, delay: 0.08, opacity: 0.48 },
  { x: 258, y: 246, size: 0.85, rotate: 20, dx: 28, dy: -26, delay: 0.14, opacity: 0.44 },
  { x: 192, y: 258, size: 1, rotate: -12, dx: 4, dy: -30, delay: 0.1, opacity: 0.5 },
  { x: 128, y: 238, size: 0.9, rotate: 30, dx: -30, dy: -24, delay: 0.16, opacity: 0.42 },
  { x: 72, y: 196, size: 1.1, rotate: -22, dx: -48, dy: -20, delay: 0.06, opacity: 0.53 },
  { x: 46, y: 146, size: 0.8, rotate: 16, dx: -56, dy: -26, delay: 0.18, opacity: 0.4 },
  { x: 154, y: 118, size: 0.7, rotate: -30, dx: -20, dy: -40, delay: 0.2, opacity: 0.36 },
  { x: 244, y: 176, size: 0.75, rotate: 26, dx: 24, dy: -34, delay: 0.15, opacity: 0.38 },
];

/** The finer dust between the petals. Same rules, same reason. */
const SPECKS: readonly Speck[] = [
  { x: 96, y: 132, r: 2.2, delay: 0.05, opacity: 0.32 },
  { x: 152, y: 84, r: 1.6, delay: 0.1, opacity: 0.26 },
  { x: 220, y: 102, r: 2, delay: 0.02, opacity: 0.3 },
  { x: 286, y: 140, r: 1.8, delay: 0.12, opacity: 0.28 },
  { x: 300, y: 186, r: 1.5, delay: 0.07, opacity: 0.24 },
  { x: 232, y: 214, r: 2.1, delay: 0.14, opacity: 0.3 },
  { x: 166, y: 192, r: 1.7, delay: 0.09, opacity: 0.26 },
  { x: 108, y: 176, r: 1.9, delay: 0.16, opacity: 0.28 },
  { x: 268, y: 72, r: 1.4, delay: 0.18, opacity: 0.22 },
  { x: 140, y: 268, r: 1.6, delay: 0.11, opacity: 0.26 },
];

/** A speck drifts on the same line as a petal, but a shorter way. */
function speckDrift(speck: Speck): { dx: number; dy: number } {
  return { dx: (speck.x - CX) * 0.22, dy: (speck.y - CY) * 0.12 - 26 };
}

/**
 * A field of petals lifting off the invitation.
 *
 * Placement is an SVG `transform` attribute on the outer group and the drift is
 * a CSS `transform` on the inner one, never both on the same element: the CSS
 * property overrides the presentation attribute, so a single element carrying
 * both would snap to the middle of the drawing the moment it animated.
 */
export default function PetalDustCover({
  phase,
  option,
  reducedMotion,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const layerStyle: CSSProperties = {
    transition: reducedMotion
      ? undefined
      : stage("opacity", FADE_SHARE, FADE_START, "ease-in"),
    opacity: opening ? 0 : 1,
  };

  /** Out from the centre and up, fading as it goes. */
  const driftStyle = (dx: number, dy: number, delay: number): CSSProperties => ({
    transition: reducedMotion
      ? undefined
      : [
          stage(
            "transform",
            DRIFT_SHARE,
            DRIFT_START + delay,
            "cubic-bezier(0.22,0.8,0.3,1)",
          ),
          stage("opacity", DRIFT_SHARE, DRIFT_START + delay, "ease-out"),
        ].join(", "),
    transform: opening ? `translate(${dx}px, ${dy}px)` : "translate(0, 0)",
    opacity: opening ? 0 : 1,
  });

  const glowStyle: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "50% 50%",
    transition: reducedMotion
      ? undefined
      : [
          stage("transform", GLOW_SHARE, GLOW_START, "ease-out"),
          stage("opacity", GLOW_SHARE, GLOW_START, "ease-out"),
        ].join(", "),
    transform: opening ? "scale(1.7)" : "scale(1)",
    opacity: opening ? 0 : 1,
  };

  return (
    <div
      aria-hidden
      style={{ ...rootStyle, ...layerStyle }}
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
    >
      <svg
        viewBox="0 0 400 300"
        className="h-auto w-full max-w-[520px]"
        role="presentation"
        focusable="false"
      >
        <defs>
          <radialGradient id="lifafa-petal-glow">
            <stop offset="0%" stopColor="var(--lifafa-marigold)" stopOpacity="0.3" />
            <stop offset="55%" stopColor="var(--lifafa-marigold)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--lifafa-marigold)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/*
          The glow sits behind everything, under the words the shell prints. Its
          idle breath is on an inner group because a CSS animation and a CSS
          transition cannot both drive transform on one element: the animation
          wins, and the expansion would never play.
        */}
        <g style={glowStyle}>
          <g
            className={
              reducedMotion
                ? undefined
                : "origin-center animate-[lifafa-pulse_6s_ease-in-out_infinite] motion-reduce:animate-none"
            }
          >
            <circle cx={CX} cy={CY} r="130" fill="url(#lifafa-petal-glow)" />
          </g>
        </g>

        {SPECKS.map((speck) => {
          const { dx, dy } = speckDrift(speck);

          return (
            <g
              key={`speck-${speck.x}-${speck.y}`}
              transform={`translate(${speck.x} ${speck.y})`}
            >
              <g style={driftStyle(dx, dy, speck.delay)}>
                <circle
                  r={speck.r}
                  fill="var(--lifafa-marigold)"
                  opacity={speck.opacity}
                />
              </g>
            </g>
          );
        })}

        {PETALS.map((petal) => (
          <g
            key={`petal-${petal.x}-${petal.y}`}
            transform={`translate(${petal.x} ${petal.y}) rotate(${petal.rotate}) scale(${petal.size})`}
          >
            <g style={driftStyle(petal.dx, petal.dy, petal.delay)}>
              <path
                d={PETAL_PATH}
                fill="var(--lifafa-marigold)"
                opacity={petal.opacity}
              />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
