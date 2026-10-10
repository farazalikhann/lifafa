"use client";

import type { ReactElement } from "react";
import { useFloatingPause } from "@/hooks/useFloatingPause";
import { cardPx } from "@/lib/cardScale";
import type { PackOrnament } from "@/lib/traditionPacks";

/**
 * The pack's `topCorners` ornament, in its two places: a pair pinned to the
 * top corners of the screen for the whole card (TopCorners), and one more,
 * larger, rising from the bottom edge where the card ends (EndMandala). One
 * round shape, filled with the card's accent, turning slowly.
 *
 * NEVER UNDER A LINE OF TEXT THAT CAN BE READ. Each is somewhere the card
 * sets no text at full strength, and is gone where the text begins, so its
 * strength does not have to answer to the card's inks: an ink that sits at
 * 4.5:1 on the bare card has nothing to give, and an ornament measured
 * against it was switched on and drawn at nothing.
 *
 *  - The pair is part of the dissolve at the top of the screen (ScrollFade),
 *    which is where a line of text is taken away before it reaches whatever
 *    hangs there. ScrollFade mounts it and masks it on its own curve: whole
 *    where the text is gone, and gone where the text is whole.
 *
 *  - The one at the end stands in room the card grows to hold it
 *    (END_MANDALA_ROOM), under its last section, and fades out inside that
 *    room.
 *
 * The motion is `lifafa-mandala-turn` in globals.css: a rotate and nothing
 * else. Held while the tab is hidden or the layer is off the screen, and
 * still under reduced motion.
 *
 * Decoration only: aria-hidden, and never a tap target.
 */

/** The 420px design width, which every cap here is a share of. */
const DESIGN_WIDTH = 420;

/**
 * How strong the ornament is where it is strongest, by the card's ground.
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

/* ---------------------------------------------------------------------------
   The pair pinned to the top corners
   --------------------------------------------------------------------------- */

/**
 * Each circle's diameter, as a share of the card's width: wider than the
 * card, so a generous quarter of each shows and the two meet across the top.
 * No wider than that share of the design width in card px, so on a card that
 * fills a laptop screen it is still a corner ornament.
 */
const PAIR_DIAMETER = 1.1;

/**
 * How far in and down each centre moves under a flower frame, as a share of
 * the card's width: the frame's corner bouquets are about that deep, and a
 * circle centred on the corner itself kept its best rings behind them.
 */
const PAIR_INSET = 0.1;

/*
  Its own fade, round the centre it turns about, is in its file: full for
  most of the way out, so the rings that clear a garland's ends and a frame's
  bouquets are at strength, and soft at the rim, where the two circles cross
  in the middle of the screen. What keeps it off the text is not that but the
  mask ScrollFade lays over both.
*/

/**
 * Two copies, each centred on a top corner of the box it is put in, the left
 * turning clockwise and the right the other way. Fills that box and is cut
 * by it; ScrollFade supplies one as deep as its own dissolve.
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
  const Shape = entry.turning?.pair ?? entry.Component;
  /* A share of the card's width, as a share of the circle's own, which is what a transform is measured in. */
  const step = inset ? (PAIR_INSET / PAIR_DIAMETER) * 100 : 0;

  return (
    <div
      ref={pauseRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-clip"
      style={{ color: accent }}
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
            width: `min(${PAIR_DIAMETER * 100}%, ${cardPx(DESIGN_WIDTH * PAIR_DIAMETER)})`,
            transform: `translate(${side === "left" ? -50 + step : -50 - step}%, ${-50 + step}%)`,
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

/* ---------------------------------------------------------------------------
   The one at the end of the card
   --------------------------------------------------------------------------- */

/** The whole circle's diameter, as a share of the card's width, capped as the pair's is. */
const END_DIAMETER = 1.2;

/** The room the card adds under its last section to hold it, as a share of the card's width. */
const END_ROOM = 0.34;

/**
 * That room, as the bottom padding of the card's content column: a percentage
 * of padding is of the card's width. Nothing is set in it, which is the whole
 * of how the ornament keeps off the last section's text.
 */
export const END_MANDALA_ROOM = `min(${END_ROOM * 100}%, ${cardPx(DESIGN_WIDTH * END_ROOM)})`;

/**
 * How much of the art its file holds: the middle 55%, with a fade cut into
 * it that is strongest at the centre and gone at the file's own edge. So it
 * is strongest at the card's bottom edge, where its centre is, and gone
 * inside the room made for it, which is 0.567 of the whole circle's radius
 * deep. The shape that turns is this share of the circle and no bigger.
 */
const END_ART_SHARE = 0.55;

/**
 * One circle, centred across the card with its centre on the card's bottom
 * edge, so its upper half rises behind the end of the card. It is part of
 * the card and scrolls with it.
 *
 * ABOVE THE DISSOLVE, AT `z-[13]`. The dissolve's bottom fade comes to rest
 * on the last 60px of the card, which is exactly where this is strongest,
 * and would paint it out. Under the frame and anything that hangs, which
 * stand higher; and the column's text is not in the room it stands in.
 */
export function EndMandala({
  entry,
  accent,
  strength,
}: {
  entry: PackOrnament;
  accent: string;
  strength: number;
}): ReactElement {
  const pauseRef = useFloatingPause();
  const Shape = entry.turning?.end ?? entry.Component;
  /* What is drawn of the circle: its diameter, less what its file leaves out. */
  const drawn = END_DIAMETER * END_ART_SHARE;

  return (
    <div
      ref={pauseRef}
      aria-hidden="true"
      /* As tall as the half that shows; padding, because a percentage of it is of the card's width. */
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[13] overflow-clip"
      style={{
        paddingTop: `min(${(drawn / 2) * 100}%, ${cardPx((DESIGN_WIDTH * drawn) / 2)})`,
        color: accent,
      }}
    >
      <div
        className="absolute left-1/2 top-full"
        style={{
          width: `min(${drawn * 100}%, ${cardPx(DESIGN_WIDTH * drawn)})`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <Shape
          instanceId={`end-${entry.id}`}
          className="lifafa-mandala-turn lifafa-mandala-turn-slow block w-full"
          style={{ opacity: strength }}
        />
      </div>
    </div>
  );
}
