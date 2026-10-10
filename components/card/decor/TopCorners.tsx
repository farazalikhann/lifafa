"use client";

import type { ReactElement } from "react";
import { useFloatingPause } from "@/hooks/useFloatingPause";
import { cardPx } from "@/lib/cardScale";
import { resolveSlots } from "@/lib/ornaments/slots";
import { getTraditionPack, type PackOrnament } from "@/lib/traditionPacks";
import type { TraditionId } from "@/types/occasion";
import type { AnyOrnamentId } from "@/types/ornament";

/**
 * The pack's `topCorners` ornament, in its two places: a pair pinned to the
 * top corners of the screen for the whole card (TopCorners), and one more,
 * larger, rising from the bottom edge where the page ends (EndMandala). One
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
 *  - The one at the end is a block of its own after everything else on the
 *    page, with nothing set in it, and fades out inside that block.
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
   The one at the end of the page
   --------------------------------------------------------------------------- */

/** The whole circle's diameter, as a share of the card's width, capped as the pair's is. */
const END_DIAMETER = 1.2;

/**
 * How much of the art its file holds: the middle 55%, with a fade cut into
 * it that is strongest at the centre and gone at the file's own edge, all the
 * way round. The shape that turns is this share of the circle and no bigger,
 * and the block it stands in is exactly as tall as its upper half: so it is
 * strongest at the bottom edge of the page, where its centre is, and has
 * faded to nothing at the top of its block and well inside the block's sides.
 * The only straight edge it meets is the end of the page itself.
 */
const END_ART_SHARE = 0.55;

/**
 * One circle, centred across the page with its centre on the page's bottom
 * edge, so its upper half rises at the very end.
 *
 * A BLOCK OF ITS OWN, IN THE FLOW, AFTER EVERYTHING. It was laid at the foot
 * of the card, in room under the card's last section, and on a guest's page
 * the card is not the end: the reply form follows on a ground with no texture
 * in it, and the ornament stopped dead on the line between the two. As the
 * last block of the page it has nothing after it to stop on and nothing over
 * it: the reply, the note and the keepsake are all above it, and it does not
 * reach up into any of them. Whoever draws the end of the page mounts it: the
 * guest's page after its last section, and the card itself where a card is
 * all there is (the editor's full-screen preview; see `endOrnament` on
 * CardCanvas).
 *
 * `z-[13]`: above the dissolve, whose bottom fade comes to rest on the foot
 * of a card and would paint this out where it is strongest, and under the
 * frame at `z-[16]`, whose foot is drawn over it.
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
      /* As tall as the half that shows; padding, because a percentage of it is of the page's width. */
      className="pointer-events-none relative z-[13] overflow-clip"
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

/**
 * The end ornament for a card's config, or nothing for a card without one:
 * for a page that draws its own end and has the config but not the card's
 * resolved slots. Reads the same list the card does, through the same slots.
 */
export function PageEndMandala({
  traditionId,
  enabledOrnaments,
  accent,
  lightGround,
}: {
  traditionId: TraditionId;
  enabledOrnaments: readonly AnyOrnamentId[];
  accent: string;
  lightGround: boolean;
}): ReactElement | null {
  const entry = resolveSlots(getTraditionPack(traditionId), enabledOrnaments).topCorners;

  return entry === null ? null : (
    <EndMandala entry={entry} accent={accent} strength={topCornersStrength(lightGround)} />
  );
}
