"use client";

import { type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * The two overlap by a hair on purpose: the panels are still settling into the
 * edges as the layer starts to go, so there is no moment where the curtains sit
 * still and wait to be dismissed.
 */
const SLIDE_SHARE = 0.72;
const FADE_SHARE = 0.3;
const FADE_START = 0.7;

/**
 * How far each panel travels, as a share of its own width.
 *
 * Not the whole way. Real curtains stay gathered at the edges when they are
 * drawn, and leaving a band behind is also what gives the final fade something
 * to fade: panels pushed entirely off screen would make it a no-op.
 */
const TRAVEL = 86;

/** Fabric, a shade off the cover's cream ground, with the folds a touch deeper. */
const FABRIC = "#f2e8da";
const FOLD = "#e4d5bd";

/*
  The drape, as one repeating gradient rather than a stack of elements. Uneven
  stops on purpose: evenly spaced folds read as corrugation, and cloth does not
  hang in a regular wave.
*/
const DRAPE =
  `repeating-linear-gradient(90deg, ${FABRIC} 0px, ${FOLD} 11px, ${FABRIC} 23px, ${FABRIC} 34px, ${FOLD} 47px, ${FABRIC} 58px)`;

/** The gathered ring and tail that hold a panel back, drawn once and mirrored. */
function TieBack({ side }: { side: "left" | "right" }): ReactElement {
  return (
    <svg
      viewBox="0 0 60 120"
      className={`absolute top-1/2 h-[120px] w-[60px] -translate-y-1/2 ${
        side === "left" ? "left-3" : "right-3 -scale-x-100"
      }`}
      role="presentation"
      focusable="false"
    >
      {/* The cord, looped around the gathered cloth. */}
      <path
        d="M8 34 C34 44 34 76 8 86"
        fill="none"
        stroke="var(--lifafa-marigold)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="30" cy="60" r="6" fill="var(--lifafa-marigold)" opacity="0.9" />
      {/* The tassel hanging off it. */}
      <path
        d="M30 66 L30 82"
        stroke="var(--lifafa-marigold)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M24 82 L36 82 L33 96 L27 96 Z"
        fill="var(--lifafa-marigold)"
        opacity="0.65"
      />
    </svg>
  );
}

/**
 * Two curtain panels drawn back off the invitation.
 *
 * Panels are elements rather than shapes in one SVG, because a curtain has to
 * reach every edge of the screen and a drawing with a fixed viewBox cannot: it
 * would letterbox on a tall phone and leave the card showing at the top and
 * bottom before anything had opened. The fabric is a CSS gradient, the tie-back
 * ornament is inline SVG, and neither is an image.
 */
export default function CurtainRevealCover({
  phase,
  option,
  reducedMotion,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  /* The whole layer leaving, once the panels are at the edges. */
  const layerStyle: CSSProperties = {
    transition: reducedMotion
      ? undefined
      : stage("opacity", FADE_SHARE, FADE_START, "ease-in"),
    opacity: opening ? 0 : 1,
  };

  /*
    The overshoot lives in this curve: it runs past its resting value and
    settles back, which is what gives the draw its snap. A panel is heavy, and
    linear cloth looks like a sliding door.
  */
  const panel = (direction: -1 | 1): CSSProperties => ({
    transition: reducedMotion
      ? undefined
      : stage("transform", SLIDE_SHARE, 0, "cubic-bezier(0.22,1.15,0.36,1)"),
    transform: opening ? `translateX(${direction * TRAVEL}%)` : "translateX(0)",
    backgroundImage: DRAPE,
  });

  /* Deepest where the two panels meet, and softening as the gap opens. */
  const seamShadowStyle: CSSProperties = {
    transition: reducedMotion
      ? undefined
      : stage("opacity", SLIDE_SHARE, 0, "ease-out"),
    opacity: opening ? 0.25 : 1,
  };

  return (
    <div
      aria-hidden
      style={{ ...rootStyle, ...layerStyle }}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* The extra pixel is the seam: two panels meeting exactly at 50% can
          leave a hairline of card showing between them at some widths. */}
      <div
        className="absolute inset-y-0 left-0 w-[calc(50%+1px)]"
        style={panel(-1)}
      >
        <div
          className="absolute inset-0"
          style={{
            ...seamShadowStyle,
            backgroundImage:
              "linear-gradient(90deg, rgba(18,16,14,0.10) 0%, rgba(18,16,14,0) 38%, rgba(18,16,14,0.16) 100%)",
          }}
        />
        <TieBack side="left" />
      </div>

      <div
        className="absolute inset-y-0 right-0 w-[calc(50%+1px)]"
        style={panel(1)}
      >
        <div
          className="absolute inset-0"
          style={{
            ...seamShadowStyle,
            backgroundImage:
              "linear-gradient(270deg, rgba(18,16,14,0.10) 0%, rgba(18,16,14,0) 38%, rgba(18,16,14,0.16) 100%)",
          }}
        />
        <TieBack side="right" />
      </div>
    </div>
  );
}
