"use client";

import type { CSSProperties, ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";
import { curtainArt } from "@/lib/curtainArt";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms,
 * which is 3.2 seconds.
 *
 * The words on the cloth go first, in the shell's own quarter of a second,
 * and the curtains wait for them. Then the curtains draw, for 2.6 seconds.
 * The valance hangs where it is while they do and lifts away in what is left,
 * so it is the last of the cover to go and never sits over the card's own top
 * border once the card is the thing on screen.
 */
const DRAW_START = 0.08;
const DRAW_SHARE = 0.81;
const FADE_START = 0.84;
const FADE_SHARE = 0.16;

/**
 * How quickly the ground behind the panels clears.
 *
 * Almost at once: the panels still cover the screen for the first few frames,
 * so by the time a gap has opened it is the card in the gap, not a blank ground
 * that pops into a card when the layer unmounts.
 */
const BACKDROP_SHARE = 0.07;

/** The shade at the seam going, and each panel's own shade on the card arriving. */
const SHADE_SHARE = 0.14;

/**
 * How narrow a panel has gathered by the time it is drawn, from the edge it
 * hangs at: heavy cloth bunches as it is pulled, and a panel that keeps its
 * full width all the way out is a door.
 */
const GATHER = 0.7;

/**
 * How far a panel travels, as a share of its own width: its gathered width
 * and a little over, so its leading edge and the shade it casts leave the
 * screen as the draw ends and not half way through it. A panel sent its full
 * width was gone at the middle of its time, and the rest of the draw was
 * cloth moving where nobody could see it.
 */
const TRAVEL = `${-(GATHER + 0.06) * 100}%`;

/** Eased in and out, the stop a little softer than the start: the cloth has weight to get moving, and settles. */
const DRAW_EASE = "cubic-bezier(0.42,0,0.5,1)";

/** How far the valance lifts as it goes, as a share of its own height. */
const VALANCE_LIFT = "-45%";

/**
 * Stops short of the hem's tassels, which hang in the bottom tenth with the
 * card showing between them: a shade drawn there would be a grey box.
 */
const ABOVE_TASSELS = "linear-gradient(180deg, #000 0%, #000 82%, transparent 90%)";

/**
 * Two curtains of velvet and zari drawn back off the invitation, under a
 * swagged valance.
 *
 * PHOTOGRAPHED CLOTH, NOT DRAWN. The curtains used to be gradients worked out
 * of the card's accent. They are pictures now — see lib/curtainArt.ts for
 * which, and why this is the one cover that does not take its colours from
 * the card.
 *
 * THE LAYOUT. Each panel is half the screen. Its picture is scaled to the
 * screen's height and held by its inner edge and its foot, so the gold border
 * always stands on the centre line and the tassels on the bottom of the
 * screen, and whatever does not fit is lost off the outer edge. On a screen
 * wider than the cloth is — a desktop — it is scaled to the half's width
 * instead and loses its top, which the valance hangs over anyway. The right
 * panel is the left one in a mirror: the same file, the same markup, the same
 * motion, flipped once at the wrapper. The picture was cut down the middle of
 * the beads on its leading edge (scripts/cut-flowers.mjs), so the two halves
 * meet as one row of beads, with nothing between them and nothing shared.
 *
 * THE DRAW. Each panel slides off its own side and gathers towards it as it
 * goes, to seven tenths of its width, and its hem trails the rod, swings
 * through and settles. The card is under the cloth the whole time: it is let
 * go as the gap opens and is what the gap shows, more of it as the gap
 * widens, and it is never faded in. The valance lifts and fades last.
 * Transform and opacity only: nothing here repaints while it moves.
 *
 * Under reduced motion the shell never hands this the "opening" phase: the
 * closed curtains crossfade to the card as one layer. See CoverShell.
 */
export default function CurtainRevealCover({
  phase,
  option,
  reducedMotion,
  colors,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";
  const art = curtainArt(colors.isLight);

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  /* The card's ground, cleared behind the panels as they start to move. */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    transition: transition(stage("opacity", BACKDROP_SHARE, 0.02, "linear")),
    opacity: opening ? 0 : 1,
  };

  /*
    A panel drawn off its own side, gathering towards it. Written for the left
    one; the right is this in a mirror, so "left" here is the outer edge of
    both.
  */
  const drawStyle: CSSProperties = {
    transformOrigin: "0% 50%",
    transition: transition(stage("transform", DRAW_SHARE, DRAW_START, DRAW_EASE)),
    transform: opening
      ? `translate3d(${TRAVEL}, 0, 0) scaleX(${GATHER})`
      : "translate3d(0, 0, 0) scaleX(1)",
    willChange: "transform",
  };

  /* The hem trailing the rod, once, for as long as the panel is moving. */
  const swayStyle: CSSProperties = {
    transformOrigin: "50% 0%",
    animation:
      opening && !reducedMotion
        ? `lifafa-cover-curtain-sway calc(var(--cover-ms)*${DRAW_SHARE}) ease-in-out calc(var(--cover-ms)*${DRAW_START}) both`
        : undefined,
    willChange: "transform",
  };

  /* The shade a panel's leading edge casts on the card behind it, once it has left the other. */
  const castStyle: CSSProperties = {
    backgroundImage: `linear-gradient(90deg, ${art.shadow}, transparent)`,
    maskImage: ABOVE_TASSELS,
    WebkitMaskImage: ABOVE_TASSELS,
    transition: transition(stage("opacity", SHADE_SHARE, DRAW_START + 0.06, "ease-out")),
    opacity: opening ? 1 : 0,
  };

  /* The shade down the middle while they hang closed: one panel lying against the other. */
  const seamStyle: CSSProperties = {
    backgroundImage: `linear-gradient(90deg, transparent, ${art.shadow} 50%, transparent)`,
    maskImage: ABOVE_TASSELS,
    WebkitMaskImage: ABOVE_TASSELS,
    transition: transition(stage("opacity", SHADE_SHARE, DRAW_START, "ease-out")),
    opacity: opening ? 0 : 1,
  };

  /* The valance, last to go: still while the panels draw, then lifted off and faded. */
  const valanceStyle: CSSProperties = {
    top: "var(--lifafa-preview-h, 0px)",
    filter: `drop-shadow(0 3px 5px ${art.shadow})`,
    transition: transition(
      stage("opacity", FADE_SHARE, FADE_START, "ease-in"),
      stage("transform", FADE_SHARE, FADE_START, "ease-in"),
    ),
    opacity: opening ? 0 : 1,
    transform: opening ? `translate3d(0, ${VALANCE_LIFT}, 0)` : "translate3d(0, 0, 0)",
  };

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0" style={backdropStyle} />

      {([-1, 1] as const).map((side) => (
        <div
          key={side}
          /*
            Exactly half each, and no pixel of overlap: the picture's own edge
            is the seam. The right half is flipped here, once, and everything
            inside it is the left panel's markup untouched.
          */
          className={`absolute inset-y-0 w-1/2 ${side < 0 ? "left-0" : "right-0 -scale-x-100"}`}
        >
          <div className="absolute inset-0" style={drawStyle}>
            {/*
              A little wider than the half, off its outer edge, so the hem
              swinging towards the middle does not pull the cloth's outer edge
              into view. Decoded before it is painted: the shell's loader has
              already waited for it, and a late decode here would be the
              curtain arriving a frame after the cover.
            */}
            <img
              /* A set with a right curtain of its own has it published turned, for this mirrored half. */
              src={side > 0 ? (art.panelRight ?? art.panel) : art.panel}
              alt=""
              decoding="sync"
              draggable={false}
              className="absolute inset-y-0 right-0 h-full w-[108%] max-w-none object-cover object-[right_bottom] select-none"
              style={swayStyle}
            />
            <div className="absolute inset-y-0 left-full w-[5vw] max-w-9 min-w-4" style={castStyle} />
          </div>
        </div>
      ))}

      <div
        className="absolute inset-y-0 left-1/2 w-[16vw] max-w-20 -translate-x-1/2"
        style={seamStyle}
      />

      {/* Full width, and as tall as that makes it: the swags keep their shape on any screen. */}
      <img
        src={art.valance}
        alt=""
        decoding="sync"
        draggable={false}
        className="absolute inset-x-0 block h-auto w-full max-w-none select-none"
        style={valanceStyle}
      />
    </div>
  );
}
