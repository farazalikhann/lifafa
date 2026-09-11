"use client";

import { type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";
import { mixHex } from "@/lib/contrast";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * Overlapping rather than end to end. The seal is still going when the flap
 * starts to lift, the letter starts to rise before the flap has landed, and the
 * envelope starts to fall away while the letter is still coming out: four
 * stages that each wait for the last one to stop read as a machine, and paper
 * does not stop. The last stage ends on exactly 1, so nothing is still moving
 * when the shell unmounts the layer.
 */
const SEAL_START = 0;
const SEAL_SHARE = 0.16;
const FLAP_START = 0.1;
const FLAP_SHARE = 0.32;
const RISE_START = 0.4;
const RISE_SHARE = 0.3;
const EXIT_START = 0.64;
const EXIT_SHARE = 0.36;
const BACKDROP_START = 0.7;
const BACKDROP_SHARE = 0.3;

/**
 * The moment the flap is edge on to the guest, and goes behind the letter.
 *
 * Halfway through the flap's own stage, which is only 90° because the flap's
 * curve is symmetric — see FLAP_EASE. Swapping the stacking order on that frame
 * is invisible, because the flap is a line at that angle.
 */
const FLAP_EDGE_ON = FLAP_START + FLAP_SHARE / 2;

/**
 * Symmetric about its midpoint, so half the time is exactly half the turn.
 * FLAP_EDGE_ON depends on that; a lopsided curve here would swap the flap
 * behind the letter while it was still visibly in front of it.
 */
const FLAP_EASE = "cubic-bezier(0.6,0,0.4,1)";

/**
 * The seal's pop: the curve dips below zero first, so the wax swells a little
 * towards the guest before it shrinks away, which is what breaking it feels
 * like rather than a shape being deleted.
 */
const SEAL_EASE = "cubic-bezier(0.4,-1.2,0.7,1)";

/** Everything the envelope is made of falls away on this curve. */
const DROP_EASE = "cubic-bezier(0.55,0,0.75,0.4)";

/** Words that join two names rather than being one, skipped when taking initials. */
const JOINERS = new Set(["and", "weds", "with", "the", "of", "to", "&", "+", "x"]);

/**
 * Up to two initials for the seal, or an empty string when there is nothing
 * usable. "Aarav weds Meera" gives AM, not AWM.
 */
function initialsOf(title: string | undefined): string {
  if (title === undefined) {
    return "";
  }

  const letters: string[] = [];

  for (const word of title.split(/\s+/)) {
    const cleaned = word.replace(/[^\p{L}\p{N}]/gu, "");

    if (cleaned.length === 0 || JOINERS.has(cleaned.toLowerCase())) {
      continue;
    }

    letters.push(cleaned.charAt(0).toUpperCase());

    if (letters.length === 2) {
      break;
    }
  }

  return letters.join("");
}

/**
 * A box on the 400 × 300 drawing, as percentages of the stage.
 *
 * Every piece below is its own element placed on the same grid the old single
 * SVG used, so the envelope keeps its proportions at any width.
 */
function box(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    left: `${(x / 400) * 100}%`,
    top: `${(y / 300) * 100}%`,
    width: `${(width / 400) * 100}%`,
    height: `${(height / 300) * 100}%`,
  };
}

/** Both spellings, because Safari before 15.4 only honours the prefixed one. */
const HIDE_BACKFACE: CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

