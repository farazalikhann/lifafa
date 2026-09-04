"use client";

import { type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * The side panel goes first and the front face follows while it is still
 * moving. A card does not unfold one panel at a time with a pause between; the
 * overlap is what makes it read as one sheet opening out rather than two doors.
 */
const SIDE_SHARE = 0.42;
const SIDE_START = 0;
const FACE_SHARE = 0.44;
const FACE_START = 0.32;
const FADE_SHARE = 0.24;
const FADE_START = 0.76;

/**
 * The resting angle of the side panel, in degrees.
 *
 * Not flat and not shut. A closed card photographed straight on is a rectangle
 * and says nothing; angling the back panel is what tells the guest there is a
 * fold here and it is holding something.
 */
const SIDE_RESTING = -38;
const SIDE_OPEN = -116;

/** How far the front face swings once the side has let go. */
const FACE_OPEN = 74;

/** Card stock, a shade off the cover's cream ground, with the inside lighter. */
const STOCK = "#f2e8da";
const STOCK_INNER = "#eadcc6";
const EDGE = "#d9c4a0";

/**
 * A folded card opening out.
 *
 * Both halves hinge on the fold itself: `transform-box: fill-box` puts each
 * one's transform origin on its own edge rather than the viewBox corner, and
 * the perspective is written into each transform so the 3D depends on nothing
 * above it in the tree.
 */
export default function FoldUnfoldCover({
  phase,
  option,
  reducedMotion,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  /* Hinged on its right edge, which is the fold. */
  const sideStyle: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "100% 50%",
    transition: reducedMotion
      ? undefined
      : stage("transform", SIDE_SHARE, SIDE_START, "cubic-bezier(0.36,0,0.24,1)"),
    transform: `perspective(1000px) rotateY(${opening ? SIDE_OPEN : SIDE_RESTING}deg)`,
  };

  /* Hinged on its left edge, the same fold, swinging the other way. */
  const faceStyle: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "0% 50%",
    transition: reducedMotion
      ? undefined
      : stage("transform", FACE_SHARE, FACE_START, "cubic-bezier(0.36,0,0.24,1)"),
    transform: `perspective(1000px) rotateY(${opening ? FACE_OPEN : 0}deg)`,
  };

  const layerStyle: CSSProperties = {
    transition: reducedMotion
      ? undefined
      : [
          stage("opacity", FADE_SHARE, FADE_START, "ease-in"),
          stage("transform", FADE_SHARE, FADE_START, "ease-in"),
        ].join(", "),
    transformBox: "fill-box",
    transformOrigin: "50% 50%",
    transform: opening ? "scale(1.06)" : "scale(1)",
    opacity: opening ? 0 : 1,
  };

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
    >
      <svg
        viewBox="0 0 400 300"
        className="h-auto w-full max-w-[420px]"
        role="presentation"
        focusable="false"
      >
        <g style={layerStyle}>
          {/*
            Drawn first so the front face overlaps it at the fold. The inner
            face of the panel is what a guest sees at this angle, so it carries
            the lighter stock.
          */}
          <g style={sideStyle}>
            <rect
              x="80"
              y="60"
              width="120"
              height="180"
              rx="4"
              fill={STOCK_INNER}
              stroke={EDGE}
              strokeWidth="1.5"
            />
          </g>

          <g style={faceStyle}>
            <rect
              x="200"
              y="60"
              width="120"
              height="180"
              rx="4"
              fill={STOCK}
              stroke={EDGE}
              strokeWidth="1.5"
            />

            {/* The thin gold border, held in from the edge. */}
            <rect
              x="209"
              y="69"
              width="102"
              height="162"
              rx="2"
              fill="none"
              stroke="var(--lifafa-marigold)"
              strokeWidth="1"
              opacity="0.75"
            />

            {/* A small mark on the front, so the face is not a blank slab. */}
            <g opacity="0.8">
              <path
                d="M260 136 L268 150 L260 164 L252 150 Z"
                fill="var(--lifafa-marigold)"
              />
              <circle cx="260" cy="120" r="2.5" fill="var(--lifafa-marigold)" />
              <circle cx="260" cy="180" r="2.5" fill="var(--lifafa-marigold)" />
            </g>
          </g>

          {/* The fold itself, a crease of shadow where the two halves meet. */}
          <line
            x1="200"
            y1="60"
            x2="200"
            y2="240"
            stroke={EDGE}
            strokeWidth="1.5"
            opacity="0.9"
          />
        </g>
      </svg>
    </div>
  );
}
