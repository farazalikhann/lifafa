"use client";

import type { CSSProperties, ReactElement } from "react";
import { getOrnament, ORNAMENT_ASPECT } from "@/lib/ornaments/muslim";
import type { HangingOrnament, OrnamentId } from "@/types/ornament";

/**
 * Which ornaments are allowed to hang.
 *
 * A lantern, a moon and a string of lights all read as suspended from
 * something above them. An arch, a border and a star do not — they are surfaces
 * and frames, and hanging one from the top edge of the card would look like a
 * mistake rather than a decision. Anything not in this set is ignored here and
 * left to the parts of the card that know what to do with it — the two stars go
 * to CornerLayer, the border to the dividers, the arch to the cover.
 */
const HANGABLE: readonly OrnamentId[] = [
  "lantern",
  "hangingLights",
  "crescentMoon",
];

/**
 * How tall the band the ornaments hang inside is, in px.
 *
 * Fixed rather than viewport relative, because this layer exists in two very
 * different boxes: a guest's phone screen and the editor's 620px preview frame.
 * A percentage of either would put the lanterns in a different place in each,
 * and the host would be shown a card their guests never receive.
 *
 * 380 leaves the deepest ornament's foot around 216px down at the sizes below,
 * which is what `hangingDepth` then clears the greeting past.
 */
const BAND_HEIGHT = 380;

/**
 * rem to px, for turning `sizeRem` into the px `size` the ornaments take.
 *
 * The browser default, assumed rather than measured: reading the real root font
 * size means touching the DOM during render, which would make the server and
 * the client disagree about how big a lantern is.
 */
const ROOT_FONT_PX = 16;

/**
 * Where each ornament hangs. Hand authored, and deliberately so.
 *
 * Math.random would place them differently on the server and in the browser,
 * which React reports as a hydration mismatch — the same reason DecorLayer's
 * scatter is a fixed table.
 *
 * SIZES. Every lantern and moon here is 2.5x what it used to be: at the old
 * sizes a lantern was a 58px speck on a phone and the jaali lattice that makes
 * it a lantern rather than a blob was not legible at all. Those sizes do not
 * fit the old positions — four lanterns at 2.5x are 262px of a 360px screen —
 * so the x values are re-authored around the new widths rather than kept and
 * left to collide. The five widest hang as one staggered row, in this order
 * across the card: lantern, lantern, moon, lantern, lantern, with a gap between
 * every pair of boxes at 360px. The small moon is the exception and clears its
 * neighbours vertically instead, tucked under the leftmost lantern's foot.
 *
 * The depths still vary on purpose: a row of lamps at one offset reads as a
 * shelf, and the whole point of a lantern is that it is on a string of its own
 * length.
 */
const HANGING: readonly HangingOrnament[] = [
  /*
    The string of lights spans the full width, so it is drawn first, behind.

    22.5rem is 360px — the width this row is laid out against, and this is the
    one ornament here that could not take the 2.5x the rest did. It is already
    a full-bleed span, so 2.5x would be 840px of wire on a 360px screen: the
    hooks it is tied off on would hang somewhere outside the card entirely.
    Widened to the card's own width instead, which is as large as it goes
    without running past the edges.
  */
  {
    id: "hangingLights",
    xPercent: 50,
    topPercent: 0,
    sizeRem: 22.5,
    delayMs: 0,
    swing: false,
  },
  {
    id: "lantern",
    xPercent: 11.5,
    topPercent: 2,
    sizeRem: 9,
    delayMs: 0,
    swing: true,
  },
  {
    id: "lantern",
    xPercent: 31,
    topPercent: 20,
    sizeRem: 7,
    delayMs: 900,
    swing: true,
  },
  {
    id: "lantern",
    xPercent: 71.5,
    topPercent: 25,
    sizeRem: 6,
    delayMs: 1800,
    swing: true,
  },
  {
    id: "lantern",
    xPercent: 89,
    topPercent: 4,
    sizeRem: 8,
    delayMs: 2600,
    swing: true,
  },
  /*
    Moons drift rather than swing — nothing is holding them, so a pendulum
    would be describing a rope that is not drawn.
  */
  {
    id: "crescentMoon",
    xPercent: 51.5,
    topPercent: 28,
    sizeRem: 5.25,
    delayMs: 1300,
    swing: false,
  },
  /*
    Under the leftmost lantern's foot rather than beside anything: once the
    other five are placed there is no horizontal room left on a 360px card, so
    this one is separated in the other axis.
  */
  {
    id: "crescentMoon",
    xPercent: 12,
    topPercent: 41,
    sizeRem: 3.75,
    delayMs: 2100,
    swing: false,
  },
];

/**
 * Swing durations in seconds, cycled across the swinging ornaments.
 *
 * Four values that share no small common multiple, so two lanterns that start
 * out of phase stay out of phase instead of drifting back into step a minute
 * in. The staggered delays handle the first few seconds; this handles the rest.
 */
const SWING_SECONDS: readonly number[] = [4.6, 5.3, 5.9, 4.9];

/**
 * Slack added under the deepest ornament by hangingDepth.
 *
 * A swinging lantern's tassel travels a few px past where it hangs at rest —
 * 3 degrees across roughly 145px is about 8px at the sizes above — and a line
 * of text that only just clears a lantern standing still would be clipped by
 * one in motion.
 */