/**
 * The envelope a guest tears open.
 *
 * LAYERS, NOT ONE DRAWING. The envelope used to be a single inline SVG with CSS
 * transforms on its shapes, and that is what made it stutter and look wrong.
 * Browsers do not composite individual SVG shapes, so every frame of the open
 * repainted the whole drawing on the main thread; and Chrome flattens 3D
 * transforms on SVG children, so the flap never swung — it squashed flat, then
 * flipped up through the top of the viewBox and was clipped. Each moving piece
 * is now an HTML element holding its own small SVG, which the browser moves on
 * the compositor, in real perspective, the same way in every engine.
 *
 * Back to front: the inside of the envelope, the letter, the pocket and side
 * panels, the flap, the seal. The letter sits between the back and the pocket,
 * so the pocket hides it until it rises, and the flap drops behind it the
 * instant it is edge on (FLAP_EDGE_ON) — which is how a flat stack of layers
 * gets the one change of depth an envelope needs.
 *
 * It never takes a pointer event — the shell's button is the whole click
 * surface — so this is only ever a picture of what tapping does.
 *
 * Every colour comes from `colors`, which is the card's own palette worked into
 * paper tones. The letter is cut from the card's own ground, so the thing that
 * comes out of the envelope is the invitation, and it can dissolve into the
 * real one underneath without changing colour on the way. See
 * lib/coverPalette.ts.
 */
