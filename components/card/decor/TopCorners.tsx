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
 * WHERE IT IS IN THE STACK, AND WHY IT IS NOT UNDER THE CONTENT COLUMN. It
 * belongs behind everything, and under the column is where that would put
 * it. But the dissolve (ScrollFade, `z-[12]`) paints the card's own colour
 * over the top of the screen, solid to the depth of whatever hangs there:
 * about 100px under a garland, of a shape that reaches 137px. Under the
 * column this was a mandala nobody could see. So it is one step above the
 * dissolve and below the top border at `z-[15]` and the frame at `z-[16]`,
 * which are drawn over it. The opening screen keeps its writing below the
 * dissolve, which is nearly all of this shape's depth, and for the little
 * that is left its opacity is measured for a wash lying across the text as
 * well as behind it; see maxVeilAlpha.
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

export default function TopCorners({
  entry,
  accent,
  opacity,
}: {
  entry: PackOrnament;
  accent: string;
  /** Measured by the canvas against the palette in use. */
  opacity: number;
}): ReactElement | null {
  const pauseRef = useFloatingPause();
  const Shape = entry.Component;

  if (opacity <= 0) {
    return null;
  }

  return (
    <div
      ref={pauseRef}
      aria-hidden="true"
      /*
        As deep as the circles reach, which is half of one, and cut there and
        at the card's edges. The depth is padding because a percentage of
        padding is of the card's width, which a height cannot be given in.
      */
      className="pointer-events-none absolute inset-x-0 top-0 z-[13] overflow-clip"
      style={{
        paddingTop: `min(${(DIAMETER_SHARE / 2) * 100}%, ${cardPx(MAX_DIAMETER / 2)})`,
        color: accent,
      }}
    >
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          /* Set on its corner by a transform of its own, so the turn inside is a rotate and nothing else. */
          className="absolute top-0"
          style={{
            left: side === "left" ? 0 : "100%",
            width: `min(${DIAMETER_SHARE * 100}%, ${cardPx(MAX_DIAMETER)})`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <Shape
            instanceId={`top-corner-${side}-${entry.id}`}
            className={`lifafa-mandala-turn block w-full${
              side === "right" ? " lifafa-mandala-turn-back" : ""
            }`}
            /* On the turning element itself, so each is one layer with nothing to blend as a group. */
            style={{ opacity }}
          />
        </div>
      ))}
    </div>
  );
}
