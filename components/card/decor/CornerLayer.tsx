"use client";

import type { ReactElement } from "react";
import type { TraditionPack } from "@/lib/traditionPacks";
import type { TraditionId } from "@/types/occasion";
import type { AnyOrnamentId } from "@/types/ornament";

/**
 * Home for every ornament in a pack that neither hangs nor frames anything.
 *
 * WHY THIS FILE EXISTS. "Stars" and "Geometric star" were drawn, registered,
 * offered as chips by the editor and switched on by the host — and then
 * rendered by nobody. HangingLayer excludes them by design, the arabesque
 * border is claimed by the section dividers and the arch by the cover, which
 * left them with no consumer anywhere in the card. Nothing was wrong with
 * either drawing; there was simply no branch that ever mounted them. This is
 * that branch, and with six packs it is now the default destination: whatever
 * a pack owns that the hanging table, the cover arch and the divider do not
 * claim arrives here, so no ornament can be offered and then silently ignored.
 *
 * They are placed around the edges of the visible area rather than scattered.
 * These are static, symmetrical, fairly heavy pieces of geometry — the sort of
 * thing that reads as a corner-piece on a page and as clutter anywhere else —
 * and the middle of the card is where the names and the date are set.
 *
 * Pinned exactly the way DecorLayer and HangingLayer are, and for the same
 * reason: a corner ornament that scrolls away from the corner stops being one.
 * The clipping is `overflow: clip` throughout, never `overflow: hidden`, so no
 * wrapper here becomes a scroll container and steals the sticky band from the
 * real scrollport.
 */

interface CornerPlacement {
  /** Percentages of the band, measured to the ornament's centre. */
  left: number;
  top: number;
  /** Rendered size in px of the drawing's larger side. */
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
 * The Muslim pack's hand-tuned placements, kept exactly as authored.
 *
 * Two placements per ornament, because each is toggled on its own: whichever
 * one the host picks has to look composed by itself, and a single shape in a
 * single corner reads as something that fell off. Both pairs sit low, clear of
 * the hanging band at the top, and to the outside of the text column.
 *
 * Checked at 360px: every box sits inside the card and clear of the others,
 * both when one ornament is on and when both are. The x values allow for the
 * rotation — an 88px square turned 8 degrees is 99px across, and it is that
 * figure, not the authored size, that has to clear the card's edge.
 */
const MUSLIM_CORNERS: Readonly<Record<string, readonly CornerPlacement[]>> = {
  stars: [
    { left: 14, top: 82, size: 88, rotation: -8, weight: 1 },
    { left: 90, top: 46, size: 56, rotation: 14, weight: 0.8 },
  ],
  geometricStar: [
    { left: 86, top: 84, size: 96, rotation: 0, weight: 1 },
    { left: 12, top: 44, size: 60, rotation: 22, weight: 0.8 },
  ],
};

/**
 * One slot per scatterable ornament, for the packs that have no hand-tuned
 * table of their own.
 *
 * ONE SLOT EACH, NOT TWO, AND THAT IS WHAT KEEPS THEM APART. The Muslim pack
 * has two scatterable ornaments and can afford a pair of placements each; the
 * Christian pack has four and the Buddhist five, and two placements apiece
 * would put ten drawings on one card. Handing each ornament a single slot from
 * a list longer than any pack's scatter set means no two can ever land on the
 * same spot, whatever combination the host switches on — collision-free by
 * construction rather than by inspection.
 *
 * Ordered so the first few land in the corners, which is where a lone ornament
 * looks deliberate. Every slot sits below the hanging band and outside the
 * text column, and the sizes shrink down the list so a fully loaded card does
 * not read as heavily as a sparse one.
 */
const SCATTER_SLOTS: readonly CornerPlacement[] = [
  { left: 14, top: 82, size: 84, rotation: -8, weight: 1 },
  { left: 86, top: 84, size: 84, rotation: 6, weight: 1 },
  { left: 90, top: 46, size: 56, rotation: 14, weight: 0.8 },
  { left: 12, top: 44, size: 56, rotation: -12, weight: 0.8 },
  { left: 50, top: 92, size: 52, rotation: 0, weight: 0.7 },
  { left: 22, top: 62, size: 46, rotation: 18, weight: 0.6 },
  { left: 78, top: 64, size: 46, rotation: -16, weight: 0.6 },
  { left: 50, top: 34, size: 42, rotation: 8, weight: 0.55 },
];

/**
 * Where each scatterable ornament of a pack sits.
 *
 * The Muslim pack keeps its authored table; every other pack takes slots from
 * SCATTER_SLOTS in the order its ornaments are declared. Deterministic either
 * way — the same ornament lands in the same place on the server and in the
 * browser, which is what stops React reporting a hydration mismatch.
 */
function placementsFor(
  traditionId: TraditionId,
  id: AnyOrnamentId,
  scatterIds: readonly AnyOrnamentId[],
): readonly CornerPlacement[] {
  if (traditionId === "muslim") {
    return MUSLIM_CORNERS[id] ?? [];
  }

  const index = scatterIds.indexOf(id);

  if (index < 0 || index >= SCATTER_SLOTS.length) {
    return [];
  }

  return [SCATTER_SLOTS[index]];
}

/**
 * Static ornaments held around the edges of the visible area.
 *
 * Returns null unless the host has switched one on, so a card without them
 * carries no extra elements at all.
 */
export default function CornerLayer({
  pack,
  scatterIds,
  enabledOrnaments,
  accent,
  bandHeight,
  maxAlpha,
}: {
  pack: TraditionPack | null;
  /**
   * The pack's ornaments that nothing else claims — not hanging, not the cover
   * arch, not the divider. Worked out by the canvas, which is the only place
   * that can see all three claims at once.
   */
  scatterIds: readonly AnyOrnamentId[];
  enabledOrnaments: readonly AnyOrnamentId[];
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
  if (pack === null) {
    return null;
  }

  const placed = scatterIds
    .filter((id) => enabledOrnaments.includes(id))
    .flatMap((id) =>
      placementsFor(pack.traditionId, id, scatterIds).map((corner) => ({
        id,
        corner,
      })),
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
        {placed.map(({ id, corner }, index) => {
          const entry = pack.findOrnament(id);

          /* An id this pack does not know draws nothing at all. */
          if (entry === null) {
            return null;
          }

          const Shape = entry.Component;
          /*
            A shape that declares itself upright is placed upright, whatever the
            slot says. The slot rotations are a composition device; for these two
            ornaments a tilt is not a style choice but a change of meaning.
          */
          const rotation = entry.uprightOnly === true ? 0 : corner.rotation;

          return (
            <span
              key={`${id}-${corner.left}-${corner.top}`}
              className="absolute block"
              style={{
                left: `${corner.left}%`,
                top: `${corner.top}%`,
                /* Ornaments draw with currentColor, so the accent is set here. */
                color: accent,
                opacity: Math.round(maxAlpha * corner.weight * 1000) / 1000,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              }}
            >
              <Shape
                size={corner.size}
                /*
                  Unique per placement and built from the table's own fixed
                  values, so it is byte-identical on the server and in the
                  browser — and so two copies of the same drawing on one page
                  could never collide on an svg id.
                */
                instanceId={`corner-${index}-${id}`}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
