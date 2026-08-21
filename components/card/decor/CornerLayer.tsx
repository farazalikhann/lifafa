"use client";

import type { ReactElement } from "react";
import { getOrnament } from "@/lib/ornaments/muslim";
import type { OrnamentId } from "@/types/ornament";

/**
 * Home for the two ornaments in the pack that neither hang nor frame anything.
 *
 * WHY THIS FILE EXISTS. "Stars" and "Geometric star" were drawn, registered in
 * `BY_ID`, offered as chips by the editor and switched on by the host — and
 * then rendered by nobody. HangingLayer excludes them by design (`HANGABLE`
 * holds the lantern, the moon and the lights, and a star suspended on a string
 * is not a thing), the arabesque border is claimed by the section dividers and
 * the arch by the cover, which left these two with no consumer anywhere in the
 * card. Nothing was wrong with either drawing; there was simply no branch that
 * ever mounted them. This is that branch.
 *
 * They are placed at the corners of the visible area rather than scattered.
 * Both are static, symmetrical, fairly heavy pieces of geometry — the sort of
 * thing that reads as a corner-piece on a page and as clutter anywhere else —
 * and the middle of the card is where the names and the date are set.
 *
 * Pinned exactly the way DecorLayer and HangingLayer are, and for the same
 * reason: a corner ornament that scrolls away from the corner stops being one.
 * The clipping is `overflow: clip` throughout, never `overflow: hidden`, so no
 * wrapper here becomes a scroll container and steals the sticky band from the
 * real scrollport.
 */

/** Every ornament this layer knows how to place. */
const CORNERABLE: readonly OrnamentId[] = ["stars", "geometricStar"];

interface CornerPlacement {
  id: OrnamentId;
  /** Percentages of the band, measured to the ornament's centre. */
  left: number;
  top: number;
  /** Rendered size in px of the drawing's larger side. Both are square. */
  size: number;
  /** Degrees. Static — nothing here animates. */
  rotation: number;
  /**
   * Multiplier on the layer's alpha ceiling.
   *
   * 1 for the corner piece each pair is anchored on, less for the echo that
   * answers it: two ornaments at one weight read as a repeat rather than as a
   * composition. The ceiling itself is measured by the canvas — nothing here
   * gets to decide how loud it is on a given palette.
   */
  weight: number;
}

/**
 * Hand authored, never generated — the same rule the rest of the card's decor
 * tables follow, so the server and the browser lay this out identically.
 *
 * Two placements per ornament, because each is toggled on its own: whichever
 * one the host picks has to look composed by itself, and a single shape in a
 * single corner reads as something that fell off. Both pairs sit low, clear of
 * the hanging band at the top, and to the outside of the text column.
 *
 * Checked at 360px: every box below sits inside the card and clear of the
 * others, both when one ornament is on and when both are. The x values allow
 * for the rotation — a 88px square turned 8 degrees is 99px across, and it is
 * that figure, not the authored size, that has to clear the card's edge.
 */
const CORNERS: readonly CornerPlacement[] = [
  /* Stars: the lower left corner, echoed small on the right edge above it. */
  { id: "stars", left: 14, top: 82, size: 88, rotation: -8, weight: 1 },
  { id: "stars", left: 90, top: 46, size: 56, rotation: 14, weight: 0.8 },
  /* Geometric star: the lower right corner, echoed small on the left edge. */
  { id: "geometricStar", left: 86, top: 84, size: 96, rotation: 0, weight: 1 },
  { id: "geometricStar", left: 12, top: 44, size: 60, rotation: 22, weight: 0.8 },
];

/**
 * Static ornaments held at the corners of the visible area.
 *
 * Returns null unless the host has switched one of the two on, so a card
 * without them carries no extra elements at all.
 */
export default function CornerLayer({
  enabledOrnaments,
  accent,
  bandHeight,
  maxAlpha,
}: {
  enabledOrnaments: readonly OrnamentId[];
  accent: string;
  /** Height of the scrollport, exactly as DecorLayer takes it. */
  bandHeight: string;
  /**
   * Ceiling on any one ornament's opacity, measured by the canvas against the
   * palette in use. These sit behind the same text the scattered motifs do, so
   * they answer to the same measurement rather than to a number picked here.
   */
  maxAlpha: number;
}): ReactElement | null {
  const placed = CORNERS.filter(
    (corner) =>
      CORNERABLE.includes(corner.id) && enabledOrnaments.includes(corner.id),
  );

  if (placed.length === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[4] overflow-clip"
    >
      <div
        className="sticky top-0 w-full overflow-clip"
        style={{ height: bandHeight }}
      >
        {placed.map((corner, index) => {
          const Shape = getOrnament(corner.id);

          return (
            <span
              key={`${corner.id}-${corner.left}-${corner.top}`}
              className="absolute block"
              style={{
                left: `${corner.left}%`,
                top: `${corner.top}%`,
                /* Ornaments draw with currentColor, so the accent is set here. */
                color: accent,
                opacity: Math.round(maxAlpha * corner.weight * 1000) / 1000,
                transform: `translate(-50%, -50%) rotate(${corner.rotation}deg)`,
              }}
            >
              <Shape
                size={corner.size}
                /*
                  Unique per placement and built from the table's own fixed
                  values, so it is byte-identical on the server and in the
                  browser. Neither of these two defines an svg id today, but
                  every ornament takes one so that adding a gradient to either
                  stays a local change — and so that two copies of the same
                  drawing on one page could never collide on it.
                */
                instanceId={`corner-${index}-${corner.id}`}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
