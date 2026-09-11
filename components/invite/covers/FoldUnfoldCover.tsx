"use client";

import { type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * The cover swings open and the card slides to centre on the same curve, so
 * the spine never appears to move backwards; the card starts coming towards the
 * guest just before the cover has landed, and the ground starts to clear just
 * after. Everything ends on exactly 1.
 */
const OPEN_START = 0;
const OPEN_SHARE = 0.56;
const EXIT_START = 0.54;
const EXIT_SHARE = 0.46;
const BACKDROP_START = 0.6;
const BACKDROP_SHARE = 0.4;

/** Slow off the mark, like stock that has been creased shut, then free. */
const OPEN_EASE = "cubic-bezier(0.45,0,0.2,1)";

/**
 * The cover's resting angle, in degrees, lifted towards the guest.
 *
 * Not flat and not shut. A closed card straight on is a rectangle and says
 * nothing; a cover held a little open, with a sliver of the inside showing, is
 * what tells the guest there is a fold here and it is holding something.
 */
const COVER_RESTING = -26;
const COVER_OPEN = -180;

/**
 * A box on the 400 × 300 drawing, as percentages of the stage.
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
 * A folded card opening out like a book.
 *
 * HTML panels in real perspective, not SVG shapes. The old drawing rotated SVG
 * rectangles in 3D, which Chrome flattens: the "fold" was two rectangles going
 * thin and wide, and every frame repainted the whole drawing on the main
 * thread. Each panel is now an element the compositor turns on its own, with a
 * front and a back face, so the cover visibly swings over its spine and shows
 * its inside on the way.
 *
 * The spread is 300 wide and hinges at its middle. Shut, it is slid half a
 * panel to the left so the cover sits in the centre of the screen; as it opens
 * it slides back, so the open card ends up centred too.
 *
 * The stock is the card's own palette worked into paper tones, and the inside
 * is the card's own ground, so a folded card on an ink invitation is dark stock
 * rather than a cream one that flashes white as it opens. See
 * lib/coverPalette.ts.
 */
export default function FoldUnfoldCover({
  phase,
  option,
  reducedMotion,
  colors,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  /* The card's ground, held over the card until the fold has come forward. */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    transition: transition(
      stage("opacity", BACKDROP_SHARE, BACKDROP_START, "ease-in-out"),
    ),
    opacity: opening ? 0 : 1,
  };

  /* Paused, not removed, so the tap does not snap it back mid-breath. */
  const floatStyle: CSSProperties = {
    animationPlayState: opening ? "paused" : "running",
  };

  /* The open card coming towards the guest and dissolving into the real one. */
  const exitStyle: CSSProperties = {
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", EXIT_SHARE, EXIT_START, "cubic-bezier(0.3,0,0.2,1)"),
      stage("opacity", EXIT_SHARE * 0.8, EXIT_START + EXIT_SHARE * 0.2, "ease-in"),
    ),
    transform: opening ? "scale(1.28)" : "scale(1)",
    opacity: opening ? 0 : 1,
  };

  /*
    The whole spread, sliding from "cover centred" to "spine centred". The
    perspective lives here, on the panels' parent, so both panels share one
    vanishing point.
  */
  const spreadStyle: CSSProperties = {
    ...box(50, 45, 300, 210),
    perspective: "1400px",
    willChange: "transform",
    transition: transition(stage("transform", OPEN_SHARE, OPEN_START, OPEN_EASE)),
    transform: opening ? "translate3d(0, 0, 0)" : "translate3d(-25%, 0, 0)",
  };

  /* Hinged on its left edge, which is the spine, and turned right over. */
  const coverStyle: CSSProperties = {
    transformOrigin: "0% 50%",
    transformStyle: "preserve-3d",
    willChange: "transform",
    transition: transition(stage("transform", OPEN_SHARE, OPEN_START, OPEN_EASE)),
    transform: `rotateY(${opening ? COVER_OPEN : COVER_RESTING}deg)`,
  };

  /*
    Light falling off the cover as it turns away from the guest. Only on the
    outside face: by the time the inside is showing it is lying flat again.
  */
  const shadeStyle: CSSProperties = {
    ...HIDE_BACKFACE,
    backgroundColor: "rgba(0,0,0,0.22)",
    transition: transition(
      stage("opacity", OPEN_SHARE * 0.5, OPEN_START, "ease-in"),
    ),
    opacity: opening ? 1 : 0,
  };

  /*
    A shadow stays a shadow, on every palette — the same rule the curtains keep.
  */
  const shadowStyle: CSSProperties = {
    ...box(70, 246, 260, 40),
    backgroundImage:
      "radial-gradient(ellipse at center, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0) 70%)",
    transition: transition(stage("opacity", EXIT_SHARE * 0.6, EXIT_START, "ease-out")),
    opacity: opening ? 0 : 1,
  };

  /* The crease, darkest at the spine: on the inside right panel's left edge. */
  const creaseRight =
    "linear-gradient(90deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 22%)";
  /* And on the inside of the cover's right edge, which meets it at the spine. */
  const creaseLeft =
    "linear-gradient(270deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 22%)";

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
          <div className="absolute inset-0" style={exitStyle}>
            <div className="absolute" style={spreadStyle}>
              {/* Inside right: the invitation, waiting under the cover. */}
              <div className="absolute inset-y-0 right-0 w-1/2">
                <svg
                  viewBox="0 0 150 210"
                  preserveAspectRatio="none"
                  overflow="visible"
                  className="absolute inset-0 h-full w-full"
                  role="presentation"
                  focusable="false"
                >
                  <rect
                    x="0"
                    y="0"
                    width="150"
                    height="210"
                    rx="3"
                    fill={colors.ground}
                    stroke={colors.edge}
                    strokeWidth="1.5"
                  />
                  <rect
                    x="12"
                    y="12"
                    width="126"
                    height="186"
                    rx="2"
                    fill="none"
                    stroke={colors.accent}
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <g opacity="0.75">
                    <path d="M45 105 H66 M84 105 H105" stroke={colors.accent} strokeWidth="1" />
                    <path d="M75 98 L82 105 L75 112 L68 105 Z" fill={colors.accent} />
                  </g>
                </svg>
                <div className="absolute inset-0" style={{ backgroundImage: creaseRight }} />
              </div>

              {/* The cover: outside face forward, inside face on its back. */}
              <div className="absolute inset-y-0 left-1/2 w-1/2" style={coverStyle}>
                <div className="absolute inset-0" style={HIDE_BACKFACE}>
                  <svg
                    viewBox="0 0 150 210"
                    preserveAspectRatio="none"
                    overflow="visible"
                    className="absolute inset-0 h-full w-full"
                    role="presentation"
                    focusable="false"
                  >
                    <rect
                      x="0"
                      y="0"
                      width="150"
                      height="210"
                      rx="3"
                      fill={colors.paper}
                      stroke={colors.edge}
                      strokeWidth="1.5"
                    />

                    {/* The thin border, held in from the edge. */}
                    <rect
                      x="10"
                      y="10"
                      width="130"
                      height="190"
                      rx="2"
                      fill="none"
                      stroke={colors.accent}
                      strokeWidth="1"
                      opacity="0.75"
                    />

                    {/* A small mark on the front, so the face is not a blank slab. */}
                    <g opacity="0.8">
                      <path d="M75 91 L84 105 L75 119 L66 105 Z" fill={colors.accent} />
                      <circle cx="75" cy="75" r="2.5" fill={colors.accent} />
                      <circle cx="75" cy="135" r="2.5" fill={colors.accent} />
                    </g>
                  </svg>
                  <div className="absolute inset-0 rounded-[3px]" style={shadeStyle} />
                </div>

                {/*
                  The inside of the cover, turned half a revolution in place so it
                  only faces the guest once the cover has gone over. Two half turns
                  about different axes leave it the right way round, so it is
                  drawn as it should read: crease on its right, at the spine.
                */}
                <div
                  className="absolute inset-0"
                  style={{ ...HIDE_BACKFACE, transform: "rotateY(180deg)" }}
                >
                  <svg
                    viewBox="0 0 150 210"
                    preserveAspectRatio="none"
                    overflow="visible"
                    className="absolute inset-0 h-full w-full"
                    role="presentation"
                    focusable="false"
                  >
                    <rect
                      x="0"
                      y="0"
                      width="150"
                      height="210"
                      rx="3"
                      fill={colors.paperLift}
                      stroke={colors.edge}
                      strokeWidth="1.5"
                    />
                    <rect
                      x="12"
                      y="12"
                      width="126"
                      height="186"
                      rx="2"
                      fill="none"
                      stroke={colors.accent}
                      strokeWidth="1"
                      opacity="0.35"
                    />
                  </svg>
                  <div className="absolute inset-0" style={{ backgroundImage: creaseLeft }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
