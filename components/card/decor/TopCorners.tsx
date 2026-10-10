"use client";

import type { ReactElement } from "react";
import { useFloatingPause } from "@/hooks/useFloatingPause";
import { cardPx } from "@/lib/cardScale";
import type { PackOrnament } from "@/lib/traditionPacks";

/**
 * The pack's `topCorners` ornament: two copies of one round shape, one in
 * each top corner of the card, so about a quarter of each shows. The left one
 * turns clockwise and the right one the other way.
 *
 * PART OF THE CARD, NOT OF THE SCREEN. Every other layer of decor is pinned
 * inside a sticky band; this one is laid at the top of the card itself, so it
 * goes up and off with the first screen and is not there on the second. It
 * was pinned for a while, with a third at the end of the page, and a guest
 * had it over their shoulder for the whole card.
 *
 * BEHIND EVERYTHING. Under the content column, so the card's writing is drawn
 * over it and never the other way round, and so under the top border and the
 * frame as well. The dissolve at the top of the screen (ScrollFade) paints
 * the card's own colour over whatever is under the column, and would paint
 * this out with it, so it is told where these two corners are and leaves them
 * alone; see `spareTopCorners` there, which takes `topCornersHole` from here.
 *
 * ALWAYS THERE, AND GONE WHERE THE WRITING BEGINS. Its strength is fixed for
 * the card's ground and does not answer to the card's inks. What keeps it off
 * the writing is where it is: it fades from its centre outwards, in its file,
 * and has nothing left at its rim, which is short of the first line of the
 * first screen.
 *
 * The motion is `lifafa-mandala-turn` in globals.css: a rotate and nothing
 * else. Held while the tab is hidden or this layer is off the screen, and
 * still under reduced motion.
 *
 * Decoration only: aria-hidden, and never a tap target.
 */

/** The 420px design width, which every cap here is a share of. */
const DESIGN_WIDTH = 420;

/**
 * Each circle's diameter, as a share of the card's width, so a quarter of
 * each shows and the middle of the top is left to the card. No wider than
 * that share of the design width in card px, so on a card that fills a laptop
 * screen it is still a corner ornament.
 */
const DIAMETER = 0.75;

/**
 * How far in and down each centre moves under a flower frame, as a share of
 * the card's width: the frame's corner bouquets are deep, and a circle
 * centred on the corner itself keeps its best rings behind them. The same
 * share of the circle it was when the circle was 110% of the width.
 */
const INSET = (0.1 * DIAMETER) / 1.1;

/** A share of the card's width as a CSS length, capped at that share of the design width. */
function share(of: number): string {
  return `min(${of * 100}%, ${cardPx(DESIGN_WIDTH * of)})`;
}

/**
 * How strong the ornament is at its centre, by the card's ground. Stronger on
 * a dark card, where a gold line at the light card's strength is too faint to
 * see under a flower frame.
 */
const STRENGTH = { light: 0.22, dark: 0.3 } as const;

/** And the least it is ever drawn at, whatever is done to the two above. */
const STRENGTH_FLOOR = 0.14;

/** How strong the ornament is on a card whose ground is light or dark. */
export function topCornersStrength(lightGround: boolean): number {
  return Math.max(STRENGTH_FLOOR, lightGround ? STRENGTH.light : STRENGTH.dark);
}

/**
 * The part of each top corner the ornament is drawn in, for the dissolve to
 * leave alone: a square on the corner, `size` across, and where in it the
 * circle's centre is, as a share of that size from the corner. The circle
 * reaches the square's far sides.
 */
export interface TopCornersHole {
  size: string;
  centre: number;
}

export function topCornersHole(inset: boolean): TopCornersHole {
  const step = inset ? INSET : 0;
  const reach = step + DIAMETER / 2;

  return { size: share(reach), centre: step / reach };
}

/*
  Its fade, round the centre it turns about, is in its file (see
  `mandala-hindu-corner` in scripts/cut-flowers.mjs), so the fade does not
  turn with it and nothing is masked a second time over a layer that moves.
*/

export default function TopCorners({
  entry,
  accent,
  strength,
  inset,
}: {
  entry: PackOrnament;
  accent: string;
  /** From `topCornersStrength`, for the card's ground. */
  strength: number;
  /** Whether the card has a flower frame, whose bouquets the centres step clear of. */
  inset: boolean;
}): ReactElement {
  const pauseRef = useFloatingPause();
  const Shape = entry.turning ?? entry.Component;
  const step = inset ? INSET : 0;
  /* A share of the card's width, as a share of the circle's own, which is what a transform is measured in. */
  const stepOfCircle = (step / DIAMETER) * 100;

  return (
    <div
      ref={pauseRef}
      aria-hidden="true"
      /*
        As deep as the circles reach and cut there and at the card's edges.
        The depth is padding because a percentage of padding is of the card's
        width, which a height cannot be given in.
      */
      className="pointer-events-none absolute inset-x-0 top-0 z-[1] overflow-clip"
      style={{ paddingTop: share(step + DIAMETER / 2), color: accent }}
    >
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          /*
            Set on its corner by a transform of its own, so the turn inside is
            a rotate and nothing else.
          */
          className="absolute top-0"
          style={{
            left: side === "left" ? 0 : "100%",
            width: share(DIAMETER),
            transform: `translate(${side === "left" ? -50 + stepOfCircle : -50 - stepOfCircle}%, ${-50 + stepOfCircle}%)`,
          }}
        >
          <Shape
            instanceId={`top-corner-${side}-${entry.id}`}
            className={`lifafa-mandala-turn block w-full${
              side === "right" ? " lifafa-mandala-turn-back" : ""
            }`}
            /* On the turning shape itself, so each is one layer with nothing to blend as a group. */
            style={{ opacity: strength }}
          />
        </div>
      ))}
    </div>
  );
}
