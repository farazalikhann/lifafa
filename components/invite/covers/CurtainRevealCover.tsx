"use client";

import { type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";
import type { CoverPalette } from "@/lib/coverPalette";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * The two overlap on purpose: the panels are still gliding into the edges as
 * the layer starts to go, so there is no moment where the curtains sit still
 * and wait to be dismissed.
 */
const SLIDE_SHARE = 0.84;
const FADE_SHARE = 0.3;
const FADE_START = 0.7;

/**
 * How quickly the ground behind the panels clears.
 *
 * Almost at once: the panels still cover the whole screen for the first few
 * frames, so nothing is lost by clearing it early, and by the time a gap has
 * opened between them it is the card in the gap and not a blank ground that
 * pops into a card when the layer unmounts.
 */
const BACKDROP_SHARE = 0.16;

/**
 * How far each panel travels, as a share of its own width.
 *
 * Not the whole way. Real curtains stay gathered at the edges when they are
 * drawn, and leaving a band behind is also what gives the final fade something
 * to fade: panels pushed entirely off screen would make it a no-op.
 */
const TRAVEL = 86;

/*
  The drape, as one repeating gradient rather than a stack of elements. Uneven
  stops on purpose: evenly spaced folds read as corrugation, and cloth does not
  hang in a regular wave.

  Built from the card's palette rather than from two cream constants, so the
  curtains are cut from the same cloth as the invitation behind them — see
  lib/coverPalette.ts. `paper` is the lit face of a fold and `paperDeep` the
  shaded one, whichever direction "darker" happens to be for this card.
*/
function drape(colors: CoverPalette): string {
  const lit = colors.paper;
  const fold = colors.paperDeep;

  return `repeating-linear-gradient(90deg, ${lit} 0px, ${fold} 11px, ${lit} 23px, ${lit} 34px, ${fold} 47px, ${lit} 58px)`;
}

/** The gathered ring and tail that hold a panel back, drawn once and mirrored. */
function TieBack({
  side,
  accent,
}: {
  side: "left" | "right";
  accent: string;
}): ReactElement {
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
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="30" cy="60" r="6" fill={accent} opacity="0.9" />
      {/* The tassel hanging off it. */}
      <path
        d="M30 66 L30 82"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M24 82 L36 82 L33 96 L27 96 Z"
        fill={accent}
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
  colors,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  /* The card's ground, cleared behind the panels as they start to move. */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    transition: reducedMotion
      ? undefined
      : stage("opacity", BACKDROP_SHARE, 0, "linear"),
    opacity: opening ? 0 : 1,
  };

  /* The whole layer leaving, once the panels are at the edges. */
  const layerStyle: CSSProperties = {
    transition: reducedMotion
      ? undefined
      : stage("opacity", FADE_SHARE, FADE_START, "ease-in"),
    opacity: opening ? 0 : 1,
  };

  /*
    Slow to start and slow to stop, which is how a heavy panel moves: the cloth
    has to be got going, and it glides into the edge rather than hitting it.
    This used to overshoot and settle back, and that curve did four fifths of
    the travel in the first fifth of the time — the panels snapped open and
    then sat still at the edges for most of the open, which read as a jolt
    rather than a draw.
  */
  const panel = (direction: -1 | 1): CSSProperties => ({
    transition: reducedMotion
      ? undefined
      : stage("transform", SLIDE_SHARE, 0, "cubic-bezier(0.55,0,0.2,1)"),
    transform: opening
      ? `translate3d(${direction * TRAVEL}%, 0, 0)`
      : "translate3d(0, 0, 0)",
    willChange: "transform",
    backgroundImage: drape(colors),
  });

  /*
    A shadow stays a shadow, on every palette.

    This is the one thing in the cover that is NOT read off the card's colours,
    and deliberately: shading is light not reaching the cloth, so it is dark
    whether the curtain is cream or near-black. Mixing it from the palette would
    make it lighten the fabric on a dark card, which is not a fold, it is a
    crease of glare. It is translucent, so the drape's own tones read through it.
  */

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
      <div className="absolute inset-0" style={backdropStyle} />

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
              "linear-gradient(90deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.18) 100%)",
          }}
        />
        <TieBack side="left" accent={colors.accent} />
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
              "linear-gradient(270deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.18) 100%)",
          }}
        />
        <TieBack side="right" accent={colors.accent} />
      </div>
    </div>
  );
}