export default function EnvelopeSealCover({
  phase,
  option,
  reducedMotion,
  colors,
  title,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";
  const initials = initialsOf(title);

  /*
    The side panels used to be paperLift at 75% over the body. The letter now
    sits behind them, so they are opaque — the same colour they always showed,
    worked out rather than composited, so nothing shows through them.
  */
  const sidePanel = mixHex(colors.paper, colors.paperLift, 0.75);
  const sealRim = mixHex(colors.accent, colors.onAccent, 0.28);

  /*
    Every transition below is a fraction of this, so the visual cannot drift out
    of step with the setTimeout that unmounts it: change the option's duration
    and both move together.
  */
  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  /* The card's ground, held over the card until the envelope has gone. */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    transition: transition(
      stage("opacity", BACKDROP_SHARE, BACKDROP_START, "ease-in-out"),
    ),
    opacity: opening ? 0 : 1,
  };

  /*
    The idle bob. Paused rather than removed on the tap: taking the animation
    away would snap the envelope back to its rest position mid-breath, a jump
    of a few pixels on the first frame of the open.
  */
  const floatStyle: CSSProperties = {
    animationPlayState: opening ? "paused" : "running",
  };

  /* Back, pocket and flap all fall away together once the letter is out. */
  const dropStyle = (zIndex: number): CSSProperties => ({
    zIndex,
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", EXIT_SHARE, EXIT_START, DROP_EASE),
      stage("opacity", EXIT_SHARE, EXIT_START, "ease-in-out"),
    ),
    transform: opening ? "translate3d(0, 22%, 0)" : "translate3d(0, 0, 0)",
    opacity: opening ? 0 : 1,
  });

  /*
    The flap's wrapper is the one that changes places in the stack, so it gets
    the z-index step on top of the drop everyone shares. A transition with no
    duration and a delay is a switch on a timer.
  */
  const flapDropStyle: CSSProperties = {
    ...dropStyle(opening ? 1 : 4),
    transition: transition(
      stage("transform", EXIT_SHARE, EXIT_START, DROP_EASE),
      stage("opacity", EXIT_SHARE, EXIT_START, "ease-in-out"),
      stage("z-index", 0, FLAP_EDGE_ON, "linear"),
    ),
  };

  /*
    Hinged on its top edge and swung towards the guest, all the way over. The
    perspective is written into the transform rather than set on a parent, so
    the 3D depends on nothing above it; preserve-3d is what lets the two faces
    below take their turn.
  */
  const flapStyle: CSSProperties = {
    ...box(40, 70, 320, 108),
    transformOrigin: "50% 0%",
    transformStyle: "preserve-3d",
    willChange: "transform",
    transition: transition(stage("transform", FLAP_SHARE, FLAP_START, FLAP_EASE)),
    transform: opening
      ? "perspective(1200px) rotateX(180deg)"
      : "perspective(1200px) rotateX(0deg)",
  };

  /* The letter coming up out of the pocket… */
  const riseStyle: CSSProperties = {
    willChange: "transform",
    transition: transition(
      stage("transform", RISE_SHARE, RISE_START, "cubic-bezier(0.4,0,0.2,1)"),
    ),
    transform: opening ? "translate3d(0, -58%, 0)" : "translate3d(0, 0, 0)",
  };

  /* …and then towards the guest, dissolving into the card behind it. */
  const letterExitStyle: CSSProperties = {
    ...box(62, 82, 276, 160),
    zIndex: 2,
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", EXIT_SHARE, EXIT_START, "cubic-bezier(0.3,0,0.2,1)"),
      stage("opacity", EXIT_SHARE * 0.8, EXIT_START + EXIT_SHARE * 0.2, "ease-in-out"),
    ),
    transform: opening ? "translate3d(0, -8%, 0) scale(1.22)" : "none",
    opacity: opening ? 0 : 1,
  };

  const sealStyle: CSSProperties = {
    ...box(170, 148, 60, 60),
    zIndex: 5,
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", SEAL_SHARE, SEAL_START, SEAL_EASE),
      stage("opacity", SEAL_SHARE, SEAL_START, "ease-in"),
    ),
    transform: opening ? "scale(0.35) rotate(-24deg)" : "none",
    opacity: opening ? 0 : 1,
  };

  /*
    A shadow stays a shadow, on every palette — the same rule the curtains keep.
    It is the envelope's weight on the ground, so it goes when the envelope does.
  */
  const shadowStyle: CSSProperties = {
    ...box(52, 238, 296, 44),
    backgroundImage:
      "radial-gradient(ellipse at center, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0) 70%)",
    transition: transition(stage("opacity", EXIT_SHARE * 0.6, EXIT_START, "ease-out")),
    opacity: opening ? 0 : 1,
  };

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
    >
      <div className="absolute inset-0" style={backdropStyle} />

      <div className="relative aspect-[4/3] w-full max-w-[420px]">
        <div className="absolute" style={shadowStyle} />

        <div
          className="absolute inset-0 animate-[lifafa-float_5.5s_ease-in-out_infinite] motion-reduce:animate-none"
          style={floatStyle}
        >
          {/* The inside of the envelope, only ever seen once the flap is up. */}
          <div className="absolute inset-0" style={dropStyle(1)}>
            <svg
              viewBox="0 0 400 300"
              className="absolute inset-0 h-full w-full"
              role="presentation"
              focusable="false"
            >
              <rect
                x="40"
                y="70"
                width="320"
                height="180"
                rx="10"
                fill={colors.paperDeep}
                stroke={colors.edge}
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* The letter: the card itself, in the card's own colours. */}
          <div className="absolute" style={letterExitStyle}>
            <div className="absolute inset-0" style={riseStyle}>
              <svg
                viewBox="0 0 276 160"
                overflow="visible"
                className="absolute inset-0 h-full w-full"
                role="presentation"
                focusable="false"
              >
                <rect
                  x="0"
                  y="0"
                  width="276"
                  height="160"
                  rx="4"
                  fill={colors.ground}
                  stroke={colors.edge}
                  strokeWidth="1.2"
                />
                <rect
                  x="10"
                  y="10"
                  width="256"
                  height="140"
                  rx="2"
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="1"
                  opacity="0.7"
                />
                {initials.length > 0 ? (
                  <text
                    x="138"
                    y="52"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="font-[family-name:var(--font-display)]"
                    fontSize="22"
                    letterSpacing="2"
                    fill={colors.text}
                    opacity="0.8"
                  >
                    {initials}
                  </text>
                ) : null}
                {/* A divider under the monogram: two rules and the product's diamond. */}
                <g opacity="0.8">
                  <path d="M96 84 H128 M148 84 H180" stroke={colors.accent} strokeWidth="1" />
                  <path d="M138 78 L144 84 L138 90 L132 84 Z" fill={colors.accent} />
                </g>
              </svg>
            </div>
          </div>

          {/* The side panels and the pocket, in front of the letter. */}
          <div className="absolute inset-0" style={dropStyle(3)}>
            <svg
              viewBox="0 0 400 300"
              className="absolute inset-0 h-full w-full"
              role="presentation"
              focusable="false"
            >
              <path
                d="M40 70 L200 178 L40 250 Z"
                fill={sidePanel}
                stroke={colors.edge}
                strokeWidth="1"
                strokeLinejoin="round"
                strokeOpacity="0.6"
              />
              <path
                d="M360 70 L200 178 L360 250 Z"
                fill={sidePanel}
                stroke={colors.edge}
                strokeWidth="1"
                strokeLinejoin="round"
                strokeOpacity="0.6"
              />
              <path
                d="M40 250 L200 142 L360 250 Z"
                fill={colors.paperLift}
                stroke={colors.edge}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {/* The body's outline, redrawn over the panels' edges. */}
              <rect
                x="40"
                y="70"
                width="320"
                height="180"
                rx="10"
                fill="none"
                stroke={colors.edge}
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* The flap, shut over the pocket until the seal lets it go. */}
          <div className="absolute inset-0" style={flapDropStyle}>
            <div className="absolute" style={flapStyle}>
              {/* Outside face: what a guest sees while the envelope is sealed. */}
              <svg
                viewBox="0 0 320 108"
                preserveAspectRatio="none"
                overflow="visible"
                className="absolute inset-0 h-full w-full"
                style={HIDE_BACKFACE}
                role="presentation"
                focusable="false"
              >
                <path
                  d="M0 0 L320 0 L160 108 Z"
                  fill={colors.paperDeep}
                  stroke={colors.edge}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>

              {/*
                Inside face, turned half a revolution in place so it only faces
                the guest once the flap is over. Drawn point up for the same
                reason: two half turns about different edges leave it upright
                rather than flipped, so the triangle stands on the hinge.
              */}
              <svg
                viewBox="0 0 320 108"
                preserveAspectRatio="none"
                overflow="visible"
                className="absolute inset-0 h-full w-full"
                style={{ ...HIDE_BACKFACE, transform: "rotateX(180deg)" }}
                role="presentation"
                focusable="false"
              >
                <path
                  d="M0 108 L320 108 L160 0 Z"
                  fill={colors.paperLift}
                  stroke={colors.edge}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Wax seal, sitting on the flap's point where the fold closes. */}
          <div className="absolute" style={sealStyle}>
            {/*
              The breath is on an inner element because a CSS animation and a
              CSS transition cannot both drive transform on one: the animation
              wins, and the pop would never play. An HTML box also pulses about
              its own centre, where the old SVG group pulsed about the middle of
              the whole drawing and bobbed the seal up and down as it breathed.
            */}
            <div className="absolute inset-0 animate-[lifafa-seal-pulse_2.6s_ease-in-out_infinite] motion-reduce:animate-none">
              <svg
                viewBox="0 0 60 60"
                className="absolute inset-0 h-full w-full"
                role="presentation"
                focusable="false"
              >
                {/*
                  The rim is the accent's own shadow rather than a fixed brown:
                  mixed towards whatever the seal is written in, so a green wax
                  gets a green rim and a pale gold one does not get a dark ring
                  drawn round it.
                */}
                <circle
                  cx="30"
                  cy="30"
                  r="27"
                  fill={colors.accent}
                  stroke={sealRim}
                  strokeWidth="2"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="21"
                  fill="none"
                  stroke={colors.onAccent}
                  strokeWidth="1"
                  opacity="0.55"
                />
                {initials.length > 0 ? (
                  <text
                    x="30"
                    y="30"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="font-[family-name:var(--font-display)]"
                    fontSize="18"
                    letterSpacing="1"
                    fill={colors.onAccent}
                    opacity="0.75"
                  >
                    {initials}
                  </text>
                ) : (
                  /* No usable name: a plain diamond, the product's own mark. */
                  <path
                    d="M30 18 L39 30 L30 42 L21 30 Z"
                    fill={colors.onAccent}
                    opacity="0.55"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
