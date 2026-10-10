"use client";

import type { ReactElement } from "react";
import { useFloatingPause } from "@/hooks/useFloatingPause";
import { cardPx } from "@/lib/cardScale";
import type { PackOrnament } from "@/lib/traditionPacks";

/**
 * The pack's `topCorners` ornament: two copies of one round shape, each
 * centred on a top corner of the card, so about a quarter of each shows. The
 * left one turns clockwise and the right one the other way.
 *
 * PART OF THE CARD, NOT OF THE SCREEN. Every other layer of decor is pinned
 * inside a sticky band; this one is laid at the top of the card itself, so it
 * goes up and off with the first screen and is not there on the second.
 *
 * BEHIND EVERYTHING. Under the content column, so the card's writing is drawn
 * over it and never the other way round, and so under the top border and the
 * frame as well. The dissolve at the top of the screen (ScrollFade) paints the
 * card's own colour over whatever is under the column, and would paint this
 * out with it: about 100px deep under a garland, of a shape that reaches 137.
 * So the dissolve is told where these two corners are and leaves them alone;
 * see `spareTopCorners` there, which takes its reach from TOP_CORNERS_REACH.
 *
 * ALWAYS THERE, AND NEVER UNDER A LINE OF TEXT AT MORE THAN A TRACE. Its
 * strength used to be measured against the card's text and brought down until
 * the text passed, and an ink that sits at 4.5:1 on the bare card has nothing
 * to give: on such a card the ornament was switched on and drawn at nothing.
 * Its strength is now fixed for the ground, and what keeps it off the writing
 * is where it is rather than how faint: it fades from the corner outwards
 * (TOP_CORNERS_FADE), and is gone where the first screen's text begins.
 *
 * The motion is `lifafa-mandala-turn` in globals.css. Held while the tab is
 * hidden or this layer is off the screen, and still under reduced motion.
 *
 * Decoration only: aria-hidden, and never a tap target.
 */

/** Each circle's diameter, as a share of the card's width. */
const DIAMETER_SHARE = 0.7;

/**
 * And the most it may be, in card px: that share of the 420px design width.
 * A card that fills a laptop screen is as wide as the screen, and 70% of that
 * is not a corner ornament.
 */
const MAX_DIAMETER = 420 * DIAMETER_SHARE;

/**
 * How far in from a top corner the circles reach: their radius, as a CSS
 * length. A percentage of the card's width, so it is only right where a
 * percentage is of that width.
 */
export const TOP_CORNERS_REACH = `min(${(DIAMETER_SHARE / 2) * 100}%, ${cardPx(MAX_DIAMETER / 2)})`;

/**
 * How strong the ornament is at the corner itself, by the card's ground.
 * Stronger on a dark card, where a gold line at the light card's strength is
 * too faint to see under a flower frame.
 */
const STRENGTH = { light: 0.22, dark: 0.3 } as const;

/** And the least it is ever drawn at, whatever is done to the two above. */
const STRENGTH_FLOOR = 0.14;

/** How strong the ornament is on a card whose ground is light or dark. */
export function topCornersStrength(lightGround: boolean): number {
  return Math.max(STRENGTH_FLOOR, lightGround ? STRENGTH.light : STRENGTH.dark);
}

/**
 * The fade from the corner outwards, as the share of its strength the
 * ornament keeps at each share of its reach.
 *
 * Full for the first two thirds, much of which is under the ends of the
 * garland and the corner flowers of a frame, so that what shows beyond them
 * is still worth showing; half by 82%, a tenth by 93%, nothing at the edge. MEASURED, NOT GUESSED: across the opening and the names as a first
 * screen, with and without a top border and a flower frame, at 360x640,
 * 360x740 and 390x844, the nearest any line of first-screen text comes to a
 * top corner is 0.99 of the reach ("You are invited" on the shortest screen),
 * and the calligraphy's box 1.02. So the text begins where this ends, and a
 * layout that brought a line a tenth closer would have a fifth of the
 * ornament's strength under its nearest end. Round the centre the shape turns about, so the fade does
 * not turn with it.
 */
const TOP_CORNERS_FADE: readonly (readonly [reach: number, kept: number])[] = [
  [0, 1],
  [0.65, 1],
  [0.82, 0.5],
  [0.93, 0.1],
  [1, 0],
];

const FADE_MASK = `radial-gradient(closest-side, ${TOP_CORNERS_FADE.map(
  ([reach, kept]) => `rgb(0 0 0 / ${kept}) ${reach * 100}%`,
).join(", ")})`;

export default function TopCorners({
  entry,
  accent,
  strength,
}: {
  entry: PackOrnament;
  accent: string;
  /** From `topCornersStrength`, for the card's ground. */
  strength: number;
}): ReactElement {
  const pauseRef = useFloatingPause();
  const Shape = entry.Component;

  return (
    <div
      ref={pauseRef}
      aria-hidden="true"
      /*
        As deep as the circles reach, which is half of one, and cut there and
        at the card's edges. The depth is padding because a percentage of
        padding is of the card's width, which a height cannot be given in.
      */
      className="pointer-events-none absolute inset-x-0 top-0 z-[1] overflow-clip"
      style={{ paddingTop: TOP_CORNERS_REACH, color: accent }}
    >
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          /*
            Set on its corner by a transform of its own, so the turn inside is
            a rotate and nothing else; and the fade is on this, which does not
            turn, over the shape, which does.
          */
          className="absolute top-0"
          style={{
            left: side === "left" ? 0 : "100%",
            width: `min(${DIAMETER_SHARE * 100}%, ${cardPx(MAX_DIAMETER)})`,
            transform: "translate(-50%, -50%)",
            opacity: strength,
            WebkitMaskImage: FADE_MASK,
            maskImage: FADE_MASK,
          }}
        >
          <Shape
            instanceId={`top-corner-${side}-${entry.id}`}
            className={`lifafa-mandala-turn block w-full${
              side === "right" ? " lifafa-mandala-turn-back" : ""
            }`}
          />
        </div>
      ))}
    </div>
  );
}