const SWING_MARGIN = 10;

/**
 * How far down the card the deepest enabled hanging ornament reaches, in px.
 * Zero when nothing hangs.
 *
 * Exported because the card has to know: the greeting and the dua sit at the
 * top of the cover, which is exactly where the lanterns are, and text laid over
 * a string of bulbs is unreadable. Derived from the same table that positions
 * them rather than written down a second time — a lantern moved deeper here
 * pushes the greeting down with it, with nothing to keep in sync by hand.
 *
 * Now that the band is pinned to the top of the screen rather than to the top
 * of the card, this is a clearance every section needs and not only the first
 * one — the caller applies it wherever the greeting lands in the running order.
 */
export function hangingDepth(
  enabledOrnaments: readonly OrnamentId[],
): number {
  let deepest = 0;

  for (const ornament of HANGING) {
    if (
      !HANGABLE.includes(ornament.id) ||
      !enabledOrnaments.includes(ornament.id)
    ) {
      continue;
    }

    /* `sizeRem` measures the longer side, so a wide ornament is shorter than it. */
    const size = ornament.sizeRem * ROOT_FONT_PX;
    const aspect = ORNAMENT_ASPECT[ornament.id];
    const height = aspect >= 1 ? size / aspect : size;
    const top = (ornament.topPercent / 100) * BAND_HEIGHT;

    deepest = Math.max(deepest, top + height);
  }

  return deepest === 0 ? 0 : Math.ceil(deepest + SWING_MARGIN);
}

/**
 * Ornaments pinned to the top edge of the *screen*, hanging over whichever
 * section the guest is currently looking at.
 *
 * Separate from DecorLayer, which scatters motifs across the whole card and
 * moves them on a loop. This layer does one thing DecorLayer cannot: it anchors
 * to a single edge, so a lantern reads as suspended from above rather than as
 * floating somewhere on the card.
 *
 * The band is sticky rather than simply sitting at the top of the card. Pinned
 * to the card, the lanterns scrolled away with the cover and were gone for the
 * whole rest of the invitation, which is not what a hanging ornament does.
 * Both wrappers clip with `overflow: clip` and never `overflow: hidden`, as
 * does the canvas root above them: `hidden` makes an element a scroll
 * container, and a sticky child sticks to the nearest one — which, being the
 * card itself, never scrolls, so the band would not move at all.
 *
 * Purely decorative and completely inert — `aria-hidden` so it is never read
 * out, `pointer-events-none` so a lantern hanging over the cover can never
 * swallow a tap or a scroll that was meant for the card underneath.
 *
 * Sits above the background and below the text: the content column in
 * CardCanvas is `z-10`, and this is `z-[5]`.
 */
export default function HangingLayer({
  enabledOrnaments,
  accent,
}: {
  enabledOrnaments: readonly OrnamentId[];
  accent: string;
}): ReactElement | null {
  const hanging = HANGING.filter(
    (ornament) =>
      HANGABLE.includes(ornament.id) && enabledOrnaments.includes(ornament.id),
  );

  if (hanging.length === 0) {
    return null;
  }

  let swingIndex = 0;

  return (
    /*
      The outer layer spans the whole card and clips to it, so nothing can bleed
      past the card's own width; the band inside it is what stays in view.
    */
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] overflow-clip"
    >
      <div
        className="sticky top-0 w-full overflow-clip"
        style={{ height: `${BAND_HEIGHT}px` }}
      >
        {hanging.map((ornament, index) => {
          const Shape = getOrnament(ornament.id);

          /*
            Counted over the swinging ornaments only, not over the whole table:
            indexing by position would let the two non-swinging moons consume
            durations and hand two lanterns the same one.
          */
          const duration = ornament.swing
            ? SWING_SECONDS[swingIndex++ % SWING_SECONDS.length]
            : 0;

          const swingStyle: CSSProperties = ornament.swing
            ? {
                animationDuration: `${duration}s`,
                animationDelay: `${ornament.delayMs}ms`,
              }
            : {};

          return (
            <span
              key={`${ornament.id}-${ornament.xPercent}-${ornament.topPercent}`}
              className="absolute block -translate-x-1/2"
              style={{
                left: `${ornament.xPercent}%`,
                top: `${ornament.topPercent}%`,
                /* Ornaments draw with currentColor, so the accent is set here. */
                color: accent,
              }}
            >
              {/*
                The centring translate above and the swing below are on two
                different elements on purpose: an animation's transform replaces
                the element's own outright, so a keyframe rotation applied here
                would drop the -50% and shunt every ornament half its width to
                the right the moment the animation took over.
              */}
              <span
                className={ornament.swing ? "lifafa-hang-swing" : "block"}
                style={swingStyle}
              >
                <Shape
                  size={ornament.sizeRem * ROOT_FONT_PX}
                  /*
                    Stable per slot and unique across the layer, which is what
                    the lantern's glow filter needs: an id built from the
                    table's own fixed values is identical on the server and in
                    the browser.
                  */
                  instanceId={`hang-${index}-${ornament.id}`}
                />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
